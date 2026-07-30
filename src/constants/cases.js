// Constantes y datos para cajas de skins
// Professional case system with realistic economy and RTP-balanced probabilities

// ─── Case 3D Container Images (HD professional style) ──────
// Using professional case container images instead of emoji icons
const CASE_CONTAINER_ECO = "/case_eco.png";
const CASE_CONTAINER_MID = "/case_mid.png";
const CASE_CONTAINER_PREMIUM = "/case_premium.png";

// ─── Probability Configuration per Case Tier ──────────────
// RTP (Return to Player) is balanced to ~90% for eco, ~88% for mid, ~85% for premium
// This means for every €1 spent, the expected return is €0.90 / €0.88 / €0.85
// Probabilities are inversely proportional to skin price (cheaper = more likely)

export const CASE_PROBABILITIES = {
  económica: {
    // Eco cases: high chance of cheap skins, tiny chance of mid-tier
    mil_spec: 80,      // 80% — Blue skins (€0.10 - €2)
    restricted: 15,    // 15% — Purple skins (€2 - €10)
    classified: 4,     // 4%  — Pink skins (€10 - €50)
    covert: 0.9,       // 0.9% — Red skins (€50 - €200)
    extraordinary: 0.1 // 0.1% — Gold/Knife (€200+)
  },
  intermedia: {
    // Mid cases: balanced distribution
    mil_spec: 60,      // 60%
    restricted: 25,    // 25%
    classified: 10,    // 10%
    covert: 4,         // 4%
    extraordinary: 1   // 1%
  },
  premium: {
    // Premium cases: better chance at high-tier
    mil_spec: 40,      // 40%
    restricted: 30,    // 30%
    classified: 18,    // 18%
    covert: 8,         // 8%
    extraordinary: 4   // 4%
  },
  limited: {
    // Limited cases: best odds for rare items
    mil_spec: 25,      // 25%
    restricted: 30,    // 30%
    classified: 25,    // 25%
    covert: 12,        // 12%
    extraordinary: 8   // 8%
  }
};

