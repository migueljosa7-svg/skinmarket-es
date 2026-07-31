// ─── CaseCardRenderer.jsx ─────────────────────────────────────────────
// Dynamic Visual Card Renderer for CS2 Case Catalog
// 4 distinct visual styles: ANIME, PREMIUM, RISK ZONE, BATTLE/HOLO/STANDARD
// Each style uses PNG transparent cutouts with CSS drop-shadows and glows
// ───────────────────────────────────────────────────────────────────────

import { Heart } from "lucide-react";
import { useMemo } from "react";

// ─── Rarity Color Mapping for Glow Effects ──────────────────────────
const RARITY_GLOW = {
    económica: { color: "#10b981", label: "ECO", glow: "rgba(16,185,129,0.25)" },
    intermedia: { color: "#3b82f6", label: "MID", glow: "rgba(59,130,246,0.25)" },
    premium: { color: "#a855f7", label: "PREMIUM", glow: "rgba(168,85,247,0.25)" },
    limited: { color: "#f59e0b", label: "LIMITED", glow: "rgba(245,158,11,0.25)" },
    risk: { color: "#ef4444", label: "RISK", glow: "rgba(239,68,68,0.25)" },
    holo: { color: "#06b6d4", label: "HOLO", glow: "rgba(6,182,212,0.25)" },
    brainrot: { color: "#ec4899", label: "BRAINROT", glow: "rgba(236,72,153,0.25)" },
    battle: { color: "#6366f1", label: "BATTLE", glow: "rgba(99,102,241,0.25)" },
    default: { color: "#6366f1", label: "CASE", glow: "rgba(99,102,241,0.2)" }
};

const getRarityConfig = (category) => RARITY_GLOW[category] || RARITY_GLOW.default;

// ─── Shared Styles ──────────────────────────────────────────────────
const styles = {
    cardBase: {
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.3s ease"
    },
    imageArea: {
        height: "260px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden"
    },
    priceBadge: {
        position: "absolute",
        top: "12px",
        right: "12px",
        zIndex: 10,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "10px",
        padding: "6px 14px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
    },
    priceText: {
        fontWeight: "900",
        fontSize: "0.85rem",
        fontFamily: "'Inter', sans-serif"
    },
    categoryBadge: {
        position: "absolute",
        top: "12px",
        left: "12px",
        zIndex: 10,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        padding: "4px 10px",
        fontSize: "0.6rem",
        fontWeight: "800",
        color: "rgba(255,255,255,0.7)",
        letterSpacing: "1px",
        textTransform: "uppercase"
    },
    bottomBar: {
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
    },
    title: {
        fontWeight: "900",
        fontSize: "0.8rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: 1
    },
    heartButton: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.2s ease, transform 0.2s ease",
        marginLeft: "12px"
    },
    previewStrip: {
        padding: "12px 20px",
        display: "flex",
        gap: "6px",
        justifyContent: "center",
        borderTop: "1px solid rgba(255,255,255,0.03)"
    },
    previewItem: {
        flex: 1,
        height: "50px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
    },
    previewImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        opacity: 0.7
    }
};

