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
  } catch (e) {
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

const corsOrigin = process.env.FRONTEND_URL || "*";
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.",
  handler: (req, res) => {
    console.error('[EXPRESS RATE LIMIT EXCEEDED] General - IP:', req.ip, 'URL:', req.originalUrl);
    res.status(429).json({ error: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.", code: "RATE_LIMIT_GENERAL" });
  }
});
app.use("/api/", limiter);

const withdrawLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Demasiados retiros. Por favor, espera antes de intentar otro retiro.",
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => res.status(429).json({ error: "Límite de retiros excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_WITHDRAW" })
});

const depositLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Demasiados depósitos. Por favor, espera antes de intentar otro depósito.",
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => res.status(429).json({ error: "Límite de depósitos excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_DEPOSIT" })
});

const caseOpenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Demasiadas aperturas de caja. Por favor, espera antes de intentar otra.",
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => res.status(429).json({ error: "Límite de aperturas excedido. Intenta de nuevo en 1 minuto.", code: "RATE_LIMIT_CASE_OPEN" })
});

const dailyCaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Demasiados intentos. Por favor, espera antes de intentar de nuevo.",
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => res.status(429).json({ error: "Límite de reclamos excedido.", code: "RATE_LIMIT_DAILY" })
});

const inspectorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Demasiadas consultas de inventario. Espera un momento.",
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    console.error('[EXPRESS RATE LIMIT EXCEEDED] Inspector - IP:', req.ip, 'URL:', req.originalUrl);
    res.status(429).json({ error: "Límite de consultas excedido.", code: "RATE_LIMIT_INSPECTOR" });
  }
});

