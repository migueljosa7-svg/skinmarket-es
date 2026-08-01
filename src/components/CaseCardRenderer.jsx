// ─── CaseCardRenderer.jsx ─────────────────────────────────────────────
// REDISEÑO TOTAL — KEYDROP / SKINCLUB "WEAPON BANNER" (Opción A)
// Cada tarjeta es el BANNER del arma protagonista en alta resolución:
//   - Hero skin HD flotando con drop-shadow neón según rareza (glowColor)
//   - Fondos temáticos con gradientes + iluminación neón (CERO cartón genérico)
//   - Placeholder SVG con silueta de rifle + nombre de la caja (nunca borroso)
//   - Badges de precio/categoría, favorito ♥ y franja de 4 previews reales
// CSS puro / Inline Styles (sin dependencias externas de CSS framework)
// ───────────────────────────────────────────────────────────────────────

import { Heart } from "lucide-react";
import { useMemo } from "react";
import { getSkinImageUrl, handleImageError } from "../services/ImageService";
import { getRarityColor, resolvePriceSync } from "../services/PriceEngine.js";

// ─── Color Helpers ──────────────────────────────────────────────────
const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(99,102,241,${alpha})`;
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return `rgba(99,102,241,${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

// ─── Themed Placeholder (silueta de rifle + nombre, nunca borroso) ──
const generateCasePlaceholder = (name, color) => {
  const safe = String(name || "CASE").replace(/[<>&'"]/g, "").toUpperCase();
  const c = hexToRgba(color || "#6366f1", 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0e13"/>
      <stop offset="100%" stop-color="#10121a"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${c}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="320" height="320" fill="url(#bg)"/>
  <rect width="320" height="320" fill="url(#halo)"/>
  <circle cx="160" cy="135" r="72" fill="none" stroke="${c}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="4 8"/>
  <g transform="translate(35,55)" fill="#ffffff" opacity="0.16">
    <rect x="25" y="78" width="220" height="15" rx="7.5"/>
    <rect x="125" y="66" width="80" height="28" rx="9"/>
    <rect x="60" y="64" width="70" height="32" rx="9"/>
    <path d="M60 70 L18 56 L8 66 L46 92 Z"/>
    <path d="M88 96 L76 150 L106 150 L98 96 Z"/>
    <rect x="48" y="42" width="55" height="19" rx="6"/>
    <path d="M118 96 L112 142 L136 142 L132 96 Z"/>
  </g>
  <text x="160" y="258" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="800" fill="#ffffff" letter-spacing="2">${safe}</text>
  <text x="160" y="282" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="700" fill="${c}" letter-spacing="3">SKINMARKET</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

// ─── Rarity / Theme Config for Glow Effects ─────────────────────────
const RARITY_GLOW = {
  limited_edition: { label: "LIMITED", glow: "0.28" },
  bestsellers: { label: "TOP", glow: "0.26" },
  holo_cases: { label: "HOLO", glow: "0.28" },
  brainrot_cases: { label: "BRAINROT", glow: "0.24" },
  battle_cases: { label: "BATTLE", glow: "0.24" },
  case_battles: { label: "BATTLE", glow: "0.24" },
  premium_cases: { label: "PREMIUM", glow: "0.30" },
  risk_zone: { label: "RISK", glow: "0.28" },
  anime_cases: { label: "ANIME", glow: "0.24" },
  sticker_cases: { label: "STICKER", glow: "0.22" },
  weapon_cases: { label: "WEAPON", glow: "0.24" },
  kings_cases: { label: "KINGS", glow: "0.26" },
  farm_cases: { label: "FARM", glow: "0.20" },
  our_specials: { label: "SPECIAL", glow: "0.26" },
  community_cases: { label: "COMMUNITY", glow: "0.22" },
  cajas_gratis: { label: "GRATIS", glow: "0.20" },
  gold_area: { label: "GOLD", glow: "0.32" },
  youtubers_cases: { label: "YT", glow: "0.26" },
  default: { label: "CASE", glow: "0.22" }
};

const getRarityConfig = (category) => RARITY_GLOW[category] || RARITY_GLOW.default;

// ─── Theme variations per forceStyle ────────────────────────────────
const getThemeVariations = (style, color) => {
  switch (style) {
    case "risk":
      return {
        watermark: "HIGH RISK",
        extraLayer: `repeating-linear-gradient(-45deg, transparent 0px, transparent 16px, ${hexToRgba(color, 0.05)} 16px, ${hexToRgba(color, 0.05)} 18px)`
      };
    case "premium":
      return {
        watermark: "PREMIUM",
        extraLayer: `linear-gradient(180deg, ${hexToRgba(color, 0.06)} 0%, transparent 40%)`
      };
    case "holo":
      return {
        watermark: "HOLO",
        extraLayer: `radial-gradient(circle at 30% 20%, ${hexToRgba(color, 0.12)} 0%, transparent 50%), radial-gradient(circle at 75% 85%, ${hexToRgba(color, 0.1)} 0%, transparent 50%)`
      };
    case "anime":
      return {
        watermark: "EXCLUSIVE",
        extraLayer: `radial-gradient(circle at 15% 90%, ${hexToRgba(color, 0.14)} 0%, transparent 45%), radial-gradient(circle at 90% 10%, ${hexToRgba(color, 0.12)} 0%, transparent 40%)`
      };
    default:
      return {
        watermark: null,
        extraLayer: "none"
      };
  }
};

// ─── Shared Glassmorphism Badge Styles ──────────────────────────────
const glassBadgeBase = {
  position: "absolute",
  zIndex: 8,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.35)"
};

// ─── MAIN CARD — WEAPON BANNER (Opción A) ───────────────────────────
const WeaponBannerCard = ({ c, skins, onClick, isFavorite, onToggleFavorite, forceStyle }) => {
  const hero = c.heroSkin || null;

  // CS2 Official Rarity Color: use hero skin's rarity for the neon glow.
  // Falls back to category color (c.glowColor / c.color) when no hero skin rarity is available.
  const rarityColor = hero?.rarity ? getRarityColor(hero.rarity) : null;
  const themeColor = rarityColor || c.glowColor || c.color || "#6366f1";
  const rarityCfg = getRarityConfig(c.category);
  const themeVar = getThemeVariations(forceStyle, themeColor);

  // Resolve hero skin price via PriceEngine cascade (sync: cache + local matrix + rarity base)
  const heroPrice = hero ? resolvePriceSync(hero.name, hero.rarity, hero.wear) : null;

  const previews = useMemo(() => {
    const pool = (skins && skins.length > 0) ? skins : (c.previewSkins || []);
    return pool.slice(0, 4);
  }, [skins, c.previewSkins]);

  const heroSrc = hero?.image
    ? getSkinImageUrl(hero.name, hero.image)
    : generateCasePlaceholder(c.name, themeColor);

  return (
    <div
      onClick={onClick}
      className="sm-case-card"
      style={{
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: "380px",
        background: `radial-gradient(130% 95% at 50% 0%, ${hexToRgba(themeColor, 0.30)} 0%, #0d0e13 55%, #05060a 100%)`,
        border: `1px solid ${hexToRgba(themeColor, 0.35)}`,
        boxShadow: `0 0 45px ${hexToRgba(themeColor, 0.14)}, 0 10px 40px rgba(0,0,0,0.5), inset 0 0 70px rgba(0,0,0,0.45)`,
        transition: "box-shadow 0.3s ease"
      }}
    >
      {/* Top neon glow line */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: "3px",
        background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
        boxShadow: `0 0 22px ${themeColor}`,
        zIndex: 9
      }} />

      {/* Extra themed layer (danger stripes, shimmer, etc.) */}
      {themeVar.extraLayer && themeVar.extraLayer !== "none" && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: themeVar.extraLayer,
          zIndex: 0,
          pointerEvents: "none"
        }} />
      )}

      {/* Ambient radial glows */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: `
          radial-gradient(circle at 18% 88%, ${hexToRgba(themeColor, 0.14)} 0%, transparent 45%),
          radial-gradient(circle at 88% 12%, ${hexToRgba(themeColor, 0.12)} 0%, transparent 40%)
        `
      }} />

      {/* Vertical watermark for risk */}
      {themeVar.watermark && (
        <div style={{
          position: "absolute",
          right: "8px", top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize: "0.6rem",
          fontWeight: "900",
          color: hexToRgba(themeColor, 0.35),
          letterSpacing: "4px",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
          pointerEvents: "none"
        }}>
          {themeVar.watermark}
        </div>
      )}

      {/* ─── HERO WEAPON AREA ─────────────────────────── */}
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "235px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}>
        {/* Radial halo behind weapon */}
        <div style={{
          position: "absolute",
          width: "250px", height: "250px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${hexToRgba(themeColor, 0.38)} 0%, ${hexToRgba(themeColor, 0.12)} 42%, transparent 70%)`,
          filter: "blur(28px)",
          top: "52%", left: "50%",
          transform: "translate(-50%, -50%)"
        }} />

        {/* Price badge (glassmorphism) */}
        <div style={{
          ...glassBadgeBase,
          top: "14px", right: "14px",
          border: `1px solid ${hexToRgba(themeColor, 0.4)}`,
          padding: "6px 14px"
        }}>
          <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", fontWeight: "800" }}>{c.gold ? "🪙" : "€"}</span>
          <span style={{
            fontWeight: "900",
            fontSize: "0.82rem",
            color: c.gold ? "#ffd700" : themeColor,
            fontFamily: "'Inter', sans-serif"
          }}>
            {c?.gold ? Number(c.gold).toLocaleString("es-ES") : Number(c?.price ?? 0).toFixed(2)}
          </span>
          {c.gold && <span style={{ fontSize: "0.5rem", color: "#ffd700", fontWeight: "800" }}>GOLD</span>}
        </div>

        {/* Category badge */}
        <div style={{
          ...glassBadgeBase,
          top: "14px", left: "14px",
          border: `1px solid ${hexToRgba(themeColor, 0.25)}`,
          padding: "4px 10px"
        }}>
          <span style={{
            fontSize: "0.55rem",
            fontWeight: "800",
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}>
            {rarityCfg.label}
          </span>
        </div>

        {/* Hero weapon image (PNG HD con drop-shadow neón) — BOUNCE 3D */}
        <div className="sm-hero-3d-wrap" style={{ perspective: "900px", zIndex: 2 }}>
          <img
            src={heroSrc}
            alt={hero?.name || c.name}
            onError={(e) => {
              if (hero) {
                handleImageError(e, hero);
              } else {
                e.currentTarget.onerror = null;
                e.currentTarget.src = generateCasePlaceholder(c.name, themeColor);
              }
            }}
            style={{
              width: "210px",
              height: "155px",
              objectFit: "contain",
              transformStyle: "preserve-3d",
              filter: `drop-shadow(0 20px 38px ${hexToRgba(themeColor, 0.6)}) brightness(1.08) contrast(1.02)`,
              transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
            className="sm-hero-img"
          />
        </div>

        {/* Hero skin name tag — shows resolved PriceEngine price */}
        {hero && (
          <div style={{
            position: "absolute",
            bottom: "10px", left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            maxWidth: "86%",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: `1px solid ${hexToRgba(themeColor, 0.3)}`,
            borderRadius: "10px",
            padding: "6px 14px",
            fontSize: "0.62rem",
            fontWeight: "800",
            color: "white",
            letterSpacing: "0.5px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
          }}>
            ⭐ {hero.name} · €{Number(heroPrice?.price || 0).toFixed(2)}
          </div>
        )}
      </div>

      {/* ─── BOTTOM CONTENT ───────────────────────────── */}
      <div style={{
        position: "relative",
        zIndex: 2,
        padding: "14px 16px 16px",
        background: "rgba(5,6,10,0.62)",
        borderTop: `1px solid ${hexToRgba(themeColor, 0.18)}`,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "10px"
        }}>
          <div style={{
            fontWeight: "900",
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1
          }}>
            {c.name}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s ease, transform 0.2s ease",
              color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.35)",
              transform: isFavorite ? "scale(1.1)" : "scale(1)",
              flexShrink: 0
            }}
            title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
          </button>
        </div>

        {/* Preview strip (4 skins reales) */}
        <div style={{ display: "flex", gap: "6px" }}>
          {previews.length > 0 ? (
            previews.map((skin, i) => (
              <div
                key={`prev-${c.id}-${skin.id || skin.name || i}`}
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                <img
                  src={getSkinImageUrl(skin.name, skin.image)}
                  alt={skin.name}
                  onError={(e) => handleImageError(e, skin)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: skin.image ? 0.85 : 0.35
                  }}
                />
              </div>
            ))
          ) : (
            <div style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.58rem",
              color: "rgba(255,255,255,0.25)",
              padding: "12px",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: "10px",
              fontWeight: "700",
              letterSpacing: "1px"
            }}>
              CARGANDO PREVIEWS…
            </div>
          )}
        </div>
      </div>

      {/* BOUNCE 3D animation */}
      <style>{`
        .sm-hero-img {
          animation: smBounce3D 3.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: 50% 85%;
          will-change: transform;
        }
        .sm-case-card:hover .sm-hero-img {
          animation-play-state: paused;
          transform: scale(1.06) rotateY(8deg) rotateX(4deg);
        }
        .sm-case-card:hover {
          transform: translateY(-10px) scale(1.02);
        }
        @keyframes smBounce3D {
          0%   { transform: translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
          12%  { transform: translateY(-14px) rotateY(6deg) rotateX(-4deg) scale(1.04); }
          24%  { transform: translateY(0) rotateY(-5deg) rotateX(3deg) scale(0.98); }
          36%  { transform: translateY(-10px) rotateY(-3deg) rotateX(-2deg) scale(1.02); }
          48%  { transform: translateY(0) rotateY(4deg) rotateX(-1deg) scale(0.99); }
          62%  { transform: translateY(-5px) rotateY(2deg) rotateX(2deg) scale(1.01); }
          76%  { transform: translateY(0) rotateY(-2deg) rotateX(0deg) scale(1); }
          88%  { transform: translateY(-2px) rotateY(1deg) rotateX(-1deg) scale(1); }
          100% { transform: translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─── MAIN RENDERER ─────────────────────────────────────────────────
const CaseCardRenderer = ({ c, skins, onClick, isFavorite, onToggleFavorite, forceStyle }) => {
  return (
    <WeaponBannerCard
      c={c}
      skins={skins}
      onClick={onClick}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      forceStyle={forceStyle}
    />
  );
};

export default CaseCardRenderer;
export { WeaponBannerCard };
// Backward-compatible aliases
export { WeaponBannerCard as AnimeCard, WeaponBannerCard as PremiumCard, WeaponBannerCard as RiskZoneCard, WeaponBannerCard as BattleCard };

