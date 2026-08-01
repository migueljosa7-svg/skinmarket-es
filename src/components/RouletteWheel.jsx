// src/components/RouletteWheel.jsx
// Reusable single/multi roulette wheel for case opening animations.
// Extracted from CaseView.jsx (PHASE 6.1 refactor).
import React, { useEffect, useRef } from "react";
import { getRarityColor } from "../constants/colors.js";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { sound } from "../utils/audio";

const SingleMultiRoulette = React.memo(({ items, quantity, isSpinning, onComplete }) => {
  const containerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isSpinning && containerRef.current) {
      containerRef.current.style.transition = "none";
      containerRef.current.style.transform = "translateX(0px)";

      void containerRef.current.offsetWidth; // Force Reflow

      const cardWidth = 160;
      const winnerStartIndex = items.length - 10 - quantity;
      const winnersCenter = winnerStartIndex * cardWidth + (quantity * cardWidth - 10) / 2;
      const offset = winnersCenter;

      sound.playTick();
      const t1 = setTimeout(() => {
        const randomJitter = Math.floor(Math.random() * 40) - 20;
        containerRef.current.style.transition = "transform 5.5s cubic-bezier(0.12, 0.8, 0.15, 1)";
        containerRef.current.style.transform = `translateX(-${offset + randomJitter}px)`;
      }, 50);

      const timer = setTimeout(() => {
        sound.playWin(true);
        onCompleteRef.current();
      }, 5700);

      return () => {
        clearTimeout(t1);
        clearTimeout(timer);
      };
    } else if (!isSpinning && containerRef.current) {
      containerRef.current.style.transition = "none";
      containerRef.current.style.transform = "translateX(0px)";
    }
  }, [isSpinning, items, quantity]);

  const selectorWidth = quantity * 160 - 20;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "200px",
        overflow: "hidden",
        borderRadius: "24px"
      }}
    >
      {/* Selector indicator */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "10px",
          bottom: "10px",
          width: `${selectorWidth}px`,
          transform: "translateX(-50%)",
          border: "2px solid #f5ac3b",
          borderRadius: "16px",
          background: "rgba(245, 172, 59, 0.05)",
          zIndex: 10,
          pointerEvents: "none",
          boxShadow: "0 0 40px rgba(245, 172, 59, 0.2)"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-15px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0",
            height: "0",
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "15px solid #f5ac3b",
            filter: "drop-shadow(0 0 10px #f5ac3b)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-15px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0",
            height: "0",
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: "15px solid #f5ac3b",
            filter: "drop-shadow(0 0 10px #f5ac3b)"
          }}
        />
      </div>

      {/* Edge fade gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, #0c0d10 0%, transparent 20%, transparent 80%, #0c0d10 100%)",
          zIndex: 5,
          pointerEvents: "none"
        }}
      />

      {/* Reel container */}
      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "10px",
          height: "100%",
          alignItems: "center",
          paddingLeft: "50%"
        }}
      >
        {items.map((skin, idx) => {
          const color = getRarityColor(skin.rarity);
          // Stable + unique key: index guarantees uniqueness since skins repeat in the reel.
          // Avoid Date.now() which forces React to remount every item on each render.
          const uniqueKey = `reel-${idx}-${skin.id || skin._id || "skin"}`;
          return (
            <div
              key={uniqueKey}
              style={{
                minWidth: "150px",
                height: "160px",
                background: "rgba(255,255,255,0.02)",
                borderWidth: "0 0 4px 0",
                borderStyle: "solid",
                borderColor: color,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "15px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  width: "100%",
                  height: "40px",
                  background: color,
                  filter: "blur(30px)",
                  opacity: 0.1
                }}
              />
              <img
                src={skin.image || getPlaceholderImage(skin.name)}
                alt={skin.name}
                onError={(e) => handleImageError(e, skin)}
                style={{
                  width: "100px",
                  height: "70px",
                  objectFit: "contain",
                  marginBottom: "12px",
                  filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.5))",
                  opacity: skin.image ? 1 : 0.3
                }}
              />
              <div
              >
                {skin.name ? skin.name.split(" | ")[0] : "SKIN"}
              </div>
              <div
                style={{
                  color: "white",
                  fontSize: "0.75rem",
                  textAlign: "center",
                  width: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  fontWeight: "bold"
                }}
              >
                {skin.name ? skin.name.split(" | ")[1] || skin.name : "SKIN"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SingleMultiRoulette;