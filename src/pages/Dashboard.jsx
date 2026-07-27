// src/pages/Dashboard.jsx
import { useState, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import RechargeModal from "../components/RechargeModal";
import { StorageService } from "../services/StorageService";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { useToast } from "../components/Toast";

const SettingsModal = ({ open, onClose }) => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [link, setLink] = useState(user?.link_intercambio || "");
  const [steamId, setSteamId] = useState(user?.steam_id || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const success = updateProfile(link, steamId);
    if (success) {
      toast.success("¡Perfil de Steam guardado correctamente!");
      onClose();
    } else {
      toast.error("Error al guardar los datos.");
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(15px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "#16191e",
          width: "100%",
          maxWidth: "480px",
          borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "35px",
          textAlign: "center",
          color: "white"
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "10px" }}>⚙️ CONFIGURACIÓN DE CUENTA</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginBottom: "25px" }}>
          Configura tus datos de Steam para simulaciones de retiro e intercambio.
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
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              outline: "none"
            }}
          />
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
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ flex: 2, padding: "14px", borderRadius: "12px", background: "#f5ac3b", color: "black", border: "none", cursor: "pointer", fontWeight: "900" }}
          >
            {loading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, sellSkin, sellAllSkins, withdrawSkin, claimDaily } = useAuth();
  const toast = useToast();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSellSingle = useCallback(
    (id) => {
      sellSkin(id);
    },
    [sellSkin]
  );

  const handleSellAll = useCallback(() => {
    const total = sellAllSkins();
    toast.success(`Todas las skins vendidas por €${Number(total || 0).toFixed(2)}!`);
  }, [sellAllSkins]);

  const handleClaimDailyReward = useCallback(() => {
    const res = claimDaily();
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error);
    }
  }, [claimDaily]);

  if (!user) return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f1115"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "3px solid rgba(245, 172, 59, 0.1)",
          borderTop: "3px solid #f5ac3b",
          borderRadius: "50%",
          margin: "0 auto 20px",
          animation: "spin 1s linear infinite"
        }} />
        <div style={{
          color: "#f5ac3b",
          fontSize: "0.85rem",
          fontWeight: "900",
          letterSpacing: "3px",
          textTransform: "uppercase"
        }}>
          Cargando perfil...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const inventory = user.inventory || [];
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalValue = inventory.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const stats = user.stats || {};

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "40px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Profile Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "28px",
            padding: "35px",
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
            <img
              src={user.avatar}
              alt={user.nombre_usuario}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80"; }}
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                border: "3px solid #f5ac3b",
                objectFit: "cover"
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: "900", margin: 0 }}>{user.nombre_usuario}</h1>
                <span
                  style={{
                    background: "rgba(245, 172, 59, 0.15)",
                    color: "#f5ac3b",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: "bold"
                  }}
                >
                  LVL {user.nivel || 1}
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "5px 0 0 0", fontSize: "0.85rem" }}>{user.email}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right", marginRight: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: "bold" }}>SALDO DISPONIBLE</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#f5ac3b" }}>€{Number(user.balance || 0).toFixed(2)}</div>
            </div>

            <button
              onClick={() => setRechargeOpen(true)}
              style={{
                padding: "14px 28px",
                background: "#f5ac3b",
                color: "black",
                border: "none",
                borderRadius: "14px",
                fontWeight: "900",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}
            >
              + RECARGAR
            </button>

            <button
              onClick={handleClaimDailyReward}
              style={{
                padding: "14px 24px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "14px",
                fontWeight: "900",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}
            >
              🎁 RECOMPENSA DIARIA
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                padding: "14px",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "1.2rem"
              }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* User Statistics Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>CAJAS ABIERTAS</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{stats.casesOpened || 0}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>BATALLAS GANADAS</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>{stats.battlesWon || 0}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>TOTAL JUGADO</div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", marginTop: "5px" }}>€{Number(stats.totalSpent || 0).toFixed(2)}</div>
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
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white"
              }}
            />
            {filteredInventory.length > 0 && (
              <button
                onClick={handleSellAll}
                style={{
                  padding: "10px 20px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                VENDER TODO (€{totalValue.toFixed(2)})
              </button>
            )}
          </div>
        </div>

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.01)", borderRadius: "24px", padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            No tienes skins en el inventario. ¡Abre cajas o gana batallas para conseguir objetos!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "20px" }}>
            {filteredInventory.map((item) => {
              const color = getRarityColor(item.rarity);
              return (
                <div
                  key={item.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderWidth: "1px 1px 4px 1px",
                    borderStyle: "solid",
                    borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                    borderRadius: "20px",
                    padding: "20px",
                    textAlign: "center",
                    position: "relative"
                  }}
                >
                  <img
                    src={item.image || getPlaceholderImage(item.name)}
                    alt={item.name}
                    onError={(e) => handleImageError(e, item)}
                    style={{
                      width: "100%",
                      height: "90px",
                      objectFit: "contain",
                      marginBottom: "12px",
                      opacity: item.image ? 1 : 0.3
                    }}
                  />
                  <div style={{ color: color, fontSize: "0.65rem", fontWeight: "900", marginBottom: "4px" }}>{item.rarity?.toUpperCase() || "MIL-SPEC"}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ color: "#f5ac3b", fontWeight: "900", fontSize: "1.1rem", marginTop: "6px" }}>€{Number(item.price || 0).toFixed(2)}</div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
                    <button
                      onClick={() => handleSellSingle(item.id)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "none",
                        color: "#ef4444",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      Vender
                    </button>
                    <button
                      onClick={() => {
                        const res = withdrawSkin(item.id);
                        toast.success(res?.message || "Retiro simulado con éxito.");
                      }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        background: "rgba(59, 130, 246, 0.15)",
                        border: "none",
                        color: "#3b82f6",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
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
    </div>
  );
}