// ─── STYLE 1: ANIME / ILLUSTRATED ──────────────────────────────────
// Transparent PNG cutout with no rigid container, drop-shadow, floating price badge
const AnimeCard = ({ c, skins, onClick, isFavorite, onToggleFavorite }) => {
    const rarity = getRarityConfig(c.category);

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={onClick}
            style={{
                ...styles.cardBase,
                background: c.bgGradient || "linear-gradient(135deg, #1a0030 0%, #ff00ff 30%, #1a0030 100%)",
                border: "1.5px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 40px rgba(255,0,255,0.08), 0 4px 20px rgba(0,0,0,0.4)"
            }}
        >
            {/* Artistic background pattern */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: `
          radial-gradient(circle at 20% 80%, rgba(255,0,255,0.12) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0,255,255,0.08) 0%, transparent 50%)
        `,
                zIndex: 0,
                pointerEvents: "none"
            }} />

            {/* Image Area - Pure PNG cutout with drop-shadow */}
            <div style={{ ...styles.imageArea, zIndex: 1 }}>
                {/* Category badge */}
                <div style={styles.categoryBadge}>
                    {c.badge || c.category?.toUpperCase() || "ANIME"}
                </div>

                {/* Price badge flotante con glassmorphism */}
                <div style={{ ...styles.priceBadge, border: `1px solid ${rarity.color}40` }}>
                    <span style={{ ...styles.priceText, color: rarity.color }}>
                        €{Number(c.price).toFixed(2)}
                    </span>
                </div>

                {/* PNG transparente recortado con drop-shadow */}
                <img
                    src={c.image || c.imageSrc || "/case_eco.png"}
                    alt={c.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = "0.3"; }}
                    style={{
                        width: "170px",
                        height: "170px",
                        objectFit: "contain",
                        zIndex: 2,
                        filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.75)) brightness(1.1)",
                        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}
                    className="anime-case-img"
                />
            </div>

            {/* Minimalist bottom bar */}
            <div style={{ ...styles.bottomBar, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", position: "relative", zIndex: 1 }}>
                <div style={{ ...styles.title, color: "white" }}>
                    {c.name}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    style={{
                        ...styles.heartButton,
                        color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.4)",
                        transform: isFavorite ? "scale(1.1)" : "scale(1)"
                    }}
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                    <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
                </button>
            </div>

            {/* Preview skins strip */}
            <div style={{ ...styles.previewStrip, background: "rgba(0,0,0,0.3)", position: "relative", zIndex: 1 }}>
                {(skins || []).slice(0, 4).map((skin, i) => (
                    <div key={`preview-${c.id}-${skin.id || skin._id || i}`} style={styles.previewItem}>
                        <img
                            src={skin.image || skin.icon_url || ""}
                            alt={skin.name}
                            onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                            style={styles.previewImage}
                        />
                    </div>
                ))}
            </div>

            <style>{`
        .anime-case-img {
          animation: animeFloat 4s ease-in-out infinite;
        }
        @keyframes animeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(0deg); }
          75% { transform: translateY(-4px) rotate(2deg); }
        }
      `}</style>
        </motion.div>
    );
};

// ─── STYLE 2: PREMIUM ──────────────────────────────────────────────
// 3D Pedestal/Chest with floating weapon, radial golden halo, glass price badge
const PremiumCard = ({ c, skins, onClick, isFavorite, onToggleFavorite }) => {

    return (
        <motion.div
            whileHover={{ y: -10, scale: 1.03 }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
            onClick={onClick}
            style={{
                ...styles.cardBase,
                background: "linear-gradient(180deg, #0a0a12 0%, #1a0f00 50%, #0a0a12 100%)",
                border: "1.5px solid rgba(255, 215, 0, 0.2)",
                boxShadow: "0 0 40px rgba(255, 215, 0, 0.08), 0 4px 20px rgba(0,0,0,0.5)"
            }}
        >
            {/* Gold shimmer top line */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, #ffd700, transparent)",
                zIndex: 5
            }} />

            {/* Image Area with pedestal base */}
            <div style={{
                ...styles.imageArea,
                background: "radial-gradient(ellipse at center bottom, rgba(255,215,0,0.08) 0%, transparent 60%)"
            }}>
                {/* Radial golden halo */}
                <div style={{
                    position: "absolute",
                    width: "220px",
                    height: "220px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(234,179,8,0.25) 0%, rgba(234,179,8,0.1) 40%, transparent 70%)",
                    filter: "blur(40px)",
                    zIndex: 0,
                    top: "45%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                }} />

                {/* 3D Pedestal base */}
                <div style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "130px",
                    height: "18px",
                    background: "linear-gradient(90deg, rgba(255,215,0,0.08), rgba(255,215,0,0.3), rgba(255,215,0,0.08))",
                    borderRadius: "50%",
                    filter: "blur(5px)",
                    zIndex: 0
                }} />

                {/* Premium badge */}
                <div style={{ ...styles.categoryBadge, background: "linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))", borderColor: "rgba(255,215,0,0.3)", color: "#ffd700" }}>
                    PREMIUM
                </div>

                {/* Golden price badge */}
                <div style={{ ...styles.priceBadge, border: "1px solid rgba(255, 215, 0, 0.25)" }}>
                    <span style={{ ...styles.priceText, color: "#ffd700" }}>
                        €{Number(c.price).toFixed(2)}
                    </span>
                </div>

                {/* PNG transparente de cofre/pedestal con arma flotando */}
                <img
                    src={c.image || c.imageSrc || "/case_premium.png"}
                    alt={c.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = "0.3"; }}
                    style={{
                        width: "160px",
                        height: "160px",
                        objectFit: "contain",
                        zIndex: 1,
                        filter: "drop-shadow(0 20px 50px rgba(255,215,0,0.3)) brightness(1.1)",
                        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}
                    className="premium-case-img"
                />
            </div>

            {/* Bottom bar */}
            <div style={{ ...styles.bottomBar, background: "linear-gradient(0deg, #0c0d10 0%, rgba(12,13,16,0.8) 100%)", borderTop: "1px solid rgba(255,215,0,0.1)" }}>
                <div style={{ ...styles.title, color: "#ffd700" }}>
                    {c.name}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    style={{
                        ...styles.heartButton,
                        color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.3)",
                        transform: isFavorite ? "scale(1.1)" : "scale(1)"
                    }}
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                    <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
                </button>
            </div>

            {/* Preview skins */}
            <div style={{ ...styles.previewStrip, background: "#121419" }}>
                {(skins || []).slice(0, 4).map((skin, i) => (
                    <div key={`preview-${c.id}-${skin.id || skin._id || i}`} style={styles.previewItem}>
                        <img
                            src={skin.image || skin.icon_url || ""}
                            alt={skin.name}
                            onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                            style={styles.previewImage}
                        />
                    </div>
                ))}
            </div>

            <style>{`
        .premium-case-img {
          animation: premiumFloat 5s ease-in-out infinite;
        }
        @keyframes premiumFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(-2deg); }
          75% { transform: translateY(-4px) rotate(2deg); }
        }
      `}</style>
        </motion.div>
    );
};

