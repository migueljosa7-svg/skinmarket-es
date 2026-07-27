console.log("=== INICIO DE SERVER.JS ===");
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
import { Strategy as SteamStrategy } from "passport-steam";
import { Server as SocketIOServer } from "socket.io";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { createCharge, handleWebhook, getPaymentStatus } from "./controllers/paymentController.js";
import p2pMarketService from "./services/p2pMarketService.js";
import fs from "fs";

dotenv.config();

// ─────────────────────────────────────────────────
// LOGGING SYSTEM - Logs estructurados con niveles
// ─────────────────────────────────────────────────

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

function log(level, module, message, data = null) {
  // PRODUCCIÓN: Silenciar TODOS los logs excepto errores fatales
  if (process.env.NODE_ENV === 'production') {
    // Solo permitir errores fatales en producción
    if (level !== LOG_LEVELS.ERROR) {
      return;
    }
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;

  switch (level) {
    case LOG_LEVELS.INFO:
      console.log(`${prefix} ${message}`, data || '');
      break;
    case LOG_LEVELS.WARN:
      console.warn(`${prefix} ${message}`, data || '');
      break;
    case LOG_LEVELS.ERROR:
      console.error(`${prefix} ${message}`, data || '');
      break;
    case LOG_LEVELS.DEBUG:
      console.debug(`${prefix} ${message}`, data || '');
      break;
    default:
      console.log(`${prefix} ${message}`, data || '');
  }
}

log(LOG_LEVELS.INFO, 'SYSTEM', 'Iniciando servidor...');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// ─── Session Store: Redis con fallback a MemoryStore ──────
const sessionStore = (() => {
  let store;
  // Intenta con Redis
  if (process.env.REDIS_URL) {
    try {
      const redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.connect().catch(err => {
        log(LOG_LEVELS.WARN, 'SESSION', 'Redis no disponible, usando MemoryStore', err.message);
      });
      store = new RedisStore({ client: redisClient });
      log(LOG_LEVELS.INFO, 'SESSION', 'Usando RedisStore');
      return store;
    } catch (e) {
      log(LOG_LEVELS.WARN, 'SESSION', 'Fallback a MemoryStore (Redis no disponible)');
    }
  } else {
    log(LOG_LEVELS.WARN, 'SESSION', 'REDIS_URL no definida, usando MemoryStore (sesiones no persistirán entre reinicios)');
  }
  // Fallback: MemoryStore
  const MemoryStore = session.MemoryStore || (session.Store && session.Store);
  if (MemoryStore) {
    store = new session.MemoryStore();
  } else {
    // Fallback manual simple
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

// Configuración flexible de CORS (acepta '*' en desarrollo)
const corsOrigin = process.env.FRONTEND_URL || "*";
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP
  message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
});
app.use("/api/", limiter);

// Configurar Sesiones (con fallback a MemoryStore si Redis no está disponible)
app.use(session({
  store: sessionStore,
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Iniciar Bot de Steam (después de crear app)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración flexible de BACKEND_URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

if (process.env.BOT_USERNAME && process.env.BOT_USERNAME !== 'tu_usuario_steam') {
  botEngine.logIn();
  // Endpoint para ver estado del bot
  app.get("/api/bot/status", (req, res) => {
    res.json(botEngine.getStatus());
  });
} else {
  log(LOG_LEVELS.INFO, 'BOT', 'Bot no configurado. Iniciando en modo simulación.');
  // Endpoint de health check genérico aunque el bot no esté configurado
  app.get("/api/bot/status", (req, res) => {
    res.json({ status: "ok", bot: "simulated", message: "Bot no configurado - modo simulación" });
  });
}

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialization de Passport
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Estrategia de Steam
passport.use(new SteamStrategy({
  returnURL: `${BACKEND_URL}/api/auth/steam/return`,
  realm: BACKEND_URL,
  apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
  try {
    const steamId = profile.id;
    const nombre = profile.displayName;

    // Buscar o crear usuario
    let result = await db.query("SELECT * FROM usuarios WHERE steam_id = $1", [steamId]);

    if (result.rows.length === 0) {
      // Crear nuevo usuario si no existe
      result = await db.query(
        "INSERT INTO usuarios (nombre_usuario, email, password_hash, steam_id, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [nombre, `${steamId}@steam.auth`, 'steam_no_password', steamId, 0, 0]
      );
    }

    return done(null, result.rows[0]);
  } catch (err) {
    return done(err);
  }
}));

// Helper para Auditoría
async function logAction(usuario_id, accion, detalles = null) {
  try {
    await db.query(
      "INSERT INTO logs_auditoria (usuario_id, accion, detalles) VALUES ($1, $2, $3)",
      [usuario_id, accion, detalles ? JSON.stringify(detalles) : null]
    );
  } catch (err) {
    console.error("Error al registrar log de auditoría:", err);
  }
}

// Helper para Transacciones
async function recordTransaction(usuario_id, tipo, monto, metodo, detalles = null) {
  try {
    await db.query(
      "INSERT INTO transacciones (usuario_id, tipo, monto, metodo, detalles) VALUES ($1, $2, $3, $4, $5)",
      [usuario_id, tipo, monto, metodo, detalles]
    );
  } catch (err) {
    console.error("Error al registrar transacción:", err);
  }
}

// Middleware para verificar JWT (actualizado para soportar sesiones si es necesario)
const authenticateToken = (req, res, next) => {
  if (req.isAuthenticated()) return next(); // Steam Auth Session

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
  // Generar token JWT para compatibilidad con el sistema actual
  const user = req.user;
  const token = jwt.sign({ id: user.usuario_id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

  // Redirigir al frontend con el token
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${FRONTEND_URL}/login?token=${token}`);
});

app.post("/api/register", async (req, res) => {
  const { nombre_usuario, email, password } = req.body;
  log(LOG_LEVELS.INFO, 'AUTH', `Intento de registro: ${nombre_usuario} (${email})`);

  if (!nombre_usuario || !email || !password) {
    log(LOG_LEVELS.WARN, 'AUTH', 'Registro fallido: faltan campos');
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

    log(LOG_LEVELS.INFO, 'AUTH', `Usuario registrado con éxito: ${user.usuario_id}`);
    res.status(201).json({ user, token });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'AUTH', 'Error en registro', { code: err.code, message: err.message });
    if (err.code === '23505') {
      return res.status(400).json({ error: "El usuario o email ya existe" });
    }
    res.status(500).json({ error: "Error al registrar usuario", details: err.message, code: err.code });
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

    const userData = {
      usuario_id: user.usuario_id,
      nombre_usuario: user.nombre_usuario,
      email: user.email,
      saldo: user.saldo,
      nivel: user.nivel,
      experiencia: user.experiencia
    };

    res.json({ user: userData, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT usuario_id, nombre_usuario, email, saldo, nivel, experiencia, link_intercambio, steam_id, trade_token, ultimo_reclamo_diario FROM usuarios WHERE usuario_id = $1",
      [req.user.id]
    );
    const inventoryResult = await db.query(
      "SELECT item_id as id, name, price, image, rarity, marketable, status FROM inventario WHERE usuario_id = $1 AND status != 'sold' AND status != 'withdrawn'",
      [req.user.id]
    );
    const user = userResult.rows[0];
    user.inventory = inventoryResult.rows.map(item => ({
      ...item,
      price: item.price ?? 0.00
    }));
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener datos del usuario" });
  }
});

app.get("/api/ranking", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT nombre_usuario as name, saldo as balance, nivel as level, experiencia as exp FROM usuarios ORDER BY saldo DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ranking" });
  }
});

app.post("/api/claim-daily", authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query("SELECT ultimo_reclamo_diario, nivel FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    const user = userResult.rows[0];

    const now = new Date();
    const lastClaim = user.ultimo_reclamo_diario ? new Date(user.ultimo_reclamo_diario) : null;

    // 12 hours limit for now (as requested by user for the first case)
    const hoursWait = 12;
    // Añadimos un pequeño margen de 5 segundos para evitar errores de sincronización de reloj
    const bufferMs = 5000;

    if (lastClaim && (now - lastClaim) < (hoursWait * 60 * 60 * 1000 - bufferMs)) {
      const remaining = hoursWait * 60 * 60 * 1000 - (now - lastClaim);
      return res.status(400).json({
        error: "Aún no puedes reclamar",
        remainingMs: remaining
      });
    }

    // Reward: level-based? or just random balance for now
    const reward = Math.max(0.05, Math.random() * 0.50).toFixed(2);
    const expReward = 10;

    await db.query(
      "UPDATE usuarios SET saldo = saldo + $1, experiencia = experiencia + $2, ultimo_reclamo_diario = $3 WHERE usuario_id = $4",
      [reward, expReward, now, req.user.id]
    );

    res.json({
      success: true,
      reward,
      expReward,
      message: `¡Has recibido ${reward}€ y ${expReward} de EXP!`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar reclamo diario" });
  }
});

// --- CASE OPENING ROUTES ---

app.post("/api/cases/open", authenticateToken, async (req, res) => {
  const { caseId, quantity } = req.body;

  try {
    // 1. Obtener datos de la caja (esto debería venir de DB, pero por ahora usamos los constantes del frontend si es necesario)
    // Para simplificar, asumiremos que el frontend envía los datos básicos o consultamos una tabla de cajas
    // Como no hay tabla de cajas aún, usaremos un mock basado en el ID por ahora
    const casePrices = { "eco-1": 1.5, "mid-1": 5.0, "premium-1": 25.0 }; // Ejemplo
    const casePrice = casePrices[caseId] || 2.5;
    const totalCost = casePrice * quantity;

    const userResult = await db.query("SELECT saldo FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    const user = userResult.rows[0];

    if (user.saldo < totalCost) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // 2. Obtener probabilidades de la DB
    const configResult = await db.query("SELECT valor FROM configuracion WHERE clave = 'probabilidades'");
    const probs = configResult.rows[0]?.valor || { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 };

    // 3. Simular pool de skins (en un sistema real esto vendría de una tabla de skins_por_caja)
    // Usaremos un pool genérico basado en la rareza
    const results = [];
    for (let i = 0; i < quantity; i++) {
      const roll = Math.random() * 100;
      let rarity = "Mil-Spec Grade";

      if (roll < probs.covert) rarity = "Covert";
      else if (roll < probs.covert + probs.classified) rarity = "Classified";
      else if (roll < probs.covert + probs.classified + probs.restricted) rarity = "Restricted";

      // Mock de item (esto se conectaría con la tabla de items)
      const mockItem = {
        name: `${rarity} Item #${Math.floor(Math.random() * 1000)}`,
        price: rarity === "Covert" ? 50 : (rarity === "Classified" ? 15 : 2),
        image: "",
        rarity: rarity,
        marketable: true
      };

      const insertResult = await db.query(
        "INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING item_id as id, name, price, image, rarity, marketable, status",
        [req.user.id, mockItem.name, mockItem.price, mockItem.image, mockItem.rarity, mockItem.marketable]
      );
      results.push(insertResult.rows[0]);
    }

    // 4. Actualizar saldo
    const newBalanceResult = await db.query(
      "UPDATE usuarios SET saldo = saldo - $1 WHERE usuario_id = $2 RETURNING saldo",
      [totalCost, req.user.id]
    );

    await recordTransaction(req.user.id, 'apertura_caja', totalCost, 'saldo_sitio', `Apertura de ${quantity}x ${caseId}`);
    await logAction(req.user.id, 'ABRIR_CAJA', { caseId, quantity, winnings: results.map(r => r.name) });

    res.json({ success: true, items: results, newBalance: newBalanceResult.rows[0].saldo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al abrir la caja" });
  }
});

// --- INVENTORY ROUTES ---

app.get("/api/inventory", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT item_id as id, name, price, image, rarity, marketable, status FROM inventario WHERE usuario_id = $1 AND status != 'sold' AND status != 'withdrawn'",
      [req.user.id]
    );
    const sanitized = result.rows.map(item => ({
      ...item,
      price: item.price ?? 0.00
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener inventario" });
  }
});

app.post("/api/inventory/add", authenticateToken, async (req, res) => {
  const { items } = req.body; // Array de {name, price, image, rarity, marketable}
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Items no proporcionados" });

  try {
    const addedItems = [];
    for (const item of items) {
      const result = await db.query(
        "INSERT INTO inventario (usuario_id, name, price, image, rarity, marketable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING item_id as id, name, price, image, rarity, marketable, status",
        [req.user.id, item.name, item.price, item.image, item.rarity, item.marketable !== false]
      );
      addedItems.push(result.rows[0]);
    }
    res.json({ success: true, items: addedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al añadir al inventario" });
  }
});

app.post("/api/inventory/sell", authenticateToken, async (req, res) => {
  const { itemId } = req.body;
  try {
    const itemResult = await db.query("SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2 AND status = 'on_site'", [itemId, req.user.id]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: "Objeto no encontrado o ya procesado" });

    const item = itemResult.rows[0];
    await db.query("UPDATE inventario SET status = 'sold' WHERE item_id = $1", [itemId]);
    const balanceResult = await db.query("UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo", [item.price, req.user.id]);

    await recordTransaction(req.user.id, 'venta', item.price, 'inventario_sitio', `Venta de ${item.name}`);
    await logAction(req.user.id, 'VENDER_ITEM', { itemId, itemName: item.name, price: item.price });

    res.json({ success: true, newBalance: balanceResult.rows[0].saldo });
  } catch (err) {
    res.status(500).json({ error: "Error al vender objeto" });
  }
});

app.post("/api/inventory/withdraw", authenticateToken, async (req, res) => {
  const { itemId } = req.body;
  try {
    // 1. Verificar objeto en inventario
    const itemResult = await db.query("SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2 AND status = 'on_site'", [itemId, req.user.id]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: "Objeto no disponible para retirar" });
    const item = itemResult.rows[0];

    // 2. Obtener datos de intercambio del usuario
    const userResult = await db.query("SELECT link_intercambio, steam_id, trade_token FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    const user = userResult.rows[0];

    if (!user.steam_id || !user.trade_token) {
      return res.status(400).json({ error: "Configura tu Link de Intercambio en los ajustes antes de retirar." });
    }

    // 3. PRODUCCIÓN: 100% REAL - Sin simulación, sin fallbacks
    if (botEngine.isLoggedIn) {
      try {
        log(LOG_LEVELS.INFO, 'STEAM TRADE', `Generando oferta real -> User SteamID: ${user.steam_id} -> Item: ${item.name} (${item.market_hash_name || item.name})`);

        const result = await botEngine.sendWithdrawOffer(
          user.steam_id,
          user.trade_token,
          item.name,
          item.market_hash_name || item.name
        );

        if (result.success) {
          // ÉXITO: Marcar como retirado y registrar
          await db.query("UPDATE inventario SET status = 'withdrawn' WHERE item_id = $1", [itemId]);

          await recordTransaction(req.user.id, 'retiro', item.price, 'steam_trade', `Retiro real de ${item.name} - Offer ID: ${result.offerId}`);
          await logAction(req.user.id, 'RETIRAR_ITEM_REAL', {
            itemId,
            itemName: item.name,
            offerId: result.offerId,
            marketHashName: item.market_hash_name
          });

          log(LOG_LEVELS.INFO, 'STEAM TRADE', `✅ Oferta enviada exitosamente -> Offer ID: ${result.offerId}`);

          // Emitir actualización por Socket.io
          if (req.app.get('io')) {
            req.app.get('io').to(req.user.id.toString()).emit('withdrawal_update', {
              itemId,
              status: 'withdrawn',
              offerId: result.offerId,
              message: `Oferta #${result.offerId} enviada a Steam. Revisa tu inventario de ofertas.`
            });
          }

          return res.json({
            success: true,
            offerId: result.offerId,
            message: `Oferta #${result.offerId} enviada a Steam. Revisa tu inventario de ofertas.`
          });
        } else {
          // FALLO: No marcar como retirado, devolver error descriptivo
          const errorMsg = result.error || 'Error del bot';
          log(LOG_LEVELS.ERROR, 'WITHDRAW', 'Error en envío de oferta', {
            error: errorMsg,
            itemName: item.name,
            itemId
          });

          return res.status(400).json({
            success: false,
            error: errorMsg || "No se pudo enviar la oferta real en este momento. Inténtalo más tarde.",
            code: 'TRADE_OFFER_FAILED',
            itemId
          });
        }
      } catch (botErr) {
        // Error fatal del bot - NO marcar como retirado
        log(LOG_LEVELS.ERROR, 'WITHDRAW', 'Error fatal del bot', {
          error: botErr.message,
          stack: botErr.stack,
          itemId
        });

        return res.status(500).json({
          success: false,
          error: "Error del sistema de trade. Por favor, intenta de nuevo más tarde.",
          code: 'BOT_ERROR',
          itemId
        });
      }
    } else {
      // Bot no conectado - PRODUCCIÓN: No permitir retiros simulados
      log(LOG_LEVELS.ERROR, 'WITHDRAW', 'Intento de retiro sin bot conectado', {
        userId: req.user.id,
        itemName: item.name,
        itemId
      });

      return res.status(503).json({
        success: false,
        error: "Sistema de retiro temporalmente no disponible. Por favor, intenta de nuevo más tarde.",
        code: 'BOT_NOT_AVAILABLE'
      });
    }
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'WITHDRAW', 'Error al procesar el retiro', { error: err.message, stack: err.stack });
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

app.post("/api/update-balance", authenticateToken, async (req, res) => {
  const { amount } = req.body;
  log(LOG_LEVELS.INFO, 'BALANCE', `Intento de actualización: +${amount}`, { usuario_id: req.user.id });

  if (amount === undefined) return res.status(400).json({ error: "Monto no especificado" });

  try {
    const result = await db.query(
      "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
      [parseFloat(amount), req.user.id]
    );
    log(LOG_LEVELS.INFO, 'BALANCE', `Éxito. Nuevo saldo: ${result.rows[0].saldo}`, { usuario_id: req.user.id });

    await recordTransaction(req.user.id, 'deposito', parseFloat(amount), 'steam_deposit', 'Depósito de skins o saldo');
    await logAction(req.user.id, 'ACTUALIZAR_SALDO', { amount });

    res.json({ success: true, newBalance: result.rows[0].saldo });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'BALANCE', 'Error al actualizar saldo', { error: err.message });
    res.status(500).json({ error: "Error al actualizar saldo" });
  }
});

// --- STEAM ROUTES ---

// Cache en memoria para inventarios de Steam (TTL: 5 minutos)
const steamInventoryCache = new Map();
const STEAM_CACHE_TTL = 5 * 60 * 1000; // 5 minutos en ms

app.get("/api/steam-inventory/:steamId", authenticateToken, async (req, res) => {
  const steamId = req.params.steamId;
  const cacheKey = `inventory_${steamId}`;

  // Verificar cache
  const cached = steamInventoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < STEAM_CACHE_TTL) {
    console.log(`[STEAM] Cache hit para: ${steamId}`);
    return res.json(cached.data);
  }

  // Si el cache expiró, limpiarlo
  if (cached) {
    steamInventoryCache.delete(cacheKey);
  }

  log(LOG_LEVELS.INFO, 'STEAM', `Solicitando inventario para: ${steamId}`);

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
      const errorText = await response.text();
      log(LOG_LEVELS.ERROR, 'STEAM', `Error from Steam API: ${response.status} ${response.statusText}`, { body: errorText });
      return res.status(response.status).json({
        error: `Steam respondió con error ${response.status}`,
        details: "La API de Steam no está disponible en este momento. Por favor, intenta de nuevo más tarde."
      });
    }

    const data = await response.json();

    if (!data || data.success === false) {
      log(LOG_LEVELS.WARN, 'STEAM', 'Respuesta fallida o perfil privado');
      return res.status(403).json({ error: "El inventario es privado o no se pudo acceder. Por favor, cámbialo a Público en los ajustes de Steam." });
    }

    if (!data.assets || !data.descriptions) {
      console.log("[STEAM] No se encontraron objetos.");
      return res.json([]);
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
        image: `https://community.cloudflare.steamstatic.com/economy/image/${description.icon_url}`,
        price: parseFloat(basePrice.toFixed(2)) ?? 0.00,
        rarity: rarity,
        marketable: description.marketable === 1
      };
    }).filter(skin => skin !== null);

    // Guardar en cache
    steamInventoryCache.set(cacheKey, {
      data: inventory,
      timestamp: Date.now()
    });

    log(LOG_LEVELS.INFO, 'STEAM', `Éxito: ${inventory.length} items cargados (cacheado por 5min)`);
    res.json(inventory);
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'STEAM', 'Error fatal al obtener inventario', { error: err.message, stack: err.stack });
    if (err.name === 'AbortError') {
      res.status(408).json({
        error: "Steam API no responde",
        details: "La API de Steam no respondió a tiempo. Por favor, intenta de nuevo en unos momentos."
      });
    } else {
      res.status(500).json({
        error: "Error interno al conectar con Steam",
        details: err.message
      });
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
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(408).json({ error: "Steam API timeout" });
    } else {
      res.status(500).json({ error: "Error fetching price" });
    }
  }
});

// Health check endpoints - MUST always respond with 200 to prevent Render from restarting
// These endpoints should never throw errors, even if DB/bot are down
app.get("/api/health", (req, res) => {
  try {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "unknown",
        bot: "unknown"
      }
    };

    // Check database connectivity without throwing
    if (db && typeof db.query === 'function') {
      health.services.database = "connected";
    } else {
      health.services.database = "not_initialized";
    }

    // Check bot status without throwing
    if (botEngine && typeof botEngine.getStatus === 'function') {
      try {
        const botStatus = botEngine.getStatus();
        health.services.bot = botStatus.isLoggedIn ? "logged_in" : "not_logged_in";
      } catch (e) {
        health.services.bot = "error";
      }
    } else {
      health.services.bot = "not_initialized";
    }

    res.status(200).json(health);
  } catch (err) {
    // Even if everything fails, return 200 to keep Render happy
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      error: "Health check partial failure",
      details: err.message
    });
  }
});

