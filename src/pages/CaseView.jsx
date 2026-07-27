// src/pages/CaseView.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { generateAllCases } from "../constants/cases.js";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { getRarityColor } from "../constants/colors.js";
import { StorageService } from "../services/StorageService";
import { sound } from "../utils/audio";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { useToast } from "../components/Toast";

const SingleMultiRoulette = ({ items, quantity, isSpinning, onComplete }) => {
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
        width: "100%",
        height: "220px",
        background: "#0c0d10",
        backgroundImage: `linear-gradient(rgba(12, 13, 16, 0.8), rgba(12, 13, 16, 0.8)), var(--case-gradient, none)`,
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        boxShadow: "inset 0 0 50px rgba(0,0,0,0.5)"
      }}
    >
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

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, #0c0d10 0%, transparent 20%, transparent 80%, #0c0d10 100%)",
          zIndex: 5,
          pointerEvents: "none"
        }}
      />

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
          return (
            <div
              key={skin.id || `reel-${idx}`}
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
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.6rem",
                  textAlign: "center",
                  width: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  textTransform: "uppercase"
                }}
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
};

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, sellSkin, withdrawSkin } = useAuth();
  const { skins: allSkins, loading: skinsLoading } = useFetchSkins(2000, true);

  const [quantity, setQuantity] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [reel, setReel] = useState([]);
  const [balanceError, setBalanceError] = useState("");
  const [hasActioned, setHasActioned] = useState(false);

  const allCases = useMemo(() => generateAllCases(), []);
  const caseData = allCases.find((c) => c.id === id);

  const validSkins = useMemo(() => {
    if (!allSkins || !caseData) return [];

    let pool = allSkins.filter(
      (skin) =>
        skin.rarity &&
        ((caseData.rarity === "mil-spec" && (skin.rarity === "Mil-Spec Grade" || skin.rarity === "Restricted")) ||
          (caseData.rarity === "classified" && (skin.rarity === "Restricted" || skin.rarity === "Classified")) ||
          (caseData.rarity === "covert" && (skin.rarity === "Classified" || skin.rarity === "Covert")))
    );

    if (pool.length === 0) pool = allSkins;

    const seed = caseData.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const shuffled = [...pool].sort((a, b) => {
      const valA = (a.id + seed).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const valB = (b.id + seed).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return (valA % 100) - (valB % 100);
    });

    return shuffled.slice(0, 10).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }, [allSkins, caseData]);

  const startSpin = useCallback(() => {
    if (!user) return toast.error("Inicia sesión para abrir cajas");
    const totalCost = parseFloat(caseData.price) * quantity;

    if (user.balance < totalCost) {
      setBalanceError(`Necesitas €${(totalCost - user.balance).toFixed(2)} adicionales`);
      return;
    }

    if (!validSkins || validSkins.length === 0) {
      toast.info("Cargando pool de skins...");
      return;
    }

    setBalanceError("");
    setHasCompleted(false);
    setResults([]);
    setHasActioned(false);

    // Pure Local Storage deduction & Provably Fair outcome calculation
    const success = StorageService.deductBalance(totalCost);
    if (!success) {
      setBalanceError("Saldo insuficiente");
      return;
    }

    // Pick expected won items
    const expectedResults = [];
    for (let i = 0; i < quantity; i++) {
      // Weighted pick: 70% low tier, 22% mid tier, 8% high tier
      const roll = Math.random() * 100;
      let chosenSkin;
      if (roll < 70) {
        chosenSkin = validSkins[Math.floor(Math.random() * Math.min(4, validSkins.length))];
      } else if (roll < 92) {
        chosenSkin = validSkins[Math.floor(Math.random() * Math.min(8, validSkins.length))];
      } else {
        chosenSkin = validSkins[validSkins.length - 1]; // Top drop
      }

      expectedResults.push({
        id: `won_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        name: chosenSkin.name,
        price: Number(chosenSkin.price),
        rarity: chosenSkin.rarity,
        image: chosenSkin.image
      });
    }

    // Add won items to user inventory & push to live drops
    const savedSkins = StorageService.addSkinsToInventory(expectedResults);
    expectedResults.forEach((item) => {
      StorageService.addLiveDrop({
        user: user.nombre_usuario,
        item: { name: item.name, price: item.price, rarity: item.rarity, image: item.image },
        caseName: caseData.name
      });
    });

    // Update user stats
    const currentStats = user.stats || {};
    const totalWon = expectedResults.reduce((acc, curr) => acc + curr.price, 0);
    StorageService.updateUser({
      stats: {
        ...currentStats,
        casesOpened: (currentStats.casesOpened || 0) + quantity,
        totalSpent: Number(((currentStats.totalSpent || 0) + totalCost).toFixed(2)),
        totalWon: Number(((currentStats.totalWon || 0) + totalWon).toFixed(2))
      }
    });

    // Build reel
    const newReel = [];
    for (let j = 0; j < 65; j++) {
      newReel.push(validSkins[Math.floor(Math.random() * validSkins.length)]);
    }
    newReel.push(...savedSkins);
    for (let j = 0; j < 10; j++) {
      newReel.push(validSkins[Math.floor(Math.random() * validSkins.length)]);
    }

    setReel(newReel);
    setResults(savedSkins);
    setIsSpinning(true);
  }, [user, caseData, quantity, validSkins]);

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false);
    setHasCompleted(true);
  }, []);

  const handleSellAll = useCallback(() => {
    if (hasActioned) return;
    setHasActioned(true);

    results.forEach((item) => {
      sellSkin(item.id);
    });
  }, [hasActioned, results, sellSkin]);

  if (!caseData)
    return (
      <div style={{ color: "white", padding: "100px", textAlign: "center", fontSize: "2rem", fontWeight: "900" }}>
        Caja no encontrada
      </div>
    );

  const totalResultsValue = results.reduce((acc, s) => acc + Number(s.price || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", paddingBottom: "100px" }}>
      {/* Header */}
      <div
        style={{
          height: "400px",
          width: "100%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at center, ${caseData.color}22 0%, #0f1115 70%), ${caseData.bgGradient}`,
          backgroundBlendMode: "overlay",
          overflow: "hidden"
        }}
      >
        <button
          onClick={() => navigate("/cases")}
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 24px",
            borderRadius: "12px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            zIndex: 10,
            backdropFilter: "blur(10px)"
          }}
        >
          ← VOLVER
        </button>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={validSkins[validSkins.length - 1]?.image || caseData.imageSrc || getPlaceholderImage(caseData.name)}
              alt={caseData.name}
onError={(e) => handleImageError(e, { name: caseData.name, image: validSkins[validSkins.length - 1]?.image || caseData.imageSrc })}
              style={{
                width: "380px",
                height: "280px",
                objectFit: "contain",
                filter: `drop-shadow(0 30px 50px ${caseData.color}55)`,
                animation: "float 6s ease-in-out infinite",
                opacity: (validSkins[validSkins.length - 1]?.image || caseData.imageSrc) ? 1 : 0.3
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "900",
                margin: 0,
                color: "white",
                textTransform: "uppercase"
              }}
            >
              {caseData.name}
            </h1>
            <div
              style={{
                fontSize: "1.2rem",
                color: caseData.color,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: "5px"
              }}
            >
              COLECCIÓN {caseData.rarity}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "-60px auto 0", position: "relative", zIndex: 10, padding: "0 20px" }}>
        {/* Roulette Area */}
        {(isSpinning || hasCompleted) && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "32px",
              padding: "40px",
              marginBottom: "40px",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5)"
            }}
          >
            {isSpinning ? (
              <div>
                <SingleMultiRoulette items={reel} quantity={quantity} isSpinning={isSpinning} onComplete={handleSpinComplete} />
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: "900", color: "#f5ac3b", letterSpacing: "3px", marginBottom: "10px" }}>
                  BOTÍN OBTENIDO
                </div>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "0 0 40px 0" }}>¡ENHORABUENA!</h2>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "25px", justifyContent: "center", marginBottom: "50px" }}>
                  {results.map((skin, idx) => {
                    const color = getRarityColor(skin.rarity);
                    return (
                      <div
                        key={skin.id || `result-${idx}`}
                        style={{
                          width: "220px",
                          background: "rgba(255,255,255,0.03)",
                          borderWidth: "1px 1px 6px 1px",
                          borderStyle: "solid",
                          borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                          borderRadius: "24px",
                          padding: "30px",
                          textAlign: "center",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        <img
                          src={skin.image || getPlaceholderImage(skin.name)}
                          alt={skin.name}
              onError={(e) => handleImageError(e, skin)}
                          style={{
                            width: "100%",
                            height: "120px",
                            objectFit: "contain",
                            marginBottom: "20px",
                            filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.5))",
                            opacity: skin.image ? 1 : 0.3
                          }}
                        />
                        <div style={{ color: color, fontSize: "0.7rem", fontWeight: "900", marginBottom: "5px" }}>
                          {skin.rarity.toUpperCase()}
                        </div>
                        <div style={{ color: "white", fontSize: "1rem", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {skin.name}
                        </div>
                        <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#fff", marginTop: "10px" }}>
                          €{Number(skin.price || 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!hasActioned ? (
                  <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                    <button
                      onClick={handleSellAll}
                      style={{
                        padding: "18px 40px",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        borderRadius: "16px",
                        fontSize: "1rem",
                        fontWeight: "900",
                        cursor: "pointer"
                      }}
                    >
                      VENDER POR €{Number(totalResultsValue || 0).toFixed(2)}
                    </button>
                    <button
                      onClick={() => navigate("/upgrade")}
                      style={{
                        padding: "18px 40px",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        color: "#10b981",
                        borderRadius: "16px",
                        fontSize: "1rem",
                        fontWeight: "900",
                        cursor: "pointer"
                      }}
                    >
                      MEJORAR
                    </button>
                    <button
                      onClick={() => {
                        setHasActioned(true);
                        results.forEach((r) => withdrawSkin(r.id));
                        toast.success("Retiro procesado a tu Trade Link.");
                      }}
                      style={{
                        padding: "18px 40px",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        color: "#3b82f6",
                        borderRadius: "16px",
                        fontSize: "1rem",
                        fontWeight: "900",
                        cursor: "pointer"
                      }}
                    >
                      RETIRAR A STEAM
                    </button>
                    <button
                      onClick={() => {
                        setHasCompleted(false);
                        setResults([]);
                      }}
                      style={{
                        padding: "18px 40px",
                        background: "#f5ac3b",
                        border: "none",
                        color: "black",
                        borderRadius: "16px",
                        fontSize: "1rem",
                        fontWeight: "900",
                        cursor: "pointer"
                      }}
                    >
                      GUARDAR EN INVENTARIO
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "20px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "16px", color: "#10b981", fontSize: "1.2rem", fontWeight: "900" }}>
                    ¡PROCESADO CORRECTAMENTE!
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Controls Panel */}
        {!hasCompleted && !isSpinning && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(20px)",
              borderRadius: "32px",
              padding: "40px",
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center"
            }}
          >
            <div style={{ marginBottom: "30px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", letterSpacing: "2px", marginBottom: "15px" }}>
                CANTIDAD DE CAJAS
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuantity(n)}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background: quantity === n ? "#f5ac3b" : "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      color: quantity === n ? "black" : "white",
                      fontSize: "1.3rem",
                      fontWeight: "900",
                      cursor: "pointer"
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {balanceError && (
              <div style={{ padding: "15px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", color: "#ff5555", marginBottom: "20px", fontWeight: "bold" }}>
                ⚠️ {balanceError}
              </div>
            )}

            <button
              onClick={startSpin}
              disabled={skinsLoading}
              style={{
                width: "100%",
                maxWidth: "450px",
                padding: "20px 50px",
                background: "linear-gradient(90deg, #f5ac3b, #ffba52)",
                color: "black",
                border: "none",
                borderRadius: "20px",
                fontSize: "1.3rem",
                fontWeight: "900",
                cursor: "pointer"
              }}
            >
              {skinsLoading ? "PREPARANDO..." : `ABRIR CAJAS • €${Number(parseFloat(caseData.price) * quantity).toFixed(2)}`}
            </button>
          </div>
        )}

        {/* Contains List */}
        <div style={{ marginTop: "60px" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "25px" }}>CONTENIDO DE LA CAJA</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
            {validSkins.map((skin, idx) => {
              const color = getRarityColor(skin.rarity);
              return (
                <div
                  key={skin.id || `skin-${idx}`}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "20px",
                    padding: "20px",
                    textAlign: "center",
                    borderWidth: "1px 1px 4px 1px",
                    borderStyle: "solid",
                    borderColor: `rgba(255,255,255,0.03) rgba(255,255,255,0.03) ${color} rgba(255,255,255,0.03)`
                  }}
                >
                  <img
                    src={skin.image || getPlaceholderImage(skin.name)}
                    alt={skin.name}
            onError={(e) => handleImageError(e, skin)}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "contain",
                      marginBottom: "15px",
                      opacity: skin.image ? 1 : 0.3
                    }}
                  />
                  <div style={{ color: color, fontSize: "0.65rem", fontWeight: "900", marginBottom: "5px" }}>{skin.rarity.toUpperCase()}</div>
                  <div style={{ color: "white", fontSize: "0.85rem", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {skin.name}
                  </div>
                  <div style={{ color: "#fff", fontWeight: "900", fontSize: "1.1rem", marginTop: "8px" }}>€{Number(skin.price || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