// ─── STYLE 3: RISK ZONE ────────────────────────────────────────────
// High contrast neon yellow, industrial danger tape, "HIGH RISK" watermark
const RiskZoneCard = ({ c, skins, onClick, isFavorite, onToggleFavorite }) => {
    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={onClick}
            style={{
                ...styles.cardBase,
                background: "linear-gradient(135deg, #1a1a00 0%, #2a2a00 50%, #1a1a00 100%)",
                border: "2px solid rgba(255, 200, 0, 0.4)",
                boxShadow: "0 0 30px rgba(255, 200, 0, 0.15), inset 0 0 60px rgba(255, 200, 0, 0.05)"
            }}
        >
            {/* HIGH RISK vertical watermark */}
            <div style={{
                position: "absolute",
                left: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 6,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize: "0.65rem",
                fontWeight: "900",
                color: "rgba(255, 200, 0, 0.25)",
                letterSpacing: "4px",
                textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif"
            }}>
                HIGH RISK
            </div>

            {/* Danger diagonal stripe */}
            <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
                background: "repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(255,200,0,0.03) 15px, rgba(255,200,0,0.03) 17px)",
                pointerEvents: "none"
            }} />

            {/* Image Area */}
            <div style={{ ...styles.imageArea, zIndex: 1 }}>
                {/* Yellow neon glow */}
                <div style={{
                    position: "absolute",
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(255,200,0,0.15) 0%, transparent 70%)",
                    filter: "blur(40px)",
                    zIndex: 0,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                }} />

                {/* Risk badge */}
                <div style={{ ...styles.categoryBadge, background: "rgba(255,200,0,0.15)", borderColor: "rgba(255,200,0,0.3)", color: "#ffcc00" }}>
                    HIGH RISK
                </div>

                {/* Price badge */}
                <div style={{ ...styles.priceBadge, border: "1px solid rgba(255, 200, 0, 0.3)" }}>
                    <span style={{ ...styles.priceText, color: "#ffcc00" }}>
                        €{Number(c.price).toFixed(2)}
                    </span>
                </div>

                {/* Case image with danger effect */}
                <img
                    src={c.image || c.imageSrc || "/case_eco.png"}
                    alt={c.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = "0.3"; }}
                    style={{
                        width: "160px",
                        height: "160px",
                        objectFit: "contain",
                        zIndex: 1,
                        filter: "drop-shadow(0 20px 40px rgba(255,200,0,0.4)) brightness(1.1) contrast(1.2)",
                        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}
                    className="risk-case-img"
                />
            </div>

            {/* Bottom bar */}
            <div style={{ ...styles.bottomBar, background: "#0c0d10", borderTop: "2px solid rgba(255, 200, 0, 0.2)", zIndex: 1 }}>
                <div style={{ ...styles.title, color: "#ffcc00" }}>
                    {c.name}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    style={{
                        ...styles.heartButton,
                        color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.3)",
                        transform: isFavorite ? "scale(1.1)" : "scale(1)"
                    }}
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                    <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
                </button>
            </div>

            {/* Preview skins */}
            <div style={{ ...styles.previewStrip, background: "#121419", zIndex: 1 }}>
                {(skins || []).slice(0, 4).map((skin, i) => (
                    <div key={`preview-${c.id}-${skin.id || skin._id || i}`} style={styles.previewItem}>
                        <img
                            src={skin.image || skin.icon_url || ""}
                            alt={skin.name}
                            onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                            style={styles.previewImage}
                        />
                    </div>
                ))}
            </div>

            <style>{`
        .risk-case-img {
          animation: riskFloat 3s ease-in-out infinite;
        }
        @keyframes riskFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
      `}</style>
        </motion.div>
    );
};