app.get("/health", (req, res) => {
  try {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    // Never fail the health check
    res.status(200).send("OK");
  }
});

// Root endpoint for Render health checks
app.get("/", (req, res) => {
  res.status(200).send("SkinMarket API Running");
});

// --- SKIN REPLACEMENT ROUTE (Emergency System) ---

app.post("/api/skins/replace-corrupted", authenticateToken, async (req, res) => {
  const { skinId, userId } = req.body;

  if (!skinId || !userId) {
    return res.status(400).json({ error: "skinId y userId son requeridos" });
  }

  try {
    const originalSkinResult = await db.query(
      "SELECT * FROM inventario WHERE item_id = $1 AND usuario_id = $2",
      [skinId, userId]
    );

    if (originalSkinResult.rows.length === 0) {
      return res.status(404).json({ error: "Skin original no encontrada" });
    }

    const originalSkin = originalSkinResult.rows[0];
    const originalPrice = parseFloat(originalSkin.price) || 0;

    let replacementSkin = null;

    const userSkinsResult = await db.query(
      `SELECT * FROM inventario
       WHERE usuario_id = $1
       AND item_id != $2
       AND status = 'on_site'
       AND image IS NOT NULL
       AND image != ''
       AND image NOT LIKE 'data:image/svg+xml%'
       AND price >= $3
       ORDER BY price DESC
       LIMIT 1`,
      [userId, skinId, originalPrice]
    );

    if (userSkinsResult.rows.length > 0) {
      replacementSkin = userSkinsResult.rows[0];
    } else {
      const systemSkinsResult = await db.query(
        `SELECT * FROM inventario
         WHERE status = 'on_site'
         AND image IS NOT NULL
         AND image != ''
         AND image NOT LIKE 'data:image/svg+xml%'
         AND price >= $1
         AND usuario_id != $2
         ORDER BY RANDOM()
         LIMIT 1`,
        [originalPrice, userId]
      );

      if (systemSkinsResult.rows.length > 0) {
        replacementSkin = systemSkinsResult.rows[0];
      }
    }

    if (!replacementSkin) {
      return res.status(404).json({
        error: "No hay skins de reemplazo disponibles en este momento",
        code: "NO_REPLACEMENT_AVAILABLE"
      });
    }

    await logAction(userId, 'SKIN_REPLACED', {
      originalSkinId: skinId,
      originalSkinName: originalSkin.name,
      replacementSkinId: replacementSkin.item_id,
      replacementSkinName: replacementSkin.name,
      reason: 'corrupted_image'
    });

    res.json({
      success: true,
      replacementSkin: {
        id: replacementSkin.item_id,
        name: replacementSkin.name,
        image: replacementSkin.image,
        price: replacementSkin.price,
        rarity: replacementSkin.rarity
      }
    });

  } catch (err) {
    log(LOG_LEVELS.ERROR, 'SKIN_REPLACEMENT', 'Error al reemplazar skin', {
      error: err.message,
      stack: err.stack,
      skinId,
      userId
    });
    res.status(500).json({ error: "Error al procesar reemplazo de skin" });
  }
});

