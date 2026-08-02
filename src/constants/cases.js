// Constantes y datos para cajas de skins
// Professional case system with realistic economy and RTP-balanced probabilities

// ─── Case 3D Container Images (HD professional style) ──────
// Using professional case container images instead of emoji icons
const CASE_CONTAINER_ECO = "/case_eco.png";
const CASE_CONTAINER_MID = "/case_mid.png";
const CASE_CONTAINER_PREMIUM = "/case_premium.png";
const CASE_CONTAINER_COVERT = "/case_covert.svg";
const CASE_CONTAINER_KNIFE = "/case_knife.svg";
const CASE_CONTAINER_VIP = "/case_vip.svg";
const CASE_CONTAINER_RARE = "/case_rare.svg";
const CASE_CONTAINER_LEGENDARY = "/case_legendary.svg";

// ─── Container Image Mapping by Category ──────────────
const CONTAINER_BY_CATEGORY = {
  económica: CASE_CONTAINER_ECO,
  intermedia: CASE_CONTAINER_MID,
  premium: CASE_CONTAINER_PREMIUM,
  limited: CASE_CONTAINER_COVERT,
  risk: CASE_CONTAINER_KNIFE
};

const getContainerForCase = (caseObj) => {
  // Daily cases have their own progression
  if (caseObj.category === "daily") {
    if (caseObj.level >= 170) return CASE_CONTAINER_LEGENDARY;
    if (caseObj.level >= 80) return CASE_CONTAINER_KNIFE;
    if (caseObj.level >= 50) return CASE_CONTAINER_VIP;
    if (caseObj.level >= 15) return CASE_CONTAINER_RARE;
    return CASE_CONTAINER_ECO;
  }
  return CONTAINER_BY_CATEGORY[caseObj.category] || CASE_CONTAINER_ECO;
};

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
  },
  risk: {
    // Risk Zone: high volatility — 75% RTP, extreme variance
    // 50% chance of losing (mil-spec cheap), 30% mid, 15% good, 5% jackpot
    mil_spec: 50,      // 50% — Cheap blues (€0.10 - €2)
    restricted: 30,    // 30% — Purple (€2 - €15)
    classified: 12,    // 12% — Pink (€15 - €60)
    covert: 5,         // 5%  — Red (€60 - €300)
    extraordinary: 3   // 3%  — Gold/Knife (€300+)
  }
};

// ─── SKIN CATALOGS BY CASE TIER ──────────────────────────
// Each tier has a curated list of real CS2 skins with realistic prices
// Higher tiers have better skins and higher max prices

