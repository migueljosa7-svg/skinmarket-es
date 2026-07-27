// src/utils/floatPreview.js
/**
 * Determines CS2 skin wear/float based on price and rarity.
 * Provides human-readable descriptions and color codes.
 */

/**
 * Wear levels from best to worst
 */
export const WEAR_LEVELS = [
  { id: "fn", label: "Factory New", range: [0.00, 0.07], multiplier: 2.0 },
  { id: "mw", label: "Minimal Wear", range: [0.07, 0.15], multiplier: 1.5 },
  { id: "ft", label: "Field-Tested", range: [0.15, 0.38], multiplier: 1.0 },
  { id: "ww", label: "Well-Worn", range: [0.38, 0.45], multiplier: 0.7 },
  { id: "bs", label: "Battle-Scarred", range: [0.45, 1.00], multiplier: 0.4 },
];

export const WEAR_COLORS = {
  fn: "#4ade80",     // Green - pristine
  mw: "#22d3ee",     // Cyan - clean
  ft: "#f5ac3b",     // Gold - average
  ww: "#fb923c",     // Orange - worn
  bs: "#ef4444",     // Red - scarred
};

/**
 * Generate a deterministic-ish float value for a skin based on its id/name
 */
export function getFloatFromName(name = "", price = 0) {
  if (!name) return { wear: "ft", wearLabel: "Field-Tested", float: (0.15 + Math.random() * 0.23).toFixed(4), color: WEAR_COLORS.ft };

  // Use name as seed for deterministic result
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const baseRandom = Math.abs((hash % 1000) / 1000);

  // Expensive skins tend to have better floats
  let wearBias = 0;
  if (price > 500) wearBias = -0.3;    // Covert/Gold often FT-MW
  else if (price > 100) wearBias = -0.15;
  else if (price < 5) wearBias = 0.2;  // Cheap skins often BS-WW

  const adjusted = Math.max(0, Math.min(1, baseRandom + wearBias));

  let wear = WEAR_LEVELS[2]; // Default FT
  for (const w of WEAR_LEVELS) {
    if (adjusted >= w.range[0] && adjusted < w.range[1]) {
      wear = w;
      break;
    }
  }

  // Generate a precise float within the wear range
  const floatInRange = wear.range[0] + (baseRandom * (wear.range[1] - wear.range[0]));
  const floatVal = parseFloat(floatInRange.toFixed(4));

  return {
    wear: wear.id,
    wearLabel: wear.label,
    float: floatVal,
    color: WEAR_COLORS[wear.id],
    isStattrak: price > 50 && baseRandom > 0.85, // ~15% chance for expensive skins
    isSouvenir: price > 200 && baseRandom > 0.95, // ~5% chance
  };
}

/**
 * Simple Float Preview Badge Component Props Generator
 */
export function getFloatBadgeProps(name, price) {
  const floatData = getFloatFromName(name, price);
  return {
    label: floatData.isStattrak ? `StatTrak™ ${floatData.wearLabel}` : floatData.wearLabel,
    color: floatData.color,
    float: floatData.float,
    extra: floatData.isStattrak ? "★" : floatData.isSouvenir ? "🎁" : "",
  };
}