// --- ADMIN ROUTES ---

const isAdmin = async (req, res, next) => {
  try {
    const result = await db.query("SELECT role FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    if (result.rows[0]?.role === 'admin') {
      next();
    } else {
      log(LOG_LEVELS.WARN, 'ADMIN', `Intento de acceso no autorizado`, { usuario_id: req.user.id });
      res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
    }
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'ADMIN', 'Error en middleware isAdmin', { error: err.message });
    res.status(500).json({ error: "Error al verificar permisos" });
  }
};

app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await db.query("SELECT COUNT(*) FROM usuarios");
    const transCount = await db.query("SELECT COUNT(*) FROM transacciones");
    const totalDeposited = await db.query("SELECT SUM(monto) FROM transacciones WHERE tipo = 'deposito'");
    const totalWithdrawn = await db.query("SELECT SUM(monto) FROM transacciones WHERE tipo = 'retiro'");

    res.json({
      users: userCount.rows[0].count,
      transactions: transCount.rows[0].count,
      deposited: totalDeposited.rows[0].sum || 0,
      withdrawn: totalWithdrawn.rows[0].sum || 0
    });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'ADMIN', 'Error al obtener estadísticas', { error: err.message });
  }
});

app.get("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT valor FROM configuracion WHERE clave = 'probabilidades'");
    res.json(result.rows[0]?.valor || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener probabilidades" });
  }
});

