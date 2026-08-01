// src/pages/Airdrop.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../components/Toast";
import { motion as Motion } from "framer-motion";
import { FaClock, FaGift, FaHistory, FaTrophy } from "react-icons/fa";
import { GiTwoCoins } from "react-icons/gi";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;
  try {
    const raw = localStorage.getItem("skinmarket_db_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.token || null;
    }
  } catch {
    //
  }
  return null;
}

// ─── AIRDROP CONFIG ─────────────────────────────
// Prize pool grows with each claim. Resets every 24h.
const AIRDROP_POOL_BASE = 25.00; // €25 base pool
const AIRDROP_CLAIM_REWARD = 0.50; // €0.50 per claim
const AIRDROP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// Recent drops (mock data — in production, fetch from backend)
const RECENT_DROPS = [
  { id: 1, user: "xX_Shadow_Xx", amount: 0.50, time: "hace 2 min" },
  { id: 2, user: "ProGamer99", amount: 0.50, time: "hace 8 min" },
  { id: 3, user: "SkinHunter", amount: 0.50, time: "hace 15 min" },
  { id: 4, user: "LuckyLuke", amount: 0.50, time: "hace 22 min" },
  { id: 5, user: "AirdropKing", amount: 0.50, time: "hace 31 min" },
  { id: 6, user: "CS2Master", amount: 0.50, time: "hace 45 min" },
  { id: 7, user: "DropCollector", amount: 0.50, time: "hace 1 h" },
  { id: 8, user: "SkinAddict", amount: 0.50, time: "hace 1 h 12 min" },
];

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("¡Disponible!");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function Airdrop() {
  const { user, addToBalance } = useAuth();
  const toast = useToast();
  const [claiming, setClaiming] = useState(false);
  const [lastClaim, setLastClaim] = useState(() => {
    try {
      const raw = localStorage.getItem("skinmarket_airdrop_last_claim");
      return raw ? new Date(raw) : null;
    } catch {
      return null;
    }
  });
  const [claimedCount, setClaimedCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem("skinmarket_airdrop_count") || "0", 10);
    } catch {
      return 0;
    }
  });

  // Next available claim time
  const nextAvailable = useMemo(() => {
    if (!lastClaim) return null;
    return new Date(lastClaim.getTime() + AIRDROP_COOLDOWN_MS);
  }, [lastClaim]);

  const timeLeft = useCountdown(nextAvailable?.toISOString());
  const isAvailable = !nextAvailable || timeLeft === "¡Disponible!" || timeLeft === "";

  // Prize pool grows with each claim
  const prizePool = useMemo(() => {
    return AIRDROP_POOL_BASE + (claimedCount * AIRDROP_CLAIM_REWARD);
  }, [claimedCount]);

  const handleClaim = useCallback(async () => {
    if (!isAvailable || claiming) return;
    setClaiming(true);

    try {
      const token = getAuthToken();
      if (token) {
        // Try backend first
        const response = await fetch(`${API_BASE}/api/airdrop/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          addToBalance(data.reward || AIRDROP_CLAIM_REWARD);
          setLastClaim(new Date());
          setClaimedCount((c) => c + 1);
          localStorage.setItem("skinmarket_airdrop_last_claim", new Date().toISOString());
          localStorage.setItem("skinmarket_airdrop_count", String(claimedCount + 1));
          toast.success(`🎁 ¡Airdrop reclamado! +€${(data.reward || AIRDROP_CLAIM_REWARD).toFixed(2)}`);
        } else {
          toast.error(data.error || "Error al reclamar el airdrop.");
        }
      } else {
        // Local fallback
        addToBalance(AIRDROP_CLAIM_REWARD);
        setLastClaim(new Date());
        setClaimedCount((c) => c + 1);
        localStorage.setItem("skinmarket_airdrop_last_claim", new Date().toISOString());
        localStorage.setItem("skinmarket_airdrop_count", String(claimedCount + 1));
        toast.success(`🎁 ¡Airdrop reclamado! +€${AIRDROP_CLAIM_REWARD.toFixed(2)}`);
      }
    } catch {
      // Local fallback on network error
      addToBalance(AIRDROP_CLAIM_REWARD);
      setLastClaim(new Date());
      setClaimedCount((c) => c + 1);
      localStorage.setItem("skinmarket_airdrop_last_claim", new Date().toISOString());
      localStorage.setItem("skinmarket_airdrop_count", String(claimedCount + 1));
      toast.success(`🎁 ¡Airdrop reclamado! +€${AIRDROP_CLAIM_REWARD.toFixed(2)}`);
    }

    setClaiming(false);
  }, [isAvailable, claiming, addToBalance, toast, claimedCount]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "40px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .airdrop-page { padding: 16px 12px !important; }
          .airdrop-hero { padding: 40px 20px !important; }
          .airdrop-hero h1 { font-size: 2rem !important; }
          .airdrop-pool { font-size: 3rem !important; }
          .airdrop-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes airdropFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes airdropPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,172,59,0.4); }
          50% { box-shadow: 0 0 0 15px rgba(245,172,59,0); }
        }
      `}</style>

      <div className="airdrop-page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Hero Section */}
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="airdrop-hero"
          style={{
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(245,172,59,0.12) 0%, rgba(245,172,59,0.02) 100%)",
            border: "1px solid rgba(245,172,59,0.2)",
            borderRadius: "40px",
            padding: "80px 40px",
            marginBottom: "40px",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(245,172,59,0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ fontSize: "4rem", marginBottom: "20px", animation: "airdropFloat 3s ease-in-out infinite" }}>
            🎁
          </div>

          <h1 style={{
            fontSize: "3.5rem",
            fontWeight: "900",
            margin: "0 0 10px 0",
            letterSpacing: "-2px",
            background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            AIRDROP DIARIO
          </h1>

          <p style={{ color: "#f5ac3b", fontWeight: "900", letterSpacing: "4px", textTransform: "uppercase", fontSize: "0.9rem", marginBottom: "40px" }}>
            RECLAMA TU RECOMPENSA GRATIS CADA 24 HORAS
          </p>

          {/* Prize Pool */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
              BOTE ACUMULADO
            </div>
            <div className="airdrop-pool" style={{ fontSize: "4rem", fontWeight: "900", color: "#f5ac3b", textShadow: "0 0 30px rgba(245,172,59,0.3)" }}>
              €{prizePool.toFixed(2)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
              El bote crece con cada reclamación
            </div>
          </div>

          {/* Countdown / Claim Button */}
          {!isAvailable ? (
            <div style={{ display: "inline-block", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "30px 50px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "10px" }}>
                <FaClock color="#f5ac3b" />
                <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: "bold", fontSize: "0.8rem", letterSpacing: "2px", textTransform: "uppercase" }}>
                  Próximo airdrop
                </span>
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", fontFamily: "monospace", color: "#f5ac3b", letterSpacing: "3px" }}>
                {timeLeft || "23:59:59"}
              </div>
            </div>
          ) : (
            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              disabled={claiming}
              style={{
                background: claiming ? "rgba(245,172,59,0.3)" : "#f5ac3b",
                color: "black",
                border: "none",
                padding: "20px 60px",
                borderRadius: "20px",
                fontSize: "1.2rem",
                fontWeight: "900",
                cursor: claiming ? "not-allowed" : "pointer",
                boxShadow: "0 20px 40px rgba(245, 172, 59, 0.3)",
                animation: "airdropPulse 2s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "0 auto"
              }}
            >
              {claiming ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  RECLAMANDO...
                </>
              ) : (
                <>
                  <FaGift />
                  RECLAMAR AIRDROP
                </>
              )}
            </Motion.button>
          )}
        </Motion.div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>RECOMPENSA</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#f5ac3b", marginTop: "5px" }}>€{AIRDROP_CLAIM_REWARD.toFixed(2)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>RECLAMACIONES</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{claimedCount}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>SALDO ACTUAL</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#10b981", marginTop: "5px" }}>
              €{Number(user?.balance || user?.saldo || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>COOLDOWN</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#f5ac3b", marginTop: "5px" }}>24h</div>
          </div>
        </div>

        {/* Recent Drops */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "25px" }}>
            <FaHistory color="#f5ac3b" />
            <h2 style={{ fontSize: "1.4rem", fontWeight: "900", margin: 0 }}>RECIENTES AIRDROPS</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {RECENT_DROPS.map((drop) => (
              <div
                key={drop.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(245,172,59,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f5ac3b"
                  }}>
                    <FaTrophy style={{ fontSize: "0.8rem" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{drop.user}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>{drop.time}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f5ac3b", fontWeight: "900", fontSize: "1rem" }}>
                  <GiTwoCoins />
                  +€{drop.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}