// Configurar Sesiones
app.use(session({
  store: sessionStore,
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// [ON-DEMAND] Bot NO se conecta al arrancar. Solo se conecta cuando 
// un usuario solicita un retiro (withdraw). No hay polling a Steam.
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

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (process.env.STEAM_API_KEY) {
  try {
    passport.use(new SteamStrategy({
      returnUrl: `${BACKEND_URL}/api/auth/steam/return`,
      realm: `${BACKEND_URL}/`,
      apiKey: process.env.STEAM_API_KEY
    }, async (identifier, profile, done) => {
      try {
        const steamId = profile.id;
        const nombre = profile.displayName;
        let result = await db.query("SELECT * FROM usuarios WHERE steam_id = $1", [steamId]);
        if (result.rows.length === 0) {
          result = await db.query(
            "INSERT INTO usuarios (nombre_usuario, email, password_hash, steam_id, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [nombre, `${steamId}@steam.auth`, 'steam_no_password', steamId, 0, 0]
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
  if (!token) return res.status(401).json({ error: "No autorizado" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido o expirado" });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.get('/api/auth/steam', passport.authenticate('steam', { failureRedirect: '/login' }), (req, res) => { });
app.get('/api/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/login' }), (req, res) => {
  const user = req.user;
  const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${FRONTEND_URL}/login?token=${token}`);
});

app.post("/api/register", async (req, res) => {
  const { nombre_usuario, email, password } = req.body;
  if (!nombre_usuario || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO usuarios (nombre_usuario, email, password_hash, nivel, experiencia) VALUES ($1, $2, $3, $4, $5) RETURNING usuario_id, nombre_usuario, email, saldo, nivel, experiencia",
      [nombre_usuario, email, hashedPassword, 0, 0]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "El usuario o email ya existe" });
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { usuario_id: user.usuario_id, nombre_usuario: user.nombre_usuario, email: user.email, saldo: user.saldo, nivel: user.nivel, experiencia: user.experiencia }, token });
  } catch (err) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ─── LEVEL SYSTEM ────────────────────────────────────
const LEVEL_THRESHOLDS = [
  { level: 1, minDeposit: 0, dailyCaseId: "eco-1", caseLabel: "Caja Eco", reward: 0.15 },
  { level: 2, minDeposit: 10, dailyCaseId: "eco-1", caseLabel: "Caja Eco", reward: 0.25 },
  { level: 3, minDeposit: 50, dailyCaseId: "eco-1", caseLabel: "Caja Eco", reward: 0.50 },
  { level: 4, minDeposit: 100, dailyCaseId: "mid-1", caseLabel: "Caja Mid", reward: 1.00 },
  { level: 5, minDeposit: 250, dailyCaseId: "mid-1", caseLabel: "Caja Mid", reward: 2.00 },
];

function calculateLevel(totalDeposited) {
  let maxLevel = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (totalDeposited >= t.minDeposit) maxLevel = t.level;
  }
  return maxLevel;
}

function getDailyCaseForLevel(level) {
  for (const t of LEVEL_THRESHOLDS) { if (t.level === level) return t; }
  return LEVEL_THRESHOLDS[0];
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'SYSTEM', err);
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});

app.get("/api/ranking", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT nombre_usuario as name, saldo as balance, nivel as level, experiencia as exp FROM usuarios ORDER BY saldo DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Error al obtener ranking" }); }
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
    let rarity, rarityPrice, rarityColor, rarityPrefix;
    if (userLevel >= 5 && rarityRoll < 8) {
      rarity = "Covert"; rarityPrice = 50; rarityColor = "#eb4b4b"; rarityPrefix = "Red";
    } else if (userLevel >= 3 && rarityRoll < 20) {
      rarity = "Classified"; rarityPrice = 15; rarityColor = "#d32ce6"; rarityPrefix = "Pink";
    } else if (rarityRoll < 35) {
      rarity = "Restricted"; rarityPrice = 3; rarityColor = "#8847ff"; rarityPrefix = "Purple";
    } else {
      rarity = "Mil-Spec Grade"; rarityPrice = 1; rarityColor = "#4b69ff"; rarityPrefix = "Blue";
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'SYSTEM', err);
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

  } catch (err) {
    log(LOG_LEVELS.ERROR, 'INSPECTOR', 'Error al inspeccionar inventario', { error: err.message });
    if (err.name === 'AbortError') {
      res.status(408).json({ error: "Steam API no responde. Intenta de nuevo.", code: "TIMEOUT" });
    } else {
      res.status(500).json({ error: "Error al consultar inventario de Steam.", details: err.message });
    }
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'STEAM PRICE', 'Error', { error: err.message });
    res.status(500).json({ error: "Error al consultar precio", details: err.message });
  }
});

// ─── CASE OPENING (with atomic transactions) ─────────────

app.post("/api/cases/open", authenticateToken, caseOpenLimiter, async (req, res) => {
  const { caseId, quantity } = req.body;

  try {
    const casePrices = { "eco-1": 1.5, "mid-1": 5.0, "premium-1": 25.0 };
    const casePrice = casePrices[caseId] || 2.5;
    const totalCost = casePrice * (quantity || 1);

    const userResult = await db.query("SELECT saldo FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    if (userResult.rows[0].saldo < totalCost) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    const configResult = await db.query("SELECT valor FROM configuracion WHERE clave = 'probabilidades'");
    const probs = configResult.rows[0]?.valor || { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 };

    const results = [];
    for (let i = 0; i < (quantity || 1); i++) {
      const roll = Math.random() * 100;
      let rarity = "Mil-Spec Grade";
      if (roll < probs.covert) rarity = "Covert";
      else if (roll < probs.covert + probs.classified) rarity = "Classified";
      else if (roll < probs.covert + probs.classified + probs.restricted) rarity = "Restricted";

      const rarityPrices = { "Covert": 50, "Classified": 15, "Restricted": 3, "Mil-Spec Grade": 1 };
      const rarityColors = { "Covert": "#eb4b4b", "Classified": "#d32ce6", "Restricted": "#8847ff", "Mil-Spec Grade": "#4b69ff" };
      const rarityPrefixes = { "Covert": "Red", "Classified": "Pink", "Restricted": "Purple", "Mil-Spec Grade": "Blue" };

      const mockName = rarityPrefixes[rarity] || "Mil-Spec";
      const randomNum = Math.floor(Math.random() * 999) + 1;
      const weaponNames = ["AK-47", "AWP", "M4A4", "M4A1-S", "Desert Eagle", "USP-S", "Glock-18", "SSG 08", "FAMAS", "P250"];
      const skinSuffixes = ["Safari Mesh", "Boreal Forest", "Sand Dune", "Predator", "Tornado", "Scorched", "Jungle", "Urban", "Army", "Contractor"];
      const wearValues = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
      const randomWeapon = weaponNames[Math.floor(Math.random() * weaponNames.length)];
      const randomSkin = skinSuffixes[Math.floor(Math.random() * skinSuffixes.length)];
      const randomWear = wearValues[Math.floor(Math.random() * wearValues.length)];
      const itemName = `${randomWeapon} | ${randomSkin}`;
      const itemPrice = (rarityPrices[rarity] || 1) * (0.5 + Math.random() * 1.5);

      const iconHash = generateIconUrlHash(itemName, Date.now() + i);
      const imageHD = buildAkamaiImageUrl(iconHash);

      const serverSeed = crypto.randomBytes(32).toString('hex');
      const clientSeed = crypto.randomBytes(16).toString('hex');
      const nonce = Date.now() + i;
      const provablyFairHash = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}:${itemName}`).digest('hex');

      await db.withTransaction(async (client) => {
        const insertResult = await client.query(
          `INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable, wear, weapon, skin_name, market_hash_name, icon_url, provably_fair_hash, server_seed, client_seed, nonce)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING item_id as id, name, price, image, rarity, marketable, status`,
          [req.user.id, itemName, parseFloat(itemPrice.toFixed(2)), imageHD,
            rarity, true, randomWear, randomWeapon, randomSkin, itemName, iconHash, provablyFairHash, serverSeed, clientSeed, nonce]
        );
        results.push(insertResult.rows[0]);
      });
    }

    await db.query("UPDATE usuarios SET saldo = saldo - $1 WHERE usuario_id = $2", [totalCost, req.user.id]);
    await recordTransaction(req.user.id, 'apertura_caja', totalCost, 'saldo_sitio', `Apertura de ${quantity || 1}x ${caseId}`);
    await logAction(req.user.id, 'ABRIR_CAJA', { caseId, quantity, winnings: results.map(r => r.name), provablyFairHashes: results.map(r => r.provably_fair_hash) });

    res.json({ success: true, items: results, newBalance: userResult.rows[0].saldo - totalCost });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'SYSTEM', err);
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'WITHDRAW_FALLBACK', 'Error en fallback', { error: err.message });
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
  } catch (err) { res.status(500).json({ error: "Error al obtener inventario" }); }
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
  } catch (err) { res.status(500).json({ error: "Error al añadir al inventario" }); }
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'TRADE', `[TRADE] Error fatal en retiro - ${err.message} | ItemID: ${itemId}`);
    res.status(500).json({ error: "Error al procesar el retiro", details: err.message });
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
  } catch (err) { res.status(500).json({ error: "Error al actualizar perfil" }); }
});

app.post("/api/update-balance", authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (amount === undefined) return res.status(400).json({ error: "Monto no especificado" });
  try {
    const result = await db.query(
      "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
      [parseFloat(amount), req.user.id]
    );
    await recordTransaction(req.user.id, 'deposito', parseFloat(amount), 'sistema', 'Ajuste de saldo');
    await logAction(req.user.id, 'ACTUALIZAR_SALDO', { amount });
    res.json({ success: true, newBalance: result.rows[0].saldo });
  } catch (err) { res.status(500).json({ error: "Error al actualizar saldo" }); }
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
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(408).json({ error: "Steam API no responde" });
    } else {
      res.status(500).json({ error: "Error interno al conectar con Steam" });
    }
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
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching price" });
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
  } catch (err) {
    res.status(500).json({ error: "Error al procesar reemplazo de skin" });
  }
});

