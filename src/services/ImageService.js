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
// CDN Sources (in priority order)
// ---------------------------------------------------------------------------

const CDN_SOURCES = [
  {
    name: 'Steam CDN',
    buildUrl: function(skinName) {
      if (!skinName) return null;
      return 'https://steamcommunity-a.akamaihd.net/economy/image/' + encodeURIComponent(skinName);
    },
  },
  {
    name: 'Steam CloudFlare CDN',
    buildUrl: function(skinName) {
      if (!skinName) return null;
      return 'https://community.cloudflare.steamstatic.com/economy/image/' + encodeURIComponent(skinName);
    },
  },
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSkinImageUrl(skinName, originalImage) {
  if (originalImage && !failedUrls.has(originalImage)) {
    return originalImage;
  }
  if (skinName) {
    for (var i = 0; i < CDN_SOURCES.length; i++) {
      var url = CDN_SOURCES[i].buildUrl(skinName);
      if (url && !failedUrls.has(url)) {
        return url;
      }
    }
  }
  return generatePlaceholderDataUrl(skinName);
}

export function handleImageError(event, skinName, originalImage) {
  var img = event && event.target;
  if (!img || !img.src) return;

  var currentSrc = img.src;

  if (currentSrc.indexOf('data:image/svg+xml') === 0) {
    return;
  }

  failedUrls.add(currentSrc);

  var nextUrl = getSkinImageUrl(skinName, originalImage);

  if (nextUrl !== currentSrc) {
    img.src = nextUrl;
    img.style.opacity = nextUrl.indexOf('data:image/svg+xml') === 0 ? '0.4' : '1';
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

