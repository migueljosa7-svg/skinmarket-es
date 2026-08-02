// ─── src/pages/Cases.jsx ─────────────────────────────────────────────
// Full KeyDrop-style Case Catalog with 21 Categories
// Dynamic Visual Card Rendering via CaseCardRenderer
// Collapsible sections, search, sort, favorites, daily roulette
// ───────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { useAuth } from "../context/useAuth";
import { useToast } from "../components/Toast";
import { AnimatePresence } from "framer-motion";
import { Search, Gift, ChevronDown, ChevronUp, Grid3X3, Layers, Star, Zap, Award, Heart, Eye, EyeOff, Flame, Sparkles, Shield, Sword, Gem, Skull, Gamepad2, Ticket, Crosshair, Crown, ShoppingBag, Coins, Users } from "lucide-react";
import { FiGrid, FiLayers, FiStar, FiZap, FiAward, FiSearch, FiChevronDown, FiGift, FiEye, FiEyeOff, FiHeart } from "react-icons/fi";
import CaseCardRenderer from "../components/CaseCardRenderer";
import DailyRouletteModal from "../components/DailyRouletteModal";
import { CASE_SPECIFIC_IMAGES } from "../hooks/useCaseImage";

// ─── FULL 21 CATEGORY CATALOG (KeyDrop Style) ─────────────────────
const KEYDROP_CATEGORIES = [
  {
    id: "limited_edition",
    label: "LIMITED EDITION",
    style: "premium",
    description: "Ediciones limitadas y exclusivas",
    icon: "gem",
    color: "#f59e0b",
    order: 0,
    cases: [
      { name: "RED SILK", price: 2.79 },
      { name: "DOPPLER EFFECT", price: 7.44 },
      { name: "EMERALD VEIN", price: 17.67 },
      { name: "CORAL BLADE", price: 53.94 },
      { name: "SACRED LOTUS", price: 125.55 },
      { name: "FEEL THE DRAGON", price: 260.40 }
    ]
  },
  {
    id: "bestsellers",
    label: "★ BESTSELLERS",
    style: "battle",
    description: "Las cajas más populares de la plataforma",
    icon: "star",
    color: "#f5ac3b",
    order: 1,
    cases: [
      { name: "STRIKE", price: 4.39 },
      { name: "ROYAL", price: 11.01 },
      { name: "STORM", price: 15.27 },
      { name: "JOKER", price: 36.71 },
      { name: "DAPHNE", price: 74.40 },
      { name: "FLAME", price: 186.00 }
    ]
  },
  {
    id: "holo_cases",
    label: "HOLO CASES",
    style: "holo",
    description: "Cajas holográficas con efectos visuales únicos",
    icon: "sparkles",
    color: "#06b6d4",
    order: 2,
    cases: [
      { name: "HYPER", price: 0.74 },
      { name: "DART", price: 2.60 },
      { name: "AQUA", price: 5.58 },
      { name: "POLYCHROME", price: 9.30 },
      { name: "MARBLED", price: 18.60 },
      { name: "ENGRAVE", price: 27.90 },
      { name: "JAINA", price: 46.50 },
      { name: "KATANA", price: 88.35 },
      { name: "MANTIS", price: 111.60 },
      { name: "ANDERS", price: 138.57 },
      { name: "STRANGE", price: 278.07 },
      { name: "DAVID", price: 362.70 },
      { name: "FIESTA", price: 0.74 },
      { name: "OLEEEE", price: 6.05 },
      { name: "CORRIDA", price: 12.56 },
      { name: "SUERTE", price: 46.50 }
    ]
  },
  {
    id: "brainrot_cases",
    label: "BRAINROT CASES",
    style: "anime",
    description: "Cajas temáticas con diseños únicos y memes",
    icon: "skull",
    color: "#ec4899",
    order: 3,
    cases: [
      { name: "CROCODILO", price: 0.93 },
      { name: "SAHUR", price: 3.72 },
      { name: "BALLERINA", price: 6.98 },
      { name: "TRALALERO", price: 11.63 },
      { name: "SHIMPANZINI", price: 46.50 },
      { name: "BRR BRR", price: 130.20 }
    ]
  },
  {
    id: "battle_cases",
    label: "BATTLE CASES",
    style: "battle",
    description: "Cajas de batalla con mecánicas de combate",
    icon: "sword",
    color: "#6366f1",
    order: 4,
    cases: [
      { name: "CLOCK", price: 2.79 },
      { name: "LIQUID", price: 7.44 },
      { name: "EXPLOSION", price: 12.09 },
      { name: "FLASH", price: 39.99 },
      { name: "CHAIN", price: 106.95 },
      { name: "SILK", price: 274.35 }
    ]
  },
  {
    id: "case_battles",
    label: "CASE BATTLES",
    style: "battle",
    description: "Enfrentamientos en vivo contra otros jugadores",
    icon: "shield",
    color: "#f97316",
    order: 5,
    cases: [
      { name: "5 Rondas", price: 53.97 },
      { name: "7 Rondas", price: 20.09 },
      { name: "17 Rondas", price: 316.20 }
    ]
  },
  {
    id: "premium_cases",
    label: "PREMIUM CASES",
    style: "premium",
    description: "Las cajas más exclusivas de la plataforma",
    icon: "crown",
    color: "#a855f7",
    order: 6,
    cases: [
      { name: "SERPENT", price: 55.75 },
      { name: "CHEAP KNIVES", price: 68.12 },
      { name: "ARROW", price: 109.99 },
      { name: "VEST", price: 167.10 },
      { name: "VICE", price: 220.01 },
      { name: "BLOODSHOT", price: 293.62 },
      { name: "LORE", price: 367.02 },
      { name: "PREMIUM KNIVES", price: 348.75 },
      { name: "BUTTERFLY", price: 690.53 },
      { name: "EMERALD", price: 930.00 },
      { name: "SPORT", price: 1581.00 },
      { name: "PANDORA", price: 4650.00 }
    ]
  },
  {
    id: "risk_zone",
    label: "RISK ZONE",
    style: "risk",
    description: "Alto riesgo, alta recompensa",
    icon: "flame",
    color: "#ef4444",
    order: 7,
    cases: [
      { name: "TIGER", price: 1.12 },
      { name: "MASK", price: 2.79 },
      { name: "ADRENALINE", price: 6.51 },
      { name: "RADIANT", price: 23.25 },
      { name: "LOTUS", price: 92.07 },
      { name: "FLAME", price: 186.00 }
    ]
  },
  {
    id: "anime_cases",
    label: "ANIME CASES",
    style: "anime",
    description: "Cajas con temática anime y arte ilustrado",
    icon: "gamepad2",
    color: "#ff66ff",
    order: 8,
    cases: [
      { name: "FLAMES", price: 0.74 },
      { name: "SKETCH", price: 1.72 },
      { name: "DOUBLE SLASH", price: 3.10 },
      { name: "HOT DAY", price: 3.86 },
      { name: "CRIMSON RED", price: 9.53 },
      { name: "PHASED", price: 12.36 },
      { name: "PINK STAR", price: 14.28 },
      { name: "ONI", price: 19.58 },
      { name: "EDGE", price: 34.88 },
      { name: "ENDLESS JOURNEY", price: 83.24 },
      { name: "NIGHT CALLS", price: 220.88 }
    ]
  },
  {
    id: "sticker_cases",
    label: "STICKER CASES",
    style: "battle",
    description: "Cajas especializadas en stickers y pegatinas",
    icon: "ticket",
    color: "#14b8a6",
    order: 9,
    cases: [
      { name: "SURGE", price: 0.47 },
      { name: "APEX", price: 2.79 },
      { name: "PRIME", price: 6.51 },
      { name: "ALPHA", price: 13.95 },
      { name: "IMMORTAL", price: 37.20 }
    ]
  },
  {
    id: "weapon_cases",
    label: "WEAPON CASES",
    style: "battle",
    description: "Cajas enfocadas en armas específicas",
    icon: "crosshair",
    color: "#3b82f6",
    order: 10,
    cases: [
      { name: "MILSPEC", price: 0.23 },
      { name: "USP-S", price: 1.11 },
      { name: "RESTRICTED", price: 1.86 },
      { name: "AWP", price: 3.23 },
      { name: "M4", price: 3.55 },
      { name: "AK-47", price: 3.66 },
      { name: "DESERT EAGLE", price: 4.17 },
      { name: "COVERT", price: 23.25 },
      { name: "AGENT", price: 27.90 },
      { name: "GLOVES", price: 116.25 },
      { name: "NEW KNIVES", price: 148.80 },
      { name: "KNIVES", price: 158.10 },
      { name: "STRAKA", price: 3.67 },
      { name: "FORG1", price: 10.70 },
      { name: "VALEK", price: 32.32 }
    ]
  },
  {
    id: "kings_cases",
    label: "KINGS CASES",
    style: "premium",
    description: "Cajas de reyes con botín premium",
    icon: "crown",
    color: "#f59e0b",
    order: 11,
    cases: [
      { name: "DAGGERS", price: 0.56 },
      { name: "ENERGY", price: 0.56 },
      { name: "TECH", price: 0.56 },
      { name: "1% PROFIT", price: 0.65 },
      { name: "1% KNIFE", price: 1.63 },
      { name: "SPARK", price: 1.77 },
      { name: "TOKEN", price: 2.56 },
      { name: "SIGNAL", price: 2.75 },
      { name: "SWAP", price: 2.94 },
      { name: "CAPITAL", price: 2.94 },
      { name: "PERFECT", price: 3.02 },
      { name: "LORD", price: 3.66 },
      { name: "SMART", price: 3.72 },
      { name: "ROCKET", price: 3.77 },
      { name: "REVOLUTION", price: 4.98 },
      { name: "SHARP", price: 7.34 },
      { name: "SYNERGY", price: 11.59 },
      { name: "ASIIMOV", price: 13.62 }
    ]
  },
  {
    id: "farm_cases",
    label: "FARM CASES",
    style: "battle",
    description: "Cajas económicas para farming",
    icon: "layers",
    color: "#10b981",
    order: 12,
    cases: [
      { name: "COOP CHAOS", price: 0.14 },
      { name: "GOLD SHOT", price: 0.19 },
      { name: "LUCKY CLUCK", price: 0.28 },
      { name: "SUNSHINE", price: 0.37 },
      { name: "EGGSPLOSION", price: 0.47 }
    ]
  },
  {
    id: "our_specials",
    label: "OUR SPECIALS",
    style: "anime",
    description: "Ediciones especiales de la casa",
    icon: "sparkles",
    color: "#ff6b6b",
    order: 13,
    cases: [
      { name: "ICE BLAST", price: 0.30 },
      { name: "BEAST", price: 0.56 },
      { name: "BANANA", price: 1.00 },
      { name: "DIABLO", price: 1.04 },
      { name: "MAFIA", price: 2.79 },
      { name: "PIKA PIKA", price: 3.39 },
      { name: "DRAGON", price: 3.61 },
      { name: "JOKER", price: 36.71 },
      { name: "LUNA", price: 102.30 },
      { name: "ELAINE", price: 186.00 }
    ]
  },
  {
    id: "community_cases",
    label: "COMMUNITY CASES",
    style: "battle",
    description: "Cajas de la comunidad y redes sociales",
    icon: "users",
    color: "#8b5cf6",
    order: 14,
    cases: [
      { name: "TELEGRAM", price: 0.50 },
      { name: "X (Twitter)", price: 0.75 },
      { name: "META", price: 1.00 },
      { name: "DISCORD", price: 1.50 },
      { name: "FACEIT", price: 2.50 }
    ]
  },
  {
    id: "cajas_gratis",
    label: "CAJAS GRATIS",
    style: "battle",
    description: "Recompensas diarias y por nivel",
    icon: "gift",
    color: "#10b981",
    order: 15,
    cases: [
      { name: "NIVEL 50", price: 0.00 },
      { name: "DAILY FREE CASE", price: 0.00 }
    ]
  },
  {
    id: "gold_area",
    label: "GOLD AREA",
    style: "premium",
    description: "Cajas comprables con Gold",
    icon: "coins",
    color: "#ffd700",
    order: 16,
    cases: [
      { name: "GOLD DIGGER", price: 0.00, gold: 480 },
      { name: "FOSTER", price: 0.00, gold: 610 },
      { name: "SHARK", price: 0.00, gold: 680 },
      { name: "TOPAZ", price: 0.00, gold: 700 },
      { name: "RUBIN RAIN", price: 0.00, gold: 840 },
      { name: "PREDATOR", price: 0.00, gold: 1200 },
      { name: "RUBY", price: 0.00, gold: 1300 },
      { name: "AMETHYST LIGHT", price: 0.00, gold: 1400 },
      { name: "OPTIMAL", price: 0.00, gold: 1930 },
      { name: "BONY", price: 0.00, gold: 2000 },
      { name: "ATUM", price: 0.00, gold: 2670 },
      { name: "WRAP", price: 0.00, gold: 4900 },
      { name: "SOLAR", price: 0.00, gold: 5600 },
      { name: "MAGENT", price: 0.00, gold: 6200 },
      { name: "SAMURAI", price: 0.00, gold: 9900 },
      { name: "ASSAULT", price: 0.00, gold: 13600 },
      { name: "EMERALD CUT", price: 0.00, gold: 19200 },
      { name: "RECON", price: 0.00, gold: 35000 }
    ]
  },
  {
    id: "youtubers_cases",
    label: "YOUTUBERS CASES",
    style: "anime",
    description: "Cajas de creadores de contenido",
    icon: "video",
    color: "#ff0000",
    order: 17,
    cases: [
      { name: "HEATONCS", price: 23.25 },
      { name: "CACHORRO", price: 26.97 },
      { name: "AMPETER", price: 29.76 },
      { name: "POKER", price: 37.20 },
      { name: "BLACK", price: 48.78 },
      { name: "TARIFA", price: 74.40 }
    ]
  }
];