// --- ADMIN ROUTES ---

const isAdmin = async (req, res, next) => {
  try {
    const result = await db.query("SELECT role FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    if (result.rows[0]?.role === 'admin') next();
    else res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
  } catch (err) { res.status(500).json({ error: "Error al verificar permisos" }); }
};

app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await db.query("SELECT COUNT(*) FROM usuarios");
    const transCount = await db.query("SELECT COUNT(*) FROM transacciones");
    const totalDeposited = await db.query("SELECT COALESCE(SUM(monto), 0) FROM transacciones WHERE tipo = 'deposito'");
    const totalWithdrawn = await db.query("SELECT COALESCE(SUM(monto), 0) FROM transacciones WHERE tipo = 'retiro'");
    res.json({ users: userCount.rows[0].count, transactions: transCount.rows[0].count, deposited: totalDeposited.rows[0].sum, withdrawn: totalWithdrawn.rows[0].sum });
  } catch (err) { res.status(500).json({ error: "Error al obtener estadísticas" }); }
});

app.get("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT valor FROM configuracion WHERE clave = 'probabilidades'");
    res.json(result.rows[0]?.valor || {});
  } catch (err) { res.status(500).json({ error: "Error al obtener probabilidades" }); }
});

app.post("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  const { probabilities } = req.body;
  try {
    await db.query("UPDATE configuracion SET valor = $1, ultima_modificacion = NOW() WHERE clave = 'probabilidades'", [JSON.stringify(probabilities)]);
    await logAction(req.user.id, "UPDATE_SETTINGS", { key: 'probabilidades', value: probabilities });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Error al actualizar probabilidades" }); }
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
  } catch (err) { res.status(500).json({ error: "Error al buscar en mercado P2P", details: err.message }); }
});

