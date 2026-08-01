// ═══════════════════════════════════════════════════════════════════════════════
// PriceEngine.js — Motor de Precios Multi-Fuente en Cascada (Backend)
// Inspirado en arquitecturas de KeyDrop / SkinClub / CSGOBig
// ═══════════════════════════════════════════════════════════════════════════════
//
// GARANTÍA CERO CRASHES:
//   Ninguna función, componente ni render debe recibir jamás undefined/null.
//   Si todas las fuentes fallan, se aplica el precio base ponderado por rareza.
//
// Cascada de resolución:
//   Fuente 1 (Primaria)      -> Caché local en memoria / Redis (<2ms)
//   Fuente 2 (API Index)     -> PriceEmpire / CSGOBackpack
//   Fuente 3 (Steam Direct)  -> Steam Community Market priceoverview (wear-specific)
//   Fuente 4 (Fallback Matrix) -> Matriz local pre-calculada (Nombre + Rareza)
//   Garantía final           -> Precio base ponderado por rareza (NUNCA null/undefined)
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══ Logger (compatible con server.js LOG_LEVELS) ════════════════════════════
const LOG_LEVELS = { INFO: "INFO", WARN: "WARN", ERROR: "ERROR", DEBUG: "DEBUG" };
function log(level, module, message, data = null) {
  if (process.env.NODE_ENV === "production" && level === LOG_LEVELS.DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;
  const method = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  method(`${prefix} ${message}`, data || "");
}

// ═══ CS2 Official Rarity Colors (Valve) ═══════════════════════════════════════
export const CS2_RARITY_COLORS = {
  "Consumer Grade": "#B0C3D9",
  "Industrial Grade": "#5E98D9",
  "Mil-Spec Grade": "#4B69FF",
  "Restricted": "#8847FF",
  "Classified": "#D32CE6",
  "Covert": "#EB4B4B",
  "Exceedingly Rare": "#FFD700",
  "Extraordinary": "#FFD700",
  "Contraband": "#FFD700",
  "★": "#FFD700",
  "★ Karambit": "#FFD700",
  "★ Gloves": "#FFD700",
};

// ═══ Base Price Matrix by Rarity (Fallback de Seguridad) ══════════════════════
// Precios base ponderados por rareza — usados cuando TODO lo demás falla.
// Garantiza que NUNCA se devuelva null/undefined/0 inválido.
const RARITY_BASE_PRICES = {
  "Consumer Grade": 0.15,
  "Industrial Grade": 0.35,
  "Mil-Spec Grade": 1.20,
  "Restricted": 4.50,
  "Classified": 18.00,
  "Covert": 65.00,
  "Exceedingly Rare": 350.00,
  "Extraordinary": 350.00,
  "Contraband": 800.00,
  "★": 400.00,
  "★ Karambit": 600.00,
  "★ Gloves": 300.00,
};

// ═══ Wear Multipliers (CS2 official float degradation) ════════════════════════
const WEAR_MULTIPLIERS = {
  "Factory New": 1.25,
  "Minimal Wear": 1.10,
  "Field-Tested": 1.00,
  "Well-Worn": 0.82,
  "Battle-Scarred": 0.70,
};

// ═══ In-Memory High-Performance Cache (TTL: 5 minutos) ════════════════════════
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const priceCache = new Map(); // key: "marketHashName|wear" -> { price, timestamp, source }

// ═══ Rate Limit Tracking (HTTP 429 backoff) ══════════════════════════════════
const rateLimitState = {
  steam: { blockedUntil: 0, consecutive429: 0 },
  priceempire: { blockedUntil: 0, consecutive429: 0 },
  csgobackpack: { blockedUntil: 0, consecutive429: 0 },
};

const RATE_LIMIT_BACKOFF_MS = 60 * 1000; // 1 minuto de backoff tras 429

function isRateLimited(source) {
  const state = rateLimitState[source];
  if (!state) return false;
  return Date.now() < state.blockedUntil;
}

function markRateLimited(source) {
  const state = rateLimitState[source];
  if (!state) return;
  state.consecutive429++;
  state.blockedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
  log(LOG_LEVELS.WARN, "PRICE_ENGINE", `⚠️ ${source} rate-limited (429). Backoff ${RATE_LIMIT_BACKOFF_MS}ms. Consecutivos: ${state.consecutive429}`);
}

function clearRateLimit(source) {
  const state = rateLimitState[source];
  if (!state) return;
  if (state.consecutive429 > 0) {
    state.consecutive429 = 0;
    state.blockedUntil = 0;
  }
}

// ═══ Local Pre-calculated Price Matrix (skin_prices.json) ══════════════════════
let localPriceMatrix = null;
let localMatrixLoaded = false;

function loadLocalPriceMatrix() {
  if (localMatrixLoaded) return localPriceMatrix;
  localMatrixLoaded = true;
  try {
    const matrixPath = path.join(__dirname, "../../../public/skin_prices.json");
    if (fs.existsSync(matrixPath)) {
      const raw = fs.readFileSync(matrixPath, "utf-8");
      localPriceMatrix = JSON.parse(raw);
      log(LOG_LEVELS.INFO, "PRICE_ENGINE", `📊 Matriz local cargada: ${Object.keys(localPriceMatrix || {}).length} entradas`);
    } else {
      localPriceMatrix = {};
      log(LOG_LEVELS.WARN, "PRICE_ENGINE", "skin_prices.json no encontrado — matriz local vacía");
    }
  } catch (err) {
    localPriceMatrix = {};
    log(LOG_LEVELS.ERROR, "PRICE_ENGINE", "Error al cargar matriz local:", err.message);
  }
  return localPriceMatrix;
}

// Recargar matriz cada 10 minutos (en caso de refreshPriceCache)
setInterval(() => {
  localMatrixLoaded = false;
  loadLocalPriceMatrix();
}, 10 * 60 * 1000).unref?.();

// ═══ Helpers ═════════════════════════════════════════════════════════════════

/**
 * Normaliza un nombre de rareza a la clave canónica de CS2.
 * @param {string} rarity - Rareza cruda (puede venir de Steam, DB, etc.)
 * @returns {string} Rareza canónica
 */
export function normalizeRarity(rarity) {
  if (!rarity || typeof rarity !== "string") return "Mil-Spec Grade";
  const r = rarity.trim();

  // Detección de cuchillos/guantes (★)
  if (r.includes("★") || r.toLowerCase().includes("knife") || r.toLowerCase().includes("gloves") || r.toLowerCase().includes("bayonet")) {
    return "Exceedingly Rare";
  }
  if (r.toLowerCase().includes("contraband")) return "Contraband";
  if (r.toLowerCase().includes("extraordinary") || r.toLowerCase().includes("exceedingly")) return "Exceedingly Rare";
  if (r.toLowerCase().includes("covert")) return "Covert";
  if (r.toLowerCase().includes("classified")) return "Classified";
  if (r.toLowerCase().includes("restricted")) return "Restricted";
  if (r.toLowerCase().includes("mil-spec") || r.toLowerCase().includes("milspec") || r.toLowerCase().includes("mil_spec")) return "Mil-Spec Grade";
  if (r.toLowerCase().includes("industrial")) return "Industrial Grade";
  if (r.toLowerCase().includes("consumer")) return "Consumer Grade";

  return "Mil-Spec Grade";
}

/**
 * Obtiene el color hex oficial de CS2 para una rareza.
 * @param {string} rarity
 * @returns {string} Hex color
 */
export function getRarityColor(rarity) {
  const normalized = normalizeRarity(rarity);
  return CS2_RARITY_COLORS[normalized] || CS2_RARITY_COLORS["Mil-Spec Grade"];
}

/**
 * Obtiene el precio base ponderado por rareza (GARANTÍA FINAL).
 * Aplica multiplicador de desgaste si se proporciona.
 * NUNCA devuelve null/undefined — siempre un número finito >= 0.10.
 * @param {string} rarity
 * @param {string} wear - Opcional (FN, MW, FT, WW, BS)
 * @returns {number} Precio base garantizado
 */
export function getRarityBasePrice(rarity, wear = null) {
  const normalized = normalizeRarity(rarity);
  let base = RARITY_BASE_PRICES[normalized] ?? RARITY_BASE_PRICES["Mil-Spec Grade"];

  // Aplicar multiplicador de desgaste
  if (wear && WEAR_MULTIPLIERS[wear]) {
    base = base * WEAR_MULTIPLIERS[wear];
  }

  // Garantía: número finito, mínimo 0.10
  const safePrice = Number(base);
  if (!isFinite(safePrice) || isNaN(safePrice) || safePrice < 0.10) {
    return 0.10;
  }
  return parseFloat(safePrice.toFixed(2));
}

/**
 * Genera una clave de caché única para market_hash_name + wear.
 */
function cacheKey(marketHashName, wear) {
  return `${marketHashName || "unknown"}|${wear || "default"}`;
}

/**
 * Extrae el desgaste (wear) de un market_hash_name.
 * Ej: "AK-47 | Redline (Field-Tested)" -> "Field-Tested"
 */
function extractWearFromName(name) {
  if (!name) return null;
  const match = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/);
  return match ? match[1] : null;
}

