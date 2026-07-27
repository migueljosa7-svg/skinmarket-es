// src/pages/Upgrade.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/useAuth";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { getRarityColor } from "../constants/colors.js";
import { StorageService } from "../services/StorageService";
import { sound } from "../utils/audio";
import { getPlaceholderImage, handleImageError, getSkinImageUrl } from "../services/ImageService";

const UpgradeSpinner = ({ chance, isSpinning, resultDegree, onComplete }) => {
  const tickRef = useRef(null);

  useEffect(() => {
    if (isSpinning && tickRef.current) {
      sound.playTick();
      const targetRotation = 1800 + resultDegree;
      tickRef.current.style.transition = "transform 4s cubic-bezier(0.12, 0.8, 0.15, 1)";
      tickRef.current.style.transform = `rotate(${targetRotation}deg)`;

      const timer = setTimeout(() => {
        onComplete();
      }, 4300);

      return () => clearTimeout(timer);
    } else if (!isSpinning && tickRef.current) {
      tickRef.current.style.transition = "none";
      tickRef.current.style.transform = `rotate(0deg)`;
    }
  }, [isSpinning, resultDegree, onComplete]);

  return (
    <div
      style={{
        position: "relative",
        width: "340px",
        height: "340px",
        borderRadius: "50%",
        margin: "0 auto",
        background: "#0c0d10",
        boxShadow: "0 0 100px rgba(0,0,0,0.8), inset 0 0 50px rgba(255,255,255,0.02)",
        border: "4px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* SVG Wheel */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: "calc(100% - 20px)",
          height: "calc(100% - 20px)",
          transform: "rotate(-90deg)",
          zIndex: 1
        }}
      >
        <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="6" strokeOpacity="0.2" />
        {chance > 0 && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#f5ac3b"
            strokeWidth="6"
            strokeDasharray={`${(chance / 100) * 283} 283`}
            strokeLinecap="round"
            style={{ transition: "all 0.5s ease", filter: "drop-shadow(0 0 10px rgba(245, 172, 59, 0.5))" }}
          />
        )}
      </svg>

      {/* The Tick Pointer */}
      <div
        ref={tickRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transformOrigin: "center center",
          zIndex: 10
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "5px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "40px",
            background: "white",
            borderRadius: "4px",
            boxShadow: "0 0 20px rgba(255,255,255,1)"
          }}
        />
      </div>

      {/* Center Label */}
      <div style={{ position: "relative", zIndex: 5, textAlign: "center" }}>
        <div
          style={{
            fontSize: "4rem",
            fontWeight: "900",
            color: "white",
            lineHeight: "1",
            letterSpacing: "-2px"
          }}
        >
          {chance.toFixed(2)}
          <span style={{ fontSize: "1.5rem", color: "#f5ac3b" }}>%</span>
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "3px",
            marginTop: "10px",
            fontWeight: "900"
          }}
        >
          PROBABILIDAD
        </div>
      </div>
    </div>
  );
};

