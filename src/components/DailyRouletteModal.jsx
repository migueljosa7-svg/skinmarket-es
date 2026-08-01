// src/components/DailyRouletteModal.jsx
// Reusable daily reward roulette modal.
// Extracted from Cases.jsx (PHASE 6.3 refactor).
import { useState, useEffect, useRef } from "react";
import { getRarityColor } from "../constants/colors";
import { handleImageError, getSkinImageUrl } from "../services/ImageService";

const DailyRouletteModal = ({ isOpen, onClose, rewardAmount, skinsPool }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [reel, setReel] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isSpinning && !hasRevealed && skinsPool.length > 0) {
      const newReel = [];
      for (let i = 0; i < 50; i++) {
        newReel.push(skinsPool[Math.floor(Math.random() * skinsPool.length)]);
      }
      const winnerSkin = skinsPool.find((s) => (s?.price || 0) >= rewardAmount) || skinsPool[0];
      newReel.push(winnerSkin);
      for (let i = 0; i < 5; i++) {
        newReel.push(skinsPool[Math.floor(Math.random() * skinsPool.length)]);
      }

      const frame = requestAnimationFrame(() => {
        setReel(newReel);
      });

      const t1 = setTimeout(() => {
        setIsSpinning(true);
        if (containerRef.current) {
          const cardWidth = 160;
          const winnerIndex = newReel.length - 6;
          const offset = winnerIndex * cardWidth - (window.innerWidth < 600 ? 100 : 250);
          containerRef.current.style.transition = "transform 5.5s cubic-bezier(0.1, 0.7, 0.1, 1)";
          containerRef.current.style.transform = `translateX(-${offset}px)`;
        }
      }, 300);

      const t2 = setTimeout(() => {
        setHasRevealed(true);
      }, 6000);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, isSpinning, hasRevealed, skinsPool, rewardAmount]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(10px)",
        color: "white"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          background: "#16191e",
          borderRadius: "32px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "35px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <h2 style={{ color: "white", textAlign: "center", marginBottom: "25px", fontWeight: "900", letterSpacing: "2px" }}>
          RECOMPENSA DIARIA
        </h2>

        <div
          style={{
            height: "180px",
            background: "#0c0d10",
            border: "2px solid rgba(255,255,255,0.05)",
            borderRadius: "20px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "4px",
              background: "#f5ac3b",
              zIndex: 10,
              transform: "translateX(-50%)",
              boxShadow: "0 0 20px #f5ac3b"
            }}
          />

          <div ref={containerRef} style={{ display: "flex", gap: "10px", paddingLeft: "50%", transition: "none" }}>
            {reel.map((skin, i) => {
              const dailyCardKey = `daily-${skin?.id || skin?.name || 'unknown'}-${i}`;
              return (
                <div
                  key={dailyCardKey}
                  style={{
                    minWidth: "150px",
                    height: "150px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                    borderWidth: "0 0 4px 0",
                    borderStyle: "solid",
                    borderColor: getRarityColor(skin?.rarity || "Common")
                  }}
                >
                  <img
                    src={getSkinImageUrl(skin?.name, skin?.image)}
                    alt={skin?.name}
                    onError={(e) => handleImageError(e, skin)}
                    style={{ width: "80px", height: "auto", marginBottom: "8px", opacity: skin?.image ? 1 : 0.3 }} />
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {skin?.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasRevealed && (
          <div style={{ textAlign: "center", marginTop: "25px" }}>
            <div style={{ color: "#10b981", fontSize: "2.2rem", fontWeight: "900", marginBottom: "8px" }}>
              +€{rewardAmount.toFixed(2)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontWeight: "bold" }}>AÑADIDOS A TU SALDO</div>
            <button
              onClick={() => {
                setHasRevealed(false);
                setIsSpinning(false);
                onClose();
              }}
              style={{
                padding: "14px 35px",
                borderRadius: "14px",
                background: "#f5ac3b",
                color: "black",
                border: "none",
                fontWeight: "900",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              ¡RECLAMAR RECOMPENSA!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyRouletteModal;