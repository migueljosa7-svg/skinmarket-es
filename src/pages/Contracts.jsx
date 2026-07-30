// src/pages/Contracts.jsx
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import { StorageService } from "../services/StorageService";
import { sound } from "../utils/audio";
import { getFloatBadgeProps } from "../utils/floatPreview";
import { getSkinImageUrl, getPlaceholderImage, handleImageError } from "../services/ImageService";
import { useToast } from "../components/Toast";

/* ─────────────────────────────────────────────
   CONTRACT FORMULA
   Input: 3-10 skins
   Total value = sum of all selected skins
   Min reward = 80% of total
   Max reward = 200% of total
   Result rarity scales with input quality
───────────────────────────────────────────── */
function calculateContractResult(selectedSkins, allSkins) {
  const totalValue = selectedSkins.reduce((sum, s) => sum + (s.price || 0), 0);
  const minReward = totalValue * 0.8;
  const maxReward = totalValue * 2.0;

  // Determine rarity based on average input rarity score
  const rarityScores = { "Mil-Spec Grade": 1, "Restricted": 2, "Classified": 3, "Covert": 4, "Extraordinary": 5, "Contraband": 6 };
  const avgScore = selectedSkins.reduce((sum, s) => sum + (rarityScores[s.rarity] || 1), 0) / selectedSkins.length;

  // Pick a reward skin from pool that matches expected value
  const pool = allSkins.filter((s) => {
    const score = rarityScores[s.rarity] || 1;
    // Higher avg input = higher potential output
    return score >= Math.round(avgScore) && score <= Math.round(avgScore) + 2;
  });

  // Fallback if pool empty
  const rewardPool = pool.length > 0 ? pool : allSkins.filter((s) => s.price > 0.5);

  // Weighted random: prefer skins within min-max range
  const weighted = [];
  rewardPool.forEach((skin) => {
    const price = skin.price || 1;
    if (price >= minReward && price <= maxReward) {
      // Higher weight for skins in ideal range
      const weight = Math.max(1, Math.floor(100 / (Math.abs(price - totalValue) + 1)));
      for (let i = 0; i < weight; i++) weighted.push(skin);
    } else if (price < maxReward * 1.5) {
      // Some weight for nearby skins
      const weight = Math.max(1, Math.floor(20 / (Math.abs(price - totalValue) + 1)));
      for (let i = 0; i < weight; i++) weighted.push(skin);
    }
  });

  // If still empty, use all skins
  const finalPool = weighted.length > 0 ? weighted : rewardPool;
  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];

  // Guard clause: if chosen is undefined, return a default result
  if (!chosen) {
    const defaultPrice = parseFloat((totalValue * 0.8).toFixed(2));
    return {
      success: true,
      totalValue: parseFloat(totalValue.toFixed(2)),
      minReward: parseFloat(minReward.toFixed(2)),
      maxReward: parseFloat(maxReward.toFixed(2)),
      reward: {
        id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: "Skin de Contrato",
        price: defaultPrice,
        rarity: "Mil-Spec Grade",
        image: "",
        wear: "Field-Tested",
      },
      profit: parseFloat((defaultPrice - totalValue).toFixed(2)),
    };
  }

  // Calculate actual reward value (slightly randomized within range)
  const actualReward = parseFloat(
    Math.max(minReward, Math.min(maxReward, chosen.price * (0.9 + Math.random() * 0.2))).toFixed(2)
  );

  return {
    success: true,
    totalValue: parseFloat(totalValue.toFixed(2)),
    minReward: parseFloat(minReward.toFixed(2)),
    maxReward: parseFloat(maxReward.toFixed(2)),
    reward: {
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: chosen.name,
      price: actualReward,
      rarity: chosen.rarity || "Mil-Spec Grade",
      image: chosen.image || "",
      wear: chosen.wear || "Field-Tested",
    },
    profit: parseFloat((actualReward - totalValue).toFixed(2)),
  };
}