// ─── GLOBAL ERROR HANDLER ────────────────────────
process.on('unhandledRejection', (reason) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Unhandled Rejection', { reason: reason?.toString() });
  // En producción, no dejar que el proceso se caiga
  if (process.env.NODE_ENV === 'production') {
    log(LOG_LEVELS.WARN, 'GLOBAL', 'Unhandled rejection capturada en producción - proceso continúa');
  }
});

process.on('uncaughtException', (err) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Uncaught Exception', { error: err.message, stack: err.stack });
  // En producción, intentar recuperación graceful en lugar de exit
  if (process.env.NODE_ENV === 'production') {
    log(LOG_LEVELS.ERROR, 'GLOBAL', 'Error crítico en producción - se recomienda reinicio manual');
  } else {
    process.exit(1);
  }
});

// ─── RESPONSE ERROR MIDDLEWARE ───────────────────
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
  cors: { origin: corsOrigin, methods: ["GET", "POST"], credentials: true },
  transports: ['polling', 'websocket'],
  pingTimeout: 30000,     // Render idle timeout protection (was 60s, now 30s for faster detection)
  pingInterval: 25000,    // Heartbeat every 25s to keep connection alive
  allowEIO3: true,
  connectTimeout: 45000,  // Allow extra time for cold starts on Render
  maxHttpBufferSize: 1e6  // 1MB max message size
});

io.on("connection", (socket) => {
  log(LOG_LEVELS.INFO, 'SOCKET', `Cliente conectado: ${socket.id}`);
  socket.on("disconnect", () => log(LOG_LEVELS.INFO, 'SOCKET', `Cliente desconectado: ${socket.id}`));
});

function emitLiveDrop(dropData) {
  io.emit("live-drop", {
    id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user: dropData.user || "Jugador",
    item: { name: dropData.item?.name || "Skin", price: Number(parseFloat(dropData.item?.price || 10).toFixed(2)), rarity: dropData.item?.rarity || "Mil-Spec", image: dropData.item?.image || "" },
    caseName: dropData.caseName || "Caja",
    timestamp: new Date().toISOString()
  });
}

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
  } catch (err) { res.status(500).json({ error: "Error al refrescar precios" }); }
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
            } catch (dbErr) {
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
          } catch (dbErr) {
            // Ignorar errores individuales
          }
        }
      }
      log(LOG_LEVELS.INFO, 'PRICE_SYNC', `Precios actualizados: ${updated} skins`);
      return res.json({ success: true, updated, source: "csgo-api", total: data.length });
    }

    res.json({ success: true, updated: 0, source: "csgo-api", message: "Sin datos de precios disponibles" });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'PRICE_SYNC', 'Error en sincronización de precios', { error: err.message });
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: "Timeout al consultar APIs de precios", code: "TIMEOUT" });
    }
    res.status(500).json({ error: "Error al sincronizar precios", details: err.message });
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
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'PRICE_SYNC', 'Error en tarea programada de precios', { error: err.message });
  }
});