// ─── STYLE 4: BATTLE / HOLO / STANDARD ─────────────────────────────
// 3D metallic box floating on radial glow, color dynamic by rarity
const BattleCard = ({ c, skins, onClick, isFavorite, onToggleFavorite }) => {
    const rarity = getRarityConfig(c.category);

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={onClick}
            style={{
                ...styles.cardBase,
                background: `radial-gradient(circle at 50% 30%, ${rarity.glow} 0%, ${rarity.color}08 30%, #0c0d10 70%)`,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `0 0 30px ${rarity.color}20, 0 4px 20px rgba(0,0,0,0.3)`
            }}
        >
            {/* Image Area with rarity glow */}
            <div style={{
                ...styles.imageArea,
                background: `radial-gradient(circle at center, ${rarity.color}18 0%, transparent 65%)`
            }}>
                {/* Radial glow effect */}
                <div style={{
                    position: "absolute",
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${rarity.color}30 0%, ${rarity.color}15 40%, transparent 70%)`,
                    filter: "blur(40px)",
                    zIndex: 0,
                    top: "55%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                }} />

                {/* Category badge */}
                <div style={{ ...styles.categoryBadge, border: `1px solid ${rarity.color}30`, color: rarity.color }}>
                    {c.badge || c.category?.toUpperCase() || "CASE"}
                </div>

                {/* Glassmorphism price badge */}
                <div style={{ ...styles.priceBadge, border: `1px solid ${rarity.color}40` }}>
                    <span style={{ ...styles.priceText, color: rarity.color }}>
                        €{Number(c.price).toFixed(2)}
                    </span>
                </div>

                {/* Metallic floating case */}
                <img
                    src={c.image || c.imageSrc || "/case_eco.png"}
                    alt={c.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = "0.3"; }}
                    style={{
                        width: "160px",
                        height: "160px",
                        objectFit: "contain",
                        zIndex: 1,
                        filter: `drop-shadow(0 20px 40px ${rarity.color}60) brightness(1.05)`,
                        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}
                    className="battle-case-img"
                />
            </div>

            {/* Bottom bar */}
            <div style={{ ...styles.bottomBar, background: "#0c0d10", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ ...styles.title, color: "white" }}>
                    {c.name}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    style={{
                        ...styles.heartButton,
                        color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.3)",
                        transform: isFavorite ? "scale(1.1)" : "scale(1)"
                    }}
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                    <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} />
                </button>
            </div>

            {/* Preview skins */}
            <div style={{ ...styles.previewStrip, background: "#121419" }}>
                {(skins || []).slice(0, 4).map((skin, i) => (
                    <div key={`preview-${c.id}-${skin.id || skin._id || i}`} style={styles.previewItem}>
                        <img
                            src={skin.image || skin.icon_url || ""}
                            alt={skin.name}
                            onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                            style={styles.previewImage}
                        />
                    </div>
                ))}
            </div>

            <style>{`
        .battle-case-img {
          animation: battleFloat 4s ease-in-out infinite;
        }
        @keyframes battleFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }
      `}</style>
        </motion.div>
    );
};

// ─── MAIN RENDERER ─────────────────────────────────────────────────
// Dynamically selects the correct card style based on case category/template
const CaseCardRenderer = ({ c, skins, onClick, isFavorite, onToggleFavorite, forceStyle }) => {
    // Determine the visual style based on category or forced style
    const cardStyle = useMemo(() => {
        if (forceStyle) return forceStyle;

        const category = (c.category || "").toLowerCase();
        const price = parseFloat(c.price) || 0;

        // RISK ZONE: High risk category or very high price volatility
        if (category === "risk" || category === "risk_zone") return "risk";

        // PREMIUM: Premium category or high-price cases
        if (category === "premium" || category === "limited" || price > 100) return "premium";

        // ANIME / ILLUSTRATED: Anime, brainrot, illustrated themes
        if (category === "anime" || category === "brainrot" || category === "illustrated" ||
            category === "youtubers" || category === "holo") return "anime";

        // Default: BATTLE / STANDARD
        return "battle";
    }, [c.category, c.price, forceStyle]);

    const commonProps = { c, skins, onClick, isFavorite, onToggleFavorite };

    switch (cardStyle) {
        case "anime": return <AnimeCard {...commonProps} />;
        case "premium": return <PremiumCard {...commonProps} />;
        case "risk": return <RiskZoneCard {...commonProps} />;
        case "battle":
        default: return <BattleCard {...commonProps} />;
    }
};

export default CaseCardRenderer;
export { AnimeCard, PremiumCard, RiskZoneCard, BattleCard };