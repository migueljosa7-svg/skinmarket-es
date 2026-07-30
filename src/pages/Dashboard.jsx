// src/pages/Dashboard.jsx
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import RechargeModal from "../components/RechargeModal";
import { StorageService } from "../services/StorageService";
import { getPlaceholderImage, getSkinImageUrl, handleImageError } from "../services/ImageService";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
  // First try the direct token key (set by AuthContext on real login)
  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;
  // Fallback: try getting token from StorageService (skinmarket_db_v1.user.token)
  try {
    const raw = localStorage.getItem("skinmarket_db_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.token || null;
    }
  } catch (e) { }
  return null;
}

const SettingsModal = ({ open, onClose }) => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [link, setLink] = useState(user?.link_intercambio || "");
  const [steamId, setSteamId] = useState(user?.steam_id || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (token) {
        const response = await fetch(`${API_BASE}/api/update-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ link_intercambio: link })
        });
        if (response.ok) {
          toast.success("¡Perfil de Steam guardado correctamente!");
          updateProfile(link, steamId);
          onClose();
        } else {
          toast.error("Error al guardar en el servidor");
        }
      } else {
        // Local fallback
        const success = updateProfile(link, steamId);
        if (success) {
          toast.success("¡Perfil de Steam guardado correctamente!");
          onClose();
        } else {
          toast.error("Error al guardar los datos.");
        }
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(15px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#16191e", width: "100%", maxWidth: "520px", borderRadius: "28px", border: "1px solid rgba(255,255,255,0.08)", padding: "35px", textAlign: "center", color: "white", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
<h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "8px" }}>CONFIGURACIÓN DE CUENTA</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginBottom: "25px" }}>
          Configura tu Trade URL de Steam para retirar skins reales mediante ofertas de intercambio.
        </p>

        <div style={{ marginBottom: "20px", textAlign: "left" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "8px" }}>
            LINK DE INTERCAMBIO (STEAM TRADE LINK)
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://steamcommunity.com/tradeoffer/new/..."
            style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
          />
          <a
            href="https://steamcommunity.com/profiles/me/tradeoffers/privacy#trade_offer_access_url"
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-block", marginTop: "8px", fontSize: "0.75rem", color: "#f5ac3b", textDecoration: "none", fontWeight: "700" }}
          >
            ¿Dónde encuentro mi Trade URL?
          </a>
        </div>

        <div style={{ marginBottom: "25px", textAlign: "left" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "8px" }}>
            STEAM ID 64
          </label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="76561198888888888"
            style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}>
            CANCELAR
          </button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: "14px", borderRadius: "12px", background: "#f5ac3b", color: "black", border: "none", cursor: "pointer", fontWeight: "900" }}>
            {loading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── LEVEL-BASED DAILY CASE (11-Level System: 0,5,15,30,50,80,120,170,230,300,360) ─────
const LEVEL_CONFIG = [
  { level: 0, minDeposit: 0, dailyCaseId: "daily-0", caseLabel: "DAILY FREE", reward: 0.15, caseImage: "/case_eco.png", theme: "Crystal", color: "#10b981" },
  { level: 5, minDeposit: 10, dailyCaseId: "daily-5", caseLabel: "BRONZE DAILY", reward: 0.25, caseImage: "/case_eco.png", theme: "Steampunk", color: "#cd7f32" },
  { level: 15, minDeposit: 50, dailyCaseId: "daily-15", caseLabel: "SILVER DAILY", reward: 0.50, caseImage: "/case_mid.png", theme: "Cyber", color: "#c0c0c0" },
  { level: 30, minDeposit: 150, dailyCaseId: "daily-30", caseLabel: "GOLD DAILY", reward: 1.00, caseImage: "/case_mid.png", theme: "Ancient", color: "#ffd700" },
  { level: 50, minDeposit: 500, dailyCaseId: "daily-50", caseLabel: "DIAMOND DAILY", reward: 2.00, caseImage: "/case_premium.png", theme: "Crystal", color: "#b9f2ff" },
  { level: 80, minDeposit: 1500, dailyCaseId: "daily-80", caseLabel: "PLATINUM DAILY", reward: 3.50, caseImage: "/case_premium.png", theme: "Frost", color: "#e5e4e2" },
  { level: 120, minDeposit: 4000, dailyCaseId: "daily-120", caseLabel: "EMERALD DAILY", reward: 6.00, caseImage: "/case_premium.png", theme: "Dragon", color: "#50c878" },
  { level: 170, minDeposit: 10000, dailyCaseId: "daily-170", caseLabel: "RUBY DAILY", reward: 10.00, caseImage: "/case_premium.png", theme: "Inferno", color: "#e0115f" },
  { level: 230, minDeposit: 25000, dailyCaseId: "daily-230", caseLabel: "MASTER DAILY", reward: 18.00, caseImage: "/case_premium.png", theme: "Shadow", color: "#ff4500" },
  { level: 300, minDeposit: 75000, dailyCaseId: "daily-300", caseLabel: "LEGENDARY DAILY", reward: 30.00, caseImage: "/case_premium.png", theme: "Heavenly", color: "#ffd700" },
  { level: 360, minDeposit: 200000, dailyCaseId: "daily-360", caseLabel: "VIP SUPREME", reward: 50.00, caseImage: "/case_premium.png", theme: "Cosmic", color: "#ff00ff" }
];

function getLevelConfig(level) {
  for (const cfg of LEVEL_CONFIG) { if (cfg.level === level) return cfg; }
  return LEVEL_CONFIG[0];
}

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

export default function Dashboard() {
  const { user, sellSkin, sellAllSkins, withdrawSkin, claimDaily } = useAuth();
  const toast = useToast();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dailyTimer, setDailyTimer] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [lastDailyReward, setLastDailyReward] = useState(null);

  // Load daily claim status
  useEffect(() => {
    const currentUser = StorageService.getUser();
    const lastClaim = currentUser?.ultimo_reclamo_diario;
    if (lastClaim) {
      const nextAvailable = new Date(new Date(lastClaim).getTime() + 24 * 60 * 60 * 1000);
      setDailyTimer(nextAvailable.toISOString());
    } else {
      setDailyTimer(null);
    }
  }, [user?.ultimo_reclamo_diario]);

  const timeLeft = useCountdown(dailyTimer);
  const isDailyAvailable = !dailyTimer || timeLeft === "¡Disponible!" || timeLeft === "";

  const levelConfig = getLevelConfig(user?.level || 1);

  const handleSellSingle = useCallback((id) => { sellSkin(id); }, [sellSkin]);
  const handleSellAll = useCallback(() => {
    const total = sellAllSkins();
    toast.success(`Todas las skins vendidas por €${Number(total || 0).toFixed(2)}!`);
  }, [sellAllSkins]);

  const handleClaimDailyReward = useCallback(async () => {
    setDailyLoading(true);
    try {
      // Try backend first
      const token = getAuthToken();
      if (token) {
        const response = await fetch(`${API_BASE}/api/claim-daily`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          // Re-fetch user data
          const meResponse = await fetch(`${API_BASE}/api/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            StorageService.updateUser({
              saldo: meData.saldo,
              balance: meData.saldo,
              nivel: meData.level,
              experiencia: meData.experiencia,
              ultimo_reclamo_diario: new Date().toISOString()
            });
          }
          toast.success(data.message);
          setLastDailyReward(data);
          setDailyTimer(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
        } else {
          toast.error(data.error);
          if (data.remainingMs) {
            setDailyTimer(new Date(Date.now() + data.remainingMs).toISOString());
          }
        }
      } else {
        // Local fallback
        const res = claimDaily();
        if (res.success) {
          toast.success(res.message);
          setLastDailyReward(res);
          setDailyTimer(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      // Local fallback
      const res = claimDaily();
      if (res.success) {
        toast.success(res.message);
        setDailyTimer(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      } else {
        toast.error(res.error);
      }
    }
    setDailyLoading(false);
  }, [claimDaily, toast]);

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1115" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid rgba(245, 172, 59, 0.1)", borderTop: "3px solid #f5ac3b", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#f5ac3b", fontSize: "0.85rem", fontWeight: "900", letterSpacing: "3px", textTransform: "uppercase" }}>
          Cargando perfil...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const inventory = user?.inventory || [];
  const filteredInventory = inventory.filter((item) => {
    return !search || item?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalValue = inventory.reduce((acc, curr) => acc + Number(curr?.price || 0), 0);
  const stats = user?.stats || {};
  const nextLevelConfig = getLevelConfig((user?.nivel || 1) + 1);
  const nextLevelDeposit = nextLevelConfig.minDeposit;
  const currentLevelDeposit = levelConfig.minDeposit;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "40px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .dashboard-page { padding: 16px 12px !important; }
          .dashboard-profile { flex-direction: column !important; align-items: flex-start !important; padding: 20px !important; }
          .dashboard-profile-info { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dashboard-profile-avatar { width: 60px !important; height: 60px !important; }
          .dashboard-profile-name { font-size: 1.3rem !important; }
          .dashboard-profile-actions { flex-direction: row !important; width: 100% !important; justify-content: space-between !important; }
          .dashboard-balance-text { font-size: 1.5rem !important; }
          .dashboard-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .dashboard-daily { flex-direction: column !important; align-items: stretch !important; text-align: center !important; gap: 16px !important; }
          .dashboard-daily-image { width: 80px !important; height: 80px !important; }
          .dashboard-daily-title { font-size: 1.2rem !important; }
          .dashboard-daily-timer { font-size: 1.8rem !important; }
          .dashboard-inventory-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dashboard-inventory-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .dashboard-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dashboard-inventory-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
      <div className="dashboard-page" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Profile Card */}
        <div className="dashboard-profile" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "35px", marginBottom: "30px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div className="dashboard-profile-info" style={{ display: "flex", alignItems: "center", gap: "25px" }}>
            <img
              src={user.avatar}
              alt={user.nombre_usuario}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80"; }}
              className="dashboard-profile-avatar"
              style={{ width: "90px", height: "90px", borderRadius: "50%", border: "3px solid #f5ac3b", objectFit: "cover" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 className="dashboard-profile-name" style={{ fontSize: "2rem", fontWeight: "900", margin: 0 }}>{user.nombre_usuario}</h1>
                <span style={{ background: "rgba(245, 172, 59, 0.15)", color: "#f5ac3b", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "bold" }}>
                  LVL {user.nivel || 1}
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "5px 0 0 0", fontSize: "0.85rem" }}>{user.email}</p>
              <p style={{ color: "rgba(255,255,255,0.3)", margin: "3px 0 0 0", fontSize: "0.75rem" }}>
                ◆ Nivel {nextLevelDeposit > 0 ? `${user.nivel || 1} → ${(user.nivel || 1) + 1}: Deposita €${(nextLevelDeposit - (user.totalDepositado || 0)).toFixed(2)} más` : "¡Nivel máximo!"}
              </p>
            </div>
          </div>

          <div className="dashboard-profile-actions" style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right", marginRight: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: "bold" }}>SALDO DISPONIBLE</div>
              <div className="dashboard-balance-text" style={{ fontSize: "2.2rem", fontWeight: "900", color: "#f5ac3b" }}>€{Number(user.balance || user.saldo || 0).toFixed(2)}</div>
            </div>

            <button onClick={() => setRechargeOpen(true)} style={{ padding: "14px 28px", background: "#f5ac3b", color: "black", border: "none", borderRadius: "14px", fontWeight: "900", fontSize: "0.95rem", cursor: "pointer" }}>
              + RECARGAR
            </button>

            <button onClick={() => setSettingsOpen(true)} style={{ padding: "14px", background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", cursor: "pointer", fontSize: "1.2rem" }}>
              ◆
            </button>
          </div>
        </div>

        {/* Daily Case Card - Level Based (KeyDrop Style) */}
        <div style={{ background: "linear-gradient(135deg, rgba(245,172,59,0.1) 0%, rgba(245,172,59,0.02) 100%)", border: "1px solid rgba(245,172,59,0.2)", borderRadius: "28px", padding: "30px", marginBottom: "30px", display: "flex", flexWrap: "wrap", gap: "25px", alignItems: "center" }}>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <img
              src={levelConfig.caseImage}
              alt={levelConfig.caseLabel}
              style={{
                width: "120px",
                height: "120px",
                objectFit: "contain",
                filter: isDailyAvailable ? "none" : "grayscale(0.8)",
                opacity: isDailyAvailable ? 1 : 0.5,
                transition: "all 0.3s"
              }}
              onError={(e) => { e.target.src = ""; e.target.style.display = "none"; }}
            />
            {levelConfig.caseImage && (
              <div style={{ marginTop: "8px", fontSize: "0.8rem", fontWeight: "900", color: isDailyAvailable ? "#f5ac3b" : "rgba(255,255,255,0.4)" }}>
                {levelConfig.caseLabel}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: "bold", marginBottom: "5px" }}>
              ◆ CAJA DIARIA NIVEL {user.nivel || 1}
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginBottom: "5px" }}>
              {isDailyAvailable ? "¡LISTA PARA ABRIR!" : "PRÓXIMA CAJA"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
              {isDailyAvailable
                ? `Recibe hasta €${(levelConfig.reward * 2).toFixed(2)} en tu caja de nivel ${user.nivel || 1}`
                : `Caja nivel ${user.nivel || 1} - Abre de nuevo en:`}
            </div>
          </div>

          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            {!isDailyAvailable ? (
              <div>
                <div style={{ fontSize: "2.5rem", fontWeight: "900", fontFamily: "monospace", color: "#f5ac3b", letterSpacing: "3px" }}>
                  {timeLeft || "23:59:59"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                  TIEMPO RESTANTE
                </div>
              </div>
            ) : (
              <button
                onClick={handleClaimDailyReward}
                disabled={dailyLoading}
                style={{
                  padding: "16px 36px",
                  borderRadius: "16px",
                  background: dailyLoading ? "rgba(245,172,59,0.3)" : "#f5ac3b",
                  color: "black",
                  border: "none",
                  fontSize: "1rem",
                  fontWeight: "900",
                  cursor: dailyLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {dailyLoading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    ABRIENDO...
                  </>
                ) : (
                  "◆ ABRIR CAJA DIARIA"
                )}
              </button>
            )}
          </div>
        </div>

        {/* User Statistics Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>CAJAS ABIERTAS</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{stats.casesOpened || 0}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>NIVEL</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px", color: "#f5ac3b" }}>{user.nivel || 1}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>TOTAL DEPOSITADO</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>€{Number(user.totalDepositado || stats.totalSpent || 0).toFixed(2)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>VALOR INVENTARIO</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#10b981", marginTop: "5px" }}>€{totalValue.toFixed(2)}</div>
          </div>
        </div>

        {/* Inventory Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "900", margin: 0 }}>MI INVENTARIO ({filteredInventory.length})</h2>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Valor total: €{totalValue.toFixed(2)}</span>
          </div>

          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Buscar skin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            />
            {filteredInventory.length > 0 && (
              <button onClick={handleSellAll} style={{ padding: "10px 20px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>
                VENDER TODO (€{totalValue.toFixed(2)})
              </button>
            )}
          </div>
        </div>

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.01)", borderRadius: "24px", padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            No tienes skins en el inventario. ¡Abre cajas o deposita para conseguir objetos!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "20px" }}>
            {filteredInventory.map((item) => {
              const color = getRarityColor(item.rarity);
              return (
                <div key={item.id} style={{ background: "rgba(255,255,255,0.02)", borderWidth: "1px 1px 4px 1px", borderStyle: "solid", borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`, borderRadius: "20px", padding: "20px", textAlign: "center", position: "relative" }}>
                  <img
                    src={getSkinImageUrl(item.name, item.image)}
                    alt={item.name}
                    onError={(e) => handleImageError(e, item)}
                    style={{ width: "100%", height: "90px", objectFit: "contain", marginBottom: "12px", opacity: item.image ? 1 : 0.3 }}
                  />
                  <div style={{ color: color, fontSize: "0.65rem", fontWeight: "900", marginBottom: "4px" }}>{item.rarity?.toUpperCase() || "MIL-SPEC"}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ color: "#f5ac3b", fontWeight: "900", fontSize: "1.1rem", marginTop: "6px" }}>€{Number(item.price || 0).toFixed(2)}</div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
                    <button onClick={() => handleSellSingle(item.id)} style={{ flex: 1, padding: "8px", background: "rgba(239, 68, 68, 0.15)", border: "none", color: "#ef4444", borderRadius: "8px", fontWeight: "bold", fontSize: "0.75rem", cursor: "pointer" }}>
                      Vender
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = getAuthToken();
                          if (!token) {
                            toast.error("❌ Debes iniciar sesión para retirar skins.");
                            return;
                          }

                          const res = await fetch(`${API_BASE}/api/inventory/withdraw`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ itemId: item.id })
                          });
                          const data = await res.json();
                          if (data.success) {
                            toast.success(data.message || "✅ Oferta de intercambio enviada a tu cuenta de Steam.");
                          } else {
                            // Handle specific error codes with user-friendly messages
                            if (data.code === "RATE_LIMIT_WITHDRAW" || data.code === "RATE_LIMIT_EXCEEDED") {
                              toast.warning("⏳ Demasiados retiros seguidos. Espera 1 minuto e intenta de nuevo.");
                            } else if (data.code === "BOT_COOLDOWN" || data.code === "RATE_LIMIT_EXCEEDED" || data.code?.includes("RATE_LIMIT")) {
                              toast.warning("🔄 Steam está procesando muchas solicitudes. Espera 5 minutos.");
                            } else if (data.code === "CONFIG_MISSING") {
                              toast.error("🔧 El sistema de retiros no está configurado. Contacta a soporte.");
                            } else if (data.code === "BOT_UNAVAILABLE") {
                              toast.warning("🤖 El bot de intercambios no está disponible ahora. Intenta en unos minutos.");
                            } else if (data.code === "ITEM_OUT_OF_STOCK") {
                              toast.error("📦 Esta skin no está disponible en el inventario del bot. Puedes venderla por saldo.");
                            } else if (data.code === "TRADE_URL_MISSING") {
                              toast.error("🔗 Configura tu Trade URL de Steam en Ajustes de Perfil antes de retirar.");
                            } else if (data.code === "CONNECTION_ERROR") {
                              toast.error("🌐 Error de conexión con Steam. Verifica tu conexión a internet.");
                            } else {
                              toast.error(data.error || "Error al retirar. Si el problema persiste, vende la skin por saldo.");
                            }
                          }
                        } catch (err) {
                          toast.error("❌ Error de conexión al retirar. Verifica tu internet o intenta más tarde.");
                          console.error('[WITHDRAW ERROR]', err);
                        }
                      }}
                      style={{ flex: 1, padding: "8px", background: "rgba(59, 130, 246, 0.15)", border: "none", color: "#3b82f6", borderRadius: "8px", fontWeight: "bold", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Retirar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RechargeModal open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}