export const SKIN_CATALOGS = {
  económica: {
    weapons: ["Glock-18", "USP-S", "P2000", "MP9", "MAC-10", "MP7", "UMP-45", "P90", "PP-Bizon", "Nova", "XM1014", "MAG-7", "Sawed-Off", "Negev", "M249"],
    skins: [
      "Groundwater", "Candy Apple", "Forest DDPAT", "Bone Mask", "Anodized Navy", "Sandstorm", "Blue Streak", "Urban DDPAT",
      "Pink DDPAT", "Mudder", "Cobalt Quartz", "Scorpion", "Silver", "Nuclear Threat", "The Emperor", "Bismuth",
      "Neon Rider", "Urban Shock", "Harvester", "Impire", "Bunsen Burner", "Torn", "Fade", "Ergo",
      "Bullet Queen", "Cortex", "Sweeper", "Night", "Tread", "Slate", "Flame", "Acid Wash"
    ],
    priceRange: [0.10, 3.00],
    avgPrice: 0.80
  },

  intermedia: {
    weapons: ["AK-47", "M4A4", "M4A1-S", "AWP", "FAMAS", "Galil AR", "SSG 08", "SG 553", "AUG", "G3SG1", "SCAR-20", "Desert Eagle", "Tec-9", "Five-SeveN", "CZ75-Auto"],
    skins: [
      "Redline", "Vulcan", "Asiimov", "Hyper Beast", "Neon Rider", "Bloodsport", "Phantom Disruptor", "Mecha Industries",
      "Safari Mesh", "Boreal Forest", "Sand Dune", "Predator", "Tornado", "Scorched", "Jungle", "Urban", "Army", "Contractor",
      "Wasteland Rebel", "Fuel Injector", "Frontside Misty", "Aqua Terrace", "Sunset Storm", "Printstream", "Monkey Business",
      "Neon Revolution", "X-Ray", "Vice", "Empress", "Wild Lotus", "Desolate Space", "Atheris", "Cobra Strike"
    ],
    priceRange: [3.00, 25.00],
    avgPrice: 8.00
  },

  premium: {
    weapons: ["AK-47", "M4A4", "M4A1-S", "AWP", "Desert Eagle", "USP-S", "Glock-18", "P250", "Five-SeveN", "Tec-9"],
    skins: [
      "Asiimov", "Hyper Beast", "Neon Rider", "Bloodsport", "Phantom Disruptor", "Mecha Industries", "Wasteland Rebel",
      "Fuel Injector", "Frontside Misty", "Aqua Terrace", "Sunset Storm", "Printstream", "Monkey Business", "Wild Lotus",
      "Neon Revolution", "X-Ray", "Cortex", "Duality", "Atheris", "Vice", "Cobra Strike", "Jungle Slipstream",
      "Empress", "The Empress", "Poseidon", "Medusa", "Knight", "Stainless", "Hot Rod", "Blaze",
      "Kill Confirmed", "Fever Dream", "Blue Gem", "Royal Paladin", "Exo", "Deft"
    ],
    priceRange: [15.00, 150.00],
    avgPrice: 45.00
  },

  limited: {
    weapons: ["AK-47", "M4A4", "M4A1-S", "AWP", "Desert Eagle", "USP-S", "Glock-18", "★ Karambit", "★ Butterfly Knife", "★ Flip Knife", "★ Talon Knife", "★ M9 Bayonet", "★ Bowie Knife", "★ Huntsman Knife", "★ Falchion Knife", "★ Shadow Daggers", "★ Ursus Knife", "★ Navaja Knife", "★ Stiletto Knife", "★ Classic Knife", "★ Survival Knife", "★ Nomad Knife", "★ Skeleton Knife", "★ Paracord Knife"],
    skins: [
      "Dragon Lore", "Howl", "Medusa", "Gungnir", "Souvenir AWP | Dragon Lore",
      "Prince", "Princess", "Empress", "The Empress",
      "Doppler", "Fade", "Marble Fade", "Crimson Web", "Case Hardened", "Tiger Tooth", "Lore",
      "Gamma Doppler", "Autotronic", "Black Laminate", "Ultraviolet",
      "Doppler Phase 2", "Doppler Phase 4", "Emerald", "Ruby", "Sapphire",
      "Slaughter", "Night", "Damascus Steel", "Urban Masked",
      "Fade", "Tiger Tooth", "Marble Fade", "Doppler", "Lore",
      "Crimson Web", "Ultraviolet", "Autotronic", "Gamma Doppler",
      "Baggage", "Forest DDPAT", "Crimson Web", "Boreal Forest",
      "Chromatic Aberration", "Spider Lily", "Desolação", "Inheritance", "Contamination"
    ],
    priceRange: [50.00, 2500.00],
    avgPrice: 350.00
  },
  risk: {
    // Risk Zone: high volatility — knives, gloves, or bust
    weapons: ["AK-47", "AWP", "M4A4", "M4A1-S", "Desert Eagle", "USP-S", "Glock-18", "★ Karambit", "★ Butterfly Knife", "★ M9 Bayonet", "★ Talon Knife", "★ Flip Knife", "★ Shadow Daggers", "★ Specialist Gloves", "★ Sport Gloves", "★ Driver Gloves", "★ Hand Wraps"],
    skins: [
      "Asiimov", "Redline", "Vulcan", "Hyper Beast", "Neon Rider", "Dragon Lore", "Howl",
      "Doppler", "Fade", "Marble Fade", "Crimson Web", "Case Hardened", "Tiger Tooth", "Lore",
      "Gamma Doppler", "Autotronic", "Black Laminate", "Ultraviolet",
      "Doppler Phase 2", "Doppler Phase 4", "Emerald", "Ruby", "Sapphire",
      "Slaughter", "Night", "Damascus Steel", "Urban Masked",
      "Pandora's Box", "King Snake", "Overprint", "Slingshot", "Hedge Maze",
      "Chromatic Aberration", "Spider Lily", "Desolação", "Inheritance", "Contamination",
      "Kill Confirmed", "Fever Dream", "Blue Gem", "Royal Paladin"
    ],
    priceRange: [0.50, 500.00],
    avgPrice: 25.00
  }
};

