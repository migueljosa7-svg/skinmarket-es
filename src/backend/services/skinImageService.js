/**
 * ============================================================
 * SKINMARKET ES - SKIN IMAGE SERVICE (REAL STEAM HASHES)
 * ============================================================
 * Resolves GENUINE Steam economy image hashes from the official
 * CSGO-API skin database (ByMykel/CSGO-API), the same source
 * used by the frontend useFetchSkins hook.
 *
 * Why this exists:
 *   The old server-side `generateIconUrlHash()` fabricated fake
 *   Steam hashes by permuting a single base string. Steam's CDN
 *   does not recognize those hashes, so every opened case / daily
 *   reward item produced a 404 image URL.
 *
 * This service lazily fetches the real skin database once, builds
 * a `market_hash_name -> icon_url_hash` map, and resolves real
 * hashes for items inserted by the backend.
 *
 * No external dependencies beyond global fetch (Node 18+).
 * ============================================================
 */

const SKINS_API = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

let skinsMap = null;     // Map<lowercased market_hash_name, iconUrlHash>
let loadPromise = null;
let lastLoad = 0;

/**
 * Extract the raw Steam economy image hash from a CDN URL.
 * @param {string} imageUrl - e.g. https://community.cloudflare.steamstatic.com/economy/image/HASH/360fx360f
 * @returns {string} The hash, or empty string if not extractable
 */
function extractHash(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const match = imageUrl.match(/\/economy\/image\/([^/?#]+)/);
  if (match && match[1]) {
    return match[1].replace(/\/[^/]+$/, '');
  }
  // If it's already just a bare hash
  if (/^[-a-zA-Z0-9_/=]{50,}$/.test(imageUrl.trim())) {
    return imageUrl.trim();
  }
  return '';
}

/**
 * Lazily load and cache the CSGO-API skin database.
 * @returns {Promise<Map<string, string>>} lowercased name -> hash map
 */
async function loadSkins() {
  if (skinsMap && Date.now() - lastLoad < CACHE_TTL_MS) return skinsMap;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(SKINS_API, {
        headers: { 'User-Agent': 'Mozilla/5.0 (SkinMarketES Backend)' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Formato inválido de CSGO-API');

      const map = new Map();
      for (const skin of data) {
        if (skin.market_hash_name && skin.image) {
          const hash = extractHash(skin.image);
          if (hash) {
            map.set(skin.market_hash_name.toLowerCase(), hash);
          }
        }
      }

      skinsMap = map;
      lastLoad = Date.now();
      if (map.size > 0) {
        console.log(`[SkinImageService] ✅ ${map.size} hashes reales cargados desde CSGO-API`);
      }
      return map;
    } catch (err) {
      console.error('[SkinImageService] ❌ No se pudo cargar CSGO-API:', err.message);
      // Keep any previously loaded map; otherwise empty map (no crash)
      skinsMap = skinsMap || new Map();
      lastLoad = Date.now();
      return skinsMap;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Normalize a skin name for map lookup.
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
  return String(name || '').toLowerCase().trim();
}

/**
 * Get the real Steam icon_url hash for a skin name.
 * Falls back through several matching strategies:
 *   1. Exact market_hash_name match (with wear)
 *   2. Base name match (without wear)
 *   3. Partial includes match (first hit)
 *
 * @param {string} name - e.g. "AK-47 | Redline (Field-Tested)"
 * @returns {Promise<string>} Real Steam hash, or '' if not found
 */
export async function getSkinIconHash(name) {
  if (!name) return '';
  const map = await loadSkins();

  const key = normalizeName(name);
  if (map.has(key)) return map.get(key);

  // Try without wear suffix: "AK-47 | Redline (Field-Tested)" -> "ak-47 | redline"
  const base = key.replace(/\s*\((factory new|minimal wear|field-tested|well-worn|battle-scarred)\)\s*$/, '');
  if (base && map.has(base)) return map.get(base);

  // Partial fallback (first includes match, bounded)
  let checked = 0;
  for (const [k, hash] of map.entries()) {
    if (checked++ > 3000) break;
    if (k.includes(key) || (base && k.includes(base))) return hash;
  }

  return '';
}

/**
 * Build a full HD Steam economy CDN URL for a skin name.
 * @param {string} name - Skin name
 * @param {string} size - Steam size suffix (e.g. "360fx360f")
 * @returns {Promise<string>} Full URL or '' if no real hash exists
 */
export async function buildSkinImageUrl(name, size = '360fx360f') {
  const hash = await getSkinIconHash(name);
  if (!hash) return '';
  return `https://steamcommunity-a.akamaihd.net/economy/image/${hash}/${size}`;
}

export default {
  getSkinIconHash,
  buildSkinImageUrl
};

