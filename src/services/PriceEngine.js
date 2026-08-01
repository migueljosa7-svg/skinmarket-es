// ═══════════════════════════════════════════════════════════════════════════════
// PriceEngine.js — Motor de Precios Multi-Fuente en Cascada (Frontend)
// Inspirado en arquitecturas de KeyDrop / SkinClub / CSGOBig
// ═══════════════════════════════════════════════════════════════════════════════
//
// GARANTÍA CERO CRASHES:
//   Ninguna función, componente ni render debe recibir jamás undefined/null.
//   Si todas las fuentes fallan, se aplica el precio base ponderado por rareza.
//
// Cascada de resolución (frontend):
//   Fuente 1 (Primaria)      -> Caché local en memoria (<2ms)
//   Fuente 2 (API Index)     -> Backend /api/prices/resolve (que a su vez consulta
//                              PriceEmpire / CSGOBackpack / Steam Market)
//   Fuente 3 (Steam Direct)  -> (delegado al backend)
//   Fuente 4 (Fallback Matrix) -> Matriz local pre-calculada (skin_prices.json)
//   Garantía final           -> Precio base ponderado por rareza (NUNCA null/undefined)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══ Local Price Matrix (cargada lazy desde /skin_prices.json) ════════════════
let localPriceMatrix = null;
let localMatrixLoaded = false;
let localMatrixLoadPromise = null;

/**
 * Carga la matriz local de precios desde /skin_prices.json (lazy, cached).
 * @returns {Promise<Object>} La matriz de precios local
 */
export async function loadPriceMatrix() {
  if (localMatrixLoaded && localPriceMatrix) return localPriceMatrix;
  if (localMatrixLoadPromise) return localMatrixLoadPromise;

  localMatrixLoadPromise = (async () => {
    try {
      const response = await fetch("/skin_prices.json", {
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        localPriceMatrix = await response.json();
        localMatrixLoaded = true;
      } else {
        localPriceMatrix = {};
        localMatrixLoaded = true;
      }
    } catch {
      localPriceMatrix = {};
      localMatrixLoaded = true;
    }
    localMatrixLoadPromise = null;
    return localPriceMatrix;
  })();

  return localMatrixLoadPromise;
}

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

// ═══ FUENTE 4: Fallback Matrix Local (skin_prices.json) ═══════════════════════
function getFromLocalMatrix(marketHashName, rarity) {
  if (!localPriceMatrix || typeof localPriceMatrix !== "object") return null;

  // Intentar match exacto por market_hash_name
  if (marketHashName && localPriceMatrix[marketHashName]) {
    const entry = localPriceMatrix[marketHashName];
    const price = typeof entry === "number" ? entry : entry?.price || entry?.median_price;
    if (isFinite(parseFloat(price)) && parseFloat(price) > 0) {
      return { price: parseFloat(parseFloat(price).toFixed(2)), source: "local_matrix" };
    }
  }

  // Intentar match por nombre sin wear
  if (marketHashName) {
    const baseName = marketHashName.replace(/\s*\(.*\)\s*$/, "").trim();
    if (localPriceMatrix[baseName]) {
      const entry = localPriceMatrix[baseName];
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
    if (localPriceMatrix[compositeKey]) {
      const entry = localPriceMatrix[compositeKey];
      const price = typeof entry === "number" ? entry : entry?.price || entry?.median_price;
      if (isFinite(parseFloat(price)) && parseFloat(price) > 0) {
        return { price: parseFloat(parseFloat(price).toFixed(2)), source: "local_matrix" };
      }
    }
  }

  return null;
}

// ═══ FUENTE 2: Backend API (delega al backend PriceEngine) ═════════════════════
const API_BASE = import.meta.env.VITE_API_URL || "";

async function fetchFromBackend(marketHashName, rarity, wear) {
  if (!API_BASE) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Construir query params incluyendo rarity y wear para el backend
  const params = new URLSearchParams({
    market_hash_name: marketHashName,
  });
  if (rarity) params.set("rarity", rarity);
  if (wear) params.set("wear", wear);

  try {
    const response = await fetch(
      `${API_BASE}/api/prices/resolve?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 429) {
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.price && isFinite(parseFloat(data.price)) && parseFloat(data.price) > 0) {
      return { price: parseFloat(parseFloat(data.price).toFixed(2)), source: data.source || "backend" };
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
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

  // ═══ FUENTE 2: Backend API (que a su vez consulta PriceEmpire / CSGOBackpack / Steam) ═══
  if (!skipExternal) {
    const backendResult = await fetchFromBackend(safeName, safeRarity, detectedWear);
    if (backendResult) {
      setInCache(safeName, detectedWear, backendResult.price, backendResult.source);
      return backendResult;
    }
  }

  // ═══ FUENTE 4: Fallback Matrix Local (skin_prices.json) ══════════════════════
  // Asegurar que la matriz local esté cargada
  if (!localMatrixLoaded) {
    await loadPriceMatrix();
  }

  const matrixResult = getFromLocalMatrix(safeName, safeRarity);
  if (matrixResult) {
    setInCache(safeName, detectedWear, matrixResult.price, matrixResult.source);
    return matrixResult;
  }

  // ═══ GARANTÍA FINAL: Precio base ponderado por rareza ══════════════════════
  const basePrice = getRarityBasePrice(safeRarity, detectedWear);
  const fallbackResult = { price: basePrice, source: "rarity_base", fromCache: false };
  setInCache(safeName, detectedWear, basePrice, "rarity_base");
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

  // Fuente 4: Matriz local (solo si ya está cargada)
  if (localMatrixLoaded) {
    const matrixResult = getFromLocalMatrix(safeName, safeRarity);
    if (matrixResult) {
      setInCache(safeName, detectedWear, matrixResult.price, matrixResult.source);
      return matrixResult;
    }
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
}

export function getCacheStats() {
  return {
    cacheSize: priceCache.size,
    cacheTtlMs: CACHE_TTL_MS,
    localMatrixLoaded,
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
  loadPriceMatrix,
  clearPriceCache,
  getCacheStats,
};
