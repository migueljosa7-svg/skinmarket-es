/**
 * ImageService - Unified image loading service with multi-CDN fallback
 * 
 * Architecture:
 * - Multiple CDN sources with automatic fallback chain
 * - Per-session failed URL cache (no infinite loops)
 * - SVG placeholder generation as last resort
 * 
 * No external dependencies. 100% offline compatible placeholder generation.
 */

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/** Set of URLs that have failed in this session to prevent infinite retries */
const failedUrls = new Set();

/** CSS color array for gradient placeholders */
const GRADIENT_COLORS = [
  '#6366f1', '#3b82f6', '#0891b2', '#06b6d4',
  '#10b981', '#f59e0b', '#ec4899', '#a855f7',
  '#8b5cf6', '#f43f5e', '#14b8a6', '#eab308',
];

// ---------------------------------------------------------------------------
// Placeholder Generation (Inline SVG -> Data URL)
// ---------------------------------------------------------------------------

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function hashColor(name) {
  if (!name) return GRADIENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

function generatePlaceholderDataUrl(skinName) {
  const name = skinName || 'SKIN';
  const safeName = escapeXml(name);
  const primaryColor = hashColor(name);
  const secondaryColor = '#020617';

  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cx = 30 + (hash % 40);
  const cy = 28 + (hash % 20);
  const r = 10 + (hash % 10);

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">',
    '<defs>',
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" stop-color="' + secondaryColor + '"/>',
    '<stop offset="100%" stop-color="' + primaryColor + '22"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="200" height="150" fill="url(#bg)" rx="12"/>',
    '<path d="M' + (cx - r) + ' ' + (cy + r) + ' Q' + cx + ' ' + (cy - r * 0.5) + ' ' + (cx + r) + ' ' + (cy + r) + '" fill="' + primaryColor + '44"/>',
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + primaryColor + '33"/>',
    '<circle cx="160" cy="20" r="6" fill="' + primaryColor + '"/>',
    '<circle cx="160" cy="20" r="10" fill="' + primaryColor + '22"/>',
    '<text x="100" y="130" font-size="11" text-anchor="middle" fill="#ffffff99" font-family="monospace" font-weight="600">' + safeName + '</text>',
    '<text x="100" y="145" font-size="8" text-anchor="middle" fill="#ffffff44" font-family="monospace">SKINMARKET</text>',
    '</svg>'
  ].join('\n');

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ---------------------------------------------------------------------------
// Steam CDN Base Domains (for hash-based URL fallback)
// ---------------------------------------------------------------------------

const STEAM_CDN_DOMAINS = [
  'https://community.steamstatic.com/economy/image',
  'https://steamcommunity-a.akamaihd.net/economy/image',
  'https://community.cloudflare.steamstatic.com/economy/image',
];

// ---------------------------------------------------------------------------
// CDN Sources (in priority order)
// ---------------------------------------------------------------------------

const CDN_SOURCES = [
  {
    name: 'CSGOFloat API',
    buildUrl: function(skinName) {
      if (!skinName) return null;
      return 'https://api.csgofloat.com/api/item_image/' + encodeURIComponent(skinName);
    },
  },
  {
    name: 'CSGO CDN',
    buildUrl: function(skinName) {
      if (!skinName) return null;
      return 'https://cdn.csgo.com/images/items/' + encodeURIComponent(skinName);
    },
  },
];

/**
 * Extract the image hash/path from a Steam economy image URL.
 * Steam economy image URLs look like:
 *   https://community.steamstatic.com/economy/image/-9a81dlWLwJ2U.../fx360f
 * Returns just the hash portion, or null if not a Steam URL.
 */
function extractSteamImageHash(url) {
  if (!url) return null;
  // Match Steam economy image pattern: /economy/image/<hash>
  const match = url.match(/\/economy\/image\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Build a Steam economy image URL using a specific CDN domain and image hash.
 */
function buildSteamCdnUrl(domain, hash) {
  if (!domain || !hash) return null;
  // Append a quality suffix for better resolution
  return domain + '/' + hash + '/fx360f';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSkinImageUrl(skinName, originalImage) {
  // If the original image URL hasn't failed yet, use it
  if (originalImage && !failedUrls.has(originalImage)) {
    return originalImage;
  }

  // If originalImage is a Steam URL that failed, try alternative Steam CDN domains
  // using the same image hash (much more reliable than constructing from skin name)
  if (originalImage) {
    var hash = extractSteamImageHash(originalImage);
    if (hash) {
      for (var s = 0; s < STEAM_CDN_DOMAINS.length; s++) {
        var altUrl = buildSteamCdnUrl(STEAM_CDN_DOMAINS[s], hash);
        if (altUrl && !failedUrls.has(altUrl) && altUrl !== originalImage) {
          return altUrl;
        }
      }
    }
  }

  // Fall back to name-based CDN sources (CSGOFloat, CSGO CDN)
  if (skinName) {
    for (var i = 0; i < CDN_SOURCES.length; i++) {
      var url = CDN_SOURCES[i].buildUrl(skinName);
      if (url && !failedUrls.has(url)) {
        return url;
      }
    }
  }

  // Last resort: SVG placeholder
  return generatePlaceholderDataUrl(skinName);
}

export function handleImageError(event, skinName, originalImage) {
  var img = event && event.target;
  if (!img || !img.src) return;

  var currentSrc = img.src;

  // Stop if we've already fallen back to the placeholder
  if (currentSrc.indexOf('data:image/svg+xml') === 0) {
    return;
  }

  // Mark the current URL as failed
  failedUrls.add(currentSrc);

  // Get the next URL to try (will skip failed URLs automatically)
  var nextUrl = getSkinImageUrl(skinName, originalImage);

  if (nextUrl !== currentSrc) {
    img.src = nextUrl;
    var isPlaceholder = nextUrl.indexOf('data:image/svg+xml') === 0;
    img.style.opacity = isPlaceholder ? '0.4' : '1';
    img.style.objectFit = 'contain';
  }
}

export function getPlaceholderImage(skinName) {
  return generatePlaceholderDataUrl(skinName);
}

export function resetImageCache() {
  failedUrls.clear();
}

export function preloadSkinImage(skinName, originalImage) {
  return new Promise(function(resolve) {
    var url = getSkinImageUrl(skinName, originalImage);
    var img = new Image();
    img.onload = function() { resolve(url); };
    img.onerror = function() {
      failedUrls.add(url);
      resolve(getSkinImageUrl(skinName, originalImage));
    };
    img.src = url;
  });
}

export default {
  getSkinImageUrl: getSkinImageUrl,
  handleImageError: handleImageError,
  getPlaceholderImage: getPlaceholderImage,
  resetImageCache: resetImageCache,
  preloadSkinImage: preloadSkinImage,
};

