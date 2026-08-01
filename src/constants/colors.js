// Colores y estilos reutilizables
// ═══ CS2 Official Rarity Colors (Valve) ═══════════════════════════════════════
export const THEME_COLORS = {
  bg: '#050812',
  bgGradient: 'linear-gradient(135deg,#050812,#0a0f1e,#040609)',
  card: '#111827',
  cardHover: '#1f2937',
  text: '#9ca3af',
  textLight: '#d1d5db',
  success: '#10b981',
  error: '#ef4444',
  primary: '#3b82f6',
  border: '#374151'
};

// ═══ RARITIES — Official CS2 Hex Colors (Valve) ═══════════════════════════════
// Consumer Grade: #B0C3D9 (Gris claro)
// Industrial Grade: #5E98D9 (Azul claro)
// Mil-Spec Grade: #4B69FF (Azul oscuro)
// Restricted: #8847FF (Morado)
// Classified: #D32CE6 (Rosa / Magenta)
// Covert: #EB4B4B (Rojo)
// Extraordinary / Knives / Gloves: #FFD700 (Dorado)
export const RARITIES = {
  'consumer': { color: '#B0C3D9', bg: 'rgba(176,195,217,0.2)', label: 'Consumer Grade' },
  'industrial': { color: '#5E98D9', bg: 'rgba(94,152,217,0.2)', label: 'Industrial Grade' },
  'mil-spec': { color: '#4B69FF', bg: 'rgba(75,105,255,0.2)', label: 'Mil-Spec Grade' },
  'restricted': { color: '#8847FF', bg: 'rgba(136,71,255,0.2)', label: 'Restricted' },
  'classified': { color: '#D32CE6', bg: 'rgba(211,44,230,0.2)', label: 'Classified' },
  'covert': { color: '#EB4B4B', bg: 'rgba(235,75,75,0.2)', label: 'Covert' },
  'exceedingly-rare': { color: '#FFD700', bg: 'rgba(255,215,0,0.2)', label: 'Extraordinary' },
  'extraordinary': { color: '#FFD700', bg: 'rgba(255,215,0,0.2)', label: 'Extraordinary' },
  'contraband': { color: '#FFE600', bg: 'rgba(255,230,0,0.2)', label: 'Contraband' }
};

// Mapeo de rarezas canónicas de CS2 a claves del objeto RARITIES
const RARITY_KEY_MAP = {
  'Consumer Grade': 'consumer',
  'Industrial Grade': 'industrial',
  'Mil-Spec Grade': 'mil-spec',
  'Restricted': 'restricted',
  'Classified': 'classified',
  'Covert': 'covert',
  'Exceedingly Rare': 'exceedingly-rare',
  'Extraordinary': 'extraordinary',
  'Contraband': 'contraband',
  '★': 'exceedingly-rare',
  '★ Karambit': 'exceedingly-rare',
  '★ Gloves': 'exceedingly-rare',
};

/**
 * Obtiene el color hex oficial de CS2 para una rareza.
 * @param {string} rarity - Rareza (puede ser canónica o abreviada)
 * @returns {string} Hex color oficial de CS2
 */
export const getRarityColor = (rarity) => {
  if (!rarity || typeof rarity !== 'string') return RARITIES['mil-spec'].color;
  const r = rarity.trim();

  // Detección de cuchillos/guantes (★)
  if (r.includes('★') || r.toLowerCase().includes('knife') || r.toLowerCase().includes('gloves') || r.toLowerCase().includes('bayonet')) {
    return RARITIES['exceedingly-rare'].color;
  }
  if (r.toLowerCase().includes('contraband')) return RARITIES['contraband'].color;
  if (r.toLowerCase().includes('extraordinary') || r.toLowerCase().includes('exceedingly')) return RARITIES['exceedingly-rare'].color;
  if (r.toLowerCase().includes('covert')) return RARITIES['covert'].color;
  if (r.toLowerCase().includes('classified')) return RARITIES['classified'].color;
  if (r.toLowerCase().includes('restricted')) return RARITIES['restricted'].color;
  if (r.toLowerCase().includes('mil-spec') || r.toLowerCase().includes('milspec') || r.toLowerCase().includes('mil_spec')) return RARITIES['mil-spec'].color;
  if (r.toLowerCase().includes('industrial')) return RARITIES['industrial'].color;
  if (r.toLowerCase().includes('consumer')) return RARITIES['consumer'].color;

  // Mapeo directo por clave canónica
  const key = RARITY_KEY_MAP[r];
  if (key && RARITIES[key]) return RARITIES[key].color;

  return RARITIES['mil-spec'].color;
};

/**
 * Obtiene el label legible de una rareza.
 * @param {string} rarity
 * @returns {string}
 */
export const getRarityLabel = (rarity) => {
  if (!rarity) return 'Mil-Spec Grade';
  const key = RARITY_KEY_MAP[rarity.trim()];
  if (key && RARITIES[key]) return RARITIES[key].label;
  return rarity;
};

export default { THEME_COLORS, RARITIES, getRarityColor, getRarityLabel };