// ─── Level-Based Daily Cases (KeyDrop-style) ─────────────
// Escalado hasta Nivel 360 - Sistema VIP Supreme
// Unlocked by user level (based on total deposited volume)
// Cada caja tiene temática, gradiente, glow y borde ÚNICOS
export const DAILY_CASES_BY_LEVEL = [
  {
    level: 0,
    name: "DAILY FREE",
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #052e16 0%, #10b981 100%)",
    badge: "FREE",
    rtp: 95,
    minDeposit: 0,
    caseId: "daily-0",
    category: "económica",
    maxSkinPrice: 5.00,
    knifeChance: 0,
    gloveChance: 0,
    description: "Caja diaria gratuita para nuevos usuarios",
    theme: "Crystal",
    glowColor: "#10b981",
    borderGlow: "0 0 30px rgba(16,185,129,0.3)",
    icon: "diamond"
  },
  {
    level: 5,
    name: "BRONZE DAILY",
    color: "#cd7f32",
    bgGradient: "linear-gradient(135deg, #1a0a00 0%, #cd7f32 100%)",
    badge: "BRONZE",
    rtp: 92,
    minDeposit: 10,
    caseId: "daily-5",
    category: "económica",
    maxSkinPrice: 10.00,
    knifeChance: 0,
    gloveChance: 0,
    description: "Desbloqueado con €10 depositados",
    theme: "Steampunk",
    glowColor: "#cd7f32",
    borderGlow: "0 0 30px rgba(205,127,50,0.3)",
    icon: "shield"
  },
  {
    level: 15,
    name: "SILVER DAILY",
    color: "#c0c0c0",
    bgGradient: "linear-gradient(135deg, #0a0a1a 0%, #8a9bb5 100%)",
    badge: "SILVER",
    rtp: 90,
    minDeposit: 50,
    caseId: "daily-15",
    category: "intermedia",
    maxSkinPrice: 30.00,
    knifeChance: 0,
    gloveChance: 0,
    description: "Desbloqueado con €50 depositados",
    theme: "Cyber",
    glowColor: "#c0c0c0",
    borderGlow: "0 0 30px rgba(192,192,192,0.3)",
    icon: "hexagon"
  },
  {
    level: 30,
    name: "GOLD DAILY",
    color: "#ffd700",
    bgGradient: "linear-gradient(135deg, #1a1200 0%, #ffd700 100%)",
    badge: "GOLD",
    rtp: 88,
    minDeposit: 150,
    caseId: "daily-30",
    category: "intermedia",
    maxSkinPrice: 75.00,
    knifeChance: 0.5,
    gloveChance: 0,
    description: "Desbloqueado con €150 depositados - Primera oportunidad de cuchillos",
    theme: "Ancient",
    glowColor: "#ffd700",
    borderGlow: "0 0 40px rgba(255,215,0,0.4)",
    icon: "crown"
  },
  {
    level: 50,
    name: "DIAMOND DAILY",
    color: "#b9f2ff",
    bgGradient: "linear-gradient(135deg, #001a2e 0%, #5cceff 100%)",
    badge: "DIAMOND",
    rtp: 85,
    minDeposit: 500,
    caseId: "daily-50",
    category: "premium",
    maxSkinPrice: 200.00,
    knifeChance: 1.5,
    gloveChance: 0.5,
    description: "Desbloqueado con €500 depositados - Guantes posibles",
    theme: "Crystal",
    glowColor: "#b9f2ff",
    borderGlow: "0 0 40px rgba(185,242,255,0.4)",
    icon: "gem"
  },
  {
    level: 80,
    name: "PLATINUM DAILY",
    color: "#e5e4e2",
    bgGradient: "linear-gradient(135deg, #0a0a1e 0%, #b0b0c0 100%)",
    badge: "PLATINUM",
    rtp: 83,
    minDeposit: 1500,
    caseId: "daily-80",
    category: "premium",
    maxSkinPrice: 500.00,
    knifeChance: 3,
    gloveChance: 1,
    description: "Desbloqueado con €1500 depositados - Skins clandestinas posibles",
    theme: "Frost",
    glowColor: "#e5e4e2",
    borderGlow: "0 0 50px rgba(229,228,226,0.4)",
    icon: "snowflake"
  },
  {
    level: 120,
    name: "EMERALD DAILY",
    color: "#50c878",
    bgGradient: "linear-gradient(135deg, #002a1a 0%, #00e676 100%)",
    badge: "EMERALD",
    rtp: 81,
    minDeposit: 4000,
    caseId: "daily-120",
    category: "limited",
    maxSkinPrice: 1200.00,
    knifeChance: 5,
    gloveChance: 2,
    description: "Desbloqueado con €4000 depositados - Alta probabilidad de items raros",
    theme: "Dragon",
    glowColor: "#50c878",
    borderGlow: "0 0 50px rgba(80,200,120,0.5)",
    icon: "skull"
  },
  {
    level: 170,
    name: "RUBY DAILY",
    color: "#e0115f",
    bgGradient: "linear-gradient(135deg, #2a0010 0%, #ff1464 100%)",
    badge: "RUBY",
    rtp: 79,
    minDeposit: 10000,
    caseId: "daily-170",
    category: "limited",
    maxSkinPrice: 2500.00,
    knifeChance: 8,
    gloveChance: 3,
    description: "Desbloqueado con €10000 depositados - Cuchillos frecuentes",
    theme: "Inferno",
    glowColor: "#e0115f",
    borderGlow: "0 0 60px rgba(224,17,95,0.5)",
    icon: "flame"
  },
  {
    level: 230,
    name: "MASTER DAILY",
    color: "#ff4500",
    bgGradient: "linear-gradient(135deg, #1a0500 0%, #ff6a00 100%)",
    badge: "MASTER",
    rtp: 77,
    minDeposit: 25000,
    caseId: "daily-230",
    category: "limited",
    maxSkinPrice: 5000.00,
    knifeChance: 12,
    gloveChance: 5,
    description: "Desbloqueado con €25000 depositados - Skins de élite garantizadas",
    theme: "Shadow",
    glowColor: "#ff4500",
    borderGlow: "0 0 60px rgba(255,69,0,0.6)",
    icon: "lightning"
  },
  {
    level: 300,
    name: "LEGENDARY DAILY",
    color: "#ffd700",
    bgGradient: "linear-gradient(135deg, #1a0a00 0%, #ffcc00 100%)",
    badge: "LEGENDARY",
    rtp: 75,
    minDeposit: 75000,
    caseId: "daily-300",
    category: "limited",
    maxSkinPrice: 10000.00,
    knifeChance: 18,
    gloveChance: 8,
    description: "Desbloqueado con €75000 depositados - Solo para leyendas",
    theme: "Heavenly",
    glowColor: "#ffd700",
    borderGlow: "0 0 80px rgba(255,215,0,0.6)",
    icon: "star"
  },
  {
    level: 360,
    name: "VIP SUPREME",
    color: "#ff00ff",
    bgGradient: "linear-gradient(135deg, #1a0030 0%, #ff00ff 100%)",
    badge: "SUPREME",
    rtp: 72,
    minDeposit: 200000,
    caseId: "daily-360",
    category: "limited",
    maxSkinPrice: 25000.00,
    knifeChance: 25,
    gloveChance: 12,
    description: "Nivel maximo - Cuchillos y guantes de alto valor muy frecuentes",
    theme: "Cosmic",
    glowColor: "#ff00ff",
    borderGlow: "0 0 100px rgba(255,0,255,0.7)",
    icon: "skull"
  }
];