/* ─────────────────────────────────────────────
   FUSION ANIMATION OVERLAY
───────────────────────────────────────────── */
const FusionAnimation = ({ isVisible, onComplete }) => {
  const [phase, setPhase] = useState("charging"); // charging | fusion | done

  useEffect(() => {
    if (!isVisible) {
      setPhase("charging");
      return;
    }

    const t1 = setTimeout(() => setPhase("fusion"), 800);
    const t2 = setTimeout(() => {
      setPhase("done");
      sound.playSparkle();
      sound.playWin(true);
    }, 3000);
    const t3 = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(30px)",
      }}
    >
      {phase === "charging" && (
        <Motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center" }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "4px solid rgba(245, 172, 59, 0.2)",
              borderTop: "4px solid #f5ac3b",
              animation: "contractSpin 1s linear infinite",
              margin: "0 auto 30px",
            }}
          />
          <style>{`@keyframes contractSpin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: "white", fontSize: "2rem", fontWeight: "900", margin: 0 }}>
            CARGANDO CONTRATO...
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "10px" }}>
            Combinando skins seleccionadas
          </p>
        </Motion.div>
      )}

      {phase === "fusion" && (
        <Motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center" }}
        >
          <div
            style={{
              position: "relative",
              width: "200px",
              height: "200px",
              margin: "0 auto 30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(circle, #f5ac3b 0%, transparent 70%)",
                animation: "contractPulse 1.5s ease-in-out infinite",
              }}
            />
            <style>{`@keyframes contractPulse { 0%,100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }`}</style>
            <div style={{ fontSize: "5rem", filter: "drop-shadow(0 0 30px #f5ac3b)", position: "relative" }}>
              ◆
            </div>
          </div>
          <h2 style={{ color: "#f5ac3b", fontSize: "2.5rem", fontWeight: "900", margin: 0 }}>
            FIRMANDO CONTRATO...
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "10px" }}>
            La fusión está en progreso...
          </p>
        </Motion.div>
      )}

      {phase === "done" && (
        <Motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center" }}
        >
          <div style={{ fontSize: "5rem", marginBottom: "20px" }}>◆</div>
          <h2 style={{ color: "#10b981", fontSize: "3rem", fontWeight: "900", margin: 0 }}>
            ¡CONTRATO COMPLETADO!
          </h2>
        </Motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN CONTRACTS PAGE
───────────────────────────────────────────── */
export default function Contracts() {
  const { user } = useAuth();
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFusing, setIsFusing] = useState(false);
  const [showFusion, setShowFusion] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [search, setSearch] = useState("");

  const inventory = user?.inventory || [];

  const filteredInventory = useMemo(() => {
    let list = [...inventory];
    if (search) {
      list = list.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()));
    }
    // Sort by price ascending
    return list.sort((a, b) => (a.price || 0) - (b.price || 0));
  }, [inventory, search]);

  const selectedSkins = useMemo(() => {
    return inventory.filter((s) => selectedIds.includes(s.id));
  }, [inventory, selectedIds]);

  const totalValue = useMemo(() => {
    return selectedSkins.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedSkins]);

  const handleToggleSkin = (id) => {
    if (isFusing) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  };

  const handleExecuteContract = useCallback(() => {
    if (selectedIds.length < 3) {
      toast.warning("Selecciona al menos 3 skins para ejecutar un contrato.");
      return;
    }

    setIsFusing(true);
    setShowFusion(true);
    sound.playWhoosh();

    // Calculate result (delayed for animation)
    setTimeout(() => {
      const result = calculateContractResult(selectedSkins, inventory);
      setLastResult(result);

      // Remove selected skins from inventory
      selectedIds.forEach((id) => {
        StorageService.sellSkin(id);
      });

      // Add reward to inventory
      StorageService.addSkinsToInventory([result.reward]);

      // Push live drop
      StorageService.addLiveDrop({
        user: user?.nombre_usuario || "Jugador",
        item: { name: result.reward.name, price: result.reward.price, rarity: result.reward.rarity, image: result.reward.image },
        caseName: "Contract",
      });

      setIsFusing(false);
    }, 2000);
  }, [selectedIds, selectedSkins, user?.nombre_usuario]);

  const handleFusionComplete = () => {
    setShowFusion(false);
  };

  const handleReset = () => {
    setSelectedIds([]);
    setLastResult(null);
  };

  const canExecute = selectedIds.length >= 3 && !isFusing;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "white", fontFamily: "'Inter', sans-serif", padding: "20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <style>{`
          @media (max-width: 768px) {
            .contracts-header { padding: 30px 20px !important; }
            .contracts-header h1 { font-size: 2.2rem !important; }
            .contracts-header p { font-size: 0.75rem !important; letter-spacing: 2px !important; }
            .contracts-layout { grid-template-columns: 1fr !important; gap: 20px !important; }
            .contracts-inventory-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; }
            .contracts-panel { padding: 20px !important; }
          }
          @media (max-width: 480px) {
            .contracts-header h1 { font-size: 1.6rem !important; }
            .contracts-inventory-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .contracts-skin-preview { width: 55px !important; }
          }
        `}</style>

        {/* Header */}
        <div
          className="contracts-header"
          style={{
            textAlign: "center",
            padding: "60px 40px",
            marginBottom: "40px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-100px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "500px",
              height: "500px",
              background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <h1
            style={{
              fontSize: "4rem",
              fontWeight: "900",
              margin: "0 0 10px 0",
              letterSpacing: "-2px",
              background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CONTRATOS
          </h1>
          <p style={{ color: "#a855f7", fontWeight: "900", letterSpacing: "4px", textTransform: "uppercase", fontSize: "0.9rem" }}>
            FUSIONA 3-10 SKINS PARA OBTENER UNA MEJOR
          </p>
        </div>

        {/* Main Layout */}
        <div className="contracts-layout" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "30px" }}>
          {/* Left: Inventory Selection */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "25px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "0.75rem", fontWeight: "900", color: "#a855f7", letterSpacing: "2px", margin: 0 }}>
                  SELECCIONA SKINS
                </h2>
                <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>
                  {selectedIds.length} / 10
                </div>
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.85rem",
                  width: "150px",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", maxHeight: "55vh", overflowY: "auto" }}>
              {filteredInventory.map((skin, index) => {
                const isSelected = selectedIds.includes(skin.id);
                const color = getRarityColor(skin.rarity);
                return (
                  <div
                    key={`skin-${skin.id || skin._id}-${index}`}
                    onClick={() => handleToggleSkin(skin.id)}
                    style={{
                      padding: "12px",
                      background: isSelected ? "rgba(168, 85, 247, 0.2)" : "rgba(255,255,255,0.02)",
                      borderWidth: isSelected ? "2px 2px 3px 2px" : "1px 1px 3px 1px",
                      borderStyle: "solid",
                      borderColor: isSelected ? `#a855f7 #a855f7 ${color} #a855f7` : `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                      borderRadius: "14px",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s",
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
                        marginBottom: "8px",
                      }}
                    />
                    <div style={{ fontSize: "0.65rem", fontWeight: "900", color: color, marginBottom: "2px" }}>
                      {skin.rarity?.toUpperCase() || "MIL-SPEC"}
                    </div>
                    <div style={{ fontSize: "0.7rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {skin.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#f5ac3b", fontWeight: "900", marginTop: "4px" }}>
                      €{skin.price?.toFixed(2) || "0.00"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Contract Panel */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "30px",
              display: "flex",
              flexDirection: "column",
              gap: "25px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>◆</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "900", margin: 0 }}>NUEVO CONTRATO</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "5px" }}>
                Firma un contrato para intercambiar skins
              </p>
            </div>

            {/* Selected Skins Preview */}
            {selectedSkins.length > 0 && (
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.05)",
                  borderRadius: "16px",
                  padding: "15px",
                  border: "1px solid rgba(168, 85, 247, 0.1)",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>
                  SKINS SELECCIONADAS ({selectedSkins.length})
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {selectedSkins.map((skin, index) => {
                    const color = getRarityColor(skin.rarity);
                    return (
                      <div
                        key={`skin-${skin.id || skin._id}-${index}`}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "10px",
                          padding: "8px",
                          textAlign: "center",
                          width: "70px",
                          border: `1px solid ${color}33`,
                        }}
                      >
                        <img
                          src={getSkinImageUrl(skin.name, skin.image)}
                          alt={skin.name}
                          onError={(e) => handleImageError(e, skin)}
                          style={{ width: "100%", height: "35px", objectFit: "contain" }}
                        />
                        <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                          €{skin.price?.toFixed(2) || "0.00"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contract Details */}
            {selectedIds.length >= 3 && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.05)",
                  borderRadius: "16px",
                  padding: "20px",
                  border: "1px solid rgba(16, 185, 129, 0.1)",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "#10b981", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "15px" }}>
                  DETALLES DEL CONTRATO
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Valor de entrada</span>
                    <span style={{ fontWeight: "900", color: "white" }}>€{totalValue.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Recompensa mínima</span>
                    <span style={{ fontWeight: "900", color: "#ef4444" }}>€{(totalValue * 0.8).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Recompensa máxima</span>
                    <span style={{ fontWeight: "900", color: "#10b981" }}>€{(totalValue * 2.0).toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "3px",
                      marginTop: "5px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "0%",
                        right: "0%",
                        height: "100%",
                        background: "linear-gradient(90deg, #ef4444, #f5ac3b, #10b981)",
                        borderRadius: "3px",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "-3px",
                        left: "50%",
                        width: "12px",
                        height: "12px",
                        background: "white",
                        borderRadius: "50%",
                        transform: "translateX(-50%)",
                        boxShadow: "0 0 10px rgba(255,255,255,0.5)",
                      }}
                    />
                  </div>
                  <div style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "5px" }}>
                    Rango de valor esperado
                  </div>
                </div>
              </div>
            )}

            {selectedIds.length < 3 && (
              <div
                style={{
                  background: "rgba(245, 172, 59, 0.05)",
                  borderRadius: "16px",
                  padding: "15px",
                  border: "1px dashed rgba(245, 172, 59, 0.2)",
                  textAlign: "center",
                  color: "#f5ac3b",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                Selecciona al menos 3 skins para firmar un contrato
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleExecuteContract}
              disabled={!canExecute}
              style={{
                width: "100%",
                padding: "18px 30px",
                borderRadius: "16px",
                border: "none",
                background: canExecute ? "linear-gradient(90deg, #a855f7, #9333ea)" : "rgba(255,255,255,0.1)",
                color: canExecute ? "white" : "rgba(255,255,255,0.2)",
                fontWeight: "900",
                fontSize: "1.1rem",
                cursor: canExecute ? "pointer" : "not-allowed",
                boxShadow: canExecute ? "0 10px 30px rgba(168, 85, 247, 0.3)" : "none",
                letterSpacing: "1px",
              }}
            >
              {isFusing ? "PROCESANDO..." : canExecute ? `EJECUTAR CONTRATO (${selectedIds.length} SKINS)` : "SELECCIONA SKINS"}
            </button>

            {/* Last Result */}
            {lastResult && (
              <AnimatePresence>
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    borderRadius: "20px",
                    padding: "25px",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>◆</div>
                  <h3 style={{ color: "#10b981", fontWeight: "900", margin: "0 0 5px 0" }}>
                    ¡CONTRATO COMPLETADO!
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", margin: "0 0 15px 0" }}>
                    Has recibido una nueva skin
                  </p>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "16px",
                      padding: "15px",
                      display: "inline-block",
                      minWidth: "180px",
                    }}
                  >
                    <img
                      src={getSkinImageUrl(lastResult?.reward?.name, lastResult?.reward?.image)}
                      alt={lastResult?.reward?.name ?? ""}
                      onError={(e) => handleImageError(e, lastResult?.reward)}
                      style={{
                        width: "100%",
                        maxWidth: "120px",
                        height: "80px",
                        objectFit: "contain",
                        marginBottom: "10px",
                        filter: "drop-shadow(0 0 15px rgba(16, 185, 129, 0.3))",
                      }}
                    />
                    <div
                      style={{
                        color: getRarityColor(lastResult?.reward?.rarity),
                        fontSize: "0.7rem",
                        fontWeight: "900",
                        marginBottom: "4px",
                      }}
                    >
                      {lastResult?.reward?.rarity?.toUpperCase() ?? ""}
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "white" }}>
                      {lastResult?.reward?.name ?? ""}
                    </div>
                    {/* Float Preview */}
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
                      {(() => {
                        const fp = getFloatBadgeProps(lastResult?.reward?.name ?? "", lastResult?.reward?.price ?? 0);
                        return (
                          <>
                            {fp.extra && <span style={{ fontSize: "0.8rem" }}>{fp.extra}</span>}
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "8px",
                                background: `${fp.color}20`,
                                border: `1px solid ${fp.color}40`,
                                color: fp.color,
                                fontSize: "0.65rem",
                                fontWeight: "900",
                              }}
                            >
                              {fp.label}
                            </span>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "8px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.6rem",
                                fontWeight: "bold",
                              }}
                            >
                              Float: {fp.float}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#f5ac3b", marginTop: "10px" }}>
                      €{(lastResult?.reward?.price ?? 0).toFixed(2)}
                    </div>
                    <div style={{ color: (lastResult?.profit ?? 0) >= 0 ? "#10b981" : "#ef4444", fontWeight: "bold", fontSize: "0.85rem", marginTop: "5px" }}>
                      {(lastResult?.profit ?? 0) >= 0 ? "+" : ""}€{(lastResult?.profit ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    style={{
                      marginTop: "15px",
                      padding: "12px 30px",
                      borderRadius: "12px",
                      background: "rgba(245, 172, 59, 0.1)",
                      border: "1px solid rgba(245, 172, 59, 0.2)",
                      color: "#f5ac3b",
                      fontWeight: "900",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    NUEVO CONTRATO
                  </button>
                </Motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Fusion Animation Overlay */}
      <FusionAnimation isVisible={showFusion} onComplete={handleFusionComplete} />
    </div>
  );
}
