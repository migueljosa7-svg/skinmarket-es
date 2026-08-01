// src/components/battles/MiniBattleRoulette.jsx
// Mini roulette wheel for battle animations.
// Extracted from Battles.jsx (PHASE 6.2 refactor).
import { useEffect, useRef } from "react";
import { getRarityColor } from "../../constants/colors.js";
import { handleImageError, getSkinImageUrl } from "../../services/ImageService";

const MiniBattleRoulette = ({ items, accentColor }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    const el = containerRef.current;
    el.style.transition = "none";
    el.style.transform = "translateX(0px)";

    void el.offsetWidth;

    const CARD_W = 120; // Increased width for better spacing
    const winnerIndex = items.length - 4;
    const offset = winnerIndex * CARD_W + 60;

    const timerId = setTimeout(() => {
      const jitter = Math.floor(Math.random() * 30) - 15;
      el.style.transition = "transform 4s cubic-bezier(0.12, 0.9, 0.2, 1)";
      el.style.transform = `translateX(-${offset + jitter}px)`;
    }, 50);

    return () => clearTimeout(timerId);
  }, [items]);

  if (!items || items.length === 0) return null;

  const gold = accentColor || "#f5ac3b";

  return (
    <div
      style={{
        width: "100%",
        height: "150px",
        background: "rgba(0,0,0,0.3)",
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        backdropFilter: 'blur(10px)'
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "3px",
          background: gold,
          zIndex: 10,
          boxShadow: `0 0 20px ${gold}`,
          transform: "translateX(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, #0f1115 0%, transparent 25%, transparent 75%, #0f1115 100%)`,
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "10px",
          height: "100%",
          alignItems: "center",
          paddingLeft: "50%",
          willChange: "transform",
        }}
      >
        {items.map((skin, idx) => {
          const rc = getRarityColor(skin.rarity);
          return (
            <div
              key={`minibattle-${skin.id || skin._id || idx}`}
              style={{
                minWidth: "110px",
                height: "110px",
                background: `radial-gradient(circle at center, ${rc}15 0%, rgba(255,255,255,0.02) 80%)`,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                boxSizing: "border-box",
                flexShrink: 0,
                borderWidth: "0 0 4px 0",
                borderStyle: "solid",
                borderColor: rc
              }}
            >
              <img
                src={getSkinImageUrl(skin.name, skin.image)}
                alt={skin.name}
                onError={(e) => handleImageError(e, skin)}
                style={{
                  width: "80px",
                  height: "60px",
                  objectFit: "contain",
                  marginBottom: "8px",
                  filter: `drop-shadow(0 0 10px ${rc}40)`,
                  opacity: skin.image ? 1 : 0.3
                }}
              />
              <div
                style={{
                  color: "white",
                  fontSize: "0.6rem",
                  fontWeight: '800',
                  textAlign: "center",
                  width: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {skin.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniBattleRoulette;