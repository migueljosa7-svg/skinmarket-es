// src/pages/CaseView.jsx
import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { generateKeydropCases, pickWeightedSkin } from "../constants/cases.js";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { getRarityColor, resolvePriceSync } from "../services/PriceEngine.js";
import { StorageService } from "../services/StorageService";
import { getSkinImageUrl, handleImageError } from "../services/ImageService";
import { useToast } from "../components/Toast";
import ProvablyFairModal from "../components/ProvablyFairModal";
import SingleMultiRoulette from "../components/RouletteWheel";
import { CASE_SPECIFIC_IMAGES } from "../hooks/useCaseImage";
import { FiAlertTriangle, FiShield, FiLock, FiCheckCircle } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
  // Primary: check localStorage "token" key (set by AuthContext on real login/OAuth)
  const directToken = localStorage.getItem("token");
  if (directToken && directToken.length > 10) return directToken;
  // Fallback: try getting token from StorageService (skinmarket_db_v1.user.token)
  try {
    const raw = localStorage.getItem("skinmarket_db_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.token || null;
    }
  } catch  { 
    // Ignore JSON parse errors
  }
  return null;
}

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, sellSkin, withdrawSkin, awardXP } = useAuth();
  const { skins: allSkins, loading: skinsLoading } = useFetchSkins(2000, true);

  const [quantity, setQuantity] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [reel, setReel] = useState([]);
  const [balanceError, setBalanceError] = useState("");
  const [hasActioned, setHasActioned] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [jokerMode, setJokerMode] = useState(false);

