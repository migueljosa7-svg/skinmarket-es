/**
 * ImageService - Unified image loading service with multi-CDN fallback
 *
 * Architecture:
 * - 4-tier CDN fallback chain (Steam CloudFlare → Steam Akamai → ByMykel GitHub API → CS2 Stash)
 * - data-try-index attribute on <img> elements for tracking fallback progress
 * - Silent SVG placeholder as last resort (no console 404 errors)
 * - Per-session failed URL cache (no infinite loops)
 * - Proactive Steam hash validation to prevent browser 404 errors on first render
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
// Steam Hash Validation
// ---------------------------------------------------------------------------

/**
 * Cleans a Steam economy image hash by removing truncated/corrupted suffixes.
 * Steam hashes should be complete base64-ish strings. This function removes
 * common truncation patterns like trailing "..." or incomplete base64 padding.
 *
 * @param {string} hash - The raw Steam image hash
 * @returns {string} Cleaned hash, or empty string if invalid
 */
function cleanSteamHash(hash) {
  if (!hash || typeof hash !== 'string') return '';

  // Remove trailing ellipsis or truncation indicators
  var cleaned = hash.replace(/\.{2,}$/, '').trim();

  // Remove any non-base64 characters that might have been introduced
  cleaned = cleaned.replace(/[^a-zA-Z0-9_\-/=]/, '');

  // Ensure minimum length (genuine Steam hashes are 150+ chars)
  if (cleaned.length < 150) return '';

  return cleaned;
}

/**
 * Validates whether a Steam economy image hash appears to be genuine and not
 * truncated/corrupted. Real Steam hashes are long base64-ish strings (150+ chars)
 * that start with a dash or alphanumeric character and contain no spaces.
 *
 * @param {string} hash - The extracted Steam image hash
 * @returns {boolean} true if the hash is likely valid
 */
function isValidSteamHash(hash) {
  if (!hash || typeof hash !== 'string') return false;

  // Clean the hash first to remove truncation artifacts
  var cleanedHash = cleanSteamHash(hash);
  if (!cleanedHash) return false;

  // A real Steam hash must be sufficiently long (genuine hashes are >150 chars)
  if (cleanedHash.length < 150) return false;

  // Must not contain whitespace
  if (/\s/.test(cleanedHash)) return false;

  // Must contain only valid URL-safe base64 characters plus hyphens and underscores
  if (!/^[a-zA-Z0-9_\-/=]+$/.test(cleanedHash)) return false;

  // Genuine hashes typically start with a dash or alphanumeric character
  if (!/^[a-zA-Z0-9\-_]/.test(cleanedHash.charAt(0))) return false;

  return true;
}

// ---------------------------------------------------------------------------
// CDN Source Definitions (4-tier fallback chain — official Valve CDNs)
// ---------------------------------------------------------------------------