export default function Upgrade() {
  const { user } = useAuth();
  const { skins: allSkins } = useFetchSkins(1000, false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [targetSkins, setTargetSkins] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultDegree, setResultDegree] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [searchRight, setSearchRight] = useState("");
  const [page, setPage] = useState(0);
  const [reverseMode, setReverseMode] = useState(false);
  const itemsPerPage = 16;

  const validTargets = useMemo(() => {
    let pool = allSkins.filter((s) => s.price > 0.5 && s.image && s.name);
    if (searchRight) {
      pool = pool.filter((s) => s.name.toLowerCase().includes(searchRight.toLowerCase()));
    }
    return pool.sort((a, b) => a.price - b.price);
  }, [allSkins, searchRight]);

  const paginatedTargets = useMemo(() => {
    const start = page * itemsPerPage;
    return validTargets.slice(start, start + itemsPerPage);
  }, [validTargets, page]);

  const maxPages = Math.ceil(validTargets.length / itemsPerPage);

  const toggleTargetSkin = (skin) => {
    if (isSpinning) return;
    setTargetSkins((prev) => {
      const exists = prev.find((s) => s.id === skin.id);
      if (exists) return prev.filter((s) => s.id !== skin.id);
      if (prev.length >= 4) return prev;
      return [...prev, skin];
    });
  };

  const handleSkinClick = (id) => {
    if (isSpinning) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      // Max 3 skins allowed
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const calculateChance = () => {
    if (selectedIds.length === 0 || targetSkins.length === 0) return 0;
    const totalBetValue = (user?.inventory || []).filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + (s.price || 0), 0);
    const totalTargetValue = targetSkins.reduce((sum, s) => sum + (s.price || 0), 0);
    if (totalTargetValue <= 0 || totalBetValue <= 0) return 0;

    if (reverseMode) {
      // Reverse: 1 high-value skin vs multiple low-value targets
      // You're betting your 1 skin to win multiple lower-value skins
      const ratio = totalTargetValue / totalBetValue;
      return Math.max(Math.min(ratio * 90, 90), 0.01);
    }

    // Normal: multiple low-value vs 1 high-value target
    const ratio = totalBetValue / totalTargetValue;
    return Math.max(Math.min(ratio * 95, 95), 0.01);
  };

  const chance = calculateChance();
  const totalBetValue = selectedIds.length > 0 ? (user?.inventory || []).filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + (s.price || 0), 0) : 0;
  const totalTargetValue = targetSkins.reduce((sum, s) => sum + (s.price || 0), 0);

  const handleSpinClick = () => {
    if (selectedIds.length === 0 || targetSkins.length === 0 || isSpinning) return;
    setLastResult(null);
    setIsSpinning(true);

    const finalDeg = Math.random() * 360;
    setResultDegree(finalDeg);
    const winDegrees = chance * 3.6;
    const success = finalDeg <= winDegrees;

    setPendingResult({
      success,
      wonSkins: targetSkins.map((s) => ({
        ...s,
        id: `upg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
      }))
    });
  };

  const handleAnimationComplete = useCallback(() => {
    setIsSpinning(false);
    if (pendingResult) {
      // Remove sacrificed skins from inventory
      selectedIds.forEach((id) => {
        StorageService.sellSkin(id); // remove item
      });

      if (pendingResult.success) {
        sound.playWin(true);
        StorageService.addSkinsToInventory(pendingResult.wonSkins);
        setLastResult({ success: true, skins: pendingResult.wonSkins });

        // Push live drop
        pendingResult.wonSkins.forEach((skin) => {
          StorageService.addLiveDrop({
            user: user?.nombre_usuario || "Jugador",
            item: { name: skin.name, price: skin.price, rarity: skin.rarity, image: skin.image },
            caseName: "Upgrader"
          });
        });
      } else {
        sound.playFail();
        setLastResult({ success: false });
      }

      setSelectedIds([]);
      setTargetSkins([]);
      setPendingResult(null);
    }
  }, [pendingResult, selectedIds, user?.nombre_usuario]);

  if (!user)
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1115", color: "white", fontSize: "2rem", fontWeight: "900" }}>
        INICIA SESIÓN PARA JUGAR
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "30px", fontFamily: "'Inter', sans-serif", color: "white" }}>
      <div style={{ maxWidth: "1500px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr", gap: "30px" }}>
        {/* INVENTORY COLUMN */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "25px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", height: "calc(100vh - 140px)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: "900", color: "#f5ac3b", letterSpacing: "2px", margin: 0 }}>TU INVENTARIO</h2>
              <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>€{totalBetValue.toFixed(2)}</div>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              disabled={isSpinning || selectedIds.length === 0}
              style={{ padding: "8px 15px", background: "rgba(255,255,255,0.05)", border: "none", color: "white", borderRadius: "10px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "bold" }}
            >
              LIMPIAR
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "10px" }}>
            {(user?.inventory || []).map((skin) => {
              const isSelected = selectedIds.includes(skin.id);
              const color = getRarityColor(skin.rarity);
              return (
                <div
                  key={skin.id}
                  onClick={() => handleSkinClick(skin.id)}
                  style={{
                    padding: "10px",
                    background: isSelected ? "rgba(245, 172, 59, 0.2)" : "rgba(255,255,255,0.02)",
                    borderWidth: isSelected ? "2px 2px 3px 2px" : "1px 1px 3px 1px",
                    borderStyle: "solid",
                    borderColor: isSelected ? `#f5ac3b #f5ac3b ${color} #f5ac3b` : `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                    borderRadius: "14px",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <img
                    src={getSkinImageUrl(skin.name, skin.image)}
                    alt={skin.name}
                    onError={(e) => handleImageError(e, skin)}
                    style={{
                      width: "100%",
                      height: "60px",
                      objectFit: "contain",
                      opacity: skin.image ? 1 : 0.3
                    }}
                  />
                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "5px" }}>{skin.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#f5ac3b", fontWeight: "900" }}>€{skin.price.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "30px" }}>
          {/* Mode Toggle */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "5px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => setReverseMode(false)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: reverseMode ? "transparent" : "#f5ac3b",
                color: reverseMode ? "rgba(255,255,255,0.4)" : "black",
                fontWeight: "900",
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              ↑ UPGRADE
            </button>
            <button
              onClick={() => setReverseMode(true)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: reverseMode ? "#a855f7" : "transparent",
                color: reverseMode ? "white" : "rgba(255,255,255,0.4)",
                fontWeight: "900",
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              ↓ DOWNGRADE
            </button>
          </div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: "bold", textAlign: "center" }}>
            {reverseMode
              ? "Apuesta 1 skin de alto valor para ganar VARIAS skins de menor valor"
              : "Apuesta hasta 3 skins para ganar 1 skin de mayor valor"}
          </div>

          <UpgradeSpinner chance={chance} isSpinning={isSpinning} resultDegree={resultDegree} onComplete={handleAnimationComplete} />

          <button
            onClick={handleSpinClick}
            disabled={isSpinning || chance <= 0}
            style={{
              width: "100%",
              maxWidth: "350px",
              padding: "18px 40px",
              background: chance > 0 ? "linear-gradient(90deg, #f5ac3b, #ffba52)" : "rgba(255,255,255,0.1)",
              color: chance > 0 ? "black" : "#666",
              border: "none",
              borderRadius: "18px",
              fontSize: "1.2rem",
              fontWeight: "900",
              cursor: chance > 0 ? "pointer" : "not-allowed"
            }}
          >
            {isSpinning ? "MEJORANDO..." : "MEJORAR SKINS"}
          </button>

          {lastResult && (
            <AnimatePresence>
              <Motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: "15px 30px",
                  borderRadius: "16px",
                  background: lastResult.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  border: `1px solid ${lastResult.success ? "#10b981" : "#ef4444"}`,
                  color: lastResult.success ? "#10b981" : "#ef4444",
                  fontWeight: "900",
                  fontSize: "1.2rem"
                }}
              >
                {lastResult.success ? "¡MEJORA EXITOSA! SKIN AÑADIDA" : "MEJORA FALLIDA"}
              </Motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* TARGET SKINS COLUMN */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "25px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", height: "calc(100vh - 140px)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div>
              <h2 style={{ fontSize: "0.75rem", fontWeight: "900", color: "#3b82f6", letterSpacing: "2px", margin: 0 }}>OBJETIVO</h2>
              <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>€{totalTargetValue.toFixed(2)}</div>
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchRight}
              onChange={(e) => setSearchRight(e.target.value)}
              style={{ padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", width: "110px", fontSize: "0.8rem" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "10px" }}>
            {paginatedTargets.map((skin) => {
              const isSelected = !!targetSkins.find((s) => s.id === skin.id);
              const color = getRarityColor(skin.rarity);
              return (
                <div
                  key={skin.id}
                  onClick={() => toggleTargetSkin(skin)}
                  style={{
                    padding: "10px",
                    background: isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.02)",
                    borderWidth: isSelected ? "2px 2px 3px 2px" : "1px 1px 3px 1px",
                    borderStyle: "solid",
                    borderColor: isSelected ? `#3b82f6 #3b82f6 ${color} #3b82f6` : `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                    borderRadius: "14px",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <img
                    src={getSkinImageUrl(skin.name, skin.image)}
                    alt={skin.name}
onError={(e) => handleImageError(e, skin)}
                    style={{
                      width: "100%",
                      height: "60px",
                      objectFit: "contain",
                      opacity: skin.image ? 1 : 0.3
                    }}
                  />
                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "5px" }}>{skin.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#3b82f6", fontWeight: "900" }}>€{skin.price.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          {maxPages > 1 && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "none", color: "white", borderRadius: "8px" }}>
                &lt;
              </button>
              <span style={{ fontSize: "0.8rem", alignSelf: "center" }}>
                {page + 1} / {maxPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(p + 1, maxPages - 1))} disabled={page >= maxPages - 1} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "none", color: "white", borderRadius: "8px" }}>
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
