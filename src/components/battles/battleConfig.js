// src/components/battles/battleConfig.js
// Shared battle configuration constants (BOT_TEMPLATES, GAME_MODES, BATTLE_FORMATS).
// Extracted from Battles.jsx (PHASE 6.2 refactor).

export const BOT_TEMPLATES = [
  { id: "newbie1", name: "Alex (Dumb)", winRate: "30%", icon: "◆", color: "#10b981", desc: "IA básica. Poca probabilidad de skins caras." },
  { id: "newbie2", name: "Juan (Low)", winRate: "32%", icon: "◆", color: "#10b981", desc: "IA básica. Poca probabilidad de skins caras." },
  { id: "std1", name: "Pro Bot", winRate: "42%", icon: "◆", color: "#3b82f6", desc: "IA balanceada. Probabilidades reales." },
  { id: "std2", name: "Hardy", winRate: "45%", icon: "◆", color: "#3b82f6", desc: "IA balanceada. Probabilidades reales." },
  { id: "elite1", name: "Elite AI", winRate: "75%", icon: "◆", color: "#ef4444", desc: "IA avanzada. Probabilidades altas de skins caras." },
  { id: "elite2", name: "X-Terminator", winRate: "80%", icon: "◆", color: "#ef4444", desc: "IA avanzada. Probabilidades altas de skins caras." },
  { id: "master1", name: "Master Mind", winRate: "85%", icon: "◆", color: "#a855f7", desc: "Maestro veterano. ¡Casi nunca falla!" },
  { id: "master2", name: "Ghostmaster", winRate: "90%", icon: "◆", color: "#a855f7", desc: "Maestro veterano. ¡Casi nunca falla!" },
  { id: "skin_king", name: "Skin King", winRate: "95%", icon: "◆", color: "#f5ac3b", desc: "El rey de la arena. Trae su propio amuleto." },
  { id: "hacker", name: "0xHacker", winRate: "99%", icon: "◆", color: "#f5ac3b", desc: "01001000 01101001 00101110" },
];

export const GAME_MODES = [
  { id: "classic", name: "Clásico", desc: "Mayor valor TOTAL gana todo.", icon: "◆", color: "#f5ac3b" },
  { id: "crazy", name: "Locura", desc: "¡Invertido! Menor valor TOTAL gana.", icon: "◆", color: "#ec4899" },
  { id: "terminal", name: "Terminal", desc: "¡Todo o nada! Quien saque la skin más cara en la ÚLTIMA CAJA gana.", icon: "◆", color: "#ef4444" },
  { id: "first_blood", name: "Primera Sangre", desc: "Quien saque la skin más cara en la PRIMERA CAJA gana todo.", icon: "◆", color: "#b91c1c" },
  { id: "joker", name: "Comodín", desc: "Clásico + desempate aleatorio.", icon: "◆", color: "#a855f7" },
];

export const BATTLE_FORMATS = [
  { count: 2, label: "1v1", sub: "Duelo", icon: "◆", isTeam: false },
  { count: 4, label: "2v2", sub: "Duo Squad", icon: "◆", isTeam: true },
  { count: 6, label: "3v3", sub: "Triples", icon: "◆", isTeam: true },
  { count: 8, label: "4v4", sub: "Team Wars", icon: "◆", isTeam: true },
  { count: 3, label: "1v1v1", sub: "Triple", icon: "◆", isTeam: false },
  { count: 4, label: "1v1v1v1", sub: "Squad", icon: "◆", isTeam: false },
];