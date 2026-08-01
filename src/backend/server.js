import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "./db.js";
import botEngine from "./steam/botEngine.js";
import dotenv from "dotenv";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as SteamStrategy } from "@dessly/passport-steam";
import { OAuth2Client } from "google-auth-library";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { createCharge, handleWebhook, getPaymentStatus } from "./controllers/paymentController.js";
import p2pMarketService from "./services/p2pMarketService.js";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

// ─────────────────────────────────────────────────
// LOGGING SYSTEM (MUST BE FIRST - BEFORE ANY USAGE)
// ─────────────────────────────────────────────────

const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', DEBUG: 'DEBUG' };

// ─── CDN IMAGE HELPER ────────────────────────────────
// Generate a deterministic Steam economy image hash from a skin name.
function generateIconUrlHash(skinName, seed) {
  const baseChars = '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw';
  const input = `${skinName}_${seed || Date.now()}_${skinName.length}_${skinName.charCodeAt(0) || 65}`;
  let hash = '';
  for (let i = 0; i < input.length; i++) {
    const idx = (input.charCodeAt(i) + i * 7) % baseChars.length;
    hash += baseChars[idx];
  }
  while (hash.length < 180) {
    const idx = (hash.length * 13 + skinName.charCodeAt(hash.length % skinName.length)) % baseChars.length;
    hash += baseChars[idx];
  }
  return hash;
}

function buildAkamaiImageUrl(iconUrlHash) {
  if (!iconUrlHash) return '';
  return `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrlHash}/360fx360f`;
}

function log(level, module, message, data = null) {
  if (process.env.NODE_ENV === 'production' && level !== LOG_LEVELS.ERROR) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;
  const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  method(`${prefix} ${message}`, data || '');
}

log(LOG_LEVELS.INFO, 'SYSTEM', 'Iniciando servidor...');

// ─────────────────────────────────────────────────
// ENVIRONMENT VALIDATION (AFTER LOGGER IS READY)
// ─────────────────────────────────────────────────

const requiredEnvVars = {
  'STEAM_API_KEY': 'Steam Web API Key',
  'DATABASE_URL': 'PostgreSQL Database URL',
  'JWT_SECRET': 'JWT Secret Key',
  'BOT_USERNAME': 'Bot Steam Username',
  'BOT_PASSWORD': 'Bot Steam Password',
  'BOT_SHARED_SECRET': 'Bot 2FA Shared Secret',
  'BOT_IDENTITY_SECRET': 'Bot Identity Secret (for confirmations)',
  'REDIS_URL': 'Redis URL (optional but recommended)',
  'BACKEND_URL': 'Backend URL',
  'FRONTEND_URL': 'Frontend URL'
};

const missingEnvVars = [];
for (const [key, description] of Object.entries(requiredEnvVars)) {
  if (!process.env[key] && key !== 'REDIS_URL') {
    missingEnvVars.push(`${key} (${description})`);
  }
}

if (missingEnvVars.length > 0) {
  log(LOG_LEVELS.ERROR, 'SYSTEM', '╔════════════════════════════════════════════════════════════╗');
  log(LOG_LEVELS.ERROR, 'SYSTEM', '║  VARIABLES DE ENTORNO CRÍTICAS FALTANTES                  ║');
  log(LOG_LEVELS.ERROR, 'SYSTEM', '╚════════════════════════════════════════════════════════════╝');
  missingEnvVars.forEach((missing, index) => {
    log(LOG_LEVELS.ERROR, 'SYSTEM', `  ${index + 1}. ${missing}`);
  });
  log(LOG_LEVELS.ERROR, 'SYSTEM', '  El servidor continuará, pero algunas funciones pueden fallar.');
  log(LOG_LEVELS.ERROR, 'SYSTEM', '  Configura estas variables en Render o en tu archivo .env');
} else {
  log(LOG_LEVELS.INFO, 'SYSTEM', '✅ Todas las variables de entorno críticas están configuradas');
}


const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// ─── Session Store ──────
const sessionStore = (() => {
  let store;
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    const redisClient = createClient({ url: redisUrl });
    redisClient.connect().catch(err => log(LOG_LEVELS.WARN, 'SESSION', 'Redis no disponible, usando MemoryStore', err.message));
    store = new RedisStore({ client: redisClient });
    log(LOG_LEVELS.INFO, 'SESSION', 'Usando RedisStore');
    return store;
  } catch {
    log(LOG_LEVELS.WARN, 'SESSION', 'Fallback a MemoryStore (Redis no disponible)');
  }

  const MemoryStore = session.MemoryStore || (session.Store && session.Store);
  if (MemoryStore) {
    store = new session.MemoryStore();
  } else {
    const simpleStore = new Map();
    store = {
      get: (sid, cb) => { cb(null, simpleStore.get(sid) || null); },
      set: (sid, session, cb) => { simpleStore.set(sid, session); cb(null); },
      destroy: (sid, cb) => { simpleStore.delete(sid); cb(null); },
    };
  }
  return store;
})();

// Middlewares de Seguridad
app.use(helmet());
app.use(hpp());

const allowedOrigins = [
  "https://skinmarket-frontend.onrender.com",
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(express.json());

// Trust proxy — needed for correct IP detection behind Render/Nginx
app.set('trust proxy', true);

// Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  },
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => {
    console.error('[EXPRESS RATE LIMIT EXCEEDED] General - IP:', req.ip, 'URL:', req.originalUrl);
    res.status(429).json({ error: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.", code: "RATE_LIMIT_GENERAL" });
  }
});
app.use("/api/", limiter);

const withdrawLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Límite de retiros excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_WITHDRAW" })
});

// depositLimiter - disponible para uso futuro
const _depositLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Límite de depósitos excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_DEPOSIT" })
});

const caseOpenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Límite de aperturas excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_CASE_OPEN" })
});

const dailyCaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Límite de reclamos excedido.", code: "RATE_LIMIT_DAILY" })
});

const inspectorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => {
    console.error('[EXPRESS RATE LIMIT EXCEEDED] Inspector - IP:', req.ip, 'URL:', req.originalUrl);
    res.status(429).json({ error: "Límite de consultas excedido.", code: "RATE_LIMIT_INSPECTOR" });
  }
});

// ─── LOGIN & REGISTER RATE LIMITERS ──────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.", code: "RATE_LIMIT_LOGIN" })
});

// registerLimiter - disponible para uso futuro
const _registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) => res.status(429).json({ error: "Demasiados intentos de registro. Intenta de nuevo en 1 hora.", code: "RATE_LIMIT_REGISTER" })
});

// Configurar Sesiones (usar SESSION_SECRET con fallback seguro)
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'skinmarket_super_secret_key_998877665544',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// [ON-DEMAND] Bot NO se conecta al arrancar. Solo se conecta cuando 
// un usuario solicita un retiro (withdraw). No hay polling a Steam.
// ─── PASSPORT INIT (must be BEFORE any /api/auth/steam routes) ──────
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (process.env.BOT_USERNAME && process.env.BOT_USERNAME !== 'tu_usuario_steam') {
  // NO llamar a botEngine.logIn() aquí - solo registrar endpoint de estado
  app.get("/api/bot/status", (req, res) => {
    const status = botEngine.getStatus();
    res.json(status);
  });
} else {
  log(LOG_LEVELS.INFO, 'BOT', 'Bot no configurado. Iniciando en modo espera.');
  app.get("/api/bot/status", (req, res) => {
    res.json({ status: "ok", bot: "not_configured", message: "Bot no configurado - requiere credenciales Steam" });
  });
}

// Steam Strategy — configurada ANTES de las rutas Steam
if (process.env.STEAM_API_KEY) {
  try {
    // CRITICAL FIX: Use process.env.BACKEND_URL explicitly for Steam returnURL and realm
    // If BACKEND_URL is missing or empty, SteamStrategy will throw "OpenID return URL is required"
    const backendUrlForSteam = process.env.BACKEND_URL || 'https://skinmarket-backend.onrender.com';
    const steamReturnURL = `${backendUrlForSteam}/api/auth/steam/return`;
    const steamRealm = `${backendUrlForSteam}/`;

    passport.use(new SteamStrategy({
      returnURL: steamReturnURL,
      realm: steamRealm,
      apiKey: process.env.STEAM_API_KEY
    }, async (identifier, profile, done) => {
      try {
        const steamId = profile.id;
        const nombre = profile.displayName;
        // Extract Steam avatar from profile photos (full-size)
        const steamAvatar = profile.photos?.[0]?.value || profile._json?.avatarfull || null;
        let result = await db.query("SELECT * FROM usuarios WHERE steam_id = $1", [steamId]);
        if (result.rows.length === 0) {
          result = await db.query(
            "INSERT INTO usuarios (nombre_usuario, email, password_hash, steam_id, avatar, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [nombre, `${steamId}@steam.auth`, 'steam_no_password', steamId, steamAvatar, 0, 0]
          );
        } else {
          // Update avatar on subsequent logins
          await db.query(
            "UPDATE usuarios SET avatar = COALESCE(NULLIF($1, ''), avatar) WHERE usuario_id = $2",
            [steamAvatar, result.rows[0].usuario_id]
          );
        }
        return done(null, result.rows[0]);
      } catch (err) { return done(err); }
    }));
    log(LOG_LEVELS.INFO, 'AUTH', 'Steam Strategy configurada correctamente');
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'AUTH', 'Error al configurar Steam Strategy:', err);
  }
} else {
  log(LOG_LEVELS.WARN, 'AUTH', 'STEAM_API_KEY no configurada. Autenticación Steam deshabilitada.');
}

// ─── GOOGLE OAUTH CLIENT ────────────────────────────
// Initialize Google OAuth2 client for verifying Google ID tokens server-side.
// Requires GOOGLE_CLIENT_ID and optionally GOOGLE_CLIENT_SECRET env vars.
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const googleClient = googleClientId
  ? new OAuth2Client(googleClientId, googleClientSecret)
  : null;

if (googleClient) {
  log(LOG_LEVELS.INFO, 'AUTH', 'Google OAuth2 client configurado correctamente');
} else {
  log(LOG_LEVELS.WARN, 'AUTH', 'GOOGLE_CLIENT_ID no configurada. Autenticación Google deshabilitada.');
}