// ═══ FUENTE 1: Caché local en memoria (<2ms) ══════════════════════════════════
function getFromCache(marketHashName, wear) {
  const key = cacheKey(marketHashName, wear);
  const cached = priceCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    priceCache.delete(key);
    return null;
  }
  return { price: cached.price, source: "cache", fromCache: true };
}

function setInCache(marketHashName, wear, price, source) {
  const key = cacheKey(marketHashName, wear);
  priceCache.set(key, { price, timestamp: Date.now(), source });
}

// ═══ FUENTE 2: API Index (PriceEmpire / CSGOBackpack) ═════════════════════════
async function fetchFromPriceEmpire(marketHashName) {
  if (isRateLimited("priceempire")) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.priceempire.com/v1/skins/prices?appid=730&market_hash_name=${encodeURIComponent(marketHashName)}`,
      {
        headers: { "User-Agent": "SkinMarket/2.0", Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      markRateLimited("priceempire");
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    // PriceEmpire puede devolver array u objeto
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    if (Array.isArray(items) && items.length > 0) {
      const item = items.find((i) => i.market_hash_name === marketHashName) || items[0];
      if (item && item.price) {
        const price = parseFloat(item.price);
        if (isFinite(price) && price > 0) {
          clearRateLimit("priceempire");
          return { price: parseFloat(price.toFixed(2)), source: "priceempire" };
        }
      }
    }
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    log(LOG_LEVELS.DEBUG, "PRICE_ENGINE", `PriceEmpire falló para ${marketHashName}: ${err.message}`);
    return null;
  }
}

async function fetchFromCSGOBackpack(marketHashName) {
  if (isRateLimited("csgobackpack")) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.csgobackpack.net/api/GetItemPrice/?item=${encodeURIComponent(marketHashName)}&currency=EUR`,
      {
        headers: { "User-Agent": "SkinMarket/2.0", Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      markRateLimited("csgobackpack");
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.success && data.average_price) {
      const price = parseFloat(data.average_price);
      if (isFinite(price) && price > 0) {
        clearRateLimit("csgobackpack");
        return { price: parseFloat(price.toFixed(2)), source: "csgobackpack" };
      }
    }
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    log(LOG_LEVELS.DEBUG, "PRICE_ENGINE", `CSGOBackpack falló para ${marketHashName}: ${err.message}`);
    return null;
  }
}