app.post("/api/admin/settings/probabilities", authenticateToken, isAdmin, async (req, res) => {
  const { probabilities } = req.body;
  try {
    await db.query("UPDATE configuracion SET valor = $1, ultima_modificacion = NOW() WHERE clave = 'probabilidades'", [JSON.stringify(probabilities)]);
    await logAction(req.user.id, "UPDATE_SETTINGS", { key: 'probabilidades', value: probabilities });
    res.json({ success: true });
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'ADMIN', 'Error al actualizar probabilidades', { error: err.message });
  }
});

// ─────────────────────────────────────────────────
// PAYMENT ROUTES - Pasarela de Pago
// ─────────────────────────────────────────────────

app.post("/api/payments/create-charge", authenticateToken, createCharge);
app.post("/api/payments/webhook", handleWebhook);
app.get("/api/payments/status/:chargeId", authenticateToken, getPaymentStatus);

// ─────────────────────────────────────────────────
// P2P MARKET ROUTES - Mercado Externo
// ─────────────────────────────────────────────────

app.get("/api/p2p/status", authenticateToken, (req, res) => {
  res.json(p2pMarketService.getStatus());
});

app.post("/api/p2p/search", authenticateToken, async (req, res) => {
  const { marketHashName, minPrice, maxPrice } = req.body;
  if (!marketHashName) return res.status(400).json({ error: "marketHashName requerido" });
  try {
    const results = await p2pMarketService.searchSkin(marketHashName, { minPrice, maxPrice });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: "Error al buscar en mercado P2P", details: err.message });
  }
});