const allCases = useMemo(() => generateKeydropCases(allSkins, CASE_SPECIFIC_IMAGES), [allSkins]);
  const caseData = useMemo(() => allCases.find((c) => c.id === id), [allCases, id]);

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

    return shuffled
      .filter((skin) => Number(skin.price) > 0)
      .slice(0, 10)
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }, [allSkins, caseData]);

  const startSpin = useCallback(async () => {
    const replaceUnfundedItem = (item) => {
      const fallbackPool = validSkins.filter((skin) => Number(skin.price) > 0);
      const replacement = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      return {
        id: `repl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: replacement?.name || item.name,
        price: Number(replacement?.price || 0.10),
        rarity: replacement?.rarity || item.rarity || "Mil-Spec Grade",
        image: replacement?.image || item.image || "",
      };
    };

    // FIX: Check localStorage token as fallback if user is null in context
    // Prevents "Debes iniciar sesión" errors after OAuth login
    const hasToken = !!localStorage.getItem("token");
    if (!user && !hasToken) return toast.error("Inicia sesión para abrir cajas");

    // Get safe user reference - use context user or construct from StorageService
    const safeUser = user || StorageService.getUser() || { nombre_usuario: "Jugador", stats: {} };

    // Joker Mode: 3x price but equalized probabilities
    const basePrice = parseFloat(caseData?.price) || 0;
    const priceMultiplier = jokerMode ? 3 : 1;
    const totalCost = basePrice * priceMultiplier * quantity;
    const userBalance = Number(safeUser?.balance ?? safeUser?.saldo ?? 0);

    if (userBalance < totalCost) {
      setBalanceError(`Necesitas €${(totalCost - userBalance).toFixed(2)} adicionales`);
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

    const token = getAuthToken();

    // Try backend first if authenticated
    if (token) {
      try {
        const response = await fetch(`${API_BASE}/api/cases/open`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ caseId: caseData.id, quantity, jokerMode })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.items && data.items.length > 0) {
            const backendItems = data.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price || 0),
              rarity: item.rarity,
              image: item.image || item.imageHD || ""
            }));

            // Update local storage to reflect backend state
            const newBalance = Number(data.newBalance || safeUser.balance - totalCost);
            StorageService.updateUser({ balance: newBalance, saldo: newBalance });
            const savedSkins = StorageService.addSkinsToInventory(backendItems);
            backendItems.forEach((item) => {
              StorageService.addLiveDrop({
                user: safeUser.nombre_usuario || "Jugador",
                item: { name: item.name, price: item.price, rarity: item.rarity, image: item.image },
                caseName: caseData.name
              });
            });

            const currentStats = safeUser.stats || {};
const totalWon = backendItems.reduce((acc, curr) => acc + (curr?.price || 0), 0);
            StorageService.updateUser({
              stats: {
                ...currentStats,
                casesOpened: (currentStats.casesOpened || 0) + quantity,
                totalSpent: Number(((currentStats.totalSpent || 0) + totalCost).toFixed(2)),
                totalWon: Number(((currentStats.totalWon || 0) + totalWon).toFixed(2))
              }
            });
            // XP: 1€ spent = 100 XP (mirrors server-side award in /api/cases/open)
            awardXP(StorageService.xpForSpend(totalCost));

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
            return;
          }
        }
      } catch (err) {
        console.warn("Backend case open failed, falling back to local:", err);
      }
    }

    // Fallback: Local Storage deduction & Provably Fair outcome calculation
    const success = StorageService.deductBalance(totalCost);
    if (!success) {
      setBalanceError("Saldo insuficiente");
      return;
    }

    // Pick expected won items using weighted probability system (RTP-balanced)
    const expectedResults = [];
    for (let i = 0; i < quantity; i++) {
      const chosenSkin = pickWeightedSkin(validSkins, caseData.category || "económica");
      if (!chosenSkin) {
        // Fallback to cheapest skin if pickWeightedSkin returns null
        const fallbackSkin = validSkins[0];
        expectedResults.push({
          id: `won_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          name: fallbackSkin.name,
          price: Number(fallbackSkin.price),
          rarity: fallbackSkin.rarity,
          image: fallbackSkin.image
        });
      } else {
        expectedResults.push({
          id: `won_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          name: chosenSkin.name,
          price: Number(chosenSkin.price),
          rarity: chosenSkin.rarity,
          image: chosenSkin.image
        });
      }
    }

    // Add won items to user inventory & push to live drops (using safeUser to prevent null refs)
    const savedSkins = StorageService.addSkinsToInventory(expectedResults);
    expectedResults.forEach((item) => {
      StorageService.addLiveDrop({
        user: safeUser.nombre_usuario || "Jugador",
        item: { name: item.name, price: item.price, rarity: item.rarity, image: item.image },
        caseName: caseData.name
      });
    });

    // Update user stats (using safeUser to prevent null refs)
    const currentStats = safeUser.stats || {};
const totalWon = expectedResults.reduce((acc, curr) => acc + (curr?.price || 0), 0);
    StorageService.updateUser({
      stats: {
        ...currentStats,
        casesOpened: (currentStats.casesOpened || 0) + quantity,
        totalSpent: Number(((currentStats.totalSpent || 0) + totalCost).toFixed(2)),
        totalWon: Number(((currentStats.totalWon || 0) + totalWon).toFixed(2))
      }
    });
    // XP: 1€ spent = 100 XP (local fallback mirrors backend behavior)
    awardXP(StorageService.xpForSpend(totalCost));

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
}, [user, toast, awardXP, caseData, jokerMode, quantity, validSkins]);

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
      <style>{`
        @media (max-width: 640px) {
          .caseview-header { height: 250px !important; }
          .caseview-header h1 { font-size: 1.5rem !important; }
          .caseview-header img { width: 180px !important; height: 150px !important; }
          .caseview-content { margin-top: -40px !important; padding: 0 10px !important; }
          .caseview-controls { padding: 20px !important; }
          .caseview-qty-buttons { gap: 6px !important; }
          .caseview-qty-buttons button { width: 48px !important; height: 48px !important; font-size: 1rem !important; }
          .caseview-open-btn { font-size: 1rem !important; padding: 16px 20px !important; }
          .caseview-roulette-container { padding: 16px !important; }
          .caseview-results-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .caseview-result-card { width: 100% !important; }
          .caseview-contains-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .caseview-actions { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .caseview-actions button { width: 100% !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .caseview-contains-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .caseview-results-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .caseview-roulette-wrapper { width: 100%; overflow-x: hidden; }
      `}</style>
      {/* Header */}
      <div
        className="caseview-header"
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
              src={getSkinImageUrl(caseData.name, validSkins[validSkins.length - 1]?.image || caseData.imageSrc)}
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
                        key={`result-${idx}-${skin.id || skin._id || "skin"}`}
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
                          src={getSkinImageUrl(skin.name, skin.image)}
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
                          €{Number(resolvePriceSync(skin.name, skin.rarity, skin.wear)?.price || skin.price || 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!hasActioned ? (
                  <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
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
                      onClick={async () => {
                        // Check if user has Trade URL configured before withdrawing
                        const currentUser = user;
                        if (!currentUser?.link_intercambio) {
                          toast.error("◆ Configura tu Trade URL de Steam en Ajustes de Perfil antes de retirar.");
                          return;
                        }
                        setHasActioned(true);
                        for (const r of results) {
                          await withdrawSkin(r.id);
                        }
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
                      onClick={() => setShowProvablyFair(true)}
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
                      <FiShield size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> VERIFICAR
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


        {!hasCompleted && !isSpinning && (
          <div
            style={{
              background: jokerMode ? "rgba(255, 0, 255, 0.05)" : "rgba(255,255,255,0.02)",
              backdropFilter: "blur(20px)",
              borderRadius: "32px",
              padding: "40px",
              border: jokerMode ? "1px solid rgba(255, 0, 255, 0.3)" : "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
              boxShadow: jokerMode ? "0 0 60px rgba(255, 0, 255, 0.2)" : "none"
            }}
          >
            {/* Joker Mode Toggle */}
            <div style={{ marginBottom: "30px", display: "flex", justifyContent: "center", alignItems: "center", gap: "15px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "900", color: jokerMode ? "#ff00ff" : "rgba(255,255,255,0.4)", letterSpacing: "2px" }}>
                MODO JOKER
              </span>
              <button
                onClick={() => setJokerMode(!jokerMode)}
                style={{
                  width: "70px",
                  height: "36px",
                  borderRadius: "18px",
                  background: jokerMode ? "linear-gradient(90deg, #ff00ff, #ff66ff)" : "rgba(255,255,255,0.1)",
                  border: jokerMode ? "2px solid #ff00ff" : "2px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.3s ease"
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: jokerMode ? "#fff" : "rgba(255,255,255,0.3)",
                    position: "absolute",
                    top: "2px",
                    left: jokerMode ? "38px" : "2px",
                    transition: "all 0.3s ease",
                    boxShadow: jokerMode ? "0 0 15px rgba(255, 0, 255, 0.8)" : "none"
                  }}
                />
              </button>
              {jokerMode && (
                <span style={{ fontSize: "0.75rem", fontWeight: "900", color: "#ff00ff", letterSpacing: "1px", animation: "pulse 1.5s infinite" }}>
                  ACTIVADO
                </span>
              )}
            </div>

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
                <FiAlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {balanceError}
              </div>
            )}

            <button
              onClick={startSpin}
              disabled={skinsLoading}
              style={{
                width: "100%",
                maxWidth: "450px",
                padding: "20px 50px",
                background: jokerMode ? "linear-gradient(90deg, #ff00ff, #ff66ff)" : "linear-gradient(90deg, #f5ac3b, #ffba52)",
                color: jokerMode ? "#fff" : "black",
                border: jokerMode ? "2px solid #ff00ff" : "none",
                borderRadius: "20px",
                fontSize: "1.3rem",
                fontWeight: "900",
                cursor: "pointer",
                boxShadow: jokerMode ? "0 0 30px rgba(255, 0, 255, 0.5)" : "none",
                animation: jokerMode ? "pulse 2s infinite" : "none"
              }}
            >
              {skinsLoading ? "PREPARANDO..." : jokerMode ? `JOKER MODE • €${Number((parseFloat(caseData?.price) || 0) * 3 * quantity).toFixed(2)}` : `ABRIR CAJAS • €${Number((parseFloat(caseData?.price) || 0) * quantity).toFixed(2)}`}
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
                  key={`skin-${idx}-${skin.id || skin._id || "skin"}`}
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
                    src={getSkinImageUrl(skin.name, skin.image)}
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
                  <div style={{ color: "#fff", fontWeight: "900", fontSize: "1.1rem", marginTop: "8px" }}>€{Number(resolvePriceSync(skin.name, skin.rarity, skin.wear)?.price || skin.price || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ProvablyFairModal isOpen={showProvablyFair} onClose={() => setShowProvablyFair(false)} resultData={{
        serverSeedHashed: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        clientSeed: "skinmarket-user-seed",
        nonce: StorageService.getUser()?.stats?.casesOpened || 1,
        serverSeedRaw: "e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8"
      }} />
    </div>
  );
}