// ═══ FUENTE 3: Steam Community Market Direct (wear-specific) ═════════════════
async function fetchFromSteamMarket(marketHashName, wear) {
  if (isRateLimited("steam")) return null;

  // Steam requiere el market_hash_name completo (incluyendo wear entre paréntesis)
  let steamHashName = marketHashName;
  if (wear && !steamHashName.includes("(")) {
    steamHashName = `${marketHashName} (${wear})`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(steamHashName)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://steamcommunity.com/market/",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      markRateLimited("steam");
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    if (data.success === false) return null;

    let price = 0;
    if (data.median_price) {
      price = parseFloat(String(data.median_price).replace(/[^0-9.,]/g, "").replace(",", "."));
    } else if (data.lowest_price) {
      price = parseFloat(String(data.lowest_price).replace(/[^0-9.,]/g, "").replace(",", "."));
    }

    if (isFinite(price) && price > 0) {
      clearRateLimit("steam");
      return { price: parseFloat(price.toFixed(2)), source: "steam_market" };
    }
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    log(LOG_LEVELS.DEBUG, "PRICE_ENGINE", `Steam Market falló para ${marketHashName}: ${err.message}`);
    return null;
  }
}

// ═══ FUENTE 4: Fallback Matrix Local (skin_prices.json) ═══════════════════════
function getFromLocalMatrix(marketHashName, rarity) {
  const matrix = loadLocalPriceMatrix();
  if (!matrix || typeof matrix !== "object") return null;

  // Intentar match exacto por market_hash_name
  if (marketHashName && matrix[marketHashName]) {
    const entry = matrix[marketHashName];
    const price = typeof entry === "number" ? entry : entry?.price || entry?.median_price;
    if (isFinite(parseFloat(price)) && parseFloat(price) > 0) {
      return { price: parseFloat(parseFloat(price).toFixed(2)), source: "local_matrix" };
    }
  }

  // Intentar match por nombre sin wear
  if (marketHashName) {
    const baseName = marketHashName.replace(/\s*\(.*\)\s*$/, "").trim();
    if (matrix[baseName]) {
      const entry = matrix[baseName];
      const price = typeof entry === "number" ? entry : entry?.price || entry?.median_price;
      if (isFinite(parseFloat(price)) && parseFloat(price) > 0) {
        return { price: parseFloat(parseFloat(price).toFixed(2)), source: "local_matrix" };
      }
    }
  }

  // Intentar match por nombre de arma + rareza
  if (marketHashName && rarity) {
    const weapon = marketHashName.split("|")[0]?.trim();
    const normalizedRarity = normalizeRarity(rarity);
    const compositeKey = `${weapon}|${normalizedRarity}`;
    if (matrix[compositeKey]) {
      const entry = matrix[compositeKey];
      const price = typeof entry === "number" ? entry : entry?.price || entry?.median_price;
      if (isFinite(parseFloat(price)) && parseFloat(price) > 0) {
        return { price: parseFloat(parseFloat(price).toFixed(2)), source: "local_matrix" };
      }
    }
  }

  return null;
}