const CDN_TIERS = [
  {
    name: 'Steam CloudFlare CDN (Primary)',
    buildUrl: function (hash) {
      if (!hash) return null;
      return 'https://community.cloudflare.steamstatic.com/economy/image/' + hash;
    },
  },
  {
    name: 'Steam Akamai CDN',
    buildUrl: function (hash) {
      if (!hash) return null;
      return 'https://steamcommunity-a.akamaihd.net/economy/image/' + hash;
    },
  },
  {
    name: 'Steam CDN CloudFlare (Alternate)',
    buildUrl: function (hash) {
      if (!hash) return null;
      return 'https://cdn.cloudflare.steamstatic.com/economy/image/' + hash;
    },
  },
  {
    name: 'Steam Community CDN',
    buildUrl: function (hash) {
      if (!hash) return null;
      return 'https://steamcommunity.com/economy/image/' + hash;
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
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
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

function generatePlaceholderDataUrl(skinName) {
  var name = skinName || 'SKIN';
  var safeName = escapeXml(name);
  var primaryColor = hashColor(name);
  var secondaryColor = '#020617';

  var hash = name.split('').reduce(function (acc, c) { return acc + c.charCodeAt(0); }, 0);
  var cx = 30 + (hash % 40);
  var cy = 28 + (hash % 20);
  var r = 10 + (hash % 10);

  var svg = [
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

/**
 * Extract the image hash/path from a Steam economy image URL.
 * Steam economy image URLs look like:
 *   https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2U.../fx360f
 * Returns just the hash portion, or null if not a Steam URL.
 */
function extractSteamImageHash(url) {
  if (!url) return null;
  var match = url.match(/\/economy\/image\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Clean a skin name for CDN URLs: remove wear/quality suffixes,
 * replace special characters, format as expected by external APIs.
 * Example: "AK-47 | Redline (Field-Tested)" → "ak-47_redline"
 */
function cleanSkinName(name) {
  if (!name) return '';
  // Remove parenthesized wear/quality suffixes: " (Field-Tested)", " (Minimal Wear)", etc.
  var cleaned = name.replace(/\s*\([^)]*\)\s*/g, '');
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  // Lowercase
  cleaned = cleaned.toLowerCase();
  // Replace " | " with "_"
  cleaned = cleaned.replace(/\s*\|\s*/g, '_');
  // Replace remaining spaces with underscores
  cleaned = cleaned.replace(/\s+/g, '_');
  // Remove any non-alphanumeric characters except underscores and hyphens
  cleaned = cleaned.replace(/[^a-z0-9_-]/g, '');
  return cleaned;
}

// ---------------------------------------------------------------------------
// Public API: getSkinImageSources(skin) — returns ordered array of fallback URLs
// ---------------------------------------------------------------------------

/**
 * Generate the 4-tier fallback image URL array for a given skin object.
 * @param {Object} skin - Skin object with at least { name, image }
 * @returns {string[]} Ordered array of CDN URLs (may include nulls)
 */
export function getSkinImageSources(skin) {
  var sources = [];
  if (!skin) return sources;

  var skinName = skin.name || '';
  var originalImage = skin.image || '';
  var hash = extractSteamImageHash(originalImage) || skin.icon_url || '';
  var cleanName = cleanSkinName(skinName);

  // Validate the Steam hash before using it. Corrupted/truncated hashes that fail
  // validation will cause the browser to emit 404 console errors on first render.
  // Skip Steam CDN tiers entirely if the hash is not genuinely valid.
  var steamHashValid = isValidSteamHash(hash);

  // --- HASH-BASED CDNs (Priority 1-4, all official Valve CDNs) ---

  // Tier 1: Steam CloudFlare CDN (Primary)
  if (hash && steamHashValid) {
    sources.push(CDN_TIERS[0].buildUrl(hash));
  } else {
    sources.push(null);
  }

  // Tier 2: Steam Akamai CDN
  if (hash && steamHashValid) {
    sources.push(CDN_TIERS[1].buildUrl(hash));
  } else {
    sources.push(null);
  }

  // Tier 3: Steam CDN CloudFlare (Alternate)
  if (hash && steamHashValid) {
    sources.push(CDN_TIERS[2].buildUrl(hash));
  } else {
    sources.push(null);
  }

  // Tier 4: Steam Community CDN
  if (hash && steamHashValid) {
    sources.push(CDN_TIERS[3].buildUrl(hash));
  } else {
    sources.push(null);
  }

  return sources;
}

// ---------------------------------------------------------------------------
// Public API: getSkinImageUrl — backward-compatible synchronous URL resolver
// ---------------------------------------------------------------------------

export function getSkinImageUrl(skinName, originalImage) {
  // Validate the hash in the original image URL before returning it directly.
  // If the Steam hash is corrupted or truncated, skip the original URL to
  // prevent the browser from firing a 404 error on first render.
  var hash = originalImage ? extractSteamImageHash(originalImage) : null;
  var isSteamUrl = !!hash;
  var canUseOriginal = originalImage && !failedUrls.has(originalImage) && (!isSteamUrl || isValidSteamHash(hash));

  if (canUseOriginal) {
    return originalImage;
  }

  // Build a minimal skin object to generate sources
  var skin = { name: skinName, image: originalImage };
  var sources = getSkinImageSources(skin);

  // Return the first source that hasn't failed yet
  for (var i = 0; i < sources.length; i++) {
    var url = sources[i];
    if (url && !failedUrls.has(url)) {
      return url;
    }
  }

  // Last resort: SVG placeholder (no console 404 errors)
  var placeholderUrl = generatePlaceholderDataUrl(skinName);
  return placeholderUrl;
}

export function getSkinImageUrlSilent(skinName, originalImage) {
  // Same as getSkinImageUrl but with better 404 suppression
  var hash = originalImage ? extractSteamImageHash(originalImage) : null;
  var isSteamUrl = !!hash;

  // If Steam hash is invalid, skip directly to name-based CDNs
  if (isSteamUrl && !isValidSteamHash(hash)) {
    var skin = { name: skinName, image: originalImage };
    var sources = getSkinImageSources(skin);

    // Return first non-Steam, non-null source (skip invalid Steam hashes)
    for (var i = 0; i < sources.length; i++) {
      var url = sources[i];
      if (url && !failedUrls.has(url)) {
        return url;
      }
    }
  }

  // Fallback to normal logic
  return getSkinImageUrl(skinName, originalImage);
}

// ---------------------------------------------------------------------------
// Emergency Skin Replacement System
// ---------------------------------------------------------------------------

/**
 * Try to load emergency skin from local database
 * @param {string} skinId - The skin ID to look up
 * @returns {Promise<string|null>} Emergency image URL or null
 */
async function loadEmergencySkinImage(skinId) {
  try {
    // Try to load from local emergency skins directory
    const response = await fetch(`/images/emergency-skins/${skinId}.png`);
    if (response.ok) {
      return `/images/emergency-skins/${skinId}.png`;
    }

    // Try webp format
    const responseWebp = await fetch(`/images/emergency-skins/${skinId}.webp`);
    if (responseWebp.ok) {
      return `/images/emergency-skins/${skinId}.webp`;
    }

    // Try jpg format
    const responseJpg = await fetch(`/images/emergency-skins/${skinId}.jpg`);
    if (responseJpg.ok) {
      return `/images/emergency-skins/${skinId}.jpg`;
    }
  } catch (err) {
    // Silent fail - emergency images are optional
  }
  return null;
}

/**
 * Request backend to replace corrupted skin with valid one
 * @param {string} skinId - The corrupted skin ID
 * @param {number} userId - The user ID requesting replacement
 * @returns {Promise<Object|null>} Replacement skin object or null
 */
async function replaceWithValidSkin(skinId, userId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch('/api/skins/replace-corrupted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ skinId, userId })
    });

    if (response.ok) {
      const data = await response.json();
      return data.replacementSkin;
    }
  } catch (err) {
    // Silent fail
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API: handleImageError — ultra-aggressive multi-tier fallback handler
// ---------------------------------------------------------------------------

export async function handleImageError(event, skin) {
  var img = event && event.target;
  if (!img || !img.src) return;

  var currentSrc = img.src;

  // If we're already on the SVG placeholder, stop (prevent loops)
  if (currentSrc.indexOf('data:image/svg+xml') === 0) {
    return;
  }

  // Mark current URL as failed for this session
  failedUrls.add(currentSrc);

  // Get or initialize the try index
  var tryIndex = parseInt(img.getAttribute('data-try-index'), 10) || 0;

  // Get the fallback sources for this skin
  var sources = getSkinImageSources(skin);

  // Try next CDN in chain
  if (tryIndex < sources.length) {
    var nextUrl = sources[tryIndex];

    if (nextUrl && !failedUrls.has(nextUrl) && nextUrl !== currentSrc) {
      img.setAttribute('data-try-index', tryIndex + 1);
      img.src = nextUrl;
      img.style.opacity = '1';
      img.style.objectFit = 'contain';
      return;
    }

    // This source is null or already failed, skip to next
    img.setAttribute('data-try-index', tryIndex + 1);
    // Retry with incremented index (will pick next non-null source)
    handleImageError(event, skin);
    return;
  }

  // All CDNs exhausted: Try emergency skin database (Level 1)
  if (skin && skin.id) {
    var emergencyUrl = await loadEmergencySkinImage(skin.id);
    if (emergencyUrl) {
      img.onerror = null;
      img.src = emergencyUrl;
      img.style.opacity = '1';
      img.style.objectFit = 'contain';
      img.removeAttribute('data-try-index');
      return;
    }

    // No emergency image: Request backend replacement (Level 2 - Critical)
    var userId = skin.userId || getCurrentUserId();
    if (userId) {
      var replacementSkin = await replaceWithValidSkin(skin.id, userId);
      if (replacementSkin && replacementSkin.image) {
        // Update the skin object in place if possible
        if (skin.image !== replacementSkin.image) {
          skin.image = replacementSkin.image;
          skin.name = replacementSkin.name;
        }

        img.onerror = null;
        img.src = replacementSkin.image;
        img.style.opacity = '1';
        img.style.objectFit = 'contain';
        img.removeAttribute('data-try-index');

        // Dispatch custom event to notify UI of replacement
        window.dispatchEvent(new CustomEvent('skinReplaced', {
          detail: { originalSkin: skin, replacementSkin: replacementSkin }
        }));
        return;
      }
    }
  }

  // All fallbacks exhausted: silent SVG placeholder fallback
  // Disable further error handling to prevent infinite loops
  img.onerror = null;

  // Assign SVG data URL placeholder silently
  var placeholderUrl = generatePlaceholderDataUrl(skin && skin.name);
  img.src = placeholderUrl;
  img.style.opacity = '0.4';
  img.style.objectFit = 'contain';

  // Remove data-try-index since we've exhausted all sources
  img.removeAttribute('data-try-index');
}

/**
 * Get current user ID from localStorage
 * @returns {string|null} User ID or null
 */
function getCurrentUserId() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.usuario_id || user.id || null;
    }
  } catch (err) {
    // Silent fail
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API: Utility functions
// ---------------------------------------------------------------------------

export function getPlaceholderImage(skinName) {
  return generatePlaceholderDataUrl(skinName);
}

export function resetImageCache() {
  failedUrls.clear();
}

export async function preloadSkinImage(skinName, originalImage) {
  return new Promise(function (resolve) {
    var url = getSkinImageUrl(skinName, originalImage);
    var img = new Image();
    img.onload = function () { resolve(url); };
    img.onerror = async function () {
      failedUrls.add(url);

      // Try emergency skin if original fails
      var skin = { name: skinName, image: originalImage };
      var emergencyUrl = await loadEmergencySkinImage(skinName);
      if (emergencyUrl) {
        resolve(emergencyUrl);
      } else {
        resolve(getSkinImageUrl(skinName, originalImage));
      }
    };
    img.src = url;
  });
}

export default {
  getSkinImageUrl: getSkinImageUrl,
  getSkinImageSources: getSkinImageSources,
  handleImageError: handleImageError,
  getPlaceholderImage: getPlaceholderImage,
  resetImageCache: resetImageCache,
  preloadSkinImage: preloadSkinImage,
};