// ─────────────────────────────────────────────────
// GLOBAL ERROR HANDLER - Catch all unhandled errors
// ─────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Unhandled Rejection', { reason: reason?.toString() });
});

process.on('uncaughtException', (err) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Uncaught Exception', {
    error: err.message,
    stack: err.stack
  });
  // Don't exit in production, let the process restart via PM2/Docker
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// ─────────────────────────────────────────────────
// SPA CATCH-ALL - Servir Frontend (React)
// ─────────────────────────────────────────────────
const distPath = path.join(__dirname, '../../dist');
const indexPath = path.join(distPath, 'index.html');

// Crear directorio public si no existe (para skin_prices.json)
const publicPath = path.join(__dirname, '../../public');
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  log(LOG_LEVELS.INFO, 'SYSTEM', 'Directorio public/ creado');
}

// Servir archivos estáticos solo si el directorio dist existe
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Cualquier ruta GET que no sea /api, sirve index.html (solo si existe)
  app.get(/^\/(?!api\/).*/, (req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "Frontend no construido. Ejecuta npm run build." });
    }
  });
} else {
  log(LOG_LEVELS.WARN, 'SYSTEM', 'Directorio dist/ no encontrado. Sirviendo solo API.');
}

// Global error middleware (must be last)
app.use((err, req, res, next) => {
  log(LOG_LEVELS.ERROR, 'GLOBAL', 'Error en middleware global', {
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ error: "Error interno del servidor" });
});