// ═══ MOTOR PRINCIPAL: resolvePrice (Cascada completa) ═════════════════════════
/**
 * Resuelve el precio de una skin usando la cascada completa de fuentes.
 * GARANTÍA: NUNCA devuelve null/undefined. Siempre un objeto con price válido.
 *
 * @param {Object} params
 * @param {string} params.marketHashName - Nombre completo (ej: "AK-47 | Redline (Field-Tested)")
 * @param {string} [params.rarity] - Rareza CS2
 * @param {string} [params.wear] - Desgaste (FN, MW, FT, WW, BS)
 * @param {boolean} [params.skipExternal] - Si true, omite APIs externas (modo offline)
 * @returns {Promise<{price: number, source: string, fromCache: boolean}>}
 */
export async function resolvePrice({ marketHashName, rarity, wear, skipExternal = false } = {}) {
  const safeName = marketHashName || "Unknown Skin";
  const safeRarity = rarity || "Mil-Spec Grade";
  const detectedWear = wear || extractWearFromName(safeName);

  // ═══ FUENTE 1: Caché local (<2ms) ══════════════════════════════════════════
  const cached = getFromCache(safeName, detectedWear);
  if (cached) {
    return cached;
  }

  // Si skipExternal, ir directo a matriz local + base
  if (!skipExternal) {
    // ═══ FUENTE 2: API Index (PriceEmpire -> CSGOBackpack) ════════════════════
    const priceEmpireResult = await fetchFromPriceEmpire(safeName);
    if (priceEmpireResult) {
      setInCache(safeName, detectedWear, priceEmpireResult.price, priceEmpireResult.source);
      return priceEmpireResult;
    }

    const csgoBackpackResult = await fetchFromCSGOBackpack(safeName);
    if (csgoBackpackResult) {
      setInCache(safeName, detectedWear, csgoBackpackResult.price, csgoBackpackResult.source);
      return csgoBackpackResult;
    }

    // ═══ FUENTE 3: Steam Community Market Direct ══════════════════════════════
    const steamResult = await fetchFromSteamMarket(safeName, detectedWear);
    if (steamResult) {
      setInCache(safeName, detectedWear, steamResult.price, steamResult.source);
      return steamResult;
    }
  }

  // ═══ FUENTE 4: Fallback Matrix Local ════════════════════════════════════════
  const matrixResult = getFromLocalMatrix(safeName, safeRarity, detectedWear);
  if (matrixResult) {
    setInCache(safeName, detectedWear, matrixResult.price, matrixResult.source);
    return matrixResult;
  }

  // ═══ GARANTÍA FINAL: Precio base ponderado por rareza ══════════════════════
  const basePrice = getRarityBasePrice(safeRarity, detectedWear);
  const fallbackResult = { price: basePrice, source: "rarity_base", fromCache: false };
  setInCache(safeName, detectedWear, basePrice, "rarity_base");
  log(LOG_LEVELS.WARN, "PRICE_ENGINE", `⚠️ Todas las fuentes fallaron para "${safeName}". Usando precio base por rareza (${safeRarity}): €${basePrice}`);
  return fallbackResult;
}