// ─── Category Style Mapping ────────────────────────────────────────
const CATEGORY_STYLE_MAP = {
  limited_edition: "premium",
  bestsellers: "battle",
  holo_cases: "holo",
  brainrot_cases: "anime",
  battle_cases: "battle",
  case_battles: "battle",
  premium_cases: "premium",
  risk_zone: "risk",
  anime_cases: "anime",
  sticker_cases: "battle",
  weapon_cases: "battle",
  kings_cases: "premium",
  farm_cases: "battle",
  our_specials: "anime",
  community_cases: "battle",
  cajas_gratis: "battle",
  gold_area: "premium",
  youtubers_cases: "anime"
};

// ─── Deterministic hash (string → number 0..65535) ─────────────────
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
};

// ─── Assign hero skin + 4 unique previews from allSkins ─────────

const assignSkinsToCase = (caseObj, allSkins, catDef) => {
  if (!allSkins || allSkins.length < 5) return caseObj;

  const seed = hashStr(catDef.id + "-" + caseObj.name + "-" + catDef.color);
  const total = allSkins.length;

  // Per-call used indices Set to avoid cross-contamination between renders
  const usedIndices = new Set();

  // Pick 5 distinct indices deterministically
  const indices = [];
  let attempts = 0;
  while (indices.length < 5 && attempts < total * 2) {
    const idx = (seed + indices.length * 7919 + attempts * 104729) % total;
    attempts++;
    if (!indices.includes(idx) && !usedIndices.has(idx)) {
      indices.push(idx);
    }
  }
  // Fallback if not enough unique found
  while (indices.length < 5) {
    const idx = (seed + indices.length * 31337) % total;
    if (!indices.includes(idx)) indices.push(idx);
  }

  // First index = hero skin (featured weapon), rest = previews
  const heroIdx = indices[0];
  const previewIdxs = indices.slice(1, 5);

  const heroSkin = allSkins[heroIdx];
  usedIndices.add(heroIdx);

  const previewSkins = previewIdxs
    .map((pi) => {
      usedIndices.add(pi);
      return allSkins[pi];
    })
    .filter(Boolean); // Filter out undefined entries when allSkins is still loading

  return {
    ...caseObj,
    heroSkin: heroSkin
      ? { id: heroSkin.id, name: heroSkin.name, price: heroSkin.price, rarity: heroSkin.rarity, image: heroSkin.image }
      : null,
    previewSkins: previewSkins.map((s) => ({
      id: s.id, name: s.name, price: s.price, rarity: s.rarity, image: s.image
    }))
  };
};