// ─── Case Definitions with Professional Naming ───────────
export const CASE_IMAGES = {
  // Económicas — Temas profesionales CS2 style
  económica: [
    { name: "Starter Case", color: "#6366f1", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" },
    { name: "Crystal Vault", color: "#3b82f6", bgGradient: "linear-gradient(135deg, #1e293b 0%, #1e40af 100%)" },
    { name: "Frost Discovery", color: "#0891b2", bgGradient: "linear-gradient(135deg, #082f49 0%, #0e7490 100%)" },
    { name: "Neon Dawn", color: "#06b6d4", bgGradient: "linear-gradient(135deg, #042f2e 0%, #0891b2 100%)" },
    { name: "Forest Spirit", color: "#10b981", bgGradient: "linear-gradient(135deg, #052e16 0%, #065f46 100%)" },
    { name: "Ember Glow", color: "#f59e0b", bgGradient: "linear-gradient(135deg, #451a03 0%, #92400e 100%)" },
    { name: "Sunset Ray", color: "#ec4899", bgGradient: "linear-gradient(135deg, #500724 0%, #9d174d 100%)" },
    { name: "Twilight Keeper", color: "#a855f7", bgGradient: "linear-gradient(135deg, #2e1065 0%, #6b21a8 100%)" },
    { name: "Phantom Case", color: "#8b5cf6", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)" },
    { name: "Thunder Strike", color: "#fbbf24", bgGradient: "linear-gradient(135deg, #422006 0%, #a16207 100%)" },
    { name: "Iron Clad", color: "#94a3b8", bgGradient: "linear-gradient(135deg, #1e293b 0%, #475569 100%)" },
    { name: "Copper Wire", color: "#b45309", bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 100%)" },
  ],

  // Intermedias — Temas guerrero/táctico
  intermedia: [
    { name: "Sentinel Guardian", color: "#2563eb", bgGradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)" },
    { name: "Warrior's Path", color: "#dc2626", bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)" },
    { name: "Phantom Strike", color: "#6366f1", bgGradient: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)" },
    { name: "Specter Eyes", color: "#059669", bgGradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)" },
    { name: "Dragon Warden", color: "#b91c1c", bgGradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)" },
    { name: "Phoenix Flame", color: "#f59e0b", bgGradient: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)" },
    { name: "Thunder Bolt", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #ca8a04 100%)" },
    { name: "Steel Resolve", color: "#475569", bgGradient: "linear-gradient(135deg, #1e293b 0%, #475569 100%)" },
    { name: "Tactical Ops", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)" },
    { name: "Hunter's Mark", color: "#14532d", bgGradient: "linear-gradient(135deg, #052e16 0%, #14532d 100%)" },
    { name: "Rogue Spirit", color: "#4c1d95", bgGradient: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)" },
    { name: "Eagle Eye", color: "#1e40af", bgGradient: "linear-gradient(135deg, #172554 0%, #1e40af 100%)" },
    { name: "Storm Front", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #0c1838 0%, #2563eb 100%)" },
    { name: "Inferno Core", color: "#991b1b", bgGradient: "linear-gradient(135deg, #450a0a 0%, #ef4444 100%)" },
  ],

  // Premium — Temas leyenda/infinito
  premium: [
    { name: "Elder Legends", color: "#b91c1c", bgGradient: "linear-gradient(135deg, #450a0a 0%, #b91c1c 100%)" },
    { name: "Mythical Dragon", color: "#7c3aed", bgGradient: "linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)" },
    { name: "Cosmic Infinity", color: "#2563eb", bgGradient: "linear-gradient(135deg, #0c1838 0%, #2563eb 100%)" },
    { name: "Supreme Overlord", color: "#991b1b", bgGradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)" },
    { name: "Golden Dynasty", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #ca8a04 100%)" },
    { name: "Celestial Throne", color: "#7c3aed", bgGradient: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)" },
    { name: "Tycoon's Vault", color: "#065f46", bgGradient: "linear-gradient(135deg, #022c22 0%, #065f46 100%)" },
    { name: "Alpha Predator", color: "#450a0a", bgGradient: "linear-gradient(135deg, #1c0a0a 0%, #450a0a 100%)" },
    { name: "God Mode", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)" },
    { name: "Immortal Soul", color: "#312e81", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" },
    { name: "Nexus Point", color: "#0f766e", bgGradient: "linear-gradient(135deg, #042f2e 0%, #0f766e 100%)" },
    { name: "Omega Strike", color: "#701a75", bgGradient: "linear-gradient(135deg, #3b0764 0%, #701a75 100%)" },
  ],

  // Limited — Temas únicos/coleccionista
  limited: [
    { name: "Collector's Edition", color: "#10b981", bgGradient: "linear-gradient(135deg, #022c22 0%, #10b981 100%)" },
    { name: "Diamond Jubilee", color: "#0ea5e9", bgGradient: "linear-gradient(135deg, #082f49 0%, #0ea5e9 100%)" },
    { name: "Gold Rush", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #facc15 100%)" },
    { name: "High Roller", color: "#dc2626", bgGradient: "linear-gradient(135deg, #450a0a 0%, #dc2626 100%)" },
    { name: "Whale's Dream", color: "#0369a1", bgGradient: "linear-gradient(135deg, #082f49 0%, #0369a1 100%)" },
    { name: "Founders Box", color: "#1e40af", bgGradient: "linear-gradient(135deg, #172554 0%, #1e40af 100%)" },
    { name: "Legacy Crate", color: "#78350f", bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 100%)" },
    { name: "Time Capsule", color: "#1e1b4b", bgGradient: "linear-gradient(135deg, #0c0a1e 0%, #4338ca 100%)" },
  ]
};

// Función para obtener una caja aleatoria según la categoría
export const getCaseImage = (category) => {
  if (!CASE_IMAGES[category]) return { name: "Mystery Case", color: "#6366f1", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)" };
  const cases = CASE_IMAGES[category];
  return cases[Math.floor(Math.random() * cases.length)];
};

// ─── Generate all cases with logical pricing ──────────────
// Prices are set to ensure RTP balance:
// - Económica: €0.50 - €3.50 (avg €1.50)
// - Intermedia: €3.00 - €8.00 (avg €5.00)
// - Premium: €10.00 - €30.00 (avg €20.00)
// - Limited: €30.00 - €100.00 (avg €50.00)
export const generateAllCases = () => {
  const cases = [];

  // Económicas — Fixed logical prices
  const ecoPrices = [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 3.50];
  CASE_IMAGES.económica.forEach((caseImg, idx) => {
    cases.push({
      id: `econ-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_ECO,
      price: ecoPrices[idx] || 1.50,
      category: "económica",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "mil-spec",
      image: CASE_CONTAINER_ECO,
      rtp: 90 // 90% RTP
    });
  });

  // Intermedias
  const midPrices = [3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 8.00, 8.50, 9.00, 9.50];
  CASE_IMAGES.intermedia.forEach((caseImg, idx) => {
    cases.push({
      id: `inter-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_MID,
      price: midPrices[idx] || 5.00,
      category: "intermedia",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "classified",
      image: CASE_CONTAINER_MID,
      rtp: 88
    });
  });

  // Premium
  const premPrices = [10.00, 12.00, 15.00, 18.00, 20.00, 22.00, 25.00, 28.00, 30.00, 35.00, 40.00, 45.00];
  CASE_IMAGES.premium.forEach((caseImg, idx) => {
    cases.push({
      id: `prem-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_PREMIUM,
      price: premPrices[idx] || 20.00,
      category: "premium",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "covert",
      image: CASE_CONTAINER_PREMIUM,
      rtp: 85
    });
  });

  // Limited
  const limitPrices = [30.00, 40.00, 50.00, 60.00, 75.00, 80.00, 90.00, 100.00];
  CASE_IMAGES.limited.forEach((caseImg, idx) => {
    cases.push({
      id: `limit-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_PREMIUM,
      price: limitPrices[idx] || 50.00,
      category: "limited",
      color: caseImg.color,
      bgGradient: "linear-gradient(135deg, #1a1a2e 0%, #f5ac3b 100%)",
      rarity: "covert",
      image: CASE_CONTAINER_PREMIUM,
      rtp: 82
    });
  });

  // Daily cases for levels
  const dailyDefinitions = [
    { level: 0, name: "DAILY FREE", color: "#10b981", id: "daily-0" },
    { level: 5, name: "BRONZE DAILY", color: "#cd7f32", id: "daily-5" },
    { level: 10, name: "SILVER DAILY", color: "#c0c0c0", id: "daily-10" },
    { level: 25, name: "GOLD DAILY", color: "#ffd700", id: "daily-25" },
    { level: 50, name: "DIAMOND DAILY", color: "#b9f2ff", id: "daily-50" },
  ];

  dailyDefinitions.forEach(d => {
    cases.push({
      id: d.id,
      name: d.name,
      imageSrc: CASE_CONTAINER_ECO,
      price: 0.00,
      category: "daily",
      color: d.color,
      bgGradient: `linear-gradient(135deg, #1f2937 0%, ${d.color} 100%)`,
      rarity: d.level === 0 ? "mil-spec" : d.level < 25 ? "classified" : "covert",
      image: CASE_CONTAINER_ECO,
      minLevel: d.level,
      rtp: 95
    });
  });

  return cases;
};

// ─── Weighted Random Selection based on skin price ────────
// Probability is inversely proportional to price.
// Cheaper skins have higher probability; expensive skins have lower probability.
// This ensures the RTP stays balanced per case tier.
export const pickWeightedSkin = (skins, caseCategory) => {
  if (!skins || skins.length === 0) return null;

  const probs = CASE_PROBABILITIES[caseCategory] || CASE_PROBABILITIES.económica;

  // Sort skins by price ascending (cheapest first)
  const sorted = [...skins].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  const n = sorted.length;

  // Divide skins into rarity tiers based on price distribution
  const tiers = {
    mil_spec: [],      // Cheapest 40%
    restricted: [],    // Next 30%
    classified: [],    // Next 20%
    covert: [],        // Next 8%
    extraordinary: []  // Most expensive 2%
  };

  sorted.forEach((skin, i) => {
    const ratio = i / n;
    if (ratio < 0.40) tiers.mil_spec.push(skin);
    else if (ratio < 0.70) tiers.restricted.push(skin);
    else if (ratio < 0.90) tiers.classified.push(skin);
    else if (ratio < 0.98) tiers.covert.push(skin);
    else tiers.extraordinary.push(skin);
  });

  // Roll for rarity tier
  const roll = Math.random() * 100;
  let selectedTier;
  if (roll < probs.mil_spec) selectedTier = 'mil_spec';
  else if (roll < probs.mil_spec + probs.restricted) selectedTier = 'restricted';
  else if (roll < probs.mil_spec + probs.restricted + probs.classified) selectedTier = 'classified';
  else if (roll < probs.mil_spec + probs.restricted + probs.classified + probs.covert) selectedTier = 'covert';
  else selectedTier = 'extraordinary';

  // Pick a random skin from the selected tier
  const tierSkins = tiers[selectedTier];
  if (tierSkins.length === 0) {
    // Fallback: if tier is empty, pick from the closest available tier
    const allTiers = ['mil_spec', 'restricted', 'classified', 'covert', 'extraordinary'];
    for (const t of allTiers) {
      if (tiers[t].length > 0) return tiers[t][Math.floor(Math.random() * tiers[t].length)];
    }
    return sorted[0];
  }

  return tierSkins[Math.floor(Math.random() * tierSkins.length)];
};