// ═══ Resolución sincrona (para uso en render sin await) ══════════════════════
/**
 * Resuelve el precio de forma sincrona usando solo caché + matriz local + base.
 * No consulta APIs externas. Útil para renders que no pueden ser async.
 * GARANTÍA: NUNCA devuelve null/undefined.
 *
 * @param {string} marketHashName
 * @param {string} [rarity]
 * @param {string} [wear]
 * @returns {{price: number, source: string}}
 */
export function resolvePriceSync(marketHashName, rarity, wear) {
  const safeName = marketHashName || "Unknown Skin";
  const safeRarity = rarity || "Mil-Spec Grade";
  const detectedWear = wear || extractWearFromName(safeName);

  // Fuente 1: Caché
  const cached = getFromCache(safeName, detectedWear);
  if (cached) return cached;

  // Fuente 4: Matriz local
  const matrixResult = getFromLocalMatrix(safeName, safeRarity, detectedWear);
  if (matrixResult) {
    setInCache(safeName, detectedWear, matrixResult.price, matrixResult.source);
    return matrixResult;
  }

  // Garantía final: base por rareza
  const basePrice = getRarityBasePrice(safeRarity, detectedWear);
  setInCache(safeName, detectedWear, basePrice, "rarity_base");
  return { price: basePrice, source: "rarity_base" };
}

// ═══ Batch Resolution (para múltiples skins a la vez) ═════════════════════════
/**
 * Resuelve precios para un lote de skins en paralelo.
 * @param {Array<{marketHashName: string, rarity?: string, wear?: string}>} skins
 * @returns {Promise<Array<{price: number, source: string}>>}
 */
export async function resolvePricesBatch(skins) {
  if (!Array.isArray(skins) || skins.length === 0) return [];
  return Promise.all(
    skins.map((skin) =>
      resolvePrice({
        marketHashName: skin.marketHashName || skin.name,
        rarity: skin.rarity,
        wear: skin.wear,
      })
    )
  );
}

// ═══ Cache Management ════════════════════════════════════════════════════════
export function clearPriceCache() {
  priceCache.clear();
  log(LOG_LEVELS.INFO, "PRICE_ENGINE", "🧹 Caché de precios limpiada");
}

export function getCacheStats() {
  return {
    cacheSize: priceCache.size,
    cacheTtlMs: CACHE_TTL_MS,
    rateLimitState: {
      steam: { blocked: isRateLimited("steam"), consecutive429: rateLimitState.steam.consecutive429 },
      priceempire: { blocked: isRateLimited("priceempire"), consecutive429: rateLimitState.priceempire.consecutive429 },
      csgobackpack: { blocked: isRateLimited("csgobackpack"), consecutive429: rateLimitState.csgobackpack.consecutive429 },
    },
    localMatrixLoaded: localMatrixLoaded,
    localMatrixEntries: localPriceMatrix ? Object.keys(localPriceMatrix).length : 0,
  };
}

// ═══ Default Export (singleton) ═══════════════════════════════════════════════
export default {
  resolvePrice,
  resolvePriceSync,
  resolvePricesBatch,
  getRarityColor,
  getRarityBasePrice,
  normalizeRarity,
  CS2_RARITY_COLORS,
  clearPriceCache,
  getCacheStats,
};