// ─── Generate case objects for a category ─────────────────────────
const generateCategoryCases = (catDef, allSkins) => {
  return catDef.cases.map((c, idx) => {
    // Assign unique image from CASE_SPECIFIC_IMAGES mapping
    const caseImage = CASE_SPECIFIC_IMAGES[c.name] || null;
    const caseObj = {
      id: `${catDef.id}-${idx}`,
      name: c.name,
      price: c.price,
      category: catDef.id,
      image: caseImage,
      imageSrc: caseImage,
      color: catDef.color,
      glowColor: catDef.color,
      badge: catDef.label,
      gold: c.gold || null,
      heroSkin: null,
      previewSkins: []
    };
    return assignSkinsToCase(caseObj, allSkins, catDef);
  });
};

// ─── Main Page Component ───────────────────────────────────────────
export default function Cases() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, claimDaily } = useAuth();
  const { skins: allSkins } = useFetchSkins(2000, true);
  const [filterCategory, setFilterCategory] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("price-asc");
  const [rouletteData, setRouletteData] = useState({ isOpen: false, reward: 0 });
  const [collapsedSections, setCollapsedSections] = useState({});
  const [favorites, setFavorites] = useState([]);

  // Generate all cases from the KeyDrop catalog
  const allKeyDropCases = useMemo(() => {
    const cases = [];
    KEYDROP_CATEGORIES.forEach((cat) => {
      const catCases = generateCategoryCases(cat, allSkins);
      cases.push(...catCases);
    });
    return cases;
  }, [allSkins]);

  // Merge both: use KeyDrop catalog for display, original for backend integration
  const allCases = useMemo(() => {
    return allKeyDropCases;
  }, [allKeyDropCases]);

  // Group cases by category
  const groupedCases = useMemo(() => {
    const groups = {};
    KEYDROP_CATEGORIES.forEach((cat) => {
      groups[cat.id] = [];
    });

    allCases.forEach((c) => {
      const cat = c.category || "battle_cases";
      if (groups[cat]) {
        groups[cat].push(c);
      } else {
        // Default to battle_cases if unknown
        groups["battle_cases"] = groups["battle_cases"] || [];
        groups["battle_cases"].push(c);
      }
    });

    return groups;
  }, [allCases]);

  // Filtered cases per category
  const filteredGroups = useMemo(() => {
    const result = {};
    Object.entries(groupedCases).forEach(([catId, cases]) => {
      let filtered = [...cases];
      if (searchTerm) {
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      filtered.sort((a, b) => {
        if (sortBy === "price-asc") return parseFloat(a?.price || 0) - parseFloat(b?.price || 0);
        if (sortBy === "price-desc") return parseFloat(b?.price || 0) - parseFloat(a?.price || 0);
        if (sortBy === "alpha-asc") return a.name.localeCompare(b.name);
        if (sortBy === "alpha-desc") return b.name.localeCompare(a.name);
        return 0;
      });

      // Also filter by the active category filter
      if (filterCategory !== "todos" && catId !== filterCategory) {
        result[catId] = [];
      } else {
        result[catId] = filtered;
      }
    });
    return result;
  }, [groupedCases, searchTerm, sortBy, filterCategory]);

  const toggleSection = (catId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleOpenCase = (caseObj) => {
    navigate(`/case/${caseObj.id}`);
  };

  const toggleFavorite = (caseId) => {
    setFavorites(prev => prev.includes(caseId) ? prev.filter(f => f !== caseId) : [...prev, caseId]);
  };

  const filterCategories = [
    { id: "todos", label: "TODAS", icon: <Grid3X3 size={16} /> },
    { id: "limited_edition", label: "LIMITED", icon: <Gem size={16} /> },
    { id: "bestsellers", label: "TOP", icon: <Star size={16} /> },
    { id: "premium_cases", label: "PREMIUM", icon: <Crown size={16} /> },
    { id: "risk_zone", label: "RISK", icon: <Flame size={16} /> },
    { id: "anime_cases", label: "ANIME", icon: <Gamepad2 size={16} /> },
    { id: "holo_cases", label: "HOLO", icon: <Sparkles size={16} /> },
    { id: "gold_area", label: "GOLD", icon: <Coins size={16} /> }
  ];

  const sortOptions = [
    { id: "price-asc", label: "Precio: Menor a Mayor" },
    { id: "price-desc", label: "Precio: Mayor a Menor" },
    { id: "alpha-asc", label: "Nombre: A-Z" },
    { id: "alpha-desc", label: "Nombre: Z-A" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "50px 20px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .cases-page { padding: 20px 10px !important; }
          .cases-header h1 { font-size: 1.8rem !important; }
          .cases-header p { font-size: 0.7rem !important; letter-spacing: 1px !important; }
          .cases-filters { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .cases-filters-cats { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px; }
          .cases-filters-cats button { flex-shrink: 0; font-size: 0.75rem !important; padding: 8px 14px !important; }
          .cases-filters-right { flex-direction: column !important; width: 100% !important; }
          .cases-filters-right input,
          .cases-filters-right select { width: 100% !important; }
          .cases-filters-right button { width: 100% !important; justify-content: center !important; }
          .cases-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .category-header { flex-wrap: wrap !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .cases-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; }
        }
        @media (min-width: 1025px) {
          .cases-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .cases-grid.risk-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <div className="cases-page" style={{ maxWidth: "1500px", margin: "0 auto" }}>
        {/* Header */}
        <header className="cases-header" style={{ textAlign: "center", marginBottom: "50px" }}>
          <h1 style={{ fontSize: "3.5rem", fontWeight: "900", margin: "0 0 10px 0" }}>TIENDA DE CAJAS</h1>
          <p style={{ color: "#f5ac3b", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}>
            Abre cajas exclusivas y obtén las mejores skins instantáneamente
          </p>
        </header>

        {/* Filters & Controls */}
        <div className="cases-filters" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px", flexWrap: "wrap", gap: "20px" }}>
          <div className="cases-filters-cats" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {filterCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  padding: "12px 22px",
                  borderRadius: "14px",
                  background: filterCategory === cat.id ? "#f5ac3b" : "rgba(255,255,255,0.03)",
                  color: filterCategory === cat.id ? "black" : "white",
                  border: "1px solid rgba(255,255,255,0.05)",
                  fontWeight: "900",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          <div className="cases-filters-right" style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              onClick={() => {
                if (!user) {
                  toast.error("Inicia sesión para reclamar tu recompensa diaria");
                  return;
                }
                const res = claimDaily();
                if (res.success) {
                  setRouletteData({ isOpen: true, reward: res.reward });
                } else {
                  toast.error(res.error || "Reclama la recompensa diaria en tu panel.");
                }
              }}
              style={{
                padding: "12px 22px",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: "900",
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Gift size={16} /> RECOMPENSA DIARIA
            </button>
            <input
              type="text"
              placeholder="Buscar caja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "12px 18px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", maxWidth: "200px" }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "12px 18px", borderRadius: "12px", background: "#16191e", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontWeight: "bold" }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Sections */}
        {KEYDROP_CATEGORIES.map((catDef) => {
          const catCases = filteredGroups[catDef.id];
          if (!catCases || catCases.length === 0) return null;

          const isCollapsed = !!collapsedSections[catDef.id];
          const isRiskZone = catDef.id === "risk_zone";
          const isPremium = catDef.style === "premium";

          return (
            <div key={catDef.id} style={{ marginBottom: "50px" }}>
              {/* Category Header with Collapse Toggle */}
              <div
                className="category-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "25px",
                  paddingBottom: "15px",
                  borderBottom: isRiskZone
                    ? "2px solid rgba(255, 200, 0, 0.2)"
                    : isPremium
                      ? "1px solid rgba(255,215,0,0.15)"
                      : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer"
                }}
                onClick={() => toggleSection(catDef.id)}
              >
                <div>
                  <h2 style={{
                    fontSize: "1.4rem",
                    fontWeight: "900",
                    margin: 0,
                    letterSpacing: "1px",
                    color: catDef.color || (isRiskZone ? "#ffcc00" : "white")
                  }}>
                    {catDef.label}
                  </h2>
                  <p style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.3)",
                    margin: "4px 0 0 0"
                  }}>
                    {catCases.length} cajas • {catDef.description}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSection(catDef.id); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: isRiskZone
                      ? "1px solid rgba(255, 200, 0, 0.2)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isRiskZone
                      ? "rgba(255, 200, 0, 0.08)"
                      : "rgba(255,255,255,0.03)",
                    color: isRiskZone ? "#ffcc00" : "rgba(255,255,255,0.5)",
                    fontWeight: "700",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  }}
                >
                  {isCollapsed ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isCollapsed ? "MOSTRAR" : "OCULTAR"}
                </button>
              </div>

              {/* Cases Grid */}
              <AnimatePresence>
                {!isCollapsed && (
                  <div
                    className={`cases-grid ${isRiskZone ? "risk-grid" : ""}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isRiskZone
                        ? "repeat(auto-fill, minmax(350px, 1fr))"
                        : "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: isRiskZone ? "30px" : "25px",
                      overflow: "hidden"
                    }}
                  >
                    {catCases.map((c) => (
                      <CaseCardRenderer
                        key={c.id}
                        c={c}
                        skins={c.previewSkins || []}
                        onClick={() => handleOpenCase(c)}
                        isFavorite={favorites.includes(c.id)}
                        onToggleFavorite={() => toggleFavorite(c.id)}
                        forceStyle={CATEGORY_STYLE_MAP[catDef.id] || "battle"}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <DailyRouletteModal
        isOpen={rouletteData.isOpen}
        onClose={() => setRouletteData({ isOpen: false, reward: 0 })}
        rewardAmount={rouletteData.reward}
        skinsPool={allSkins}
      />
    </div>
  );
}