// ─── Case Definitions with Professional Naming ───────────
export const CASE_IMAGES = {
  // Económicas — Temas profesionales CS2 style (0.50€ - 2.50€)
  económica: [
    { name: "Starter Case", color: "#6366f1", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", badge: "ECO", rtp: 90 },
    { name: "Crystal Vault", color: "#3b82f6", bgGradient: "linear-gradient(135deg, #1e293b 0%, #1e40af 100%)", badge: "ECO", rtp: 90 },
    { name: "Frost Discovery", color: "#0891b2", bgGradient: "linear-gradient(135deg, #082f49 0%, #0e7490 100%)", badge: "ECO", rtp: 90 },
    { name: "Neon Dawn", color: "#06b6d4", bgGradient: "linear-gradient(135deg, #042f2e 0%, #0891b2 100%)", badge: "ECO", rtp: 90 },
    { name: "Forest Spirit", color: "#10b981", bgGradient: "linear-gradient(135deg, #052e16 0%, #065f46 100%)", badge: "ECO", rtp: 90 },
    { name: "Ember Glow", color: "#f59e0b", bgGradient: "linear-gradient(135deg, #451a03 0%, #92400e 100%)", badge: "ECO", rtp: 90 },
    { name: "Sunset Ray", color: "#ec4899", bgGradient: "linear-gradient(135deg, #500724 0%, #9d174d 100%)", badge: "ECO", rtp: 90 },
    { name: "Twilight Keeper", color: "#a855f7", bgGradient: "linear-gradient(135deg, #2e1065 0%, #6b21a8 100%)", badge: "ECO", rtp: 90 },
    { name: "Phantom Case", color: "#8b5cf6", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)", badge: "ECO", rtp: 90 },
    { name: "Thunder Strike", color: "#fbbf24", bgGradient: "linear-gradient(135deg, #422006 0%, #a16207 100%)", badge: "ECO", rtp: 90 },
    { name: "Iron Clad", color: "#94a3b8", bgGradient: "linear-gradient(135deg, #1e293b 0%, #475569 100%)", badge: "ECO", rtp: 90 },
    { name: "Copper Wire", color: "#b45309", bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 100%)", badge: "ECO", rtp: 90 },
  ],

  // Intermedias — Temas guerrero/táctico (5.00€ - 25.00€)
  intermedia: [
    { name: "Sentinel Guardian", color: "#2563eb", bgGradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", badge: "MID", rtp: 88 },
    { name: "Warrior's Path", color: "#dc2626", bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)", badge: "MID", rtp: 88 },
    { name: "Phantom Strike", color: "#6366f1", bgGradient: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)", badge: "MID", rtp: 88 },
    { name: "Specter Eyes", color: "#059669", bgGradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", badge: "MID", rtp: 88 },
    { name: "Dragon Warden", color: "#b91c1c", bgGradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)", badge: "MID", rtp: 88 },
    { name: "Phoenix Flame", color: "#f59e0b", bgGradient: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)", badge: "MID", rtp: 88 },
    { name: "Thunder Bolt", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #ca8a04 100%)", badge: "MID", rtp: 88 },
    { name: "Steel Resolve", color: "#475569", bgGradient: "linear-gradient(135deg, #1e293b 0%, #475569 100%)", badge: "MID", rtp: 88 },
    { name: "Tactical Ops", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)", badge: "MID", rtp: 88 },
    { name: "Hunter's Mark", color: "#14532d", bgGradient: "linear-gradient(135deg, #052e16 0%, #14532d 100%)", badge: "MID", rtp: 88 },
    { name: "Rogue Spirit", color: "#4c1d95", bgGradient: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)", badge: "MID", rtp: 88 },
    { name: "Eagle Eye", color: "#1e40af", bgGradient: "linear-gradient(135deg, #172554 0%, #1e40af 100%)", badge: "MID", rtp: 88 },
    { name: "Storm Front", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #0c1838 0%, #2563eb 100%)", badge: "MID", rtp: 88 },
    { name: "Inferno Core", color: "#991b1b", bgGradient: "linear-gradient(135deg, #450a0a 0%, #ef4444 100%)", badge: "MID", rtp: 88 },
  ],

  // Premium — Temas leyenda/infinito (50.00€ - 300.00€)
  premium: [
    { name: "Elder Legends", color: "#b91c1c", bgGradient: "linear-gradient(135deg, #450a0a 0%, #b91c1c 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Mythical Dragon", color: "#7c3aed", bgGradient: "linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Cosmic Infinity", color: "#2563eb", bgGradient: "linear-gradient(135deg, #0c1838 0%, #2563eb 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Supreme Overlord", color: "#991b1b", bgGradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Golden Dynasty", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #ca8a04 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Celestial Throne", color: "#7c3aed", bgGradient: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Tycoon's Vault", color: "#065f46", bgGradient: "linear-gradient(135deg, #022c22 0%, #065f46 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Alpha Predator", color: "#450a0a", bgGradient: "linear-gradient(135deg, #1c0a0a 0%, #450a0a 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "God Mode", color: "#1e3a8a", bgGradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Immortal Soul", color: "#312e81", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Nexus Point", color: "#0f766e", bgGradient: "linear-gradient(135deg, #042f2e 0%, #0f766e 100%)", badge: "PREMIUM", rtp: 85 },
    { name: "Omega Strike", color: "#701a75", bgGradient: "linear-gradient(135deg, #3b0764 0%, #701a75 100%)", badge: "PREMIUM", rtp: 85 },
  ],

  // Limited — Temas únicos/coleccionista (50.00€ - 300.00€)
  limited: [
    { name: "Collector's Edition", color: "#10b981", bgGradient: "linear-gradient(135deg, #022c22 0%, #10b981 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Diamond Jubilee", color: "#0ea5e9", bgGradient: "linear-gradient(135deg, #082f49 0%, #0ea5e9 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Gold Rush", color: "#ca8a04", bgGradient: "linear-gradient(135deg, #422006 0%, #facc15 100%)", badge: "LIMITED", rtp: 82 },
    { name: "High Roller", color: "#dc2626", bgGradient: "linear-gradient(135deg, #450a0a 0%, #dc2626 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Whale's Dream", color: "#0369a1", bgGradient: "linear-gradient(135deg, #082f49 0%, #0369a1 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Founders Box", color: "#1e40af", bgGradient: "linear-gradient(135deg, #172554 0%, #1e40af 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Legacy Crate", color: "#78350f", bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 100%)", badge: "LIMITED", rtp: 82 },
    { name: "Time Capsule", color: "#1e1b4b", bgGradient: "linear-gradient(135deg, #0c0a1e 0%, #4338ca 100%)", badge: "LIMITED", rtp: 82 },
  ],

  // Risk Zone — Alta volatilidad (10.00€ - 150.00€)
  risk: [
    { name: "Russian Roulette", color: "#ef4444", bgGradient: "linear-gradient(135deg, #1a0000 0%, #dc2626 100%)", badge: "RISK", rtp: 75 },
    { name: "All or Nothing", color: "#f97316", bgGradient: "linear-gradient(135deg, #1a0500 0%, #ea580c 100%)", badge: "RISK", rtp: 75 },
    { name: "Double or Quits", color: "#eab308", bgGradient: "linear-gradient(135deg, #1a1200 0%, #ca8a04 100%)", badge: "RISK", rtp: 75 },
    { name: "Chaos Theory", color: "#a855f7", bgGradient: "linear-gradient(135deg, #1a0030 0%, #9333ea 100%)", badge: "RISK", rtp: 75 },
    { name: "Devil's Deal", color: "#dc2626", bgGradient: "linear-gradient(135deg, #2a0000 0%, #b91c1c 100%)", badge: "RISK", rtp: 75 },
    { name: "Lucky Shot", color: "#f59e0b", bgGradient: "linear-gradient(135deg, #1a0a00 0%, #d97706 100%)", badge: "RISK", rtp: 75 },
    { name: "Mortal Coil", color: "#7c3aed", bgGradient: "linear-gradient(135deg, #1a0030 0%, #7c3aed 100%)", badge: "RISK", rtp: 75 },
    { name: "Last Stand", color: "#b91c1c", bgGradient: "linear-gradient(135deg, #1a0000 0%, #991b1b 100%)", badge: "RISK", rtp: 75 },
  ]
};

// Función para obtener una caja aleatoria según la categoría
export const getCaseImage = (category) => {
  if (!CASE_IMAGES[category]) return { name: "Mystery Case", color: "#6366f1", bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)" };
  const cases = CASE_IMAGES[category];
  return cases[Math.floor(Math.random() * cases.length)];
};

// ─── Helper: Generate unique preview skins per case ──────────
// Uses the SKIN_CATALOGS to create 4 unique preview skins per case
// No two cases get the same combination
const generatePreviewSkins = (caseObj, caseIndex, category) => {
  const catalog = SKIN_CATALOGS[category] || SKIN_CATALOGS.económica;
  const previews = [];
  const usedCombos = new Set();
  const seedStr = `${caseObj.id || caseObj.name}_${caseIndex}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
    seed |= 0;
  }

  // Deterministic "random" based on case seed + index
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset * 9973) * 10000;
    return x - Math.floor(x);
  };

  // Pick 1 featured skin (mid-to-high range) and 3 secondary skins
  for (let i = 0; i < 4; i++) {
    let attempts = 0;
    let weapon, skinName, combo;

    do {
      const wIndex = Math.floor(seededRandom(i * 7 + attempts * 13 + caseIndex) * catalog.weapons.length);
      const sIndex = Math.floor(seededRandom(i * 11 + attempts * 17 + caseIndex + 1) * catalog.skins.length);
      weapon = catalog.weapons[wIndex];
      skinName = catalog.skins[sIndex];
      combo = `${weapon}|${skinName}`;
      attempts++;
    } while (usedCombos.has(combo) && attempts < 50);

    usedCombos.add(combo);

    // Price proportional to position: first is featured (higher), rest are lower
    const priceRatio = i === 0 ? 0.7 + seededRandom(i * 5 + caseIndex) * 0.3 : 0.1 + seededRandom(i * 3 + caseIndex) * 0.4;
    const price = parseFloat((catalog.priceRange[0] + (catalog.priceRange[1] - catalog.priceRange[0]) * priceRatio).toFixed(2));

    const rarities = ["Mil-Spec Grade", "Restricted", "Classified", "Covert"];
    const rarity = i === 0 ? rarities[Math.min(2 + Math.floor(seededRandom(i * 23 + caseIndex) * 2), 3)]
      : rarities[Math.min(Math.floor(seededRandom(i * 19 + caseIndex) * 2), 2)];

    previews.push({
      id: `preview-${caseObj.id || `case-${caseIndex}`}-${i}`,
      name: `${weapon} | ${skinName}`,
      price,
      rarity,
      weapon,
      skin_name: skinName,
      image: ""
    });
  }

  return previews;
};

// ─── Generate all cases with logical pricing ──────────────
// Prices are set to ensure RTP balance:
// - Económica: €0.50 - €3.50 (avg €1.50)
// - Intermedia: €3.00 - €8.00 (avg €5.00)
// - Premium: €10.00 - €30.00 (avg €20.00)
// - Limited: €30.00 - €100.00 (avg €50.00)
export const generateAllCases = () => {
  const cases = [];
  let globalIndex = 0;

  // Económicas — Fixed logical prices
  const ecoPrices = [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 3.50];
  CASE_IMAGES.económica.forEach((caseImg, idx) => {
    const caseObj = {
      id: `econ-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_ECO,
      price: ecoPrices[idx] || 1.50,
      category: "económica",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "mil-spec",
      image: CASE_CONTAINER_ECO,
      rtp: 90,
      badge: caseImg.badge || "ECO"
    };
    // Assign distinct container
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    // Generate unique preview skins
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, "económica");
    cases.push(caseObj);
  });

  // Intermedias
  const midPrices = [3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 8.00, 8.50, 9.00, 9.50];
  CASE_IMAGES.intermedia.forEach((caseImg, idx) => {
    const caseObj = {
      id: `inter-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_MID,
      price: midPrices[idx] || 5.00,
      category: "intermedia",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "classified",
      image: CASE_CONTAINER_MID,
      rtp: 88,
      badge: caseImg.badge || "MID"
    };
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, "intermedia");
    cases.push(caseObj);
  });

  // Premium
  const premPrices = [10.00, 12.00, 15.00, 18.00, 20.00, 22.00, 25.00, 28.00, 30.00, 35.00, 40.00, 45.00];
  CASE_IMAGES.premium.forEach((caseImg, idx) => {
    const caseObj = {
      id: `prem-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_PREMIUM,
      price: premPrices[idx] || 20.00,
      category: "premium",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "covert",
      image: CASE_CONTAINER_PREMIUM,
      rtp: 85,
      badge: caseImg.badge || "PREMIUM"
    };
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, "premium");
    cases.push(caseObj);
  });

  // Limited
  const limitPrices = [30.00, 40.00, 50.00, 60.00, 75.00, 80.00, 90.00, 100.00];
  CASE_IMAGES.limited.forEach((caseImg, idx) => {
    const caseObj = {
      id: `limit-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_COVERT,
      price: limitPrices[idx] || 50.00,
      category: "limited",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "covert",
      image: CASE_CONTAINER_COVERT,
      rtp: 82,
      badge: caseImg.badge || "LIMITED"
    };
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, "limited");
    cases.push(caseObj);
  });

  // Risk Zone — High volatility (10.00€ - 150.00€)
  const riskPrices = [10.00, 15.00, 20.00, 30.00, 50.00, 75.00, 100.00, 150.00];
  CASE_IMAGES.risk.forEach((caseImg, idx) => {
    const caseObj = {
      id: `risk-${idx}`,
      name: caseImg.name,
      imageSrc: CASE_CONTAINER_KNIFE,
      price: riskPrices[idx] || 20.00,
      category: "risk",
      color: caseImg.color,
      bgGradient: caseImg.bgGradient,
      rarity: "extraordinary",
      image: CASE_CONTAINER_KNIFE,
      rtp: 75,
      badge: caseImg.badge || "RISK"
    };
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, "risk");
    cases.push(caseObj);
  });

  // Daily cases for levels (KeyDrop-style progression)
  DAILY_CASES_BY_LEVEL.forEach(d => {
    const dailyCat = d.category || "económica";
    const caseObj = {
      id: d.caseId,
      name: d.name,
      imageSrc: CASE_CONTAINER_ECO,
      price: 0.00,
      category: "daily",
      color: d.color,
      bgGradient: d.bgGradient,
      rarity: d.level === 0 ? "mil-spec" : d.level < 25 ? "classified" : d.level < 50 ? "covert" : "extraordinary",
      image: CASE_CONTAINER_ECO,
      minLevel: d.level,
      rtp: d.rtp,
      badge: d.badge,
      maxSkinPrice: d.maxSkinPrice,
      description: d.description,
      level: d.level
    };
    caseObj.image = getContainerForCase(caseObj);
    caseObj.imageSrc = caseObj.image;
    caseObj.previewSkins = generatePreviewSkins(caseObj, globalIndex++, dailyCat);
    cases.push(caseObj);
  });

  return cases;
};

// ─── Generate random skin for case opening ────────────────
// Uses the skin catalogs to create realistic CS2 skins
export const generateRandomSkin = (caseCategory) => {
  const catalog = SKIN_CATALOGS[caseCategory] || SKIN_CATALOGS.económica;
  const probs = CASE_PROBABILITIES[caseCategory] || CASE_PROBABILITIES.económica;

  // Roll for rarity tier
  const roll = Math.random() * 100;
  let rarity, rarityPrice;

  if (roll < probs.covert) {
    rarity = "Covert";
    rarityPrice = catalog.priceRange[1] * (0.6 + Math.random() * 0.4);
  } else if (roll < probs.covert + probs.classified) {
    rarity = "Classified";
    rarityPrice = catalog.priceRange[0] + (catalog.priceRange[1] - catalog.priceRange[0]) * (0.3 + Math.random() * 0.4);
  } else if (roll < probs.covert + probs.classified + probs.restricted) {
    rarity = "Restricted";
    rarityPrice = catalog.priceRange[0] + (catalog.priceRange[1] - catalog.priceRange[0]) * (0.1 + Math.random() * 0.3);
  } else {
    rarity = "Mil-Spec Grade";
    rarityPrice = catalog.priceRange[0] + Math.random() * (catalog.priceRange[1] - catalog.priceRange[0]) * 0.2;
  }

  // Pick random weapon and skin
  const weapon = catalog.weapons[Math.floor(Math.random() * catalog.weapons.length)];
  const skinName = catalog.skins[Math.floor(Math.random() * catalog.skins.length)];
  const wearValues = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
  const wear = wearValues[Math.floor(Math.random() * wearValues.length)];

  // Special items (knives/gloves) for high-tier cases
  let finalWeapon = weapon;
  let finalSkin = skinName;
  let finalPrice = rarityPrice;

  if (caseCategory === "limited" && Math.random() < 0.08) {
    // 8% chance for knife/glove in limited cases
    const specialItems = [
      { weapon: "★ Karambit", skins: ["Doppler", "Fade", "Marble Fade", "Crimson Web", "Case Hardened"], priceRange: [400, 1500] },
      { weapon: "★ Butterfly Knife", skins: ["Doppler", "Fade", "Marble Fade", "Crimson Web", "Gamma Doppler"], priceRange: [300, 1200] },
      { weapon: "★ Flip Knife", skins: ["Doppler", "Fade", "Marble Fade", "Crimson Web"], priceRange: [150, 600] },
      { weapon: "★ Talon Knife", skins: ["Doppler", "Fade", "Marble Fade", "Crimson Web"], priceRange: [200, 800] },
      { weapon: "★ Shadow Daggers", skins: ["Doppler", "Fade", "Marble Fade", "Crimson Web"], priceRange: [120, 500] }
    ];
    const special = specialItems[Math.floor(Math.random() * specialItems.length)];
    finalWeapon = special.weapon;
    finalSkin = special.skins[Math.floor(Math.random() * special.skins.length)];
    finalPrice = special.priceRange[0] + Math.random() * (special.priceRange[1] - special.priceRange[0]);
    rarity = "Extraordinary";
  } else if (caseCategory === "premium" && Math.random() < 0.03) {
    // 3% chance for gloves in premium cases
    const gloves = [
      { name: "★ Specialist Gloves | Fade", price: 250 },
      { name: "★ Specialist Gloves | Crimson Web", price: 180 },
      { name: "★ Sport Gloves | Pandora's Box", price: 350 },
      { name: "★ Driver Gloves | King Snake", price: 220 },
      { name: "★ Hand Wraps | Overprint", price: 150 }
    ];
    const glove = gloves[Math.floor(Math.random() * gloves.length)];
    finalWeapon = "★ Gloves";
    finalSkin = glove.name.split(" | ")[1];
    finalPrice = glove.price;
    rarity = "Extraordinary";
  }

  const itemName = `${finalWeapon} | ${finalSkin}`;
  const price = parseFloat(finalPrice.toFixed(2));

  return {
    name: itemName,
    weapon: finalWeapon,
    skin_name: finalSkin,
    rarity: rarity,
    price: price,
    wear: wear
  };
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
