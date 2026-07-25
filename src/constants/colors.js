// Colores y estilos reutilizables
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

export const RARITIES = {
  'mil-spec': { color: '#64748b', bg: 'rgba(100,116,139,0.2)', label: 'Mil-Spec Grade' },
  'restricted': { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)', label: 'Restricted' },
  'classified': { color: '#a855f7', bg: 'rgba(168,85,247,0.2)', label: 'Classified' },
  'covert': { color: '#ef4444', bg: 'rgba(239,68,68,0.2)', label: 'Covert' },
  'exceedingly-rare': { color: '#fbbf24', bg: 'rgba(251,191,36,0.2)', label: 'Extraordinary' }
};

export const getRarityColor = (rarity) => {
  if (!rarity) return RARITIES['mil-spec'].color;
  const r = rarity.toLowerCase();

  if (r.includes('covert') || r.includes('red') || r.includes('extraordinary')) return RARITIES['covert'].color;
  if (r.includes('classified') || r.includes('pink') || r.includes('ancient')) return RARITIES['classified'].color;
  if (r.includes('restricted') || r.includes('purple')) return RARITIES['restricted'].color;
  if (r.includes('mil-spec') || r.includes('blue')) return RARITIES['mil-spec'].color;
  if (r.includes('contraband') || r.includes('gold') || r.includes('rare')) return RARITIES['exceedingly-rare'].color;

  return RARITIES['mil-spec'].color;
};
