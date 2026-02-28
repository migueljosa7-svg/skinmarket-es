console.log("=== INICIO DE SERVER.JS ===");
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "./db.js";
import steamBot from "./steamBot.js";
import dotenv from "dotenv";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as SteamStrategy } from "passport-steam";

dotenv.config();

// Iniciar Bot de Steam
// Iniciar Bot de Steam (Solo si hay credenciales configuradas)
if (process.env.BOT_USERNAME && process.env.BOT_USERNAME !== 'tu_usuario_steam') {
  steamBot.logIn();
} else {
  console.log("[BOT] Bot no configurado. Iniciando en modo simulación.");
}

console.log("Iniciando servidor...");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// Configurar Redis
console.log("Conectando a Redis...");
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});
redisClient.connect()
  .then(() => console.log("Redis conectado"))
  .catch(err => console.error("Error conectando a Redis:", err));

// Middlewares de Seguridad
app.use(helmet());
app.use(hpp());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

// Configurar Sesiones con Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialization de Passport
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Estrategia de Steam
passport.use(new SteamStrategy({
  returnURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/steam/return`,
  realm: process.env.BACKEND_URL || 'http://localhost:3001',
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
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${token}`);
});

app.post("/api/register", async (req, res) => {
  const { nombre_usuario, email, password } = req.body;
  console.log(`[AUTH] Intento de registro: ${nombre_usuario} (${email})`);

  if (!nombre_usuario || !email || !password) {
    console.log("[AUTH] Registro fallido: faltan campos");
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

    console.log(`[AUTH] Usuario registrado con éxito: ${user.usuario_id}`);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("[AUTH] Error en registro:", err);
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
    user.inventory = inventoryResult.rows;
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
    res.json(result.rows);
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

    // 3. Intentar envío real con el Bot si está disponible
    if (steamBot.isLoggedIn) {
      try {
        await steamBot.sendWithdrawOffer(user.steam_id, user.trade_token, item.name);
        await db.query("UPDATE inventario SET status = 'withdrawn' WHERE item_id = $1", [itemId]);

        await recordTransaction(req.user.id, 'retiro', item.price, 'steam_trade', `Retiro real de ${item.name}`);
        await logAction(req.user.id, 'RETIRAR_ITEM_REAL', { itemId, itemName: item.name });

        return res.json({ success: true, message: "Oferta real enviada a Steam." });
      } catch (botErr) {
        console.error("[WITHDRAW] Bot error:", botErr.message);
        // Fallback a simulación si el bot falla (ej: no tiene el objeto)
        await db.query("UPDATE inventario SET status = 'withdrawing' WHERE item_id = $1", [itemId]);

        await recordTransaction(req.user.id, 'retiro', item.price, 'simulado_pendiente', `Retiro simulado de ${item.name}`);

        return res.json({ success: true, message: "El bot no tiene el objeto físico. Retiro marcado como pendiente (simulado)." });
      }
    } else {
      // Fallback a simulación si el bot no está configurado
      await db.query("UPDATE inventario SET status = 'withdrawing' WHERE item_id = $1", [itemId]);

      // Simular que se retira después de 5 segundos (sincronizado con el frontend)
      setTimeout(async () => {
        try {
          await db.query("UPDATE inventario SET status = 'withdrawn' WHERE item_id = $1", [itemId]);
          console.log(`[WITHDRAW] Item ${itemId} marcado como retirado (simulado)`);
        } catch (e) {
          console.error("Error en simulación de retiro:", e);
        }
      }, 5000);

      res.json({ success: true, message: "Bot fuera de línea. Retiro simulado iniciado." });
    }
  } catch (err) {
    console.error(err);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

app.post("/api/update-balance", authenticateToken, async (req, res) => {
  const { amount } = req.body;
  console.log(`[BALANCE] Intento de actualización: +${amount} para usuario_id: ${req.user.id}`);

  if (amount === undefined) return res.status(400).json({ error: "Monto no especificado" });

  try {
    const result = await db.query(
      "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
      [parseFloat(amount), req.user.id]
    );
    console.log(`[BALANCE] Éxito. Nuevo saldo en DB: ${result.rows[0].saldo}`);

    await recordTransaction(req.user.id, 'deposito', parseFloat(amount), 'steam_deposit', 'Depósito de skins o saldo');
    await logAction(req.user.id, 'ACTUALIZAR_SALDO', { amount });

    res.json({ success: true, newBalance: result.rows[0].saldo });
  } catch (err) {
    console.error("[BALANCE] Error:", err);
    res.status(500).json({ error: "Error al actualizar saldo" });
  }
});

// --- STEAM ROUTES ---

import fetch from 'node-fetch';

app.get("/api/steam-inventory/:steamId", async (req, res) => {
  const steamId = req.params.steamId;
  console.log(`[STEAM] Solicitando inventario para: ${steamId}`);

  try {
    const response = await fetch(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Referer": "https://steamcommunity.com/"
        }
      }
    );

    if (response.status !== 200) {
      console.error(`[STEAM] Error from Steam API: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[STEAM] Body: ${errorText}`);
      return res.status(response.status).json({ error: `Steam respondió con error ${response.status}` });
    }

    const data = await response.json();

    if (!data || data.success === false) {
      console.warn("[STEAM] Respuesta fallida o perfil privado");
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
        image: `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`,
        price: parseFloat(basePrice.toFixed(2)),
        rarity: rarity,
        marketable: description.marketable === 1
      };
    }).filter(skin => skin !== null);

    console.log(`[STEAM] Éxito: ${inventory.length} items cargados`);
    res.json(inventory);
  } catch (err) {
    console.error("[STEAM] fatal error detail:", err);
    res.status(500).json({ error: "Error interno al conectar con Steam", details: err.message });
  }
});

app.get("/api/steam-price", async (req, res) => {
  const hashName = req.query.market_hash_name;
  if (!hashName) return res.status(400).json({ error: "Missing market_hash_name" });
  try {
    const response = await fetch(
      `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(hashName)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching price" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date(), version: "1.0.0" });
});

// --- ADMIN ROUTES ---

const isAdmin = async (req, res, next) => {
  try {
    const result = await db.query("SELECT role FROM usuarios WHERE usuario_id = $1", [req.user.id]);
    if (result.rows[0]?.role === 'admin') {
      next();
    } else {
      console.warn(`[ADMIN] Intento de acceso no autorizado: Usuario ID ${req.user.id}`);
      res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
    }
  } catch (err) {
    console.error("[ADMIN] Error en middleware isAdmin:", err);
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
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
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
    console.error(err);
    res.status(500).json({ error: "Error al actualizar probabilidades" });
  }
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir la carpeta generada por React (Vite)
app.use(express.static(path.join(__dirname, '../../dist')));

// Cualquier ruta que NO sea /api, que la maneje React
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));