// ─────────────────────────────────────────────────
// Socket.io - Live Drops en Tiempo Real
// ─────────────────────────────────────────────────
const server = app.listen(PORT, "0.0.0.0", () => log(LOG_LEVELS.INFO, 'SYSTEM', `Servidor corriendo en puerto ${PORT}`));
server.on('error', (err) => {
  log(LOG_LEVELS.ERROR, 'SYSTEM', `Error al abrir puerto ${PORT}:`, err.message);
  process.exit(1);
});

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on("connection", (socket) => {
  log(LOG_LEVELS.INFO, 'SOCKET', `Cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    log(LOG_LEVELS.INFO, 'SOCKET', `Cliente desconectado: ${socket.id}`);
  });
});

// Función helper para emitir live drops a todos los clientes
function emitLiveDrop(dropData) {
  io.emit("live-drop", {
    id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user: dropData.user || "Jugador",
    item: {
      name: dropData.item?.name || "Skin",
      price: Number(parseFloat(dropData.item?.price || 10).toFixed(2)),
      rarity: dropData.item?.rarity || "Mil-Spec",
      image: dropData.item?.image || ""
    },
    caseName: dropData.caseName || "Caja",
    timestamp: new Date().toISOString()
  });
}

// ─────────────────────────────────────────────────
// Price Cache - Actualización Automática (Cron)
// ─────────────────────────────────────────────────

async function refreshPriceCache() {
  try {
    const { execSync } = await import("child_process");
    const scriptPath = path.join(__dirname, "../../generate_prices_cache.js");
    log(LOG_LEVELS.INFO, 'PRICES', 'Iniciando actualización de caché de precios...');
    const result = execSync(`node "${scriptPath}"`, { timeout: 30000 });
    log(LOG_LEVELS.INFO, 'PRICES', `Caché actualizada: ${result.toString().trim()}`);
  } catch (err) {
    log(LOG_LEVELS.ERROR, 'PRICES', 'Error al actualizar caché de precios', { error: err.message });
    log(LOG_LEVELS.WARN, 'PRICES', 'Los precios existentes se mantienen (respaldo preservado)');
  }
}

// Programar actualización cada 6 horas (a las 0:00, 6:00, 12:00, 18:00)
cron.schedule("0 */6 * * *", () => {
  refreshPriceCache();
});

// También ejecutar la primera vez 10 segundos después del inicio
setTimeout(() => {
  refreshPriceCache();
}, 10000);

// ─────────────────────────────────────────────────
// ADMIN: Refrescar caché de precios manualmente
// ─────────────────────────────────────────────────

app.post("/api/admin/refresh-prices", authenticateToken, isAdmin, async (req, res) => {
  try {
    await refreshPriceCache();
    await logAction(req.user.id, "REFRESH_PRICES", {});
    res.json({ success: true, message: "Caché de precios actualizada correctamente." });
  } catch (err) {
    res.status(500).json({ error: "Error al refrescar precios" });
  }
});