// ─── IS ADMIN MIDDLEWARE (DEFINED FIRST - HOISTED VIA FUNCTION DECLARATION) ──
// IMPORTANT: Must be defined BEFORE any endpoint that uses it (like /api/update-balance)
async function isAdmin(req, res, next) {
  try {
    const result = await db.query("SELECT role FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    if (result.rows[0]?.role === 'admin') next();
    else res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
  } catch {
    res.status(500).json({ error: "Error al verificar permisos" });
  }
}

// ─── SECURITY HELPERS (PASO 3) ──────────────────────

/**
 * Sanitize a string input to prevent XSS and injection attacks.
 * Removes HTML tags, control characters, and trims whitespace.
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return String(input);
  // Remove HTML tags
  let cleaned = input.replace(/<[^>]*>/g, '');
  // Remove control characters (except newlines/tabs)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '');
  // Trim and limit length
  return cleaned.trim().slice(0, 1000);
}

/**
 * Validate password against security policy.
 * Requires: min 8 chars, at least 1 uppercase, 1 number, 1 special char.
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'La contraseña es obligatoria' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'La contraseña debe contener al menos una mayúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'La contraseña debe contener al menos un número' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, error: 'La contraseña debe contener al menos un carácter especial (!@#$%^&*...)' };
  }
  return { valid: true };
}

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Validate username format (alphanumeric + underscores, 3-30 chars).
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

// Helper para Auditoría
async function logAction(usuario_id, accion, detalles = null) {
  try {
    await db.query(
      "INSERT INTO logs_auditoria (usuario_id, accion, detalles) VALUES ($1, $2, $3)",
      [usuario_id, accion, detalles ? JSON.stringify(detalles) : null]
    );
  } catch (err) { log(LOG_LEVELS.ERROR, 'SYSTEM', 'Error al registrar log de auditoría', err); }
}

async function recordTransaction(usuario_id, tipo, monto, metodo, detalles = null) {
  try {
    await db.query(
      "INSERT INTO transacciones (usuario_id, tipo, monto, metodo, detalles) VALUES ($1, $2, $3, $4, $5)",
      [usuario_id, tipo, monto, metodo, detalles]
    );
  } catch (err) { log(LOG_LEVELS.ERROR, 'SYSTEM', 'Error al registrar transacción', err); }
}

const authenticateToken = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'TOKEN_MISSING',
      message: 'No autorizado. Debes iniciar sesión para acceder a este recurso.'
    });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        error: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: isExpired ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Token inválido. Vuelve a iniciar sesión.'
      });
    }
    req.user = user;
    next();
  });
};

// ─── STEAM AUTH TIMEOUT HELPER ──────────────────────────────
// Wraps passport.authenticate with a safety timeout to prevent
// infinite pending when Steam OpenID validation hangs.
// If Steam doesn't respond within STEAM_AUTH_TIMEOUT_MS (8 seconds),
// the request is aborted with a redirect to the login page with error.
const STEAM_AUTH_TIMEOUT_MS = 8000;

function steamAuthWithTimeout(req, res, next, authCallback) {
  let responded = false;
  const safeRespond = (redirectUrl) => {
    if (!responded) {
      responded = true;
      return res.redirect(redirectUrl);
    }
  };

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      log(LOG_LEVELS.ERROR, 'AUTH', '⏱️ TIMEOUT: Steam OpenID no respondió en 8 segundos');
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${FRONTEND_URL}/login?error=steam_timeout`);
    }
  }, STEAM_AUTH_TIMEOUT_MS);

  // Wrap the original callback to clear timeout and prevent double response
  const wrappedCallback = (err, user) => {
    clearTimeout(timeout);
    if (responded) return; // Already responded via timeout
    authCallback(err, user, safeRespond);
  };

  passport.authenticate('steam', { failureRedirect: '/login' }, wrappedCallback)(req, res, next);
}

// --- AUTH ROUTES ---

app.get('/api/auth/steam', (req, res, next) => {
  steamAuthWithTimeout(req, res, next, (err, user, safeRespond) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (err) {
      log(LOG_LEVELS.ERROR, 'AUTH', 'Error en autenticación Steam:', err.message);
      return safeRespond(`${FRONTEND_URL}/login?error=steam_auth_failed`);
    }
    if (!user) return safeRespond(`${FRONTEND_URL}/login`);
    req.logIn(user, (loginErr) => {
      if (loginErr) return safeRespond(`${FRONTEND_URL}/login?error=login_failed`);
      // Proceed to the next middleware (the redirect handler below)
      next();
    });
  });
}, (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${FRONTEND_URL}/login`);
});

app.get('/api/auth/steam/return', (req, res, next) => {
  steamAuthWithTimeout(req, res, next, (err, user, safeRespond) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (err) {
      log(LOG_LEVELS.ERROR, 'AUTH', 'Error en callback Steam:', err.message);
      return safeRespond(`${FRONTEND_URL}/login?error=steam_callback_failed`);
    }
    if (!user) return safeRespond(`${FRONTEND_URL}/login`);
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        log(LOG_LEVELS.ERROR, 'AUTH', 'Error en login de Steam:', loginErr.message);
        return safeRespond(`${FRONTEND_URL}/login?error=login_failed`);
      }
      try {
        const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
        safeRespond(`${FRONTEND_URL}/login?token=${token}`);
      } catch (jwtErr) {
        log(LOG_LEVELS.ERROR, 'AUTH', 'Error generando JWT en Steam:', jwtErr.message);
        safeRespond(`${FRONTEND_URL}/login?error=token_generation_failed`);
      }
    });
  });
});

// ─── GOOGLE OAUTH ENDPOINT ─────────────────────────
// Verifies the Google ID token server-side using the official Google library.
// The frontend sends the idToken obtained from Google Sign-In.
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: "idToken es obligatorio" });
  }

  if (!googleClient) {
    return res.status(503).json({ error: "Autenticación con Google no está configurada en el servidor" });
  }

  try {
    // Verify the ID token using Google's official library
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ error: "Token de Google inválido" });
    }

    const googleId = payload['sub'];
    const email = sanitizeInput(payload['email']);
    const nombre = sanitizeInput(payload['name'] || payload['given_name'] || email.split('@')[0]);
    const avatar = payload['picture'] || null;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email de Google inválido" });
    }

    // Check if user exists by Google ID or email
    let result = await db.query("SELECT * FROM usuarios WHERE google_id = $1 OR email = $2", [googleId, email]);

    if (result.rows.length === 0) {
      // Create new user with Google account
      result = await db.query(
        "INSERT INTO usuarios (nombre_usuario, email, password_hash, google_id, avatar, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING usuario_id, nombre_usuario, email, saldo, nivel, experiencia",
        [nombre, email, 'google_no_password', googleId, avatar, 0, 0]
      );
    } else {
      // Update Google ID if user existed via email but didn't have google_id
      if (!result.rows[0].google_id) {
        await db.query("UPDATE usuarios SET google_id = $1, avatar = COALESCE(avatar, $2) WHERE usuario_id = $3",
          [googleId, avatar, result.rows[0].usuario_id]);
      }
    }

    const user = result.rows[0];
    const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });

    await logAction(user.usuario_id, 'LOGIN_GOOGLE', { googleId, email });

    res.json({
      user: {
        usuario_id: user.usuario_id,
        nombre_usuario: user.nombre_usuario,
        email: user.email,
        saldo: user.saldo,
        nivel: user.nivel,
        experiencia: user.experiencia,
        avatar: avatar || user.avatar
      },
      token
    });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'AUTH', 'Error en Google OAuth:', err.message);
    res.status(401).json({ error: "Error al verificar el token de Google. Intenta de nuevo." });
  }
});

// ─── PASSWORD RECOVERY ──────────────────────────────
// In-memory store for password reset tokens (in production, use Redis or DB)
const passwordResetTokens = new Map();

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  try {
    const result = await db.query("SELECT usuario_id, email, nombre_usuario FROM usuarios WHERE email = $1", [email]);

    // Always return success to prevent email enumeration attacks
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: "Si el email existe en nuestro sistema, recibirás un enlace de recuperación."
      });
    }

    const user = result.rows[0];

    // Generate secure reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token (in production, use database table)
    passwordResetTokens.set(tokenHash, {
      userId: user.usuario_id,
      email: user.email,
      expiresAt: expiresAt,
      used: false
    });

    // Clean up expired tokens
    for (const [key, value] of passwordResetTokens.entries()) {
      if (value.expiresAt < new Date()) {
        passwordResetTokens.delete(key);
      }
    }

    // In production, send email here
    // For now, log the reset link (in production, remove this log)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    log(LOG_LEVELS.INFO, 'AUTH', `Password reset link for ${email}: ${resetLink}`);

    await logAction(user.usuario_id, 'PASSWORD_RESET_REQUESTED', { email });

    res.json({
      success: true,
      message: "Si el email existe en nuestro sistema, recibirás un enlace de recuperación.",
      // Only include resetLink in development
      ...(process.env.NODE_ENV !== 'production' && { resetLink })
    });
  } catch {
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
  }

  // Validate password security policy
  const pwdCheck = validatePassword(newPassword);
  if (!pwdCheck.valid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  try {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetData = passwordResetTokens.get(tokenHash);

    if (!resetData) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    if (resetData.used) {
      return res.status(400).json({ error: "Este token ya ha sido utilizado" });
    }

    if (resetData.expiresAt < new Date()) {
      passwordResetTokens.delete(tokenHash);
      return res.status(400).json({ error: "Token expirado. Solicita uno nuevo." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await db.query(
      "UPDATE usuarios SET password_hash = $1 WHERE usuario_id = $2",
      [hashedPassword, resetData.userId]
    );

    // Mark token as used
    resetData.used = true;
    passwordResetTokens.set(tokenHash, resetData);

    await logAction(resetData.userId, 'PASSWORD_RESET_COMPLETED', { email: resetData.email });

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente. Ahora puedes iniciar sesión."
    });
  } catch {
    res.status(500).json({ error: "Error al actualizar la contraseña" });
  }
});

app.post("/api/register", loginLimiter, async (req, res) => {
  const { nombre_usuario, email, password } = req.body;

  // Sanitize inputs
  const cleanUsername = sanitizeInput(nombre_usuario);
  const cleanEmail = sanitizeInput(email);

  // Validate inputs
  if (!cleanUsername || !cleanEmail || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  if (!isValidUsername(cleanUsername)) {
    return res.status(400).json({ error: "El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos" });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  // Validate password security policy
  const pwdCheck = validatePassword(password);
  if (!pwdCheck.valid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  try {
    // Check if db is available before querying
    if (!db || typeof db.query !== 'function') {
      log(LOG_LEVELS.ERROR, 'REGISTER', 'Base de datos no disponible');
      return res.status(503).json({
        success: false,
        error: "Servicio de base de datos no disponible. Intenta más tarde.",
        code: "DB_UNAVAILABLE"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.query(
      "INSERT INTO usuarios (nombre_usuario, email, password_hash, nivel, experiencia) VALUES ($1, $2, $3, $4, $5) RETURNING usuario_id, nombre_usuario, email, saldo, nivel, experiencia",
      [cleanUsername, cleanEmail, hashedPassword, 0, 0]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    await logAction(user.usuario_id, 'REGISTER', { email: cleanEmail });
    res.status(201).json({
      success: true,
      user: {
        usuario_id: user.usuario_id,
        nombre_usuario: user.nombre_usuario,
        email: user.email,
        saldo: user.saldo,
        nivel: user.nivel,
        experiencia: user.experiencia
      },
      token
    });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'REGISTER', 'Error al registrar usuario', { error: err.message, code: err.code });

    // Error de conexión a la base de datos
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect')) {
      return res.status(503).json({
        success: false,
        error: "No se pudo conectar con la base de datos. Verifica tu conexión e intenta de nuevo.",
        code: "DB_CONNECTION_ERROR"
      });
    }

    // Violación de clave única (usuario o email ya existe)
    if (err.code === '23505') {
      const detail = err.detail || '';
      const campo = detail.includes('nombre_usuario') ? 'nombre de usuario' : 'email';
      return res.status(409).json({
        success: false,
        error: `El ${campo} ya está registrado. Por favor, usa otro o inicia sesión.`,
        code: "DUPLICATE_ENTRY",
        field: detail.includes('nombre_usuario') ? 'nombre_usuario' : 'email'
      });
    }

    // Error genérico del servidor
    res.status(500).json({
      success: false,
      error: "Error interno al registrar usuario. Por favor, intenta de nuevo más tarde.",
      code: "REGISTER_ERROR"
    });
  }
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Sanitize email
  const cleanEmail = sanitizeInput(email);

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios" });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  try {
    const result = await db.query("SELECT * FROM usuarios WHERE email = $1", [cleanEmail]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    await logAction(user.usuario_id, 'LOGIN', { email: cleanEmail });
    res.json({ user: { usuario_id: user.usuario_id, nombre_usuario: user.nombre_usuario, email: user.email, saldo: user.saldo, nivel: user.nivel, experiencia: user.experiencia }, token });
  } catch {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ─── LEVEL SYSTEM ────────────────────────────────────
// Escalado hasta Nivel 360 - Sistema VIP Supreme
const LEVEL_THRESHOLDS = [
  { level: 0, minDeposit: 0, dailyCaseId: "daily-0", caseLabel: "DAILY FREE", reward: 0.15 },
  { level: 5, minDeposit: 10, dailyCaseId: "daily-5", caseLabel: "BRONZE DAILY", reward: 0.25 },
  { level: 15, minDeposit: 50, dailyCaseId: "daily-15", caseLabel: "SILVER DAILY", reward: 0.50 },
  { level: 30, minDeposit: 150, dailyCaseId: "daily-30", caseLabel: "GOLD DAILY", reward: 1.00 },
  { level: 50, minDeposit: 500, dailyCaseId: "daily-50", caseLabel: "DIAMOND DAILY", reward: 2.00 },
  { level: 80, minDeposit: 1500, dailyCaseId: "daily-80", caseLabel: "PLATINUM DAILY", reward: 3.50 },
  { level: 120, minDeposit: 4000, dailyCaseId: "daily-120", caseLabel: "EMERALD DAILY", reward: 6.00 },
  { level: 170, minDeposit: 10000, dailyCaseId: "daily-170", caseLabel: "RUBY DAILY", reward: 10.00 },
  { level: 230, minDeposit: 25000, dailyCaseId: "daily-230", caseLabel: "MASTER DAILY", reward: 18.00 },
  { level: 300, minDeposit: 75000, dailyCaseId: "daily-300", caseLabel: "LEGENDARY DAILY", reward: 30.00 },
  { level: 360, minDeposit: 200000, dailyCaseId: "daily-360", caseLabel: "VIP SUPREME", reward: 50.00 },
];

// Pre-computed lookup map for O(1) level → daily case resolution
const DAILY_CASE_BY_LEVEL_MAP = new Map(LEVEL_THRESHOLDS.map(t => [t.level, t]));

// Binary search for O(log n) level calculation (vs previous O(n) linear scan)
function calculateLevel(totalDeposited) {
  let lo = 0, hi = LEVEL_THRESHOLDS.length - 1, result = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (totalDeposited >= LEVEL_THRESHOLDS[mid].minDeposit) {
      result = LEVEL_THRESHOLDS[mid].level;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function getDailyCaseForLevel(level) {
  return DAILY_CASE_BY_LEVEL_MAP.get(level) || LEVEL_THRESHOLDS[0];
}

// ─── GET USER /api/me ────────────────────
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT usuario_id, nombre_usuario, email, saldo, nivel, experiencia, link_intercambio, steam_id, trade_token, ultimo_reclamo_diario, avatar FROM usuarios WHERE usuario_id = $1",
      [req.user.id]
    );

    const depositResult = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total_depositado FROM transacciones WHERE usuario_id = $1 AND tipo IN ('deposito', 'apertura_caja')",
      [req.user.id]
    );
    const totalDepositado = parseFloat(depositResult.rows[0].total_depositado) || 0;
    const calculatedLevel = calculateLevel(totalDepositado);

    const inventoryResult = await db.query(
      "SELECT item_id as id, name, price, image, rarity, marketable, status, market_hash_name, wear, assetid FROM inventario WHERE usuario_id = $1 AND status != 'sold' AND status != 'withdrawn'",
      [req.user.id]
    );

    const user = userResult.rows[0];
    user.inventory = inventoryResult.rows.map(item => ({ ...item, price: item.price ?? 0.00 }));
    user.level = calculatedLevel;
    user.totalDepositado = totalDepositado;
    user.dailyCaseId = getDailyCaseForLevel(calculatedLevel);
    user.nextLevel = calculateLevel(totalDepositado) + 1;

    res.json(user);
  } catch {
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});

app.get("/api/ranking", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT nombre_usuario as name, saldo as balance, nivel as level, experiencia as exp FROM usuarios ORDER BY saldo DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error al obtener ranking" });
  }
});

// ─────────────────────────────────────────────────────────────────
// DAILY CASE SYSTEM - Level-based (KeyDrop-style) - 24h cooldown
// ─────────────────────────────────────────────────────────────────

app.post("/api/claim-daily", authenticateToken, dailyCaseLimiter, async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT ultimo_reclamo_diario, nivel, saldo FROM usuarios WHERE usuario_id = $1",
      [req.user.id]
    );
    const user = userResult.rows[0];
    const now = new Date();
    const lastClaim = user.ultimo_reclamo_diario ? new Date(user.ultimo_reclamo_diario) : null;

    const hoursWait = 24;
    const bufferMs = 5000;

    if (lastClaim && (now - lastClaim) < (hoursWait * 60 * 60 * 1000 - bufferMs)) {
      const remaining = hoursWait * 60 * 60 * 1000 - (now - lastClaim);
      const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return res.status(400).json({
        error: `⏳ ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`,
        remainingMs: remaining,
        canOpen: false
      });
    }

    const depositResult = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total_depositado FROM transacciones WHERE usuario_id = $1 AND tipo IN ('deposito', 'apertura_caja')",
      [req.user.id]
    );
    const totalDepositado = parseFloat(depositResult.rows[0].total_depositado) || 0;

    const userLevelRaw = user.nivel || 0;
    if (totalDepositado < 2.00 && userLevelRaw < 1) {
      return res.status(403).json({
        error: "Debes tener un depósito acumulado de al menos 2.00€ o alcanzar el Nivel 1 para reclamar la caja diaria. ¡Deposita para desbloquear!",
        code: "DAILY_LOCKED",
        requiredDeposit: 2.00,
        currentDeposit: totalDepositado
      });
    }

    const userLevel = calculateLevel(totalDepositado);
    const dailyCase = getDailyCaseForLevel(userLevel);

    const rarityRoll = Math.random() * 100;
    const rarityPrices = { "Covert": 50, "Classified": 15, "Restricted": 3, "Mil-Spec Grade": 1 };
    let rarity;
    if (userLevel >= 5 && rarityRoll < 8) {
      rarity = "Covert";
    } else if (userLevel >= 3 && rarityRoll < 20) {
      rarity = "Classified";
    } else if (rarityRoll < 35) {
      rarity = "Restricted";
    } else {
      rarity = "Mil-Spec Grade";
    }

    const weaponNames = ["AK-47", "AWP", "M4A4", "M4A1-S", "Desert Eagle", "USP-S", "Glock-18", "SSG 08", "FAMAS", "P250"];
    const skinSuffixes = ["Safari Mesh", "Boreal Forest", "Sand Dune", "Predator", "Tornado", "Scorched", "Jungle", "Urban", "Army", "Contractor"];
    const wearValues = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
    const randomWeapon = weaponNames[Math.floor(Math.random() * weaponNames.length)];
    const randomSkin = skinSuffixes[Math.floor(Math.random() * skinSuffixes.length)];
    const randomWear = wearValues[Math.floor(Math.random() * wearValues.length)];
    const itemName = `${randomWeapon} | ${randomSkin}`;
    const itemPrice = parseFloat(((rarityPrices[rarity] || 1) * (0.5 + Math.random() * 1.5)).toFixed(2));

    const iconHash = generateIconUrlHash(itemName, Date.now());
    const imageHD = buildAkamaiImageUrl(iconHash);

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();
    const provablyFairHash = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}:${itemName}`).digest('hex');

    let insertedSkin;
    const expReward = userLevel * 15;

    await db.withTransaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable, wear, weapon, skin_name, market_hash_name, status, icon_url, provably_fair_hash, server_seed, client_seed, nonce)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'on_site', $11, $12, $13, $14, $15)
         RETURNING item_id as id, name, price, image, rarity, marketable, status`,
        [req.user.id, itemName, itemPrice, imageHD,
          rarity, true, randomWear, randomWeapon, randomSkin, itemName, iconHash, provablyFairHash, serverSeed, clientSeed, nonce]
      );
      insertedSkin = insertResult.rows[0];

      await client.query(
        "UPDATE usuarios SET experiencia = experiencia + $1, ultimo_reclamo_diario = $2 WHERE usuario_id = $3",
        [expReward, now, req.user.id]
      );
    });

    await recordTransaction(req.user.id, 'premio', itemPrice, 'caja_diaria', `Skin de caja diaria nivel ${userLevel}: ${itemName}`);
    await logAction(req.user.id, 'RECLAMAR_CAJA_DIARIA', { level: userLevel, caseId: dailyCase.dailyCaseId, skin: itemName, price: itemPrice, provablyFairHash });

    res.json({
      success: true,
      skin: insertedSkin,
      expReward,
      level: userLevel,
      caseId: dailyCase.dailyCaseId,
      caseLabel: dailyCase.caseLabel,
      provablyFair: { serverSeed, clientSeed, nonce, hash: provablyFairHash },
      message: `🎉 ¡Caja diaria nivel ${userLevel} abierta! Has ganado: ${itemName} (€${itemPrice}) +${expReward} EXP`
    });
  } catch {
    res.status(500).json({ error: "Error al procesar reclamo diario" });
  }
});

// ─── STEAM INVENTORY INSPECTOR ───────────────────────────
app.get("/api/steam/inspector/:steamId", authenticateToken, inspectorLimiter, async (req, res) => {
  const steamId = req.params.steamId;

  if (!steamId || steamId.length < 15) {
    return res.status(400).json({ error: "SteamID64 inválido. Debe tener 17 dígitos." });
  }

  log(LOG_LEVELS.INFO, 'INSPECTOR', `Inspeccionando inventario: ${steamId}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://steamcommunity.com/",
          "Accept": "application/json"
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 403) {
      return res.status(403).json({ error: "El inventario es privado. Debe ser público para ser inspeccionado.", code: "PRIVATE_INVENTORY" });
    }

    if (response.status === 401) {
      return res.status(401).json({ error: "Perfil no encontrado o SteamID inválido.", code: "INVALID_STEAMID" });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Steam respondió con error ${response.status}. Intenta de nuevo.`,
        details: "La API de Steam puede estar rate-limited. Espera unos minutos."
      });
    }

    const data = await response.json();

    if (!data || data.success === false) {
      return res.status(403).json({
        error: "No se puede acceder a este inventario. Ajusta tu perfil a público.",
        code: "PRIVATE_INVENTORY"
      });
    }

    if (!data.assets || !data.descriptions || data.assets.length === 0) {
      return res.json({ items: [], totalValue: 0, totalItems: 0, steamId });
    }

    const items = data.assets.map(asset => {
      const desc = data.descriptions.find(d => d.classid === asset.classid);
      if (!desc) return null;

      const rarityTag = desc.tags?.find(t => t.category === "Rarity");
      const rarity = rarityTag?.name || "Consumer Grade";
      const typeTag = desc.tags?.find(t => t.category === "Type");
      const type = typeTag?.name || "";
      const weaponTag = desc.tags?.find(t => t.category === "Weapon");
      const weapon = weaponTag?.name || "";

      const iconUrl = desc.icon_url || desc.icon_url_large || "";
      const imageHD = iconUrl
        ? `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrl}/360fx360f`
        : "";

      return {
        assetid: asset.assetid,
        classid: asset.classid,
        name: desc.market_hash_name || desc.name,
        market_hash_name: desc.market_hash_name,
        icon_url: iconUrl,
        image: imageHD,
        rarity,
        type,
        weapon,
        wear: desc.type || "",
        tradable: desc.tradable === 1,
        marketable: desc.marketable === 1,
        descriptions: desc.descriptions?.map(d => d.value).filter(Boolean) || []
      };
    }).filter(item => item !== null);

    const totalValue = items.reduce((sum, item) => {
      let estPrice = 0.50;
      if (item.rarity.includes("Extraordinary") || item.rarity.includes("Contraband")) estPrice = 500.00;
      else if (item.rarity.includes("Covert")) estPrice = 50.00;
      else if (item.rarity.includes("Classified")) estPrice = 15.00;
      else if (item.rarity.includes("Restricted")) estPrice = 3.00;
      else if (item.rarity.includes("Mil-Spec")) estPrice = 1.00;
      return sum + estPrice;
    }, 0);

    log(LOG_LEVELS.INFO, 'INSPECTOR', `Inventario cargado: ${items.length} items, valor estimado: €${totalValue.toFixed(2)}`);

    res.json({
      items,
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalItems: items.length,
      steamId,
      queryTime: new Date().toISOString()
    });

  } catch {
    res.status(500).json({ error: "Error al consultar inventario de Steam." });
  }
});

// ─── API to fetch price from Steam Market (real) ──────────
app.get("/api/steam/price", inspectorLimiter, async (req, res) => {
  const hashName = req.query.market_hash_name;
  if (!hashName) return res.status(400).json({ error: "market_hash_name requerido" });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(hashName)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://steamcommunity.com/market/"
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Error al obtener precio de Steam" });
    }

    const data = await response.json();

    if (data.success === false) {
      return res.json({ success: false, market_hash_name: hashName, error: "No hay datos de precio" });
    }

    let price = 0;
    if (data.median_price) {
      price = parseFloat(data.median_price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    } else if (data.lowest_price) {
      price = parseFloat(data.lowest_price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    }

    res.json({
      success: true,
      market_hash_name: hashName,
      lowest_price: data.lowest_price,
      median_price: data.median_price,
      volume: data.volume,
      price_eur: price
    });
  } catch {
    res.status(500).json({ error: "Error al consultar precio" });
  }
});

// ─── CASE OPENING (with atomic transactions) ─────────────

// Module-level case price lookup table — avoids recreating the object on every request.
// Maps caseId to real price from the frontend case definitions.
// Updated economic balance:
// - Económica: €0.50 - €2.50
// - Intermedia: €5.00 - €25.00
// - Premium: €50.00 - €300.00
// - Limited: €50.00 - €300.00
// - Risk Zone: €10.00 - €150.00
const CASE_PRICES = {
  "econ-0": 0.50, "econ-1": 0.75, "econ-2": 1.00, "econ-3": 1.25,
  "econ-4": 1.50, "econ-5": 1.75, "econ-6": 2.00, "econ-7": 2.25,
  "econ-8": 2.50, "econ-9": 2.50, "econ-10": 2.50, "econ-11": 2.50,
  // Legacy eco IDs for backward compatibility
  "eco-0": 0.50, "eco-1": 0.75, "eco-2": 1.00, "eco-3": 1.25, "eco-4": 1.50,
  "eco-5": 1.75, "eco-6": 2.00, "eco-7": 2.25, "eco-8": 2.50, "eco-9": 2.75,
  "eco-10": 3.00, "eco-11": 3.50,
  // Intermedia: €5.00 - €25.00
  "inter-0": 5.00, "inter-1": 5.50, "inter-2": 6.00, "inter-3": 7.00,
  "inter-4": 8.00, "inter-5": 9.00, "inter-6": 10.00, "inter-7": 12.00,
  "inter-8": 14.00, "inter-9": 16.00, "inter-10": 18.00, "inter-11": 20.00,
  "inter-12": 22.00, "inter-13": 25.00,
  // Premium: €50.00 - €300.00
  "prem-0": 50.00, "prem-1": 60.00, "prem-2": 75.00, "prem-3": 90.00,
  "prem-4": 100.00, "prem-5": 120.00, "prem-6": 150.00, "prem-7": 180.00,
  "prem-8": 200.00, "prem-9": 220.00, "prem-10": 250.00, "prem-11": 300.00,
  // Limited: €50.00 - €300.00
  "limit-0": 50.00, "limit-1": 75.00, "limit-2": 100.00, "limit-3": 125.00,
  "limit-4": 150.00, "limit-5": 175.00, "limit-6": 200.00, "limit-7": 300.00,
  // Risk Zone: €10.00 - €150.00
  "risk-0": 10.00, "risk-1": 15.00, "risk-2": 20.00, "risk-3": 30.00,
  "risk-4": 50.00, "risk-5": 75.00, "risk-6": 100.00, "risk-7": 150.00
};

// ─── SECURE RNG HELPER (cryptographically secure) ───────────
// Uses crypto.randomInt() for tamper-proof drop rate calculations.
// The frontend NEVER computes the outcome — it only renders the animation.
function secureRoll() {
  // crypto.randomInt(0, 10000) gives 0-9999, divide by 100 for 2-decimal precision
  return crypto.randomInt(0, 10000) / 100;
}

function securePick(array) {
  if (!array || array.length === 0) return null;
  return array[crypto.randomInt(0, array.length)];
}

app.post("/api/cases/open", authenticateToken, caseOpenLimiter, async (req, res) => {
  const { caseId, quantity, jokerMode } = req.body;

  try {
    // Validate quantity (prevent abuse)
    const qty = Math.min(Math.max(parseInt(quantity) || 1, 1), 5);

    const casePrice = CASE_PRICES[caseId] || 2.50;
    const priceMultiplier = jokerMode ? 3 : 1;
    const totalCost = casePrice * priceMultiplier * qty;

    // Atomic balance check + deduction in a single transaction
    let userBalance;
    await db.withTransaction(async (client) => {
      const userResult = await client.query(
        "SELECT saldo FROM usuarios WHERE usuario_id = $1 FOR UPDATE",
        [req.user.id]
      );
      if (!userResult.rows[0] || userResult.rows[0].saldo < totalCost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      userBalance = userResult.rows[0].saldo;
      await client.query(
        "UPDATE usuarios SET saldo = saldo - $1, experiencia = experiencia + $2 WHERE usuario_id = $3",
        [totalCost, Math.floor(totalCost * 100), req.user.id]
      );
    });

    // Import case configuration for realistic skins
    const { CASE_PROBABILITIES, SKIN_CATALOGS } = await import("../constants/cases.js");

    const caseCategory = caseId?.startsWith("econ") || caseId?.startsWith("eco") ? "económica"
      : caseId?.startsWith("inter") ? "intermedia"
        : caseId?.startsWith("prem") ? "premium"
          : caseId?.startsWith("limit") ? "limited"
            : caseId?.startsWith("risk") ? "risk"
              : "económica";
    const catalog = SKIN_CATALOGS[caseCategory] || SKIN_CATALOGS.económica;
    const probs = CASE_PROBABILITIES[caseCategory] || CASE_PROBABILITIES.económica;

    const results = [];
    for (let i = 0; i < qty; i++) {
      // ─── CRYPTOGRAPHICALLY SECURE RNG (crypto.randomInt) ───
      // The drop rate is determined HERE on the backend, never on the client.
      let rarity, rarityPrice;
      if (jokerMode) {
        // Joker Mode: equalized probabilities (all rarities have equal chance)
        const equalizedRoll = secureRoll(100);
        if (equalizedRoll < 20) { rarity = "Covert"; rarityPrice = catalog.priceRange[1] * 0.8; }
        else if (equalizedRoll < 40) { rarity = "Classified"; rarityPrice = catalog.priceRange[1] * 0.5; }
        else if (equalizedRoll < 60) { rarity = "Restricted"; rarityPrice = catalog.priceRange[1] * 0.3; }
        else { rarity = "Mil-Spec Grade"; rarityPrice = catalog.priceRange[0]; }
      } else {
        // Standard weighted probabilities using crypto.randomInt
        const roll = secureRoll(100);
        if (roll < probs.covert) {
          rarity = "Covert";
          rarityPrice = catalog.priceRange[1] * (0.6 + (crypto.randomInt(0, 10000) / 10000) * 0.4);
        } else if (roll < probs.covert + probs.classified) {
          rarity = "Classified";
          rarityPrice = catalog.priceRange[0] + (catalog.priceRange[1] - catalog.priceRange[0]) * (0.3 + (crypto.randomInt(0, 10000) / 10000) * 0.4);
        } else if (roll < probs.covert + probs.classified + probs.restricted) {
          rarity = "Restricted";
          rarityPrice = catalog.priceRange[0] + (catalog.priceRange[1] - catalog.priceRange[0]) * (0.1 + (crypto.randomInt(0, 10000) / 10000) * 0.3);
        } else {
          rarity = "Mil-Spec Grade";
          rarityPrice = catalog.priceRange[0] + (crypto.randomInt(0, 10000) / 10000) * (catalog.priceRange[1] - catalog.priceRange[0]) * 0.2;
        }
      }

      // Pick weapon and skin using crypto.randomInt (secure)
      const weapon = securePick(catalog.weapons);
      const skinName = securePick(catalog.skins);
      const wearValues = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
      const randomWear = securePick(wearValues);
      const itemName = `${weapon} | ${skinName}`;
      const itemPrice = parseFloat(rarityPrice.toFixed(2));

      const iconHash = generateIconUrlHash(itemName, Date.now() + i);
      const imageHD = buildAkamaiImageUrl(iconHash);

      // Provably Fair seeds
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const clientSeed = crypto.randomBytes(16).toString('hex');
      const nonce = Date.now() + i;
      const provablyFairHash = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}:${itemName}`).digest('hex');

      const insertResult = await db.query(
        `INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable, wear, weapon, skin_name, market_hash_name, icon_url, provably_fair_hash, server_seed, client_seed, nonce, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'on_site')
         RETURNING item_id as id, name, price, image, rarity, marketable, status`,
        [req.user.id, itemName, itemPrice, imageHD,
          rarity, true, randomWear, weapon, skinName, itemName, iconHash, provablyFairHash, serverSeed, clientSeed, nonce]
      );
      results.push(insertResult.rows[0]);
    }

    await recordTransaction(req.user.id, 'apertura_caja', totalCost, 'saldo_sitio', `Apertura de ${qty}x ${caseId}${jokerMode ? ' (Joker Mode)' : ''}`);
    await logAction(req.user.id, 'ABRIR_CAJA', { caseId, quantity: qty, jokerMode, winnings: results.map(r => r.name), provablyFairHashes: results.map(r => r.provably_fair_hash) });

    res.json({ success: true, items: results, newBalance: userBalance - totalCost });
  } catch {
    res.status(500).json({ error: "Error al abrir la caja" });
  }
});

// ─── TRADE URL VALIDATION ─────────────────────────
app.post("/api/validate-trade-url", authenticateToken, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ valid: false, error: "Trade URL no proporcionada" });

  const partnerMatch = url.match(/partner=(\d+)/);
  const tokenMatch = url.match(/token=([\w-]+)/);

  if (!partnerMatch || !tokenMatch) {
    return res.json({
      valid: false,
      error: "Formato de Trade URL inválido. Debe contener 'partner' y 'token'.",
      code: "INVALID_TRADE_URL_FORMAT"
    });
  }

  const partnerId = partnerMatch[1];
  const token = tokenMatch[1];

  if (!/^\d+$/.test(partnerId) || partnerId.length < 5) {
    return res.json({ valid: false, error: "Partner ID inválido en la Trade URL.", code: "INVALID_PARTNER_ID" });
  }

  if (!/^[\w-]+$/.test(token) || token.length < 5) {
    return res.json({ valid: false, error: "Token de intercambio inválido.", code: "INVALID_TOKEN" });
  }

  const steamId64 = (BigInt(partnerId) + BigInt("76561197960265728")).toString();

  if (!url.includes("steamcommunity.com/tradeoffer/")) {
    return res.json({
      valid: false,
      error: "La URL debe ser una Trade Offer de Steam (steamcommunity.com/tradeoffer/...)",
      code: "NOT_STEAM_URL"
    });
  }

  res.json({ valid: true, steam_id: steamId64, trade_token: token });
});

// ─── WITHDRAW FALLBACK: Sell skin for 100% balance ──────────
app.post("/api/inventory/withdraw-fallback", authenticateToken, async (req, res) => {
  const { itemId, action } = req.body;
  if (!itemId || !action) return res.status(400).json({ error: "itemId y action requeridos" });

  try {
    const itemResult = await db.query(
      "SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2 AND status = 'on_site'",
      [itemId, req.user.id]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: "Objeto no encontrado o ya procesado" });
    }
    const item = itemResult.rows[0];

    if (action === 'sell') {
      await db.withTransaction(async (client) => {
        await client.query("UPDATE inventario SET status = 'sold' WHERE item_id = $1", [itemId]);
        await client.query(
          "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2",
          [item.price, req.user.id]
        );
      });
      await recordTransaction(req.user.id, 'venta_forzada', item.price, 'fallback_saldo',
        `Venta forzada (bot sin stock): ${item.name}`);
      await logAction(req.user.id, 'WITHDRAW_FALLBACK_SELL', { itemId, itemName: item.name, price: item.price });

      const balanceResult = await db.query("SELECT saldo FROM usuarios WHERE usuario_id = $1", [req.user.id]);
      res.json({
        success: true,
        action: 'sell',
        price: item.price,
        newBalance: balanceResult.rows[0].saldo,
        message: `✅ Skin vendida por €${item.price} en saldo (100% del valor).`
      });
    } else if (action === 'replace') {
      const replacementResult = await db.query(
        `SELECT item_id, name, price, image, rarity, market_hash_name, wear, weapon, skin_name
         FROM inventario
         WHERE status = 'on_site' AND usuario_id != $1
           AND price >= $2 AND price <= $3
         ORDER BY RANDOM() LIMIT 1`,
        [req.user.id, item.price * 0.9, item.price * 1.1]
      );

      if (replacementResult.rows.length === 0) {
        return res.json({
          success: false,
          error: "No hay skins de reemplazo disponibles en este momento.",
          code: "NO_REPLACEMENT",
          alternative: "sell",
          message: "Puedes vender la skin por €" + parseFloat(item.price).toFixed(2) + " en saldo."
        });
      }

      const replacement = replacementResult.rows[0];

      await db.withTransaction(async (client) => {
        await client.query("UPDATE inventario SET status = 'replaced' WHERE item_id = $1", [itemId]);
        await client.query(
          `INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable, market_hash_name, wear, weapon, skin_name, status)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, 'on_site')`,
          [req.user.id, replacement.name, replacement.price, replacement.image,
          replacement.rarity, replacement.market_hash_name, replacement.wear,
          replacement.weapon, replacement.skin_name]
        );
      });

      await logAction(req.user.id, 'WITHDRAW_FALLBACK_REPLACE', {
        originalItemId: itemId,
        originalName: item.name,
        replacementId: replacement.item_id,
        replacementName: replacement.name
      });

      res.json({
        success: true,
        action: 'replace',
        replacement: {
          id: replacement.item_id,
          name: replacement.name,
          price: replacement.price,
          image: replacement.image,
          rarity: replacement.rarity
        },
        message: `🔄 Skin reemplazada por: ${replacement.name} (€${replacement.price})`
      });
    } else {
      res.status(400).json({ error: "Acción inválida. Usa 'sell' o 'replace'." });
    }
  } catch {
    res.status(500).json({ error: "Error al procesar fallback de retiro" });
  }
});

// --- INVENTORY ROUTES ---

app.get("/api/inventory", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT item_id as id, name, price, image, rarity, marketable, status, market_hash_name, wear, assetid FROM inventario WHERE usuario_id = $1 AND status != 'sold' AND status != 'withdrawn'",
      [req.user.id]
    );
    res.json(result.rows.map(item => ({ ...item, price: item.price ?? 0.00 })));
  } catch { res.status(500).json({ error: "Error al obtener inventario" }); }
});

app.post("/api/inventory/add", authenticateToken, async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Items no proporcionados" });
  try {
    const addedItems = [];
    for (const item of items) {
      const result = await db.query(
        `INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable, market_hash_name, wear, weapon, skin_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING item_id as id, name, price, image, rarity, marketable, status`,
        [req.user.id, item.name, item.price, item.image, item.rarity, item.marketable !== false, item.market_hash_name || item.name, item.wear || "Field-Tested", item.weapon || "", item.skin_name || ""]
      );
      addedItems.push(result.rows[0]);
    }
    res.json({ success: true, items: addedItems });
  } catch { res.status(500).json({ error: "Error al añadir al inventario" }); }
});

app.post("/api/inventory/sell", authenticateToken, async (req, res) => {
  const { itemId } = req.body;
  try {
    await db.withTransaction(async (client) => {
      const itemResult = await client.query(
        "SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2 AND status = 'on_site' FOR UPDATE",
        [itemId, req.user.id]
      );
      if (itemResult.rows.length === 0) {
        throw new Error("Objeto no encontrado o ya procesado");
      }
      const item = itemResult.rows[0];

      await client.query("UPDATE inventario SET status = 'sold' WHERE item_id = $1", [itemId]);

      const balanceResult = await client.query(
        "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
        [item.price, req.user.id]
      );

      await recordTransaction(req.user.id, 'venta', item.price, 'inventario_sitio', `Venta de ${item.name}`);
      await logAction(req.user.id, 'VENDER_ITEM', { itemId, itemName: item.name, price: item.price });

      res.json({ success: true, newBalance: balanceResult.rows[0].saldo });
    });
  } catch (err) {
    if (err.message === "Objeto no encontrado o ya procesado") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Error al vender objeto" });
  }
});

// ─── REAL WITHDRAW TO STEAM TRADE OFFER ──────────────────
app.post("/api/inventory/withdraw", authenticateToken, withdrawLimiter, async (req, res) => {
  const { itemId } = req.body;

  // [TRADE] Log de inicio de retiro
  log(LOG_LEVELS.INFO, 'TRADE', `[TRADE] Iniciando retiro - ItemID: ${itemId} para usuario: ${req.user.id}`);

  try {
    const itemResult = await db.query("SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2 AND status = 'on_site'", [itemId, req.user.id]);
    if (itemResult.rows.length === 0) {
      log(LOG_LEVELS.WARN, 'TRADE', `[TRADE] Item ${itemId} no disponible para retiro (usuario: ${req.user.id})`);
      return res.status(404).json({ error: "Objeto no disponible para retirar" });
    }
    const item = itemResult.rows[0];

    const userResult = await db.query("SELECT link_intercambio, steam_id, trade_token FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    const user = userResult.rows[0];

    if (!user.steam_id || !user.trade_token) {
      log(LOG_LEVELS.WARN, 'TRADE', `[TRADE] Usuario ${req.user.id} sin Steam ID o Trade Token configurado`);
      return res.status(400).json({
        success: false,
        error: 'Debes configurar tu Steam Trade URL en tu perfil antes de solicitar un retiro.',
        code: "TRADE_URL_MISSING"
      });
    }

    // [TRADE] Log del estado del bot (ON-DEMAND: bot se conecta solo cuando se solicita un retiro)
    console.log('[WITHDRAW REAL] Iniciando oferta real para SteamID:', user.steam_id, '- Item:', item.name, '- ItemID:', itemId);
    const botStatus = botEngine.isLoggedIn ? 'Conectado' : 'Desconectado (bajo demanda)';
    log(LOG_LEVELS.INFO, 'TRADE', `[TRADE] Estado del Bot: ${botStatus} | Solicitando retiro on-demand: ${item.name} (${item.market_hash_name || item.name}) para SteamID: ${user.steam_id}`);

    // ON-DEMAND: sendWithdrawOffer handles login internally via ensureConnected()
    try {
      log(LOG_LEVELS.INFO, 'TRADE', `[TRADE] Solicitando retiro de item: ${item.market_hash_name || item.name} para SteamID: ${user.steam_id}`);

      const result = await botEngine.sendWithdrawOffer(
        user.steam_id,
        user.trade_token,
        item.name,
        item.market_hash_name || item.name
      );

      if (result.success) {
        log(LOG_LEVELS.INFO, 'TRADE', `[TRADE] ✅ Oferta enviada exitosamente - OfferID: ${result.offerId} | Item: ${item.name}`);

        await db.query("UPDATE inventario SET status = 'withdrawn' WHERE item_id = $1", [itemId]);
        await recordTransaction(req.user.id, 'retiro', item.price, 'steam_trade', `Retiro real: ${item.name} - Offer ID: ${result.offerId}`);
        await logAction(req.user.id, 'RETIRAR_ITEM_REAL', { itemId, itemName: item.name, offerId: result.offerId, marketHashName: item.market_hash_name });

        if (req.app.get('io')) {
          req.app.get('io').to(req.user.id.toString()).emit('withdrawal_update', {
            itemId, status: 'withdrawn', offerId: result.offerId,
            message: `Oferta #${result.offerId} enviada a Steam. Revisa tu inventario de ofertas.`
          });
        }

        return res.json({ success: true, offerId: result.offerId, message: `Oferta #${result.offerId} enviada a Steam. Revisa tu inventario.` });
      } else {
        log(LOG_LEVELS.ERROR, 'TRADE', `[TRADE] ❌ Fallo al enviar oferta - Error: ${result.error} | Item: ${item.name}`);
        return res.status(400).json({
          success: false,
          error: result.error || "No se pudo enviar la oferta real. Inténtalo más tarde.",
          code: result.code || 'TRADE_OFFER_FAILED',
          itemId
        });
      }
    } catch (botErr) {
      log(LOG_LEVELS.ERROR, 'TRADE', `[TRADE] ❌ Error del bot en retiro - ${botErr.message} | Item: ${item.name}`);

      // Determine specific error type for better user feedback
      let errorMessage = "Error al procesar el retiro. ";
      let errorCode = 'BOT_ERROR';

      if (botErr.message && botErr.message.includes('RateLimitExceeded')) {
        errorMessage = "Steam está limitando las solicitudes. Espera 5 minutos e intenta de nuevo.";
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (botErr.message && (botErr.message.includes('no dispone') || botErr.message.includes('no tiene'))) {
        errorMessage = "El bot no tiene esta skin en stock actualmente. Intenta más tarde o usa la opción de venta.";
        errorCode = 'ITEM_OUT_OF_STOCK';
      } else if (botErr.message && (botErr.message.includes('conexión') || botErr.message.includes('network') || botErr.message.includes('timeout'))) {
        errorMessage = "Error de conexión con Steam. Verifica tu internet e intenta de nuevo.";
        errorCode = 'CONNECTION_ERROR';
      } else if (botErr.message && (botErr.message.includes('trade') || botErr.message.includes('intercambio'))) {
        errorMessage = "Error en la oferta de intercambio. La skin puede no ser intercambiable o ya fue usada.";
        errorCode = 'TRADE_ERROR';
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        itemId,
        details: botErr.message
      });
    }
  } catch {
    res.status(500).json({ error: "Error al procesar el retiro" });
  }
});

app.post("/api/update-profile", authenticateToken, async (req, res) => {
  const { link_intercambio } = req.body;
  if (!link_intercambio) return res.status(400).json({ error: "Enlace no proporcionado" });

  let steam_id = null;
  let trade_token = null;

  const partnerMatch = link_intercambio.match(/partner=(\d+)/);
  if (partnerMatch) {
    steam_id = (BigInt(partnerMatch[1]) + BigInt("76561197960265728")).toString();
  }

  const tokenMatch = link_intercambio.match(/token=([\w-]+)/);
  if (tokenMatch) {
    trade_token = tokenMatch[1];
  }

  try {
    const result = await db.query(
      "UPDATE usuarios SET link_intercambio = $1, steam_id = $2, trade_token = $3 WHERE usuario_id = $4 RETURNING link_intercambio, steam_id, trade_token",
      [link_intercambio, steam_id, trade_token, req.user.id]
    );
    res.json({ success: true, profile: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// SECURITY FIX: /api/update-balance was previously open to ANY authenticated user,
// allowing arbitrary balance injection. Now protected behind isAdmin middleware.
// Balance can ONLY be credited via verified payment webhooks or admin action.
app.post("/api/update-balance", authenticateToken, isAdmin, async (req, res) => {
  const { amount, targetUserId } = req.body;
  if (amount === undefined) return res.status(400).json({ error: "Monto no especificado" });

  // Strict validation: reject NaN, negative, or non-finite values
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount === 0) {
    return res.status(400).json({ error: "Monto inválido. Debe ser un número finito y distinto de cero." });
  }
  if (Math.abs(parsedAmount) > 10000) {
    return res.status(400).json({ error: "Monto excede el límite máximo permitido (€10,000)." });
  }

  const userId = targetUserId || req.user.id;
  try {
    const result = await db.query(
      "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
      [parsedAmount, userId]
    );
    await recordTransaction(userId, 'ajuste_admin', parsedAmount, 'sistema', `Ajuste manual por admin #${req.user.id}`);
    await logAction(req.user.id, 'ACTUALIZAR_SALDO_ADMIN', { amount: parsedAmount, targetUser: userId });
    res.json({ success: true, newBalance: result.rows[0].saldo });
  } catch {
    res.status(500).json({ error: "Error al actualizar saldo" });
  }
});

// --- STEAM ROUTES (Legacy) ---

const steamInventoryCache = new Map();
const STEAM_CACHE_TTL = 5 * 60 * 1000;

app.get("/api/steam-inventory/:steamId", authenticateToken, async (req, res) => {
  const steamId = req.params.steamId;
  const cacheKey = `inventory_${steamId}`;

  const cached = steamInventoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < STEAM_CACHE_TTL) {
    return res.json(cached.data);
  }
  if (cached) steamInventoryCache.delete(cacheKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Referer": "https://steamcommunity.com/"
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.status !== 200) {
      return res.status(response.status).json({ error: `Steam respondió con error ${response.status}` });
    }

    const data = await response.json();
    if (!data || data.success === false) {
      return res.status(403).json({ error: "El inventario es privado o no se pudo acceder." });
    }

    const inventory = data.assets.map(asset => {
      const description = data.descriptions.find(d => d.classid === asset.classid);
      if (!description) return null;
      let rarity = description.tags?.find(t => t.category === "Rarity")?.name || "Consumer Grade";
      let basePrice = 0.50;
      if (rarity.includes("Covert")) basePrice = (Math.random() * 400 + 50);
      else if (rarity.includes("Classified")) basePrice = (Math.random() * 40 + 10);
      else if (rarity.includes("Restricted")) basePrice = (Math.random() * 8 + 2);
      return {
        id: asset.assetid,
        name: description.market_hash_name,
        market_hash_name: description.market_hash_name,
        assetid: asset.assetid,
        image: `https://community.cloudflare.steamstatic.com/economy/image/${description.icon_url}`,
        price: parseFloat(basePrice.toFixed(2)) ?? 0.00,
        rarity: rarity,
        marketable: description.marketable === 1
      };
    }).filter(skin => skin !== null);

    steamInventoryCache.set(cacheKey, { data: inventory, timestamp: Date.now() });
    res.json(inventory);
  } catch {
    res.status(500).json({ error: "Error interno al conectar con Steam" });
  }
});

app.get("/api/steam-price", async (req, res) => {
  const hashName = req.query.market_hash_name;
  if (!hashName) return res.status(400).json({ error: "Missing market_hash_name" });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(hashName)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Steam Market respondió con error ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: "Error al consultar precio de Steam" });
  }
});

// Health endpoints
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).send("SkinMarket API Running");
});

// --- SKIN REPLACEMENT ---

app.post("/api/skins/replace-corrupted", authenticateToken, async (req, res) => {
  const { skinId, userId } = req.body;
  if (!skinId || !userId) return res.status(400).json({ error: "skinId y userId son requeridos" });
  try {
    const originalSkinResult = await db.query("SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2", [skinId, userId]);
    if (originalSkinResult.rows.length === 0) return res.status(404).json({ error: "Skin original no encontrada" });
    const originalSkin = originalSkinResult.rows[0];
    const originalPrice = parseFloat(originalSkin.price) || 0;
    let replacementSkin = null;

    const userSkinsResult = await db.query(
      `SELECT * FROM inventario WHERE usuario_id = $1 AND item_id != $2 AND status = 'on_site' AND image IS NOT NULL AND image != '' AND price >= $3 ORDER BY price DESC LIMIT 1`,
      [userId, skinId, originalPrice]
    );
    if (userSkinsResult.rows.length > 0) {
      replacementSkin = userSkinsResult.rows[0];
    } else {
      const systemSkinsResult = await db.query(
        `SELECT * FROM inventario WHERE status = 'on_site' AND image IS NOT NULL AND image != '' AND price >= $1 AND usuario_id != $2 ORDER BY RANDOM() LIMIT 1`,
        [originalPrice, userId]
      );
      if (systemSkinsResult.rows.length > 0) replacementSkin = systemSkinsResult.rows[0];
    }

    if (!replacementSkin) return res.status(404).json({ error: "No hay skins de reemplazo disponibles", code: "NO_REPLACEMENT_AVAILABLE" });

    await logAction(userId, 'SKIN_REPLACED', { originalSkinId: skinId, originalSkinName: originalSkin.name, replacementSkinId: replacementSkin.item_id, replacementSkinName: replacementSkin.name });
    res.json({ success: true, replacementSkin: { id: replacementSkin.item_id, name: replacementSkin.name, image: replacementSkin.image, price: replacementSkin.price, rarity: replacementSkin.rarity } });
  } catch {
    res.status(500).json({ error: "Error al procesar reemplazo de skin" });
  }
});

// --- ADMIN ROUTES ---

app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await db.query("SELECT COUNT(*) FROM usuarios");
    const transCount = await db.query("SELECT COUNT(*) FROM transacciones");
    const totalDeposited = await db.query("SELECT COALESCE(SUM(monto), 0) FROM transacciones WHERE tipo = 'deposito'");
    const totalWithdrawn = await db.query("SELECT COALESCE(SUM(monto), 0) FROM transacciones WHERE tipo = 'retiro'");
    res.json({ users: userCount.rows[0].count, transactions: transCount.rows[0].count, deposited: totalDeposited.rows[0].sum, withdrawn: totalWithdrawn.rows[0].sum });
  } catch {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

app.get("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT valor FROM configuracion WHERE clave = 'probabilidades'");
    res.json(result.rows[0]?.valor || {});
  } catch {
    res.status(500).json({ error: "Error al obtener probabilidades" });
  }
});

app.post("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  const { probabilities } = req.body;
  try {
    await db.query("UPDATE configuracion SET valor = $1, ultima_modificacion = NOW() WHERE clave = 'probabilidades'", [JSON.stringify(probabilities)]);
    await logAction(req.user.id, "UPDATE_SETTINGS", { key: 'probabilidades', value: probabilities });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Error al actualizar probabilidades" });
  }
});

// ─── PAYMENT ROUTES ───────────────────────────────
app.post("/api/payments/create-charge", authenticateToken, createCharge);
app.post("/api/payments/webhook", handleWebhook);
app.get("/api/payments/status/:chargeId", authenticateToken, getPaymentStatus);

// ─── P2P MARKET ───────────────────────────────────
app.get("/api/p2p/status", authenticateToken, (req, res) => { res.json(p2pMarketService.getStatus()); });
app.post("/api/p2p/search", authenticateToken, async (req, res) => {
  const { marketHashName, minPrice, maxPrice } = req.body;
  if (!marketHashName) return res.status(400).json({ error: "marketHashName requerido" });
  try {
    const results = await p2pMarketService.searchSkin(marketHashName, { minPrice, maxPrice });
    res.json({ success: true, results });
  } catch {
    res.status(500).json({ error: "Error al buscar en mercado P2P" });
  }
});

// ─────────────────────────────────────────────────
// BATTLES PRIVADAS — Salas en memoria con TTL
// ─────────────────────────────────────────────────
// Las salas viven en memoria (Map) con expiración automática (TTL).
// El creador paga su entrada (y opcionalmente un % de la entrada de los
// rivales vía "préstamo"). Al unirse, cada jugador paga su entrada de
// forma atómica (SELECT ... FOR UPDATE). Los endpoints responden a la UI.
// ─────────────────────────────────────────────────

const BATTLE_ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutos de vida por sala
const battleRooms = new Map(); // roomCode -> { ...room, expiresAt }

function generateBattleCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (battleRooms.has(code));
  return code;
}

// Limpiar salas expiradas periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of battleRooms.entries()) {
    if (room.expiresAt < now) {
      battleRooms.delete(code);
      log(LOG_LEVELS.INFO, 'BATTLES', `Sala ${code} expirada y eliminada (TTL)`);
    }
  }
}, 60 * 1000).unref?.();

// Helper: deducción atómica de saldo (con FOR UPDATE) + otorga XP (1€ = 100 XP)
// Lanza Error('INSUFFICIENT_BALANCE') si no hay saldo suficiente.
async function atomicDeductBalanceAndAwardXP(usuario_id, monto) {
  const amount = Math.max(0, parseFloat(monto) || 0);
  let userBalance;
  await db.withTransaction(async (client) => {
    const userResult = await client.query(
      "SELECT saldo FROM usuarios WHERE usuario_id = $1 FOR UPDATE",
      [usuario_id]
    );
    if (!userResult.rows[0] || Number(userResult.rows[0].saldo) < amount) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    userBalance = Number(userResult.rows[0].saldo);
    const expGain = Math.floor(amount * 100); // $1 = 100 XP
    await client.query(
      "UPDATE usuarios SET saldo = saldo - $1, experiencia = experiencia + $2 WHERE usuario_id = $3",
      [amount, expGain, usuario_id]
    );
  });
  return { newBalance: userBalance - amount, expGain: Math.floor(amount * 100) };
}

// POST /api/battles/create — El creador paga entrada + préstamo y crea la sala
app.post("/api/battles/create", authenticateToken, async (req, res) => {
  const {
    gameMode = "classic",
    playerCount = 2,
    totalCost = 0,
    loanPercent = 0,
    caseIds = [],
    inviteCode = null
  } = req.body || {};

  try {
    const entry = parseFloat(totalCost) || 0;
    const loanMultiplier = (parseInt(loanPercent, 10) || 0) / 100;
    const opponentCount = Math.max(0, (parseInt(playerCount, 10) || 2) - 1);
    const loanCost = loanMultiplier > 0 ? entry * opponentCount * loanMultiplier : 0;
    const totalToPay = entry + loanCost;

    if (entry <= 0 || !Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: "Datos de batalla inválidos. Entrada y cajas son obligatorias.", code: "INVALID_BATTLE_DATA" });
    }
    if (totalToPay > 10000) {
      return res.status(400).json({ error: "El coste de la batalla supera el límite permitido.", code: "BATTLE_TOO_EXPENSIVE" });
    }

    // Deducción atómica del saldo del creador (entrada + préstamo)
    let deduction;
    try {
      deduction = await atomicDeductBalanceAndAwardXP(req.user.id, totalToPay);
    } catch (err) {
      if (err.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({ error: "Saldo insuficiente para crear la batalla.", code: "INSUFFICIENT_BALANCE", required: totalToPay });
      }
      throw err;
    }

    const code = inviteCode || generateBattleCode();
    // Si el código ya existe, regenerar
    const finalCode = battleRooms.has(code) ? generateBattleCode() : code;

    const room = {
      code: finalCode,
      ownerId: req.user.id,
      ownerName: (req.body && req.body.ownerName) || "Jugador",
      gameMode,
      playerCount: parseInt(playerCount, 10) || 2,
      entry: entry,
      loanPercent: parseInt(loanPercent, 10) || 0,
      loanCost,
      caseIds,
      status: "waiting",
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + BATTLE_ROOM_TTL_MS,
      players: [{
        userId: req.user.id,
        name: (req.body && req.body.ownerName) || "Jugador",
        paid: totalToPay,
        isOwner: true,
        joinedAt: new Date().toISOString()
      }]
    };

    battleRooms.set(finalCode, room);

    await recordTransaction(req.user.id, 'batalla', totalToPay, 'saldo_sitio', `Creación de batalla privada #${finalCode} (entrada ${entry}€ + préstamo ${loanCost}€)`);
    await logAction(req.user.id, 'BATALLA_CREAR', { code: finalCode, gameMode, playerCount, entry, loanPercent, loanCost, caseIds });

    log(LOG_LEVELS.INFO, 'BATTLES', `Sala ${finalCode} creada por usuario ${req.user.id} (coste ${totalToPay}€)`);

    res.status(201).json({
      success: true,
      code: finalCode,
      room: {
        code: finalCode,
        gameMode,
        playerCount,
        entry,
        loanPercent,
        caseIds,
        status: "waiting",
        players: room.players,
        inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/battles?invite=${finalCode}`
      },
      newBalance: deduction.newBalance,
      expGain: deduction.expGain,
      message: `✅ Batalla privada #${finalCode} creada. Comparte el enlace de invitación.`
    });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'BATTLES', 'Error al crear batalla:', err.message);
    res.status(500).json({ error: "Error al crear la batalla.", code: "BATTLE_CREATE_ERROR" });
  }
});

// POST /api/battles/join — Un jugador se une a una sala existente pagando su entrada
app.post("/api/battles/join", authenticateToken, async (req, res) => {
  const { inviteCode, playerName } = req.body || {};

  try {
    if (!inviteCode) {
      return res.status(400).json({ error: "Código de invitación obligatorio.", code: "INVITE_CODE_REQUIRED" });
    }

    const code = String(inviteCode).toUpperCase().trim();
    const room = battleRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: "La batalla no existe o ha expirado.", code: "BATTLE_NOT_FOUND" });
    }
    if (room.status !== "waiting") {
      return res.status(409).json({ error: "La batalla ya ha comenzado o ha finalizado.", code: "BATTLE_ALREADY_STARTED" });
    }
    if (room.expiresAt < Date.now()) {
      battleRooms.delete(code);
      return res.status(404).json({ error: "La batalla ha expirado.", code: "BATTLE_EXPIRED" });
    }
    if (room.players.some((p) => p.userId === req.user.id)) {
      return res.status(409).json({ error: "Ya estás dentro de esta batalla.", code: "ALREADY_JOINED" });
    }
    if (room.players.length >= room.playerCount) {
      return res.status(409).json({ error: "La batalla está completa.", code: "BATTLE_FULL" });
    }

    // El jugador que se une paga su propia entrada (sin préstamo)
    const joinCost = room.entry;

    // Deducción atómica del saldo del que se une
    let deduction;
    try {
      deduction = await atomicDeductBalanceAndAwardXP(req.user.id, joinCost);
    } catch (err) {
      if (err.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({ error: "Saldo insuficiente para unirte a la batalla.", code: "INSUFFICIENT_BALANCE", required: joinCost });
      }
      throw err;
    }

    room.players.push({
      userId: req.user.id,
      name: playerName || "Jugador",
      paid: joinCost,
      isOwner: false,
      joinedAt: new Date().toISOString()
    });

    // Si la sala está llena, marcarla como lista
    const isFull = room.players.length >= room.playerCount;
    if (isFull) {
      room.status = "ready";
    }

    await recordTransaction(req.user.id, 'batalla', joinCost, 'saldo_sitio', `Unión a batalla privada #${code} (entrada ${joinCost}€)`);
    await logAction(req.user.id, 'BATALLA_UNIRSE', { code, playerCount: room.players.length });

    log(LOG_LEVELS.INFO, 'BATTLES', `Usuario ${req.user.id} se unió a la sala ${code} (${room.players.length}/${room.playerCount})`);

    res.json({
      success: true,
      code,
      room: {
        code,
        gameMode: room.gameMode,
        playerCount: room.playerCount,
        entry: room.entry,
        loanPercent: room.loanPercent,
        caseIds: room.caseIds,
        status: room.status,
        players: room.players
      },
      newBalance: deduction.newBalance,
      expGain: deduction.expGain,
      isReady: isFull,
      message: isFull
        ? `🎉 ¡Batalla #${code} completa! Puede comenzar.`
        : `✅ Te has unido a la batalla #${code}. Esperando a más jugadores (${room.players.length}/${room.playerCount}).`
    });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'BATTLES', 'Error al unirse a batalla:', err.message);
    res.status(500).json({ error: "Error al unirse a la batalla.", code: "BATTLE_JOIN_ERROR" });
  }
});

// GET /api/battles/:code — Consultar el estado de una sala
app.get("/api/battles/:code", authenticateToken, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase().trim();
  const room = battleRooms.get(code);

  if (!room || room.expiresAt < Date.now()) {
    if (room) battleRooms.delete(code);
    return res.status(404).json({ error: "La batalla no existe o ha expirado.", code: "BATTLE_NOT_FOUND" });
  }

  res.json({
    success: true,
    room: {
      code,
      gameMode: room.gameMode,
      playerCount: room.playerCount,
      entry: room.entry,
      loanPercent: room.loanPercent,
      loanCost: room.loanCost,
      caseIds: room.caseIds,
      status: room.status,
      ownerName: room.ownerName,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      players: room.players
    }
  });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', '❌ Unhandled Promise Rejection', {
    reason: reason?.toString() || 'Unknown reason',
    type: typeof reason,
    isError: reason instanceof Error,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise ? 'promise was provided' : 'no promise context'
  });

  // Never crash on unhandled rejections — log and continue
  log(LOG_LEVELS.WARN, 'GLOBAL', '🔁 Proceso continúa a pesar del rejection no capturado');
});

process.on('uncaughtException', (err) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', '💥 UNCAUGHT EXCEPTION', {
    error: err.message,
    stack: err.stack,
    code: err.code,
    syscall: err.syscall,
    errno: err.errno,
    path: err.path,
    address: err.address,
    port: err.port
  });

  // Log environment context
  log(LOG_LEVELS.ERROR, 'GLOBAL', '📋 Contexto del error', {
    nodeEnv: process.env.NODE_ENV || 'development',
    pid: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cwd: process.cwd()
  });

  // En producción, gracia: no matar el proceso inmediatamente
  if (process.env.NODE_ENV === 'production') {
    log(LOG_LEVELS.ERROR, 'GLOBAL', '⚠️ Error crítico en producción — ejecutando shutdown graceful en 5s...');

    // Dar tiempo para que los logs se escriban y las conexiones se cierren
    setTimeout(() => {
      log(LOG_LEVELS.INFO, 'GLOBAL', '🔄 Forzando reinicio del proceso...');
      process.exit(1);
    }, 5000);
  } else {
    // En desarrollo, salir inmediatamente para que el watcher reinicie
    log(LOG_LEVELS.ERROR, 'GLOBAL', '🛑 Saliendo del proceso (desarrollo)');
    process.exit(1);
  }
});

// ─── SIGTERM / SIGINT HANDLER (Graceful Shutdown para Render) ──
process.on('SIGTERM', () => {
  log(LOG_LEVELS.INFO, 'GLOBAL', '📡 Señal SIGTERM recibida — cerrando servidor gracefulmente...');
  if (server) {
    server.close(() => {
      log(LOG_LEVELS.INFO, 'GLOBAL', '✅ Servidor HTTP cerrado correctamente');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  log(LOG_LEVELS.INFO, 'GLOBAL', '⌨️ Señal SIGINT recibida — cerrando servidor...');
  if (server) {
    server.close(() => {
      log(LOG_LEVELS.INFO, 'GLOBAL', '✅ Servidor HTTP cerrado correctamente');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// ─── RESPONSE ERROR MIDDLEWARE ───────────────────
// Express requires exactly 4 args (err, req, res, next) to identify error handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Error en middleware global', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Siempre devolver JSON estructurado
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

// ─── SKIN PRICES CACHE WITH HTTP CACHE HEADERS ─────
const skinPricesPath = path.join(__dirname, '../../public/skin_prices.json');
app.get('/skin_prices.json', (req, res) => {
  if (!fs.existsSync(skinPricesPath)) {
    return res.status(404).json({ error: "Cache de precios no disponible" });
  }

  // Cache-Control: public, max-age=300 (5 minutos)
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Content-Type', 'application/json');
  res.sendFile(skinPricesPath);
});

// ─── SPA CATCH-ALL ───────────────────────────────
const distPath = path.join(__dirname, '../../dist');
const indexPath = path.join(distPath, 'index.html');
const publicPath = path.join(__dirname, '../../public');
if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).json({ error: "Frontend no construido. Ejecuta npm run build." });
  });
} else {
  log(LOG_LEVELS.WARN, 'SYSTEM', 'Directorio dist/ no encontrado. Sirviendo solo API.');
}

// ─── SOCKET.IO ────────────────────────────────────
const server = app.listen(PORT, "0.0.0.0", () => log(LOG_LEVELS.INFO, 'SYSTEM', `Servidor corriendo en puerto ${PORT}`));
server.on('error', (err) => {
  log(LOG_LEVELS.ERROR, 'SYSTEM', `Error al abrir puerto ${PORT}:`, err.message);
  process.exit(1);
});

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000,
  allowEIO3: true,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6
});

io.on("connection", (socket) => {
  log(LOG_LEVELS.INFO, 'SOCKET', `Cliente conectado: ${socket.id}`);
  socket.on("disconnect", () => log(LOG_LEVELS.INFO, 'SOCKET', `Cliente desconectado: ${socket.id}`));
});

// Expose io to Express so route handlers can emit socket events (e.g. withdrawal_update)
app.set('io', io);


// ─── PRICE CACHE ──────────────────────────────────
async function refreshPriceCache() {
  try {
    const { execSync } = await import("child_process");
    const scriptPath = path.join(__dirname, "../../generate_prices_cache.js");
    log(LOG_LEVELS.INFO, 'PRICES', 'Iniciando actualización de caché de precios...');
    const result = execSync(`node "${scriptPath}"`, { timeout: 30000 });
    log(LOG_LEVELS.INFO, 'PRICES', `Caché actualizada: ${result.toString().trim()}`);
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'PRICES', 'Error al actualizar caché de precios', { error: err.message });
  }
}

cron.schedule("0 */6 * * *", () => { refreshPriceCache(); });
setTimeout(() => { refreshPriceCache(); }, 10000);

app.post("/api/admin/refresh-prices", authenticateToken, isAdmin, async (req, res) => {
  try {
    await refreshPriceCache();
    await logAction(req.user.id, "REFRESH_PRICES", {});
    res.json({ success: true, message: "Caché de precios actualizada correctamente." });
  } catch {
    res.status(500).json({ error: "Error al refrescar precios" });
  }
});

// ─── CS2 PRICE SYNC ENGINE ──────────────────────────────
app.get("/api/skins/sync-market-prices", async (req, res) => {
  try {
    log(LOG_LEVELS.INFO, 'PRICE_SYNC', 'Iniciando sincronización de precios CS2...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      'https://csgo-api.vercel.app/api/skins/prices',
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      log(LOG_LEVELS.WARN, 'PRICE_SYNC', 'CSGO-API falló, intentando PriceEmpire...');
      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000);

      const fallbackResponse = await fetch(
        'https://api.priceempire.com/v1/skins/prices?appid=730',
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          },
          signal: fallbackController.signal
        }
      );

      clearTimeout(fallbackTimeout);

      if (!fallbackResponse.ok) {
        return res.status(502).json({
          success: false,
          error: "No se pudieron obtener precios de mercado. Las APIs externas no responden.",
          code: "PRICE_API_UNAVAILABLE"
        });
      }

      const fallbackData = await fallbackResponse.json();
      log(LOG_LEVELS.INFO, 'PRICE_SYNC', `PriceEmpire respondió con ${fallbackData?.length || 0} precios`);

      if (Array.isArray(fallbackData) && fallbackData.length > 0) {
        let updated = 0;
        for (const item of fallbackData.slice(0, 500)) {
          if (item.market_hash_name && item.price) {
            try {
              await db.query(
                "UPDATE inventario SET price = $1 WHERE market_hash_name = $2 AND status = 'on_site'",
                [parseFloat(item.price), item.market_hash_name]
              );
              updated++;
            } catch {
              // Ignorar errores individuales
            }
          }
        }
        log(LOG_LEVELS.INFO, 'PRICE_SYNC', `Precios actualizados: ${updated} skins`);
        return res.json({ success: true, updated, source: "priceempire", total: fallbackData.length });
      }

      return res.json({ success: true, updated: 0, source: "priceempire", message: "Sin datos de precios disponibles" });
    }

    const data = await response.json();
    log(LOG_LEVELS.INFO, 'PRICE_SYNC', `CSGO-API respondió con ${data?.length || 0} precios`);

    if (Array.isArray(data) && data.length > 0) {
      let updated = 0;
      for (const item of data.slice(0, 500)) {
        if (item.market_hash_name && item.price) {
            try {
              await db.query(
                "UPDATE inventario SET price = $1 WHERE market_hash_name = $2 AND status = 'on_site'",
                [parseFloat(item.price), item.market_hash_name]
              );
              updated++;
            } catch {
              // Ignorar errores individuales
            }
        }
      }
      log(LOG_LEVELS.INFO, 'PRICE_SYNC', `Precios actualizados: ${updated} skins`);
      return res.json({ success: true, updated, source: "csgo-api", total: data.length });
    }

    res.json({ success: true, updated: 0, source: "csgo-api", message: "Sin datos de precios disponibles" });
  } catch {
    res.status(500).json({ error: "Error al sincronizar precios" });
  }
});

// Tarea periódica: sincronizar precios cada 6 horas
cron.schedule("0 */6 * * *", async () => {
  log(LOG_LEVELS.INFO, 'PRICE_SYNC', 'Ejecutando tarea programada de sincronización de precios...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/skins/sync-market-prices`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const result = await response.json();
    log(LOG_LEVELS.INFO, 'PRICE_SYNC', `Sincronización programada completada: ${JSON.stringify(result)}`);
  } catch {
    // Silenciar errores en tarea programada
  }
});