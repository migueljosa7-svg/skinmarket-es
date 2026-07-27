import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import { getPlaceholderImage, handleImageError, getSkinImageUrl } from "../services/ImageService";
import { useToast } from "./Toast";
import { motion as Motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   TRADE URL VALIDATION MODAL
───────────────────────────────────────────── */
const TradeUrlModal = ({ open, onClose, onSave, currentUrl }) => {
  const [url, setUrl] = useState(currentUrl || "");
  const [error, setError] = useState("");

  // Lock body scroll when modal opens
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSave = () => {
    if (!url || !url.includes("steamcommunity.com/tradeoffer/")) {
      setError("❌ Introduce un Trade URL válido de Steam (ej: https://steamcommunity.com/tradeoffer/new/?partner=...)");
      return;
    }
    const partnerMatch = url.match(/partner=(\d+)/);
    const tokenMatch = url.match(/token=([\w-]+)/);
    if (!partnerMatch || !tokenMatch) {
      setError("❌ El enlace debe contener 'partner' y 'token'. Copia el enlace completo de tu Trade Offer.");
      return;
    }
    setError("");
    onSave(url);
    onClose();
  };

  if (!open) return null;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(15px)",
        zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
      }}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#16191e", width: "100%", maxWidth: "500px", borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.05)", padding: "35px", textAlign: "center", color: "white"
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔗</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "8px" }}>CONFIGURA TU TRADE URL</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "25px", lineHeight: "1.5" }}>
          Para retirar skins necesitas vincular tu <strong>Trade URL</strong> de Steam.
          <br />
          <span style={{ fontSize: "0.75rem", color: "#f5ac3b" }}>
            Tu inventario de Steam debe ser <strong>PÚBLICO</strong>.
          </span>
        </p>

        <div style={{ textAlign: "left", marginBottom: "15px" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>
            LINK DE INTERCAMBIO (TRADE URL)
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
            style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              background: "rgba(0,0,0,0.3)", border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
              color: "white", outline: "none", fontSize: "0.85rem"
            }}
          />
          {error && <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "8px", fontWeight: "bold" }}>{error}</div>}
        </div>

        <div style={{
          background: "rgba(245, 172, 59, 0.05)", border: "1px dashed rgba(245, 172, 59, 0.2)",
          borderRadius: "12px", padding: "15px", marginBottom: "25px", textAlign: "left"
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "#f5ac3b", marginBottom: "5px" }}>📋 ¿CÓMO OBTENERLO?</div>
          <ol style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, paddingLeft: "18px", lineHeight: "1.7" }}>
            <li>Ve a tu <strong>Inventario de Steam</strong> → <strong>Ofertas de intercambio</strong></li>
            <li>Haz clic en <strong>¿Quién puede enviarme ofertas de intercambio?</strong></li>
            <li>Copia tu <strong>Trade URL</strong> (el enlace completo)</li>
            <li>Pégalo arriba y guarda</li>
          </ol>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)",
            color: "white", border: "none", cursor: "pointer", fontWeight: "bold"
          }}>
            CANCELAR
          </button>
          <button onClick={handleSave} style={{
            flex: 2, padding: "14px", borderRadius: "12px", background: "#f5ac3b",
            color: "black", border: "none", cursor: "pointer", fontWeight: "900"
          }}>
            GUARDAR TRADE URL
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  );
};

export default function Inventory() {
  const { user, sellSkin, sellAllSkins, withdrawSkin, updateProfile } = useAuth();
  const toast = useToast();
  const [tradeUrlModalOpen, setTradeUrlModalOpen] = useState(false);
  const [pendingWithdrawId, setPendingWithdrawId] = useState(null);

  const inventory = user?.inventory || [];
  const totalValue = inventory.reduce((acc, skin) => acc + (skin.price || 0), 0);

  const handleSellSingle = useCallback(
    (skinId) => {
      sellSkin(skinId);
      toast.success("Skin vendida correctamente.");
    },
    [sellSkin]
  );

  const handleSellAll = useCallback(() => {
    if (inventory.length === 0) return;
    const total = sellAllSkins();
    toast.success(`¡Todas las skins vendidas por €${Number(total || 0).toFixed(2)}!`);
  }, [inventory.length, sellAllSkins]);

  // 3-Way Withdraw: Check trade URL, then offer withdraw/exchange/pending options
  const handleWithdrawOrExchange = useCallback((skinId, action) => {
    const skin = inventory.find(s => s.id === skinId);
    if (!skin) return;

    if (action === "withdraw") {
      // Check if user has trade URL configured
      if (!user?.link_intercambio || !user?.link_intercambio.includes('steamcommunity.com')) {
        setPendingWithdrawId(skinId);
        setTradeUrlModalOpen(true);
        return;
      }

      // Attempt withdraw
      const res = withdrawSkin(skinId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Error al retirar. Puedes usar 'Intercambiar' para cambiar por saldo.");
      }
    } else if (action === "exchange") {
      // Exchange: convert skin to balance at 85% value
      const exchangeValue = Number((skin.price * 0.85).toFixed(2));
      sellSkin(skinId); // removes skin
      toast.success(`🔄 Skin intercambiada por €${exchangeValue} en saldo (85% de valor).`);
    }
  }, [inventory, user, withdrawSkin, sellSkin]);

  // Save trade URL from modal
  const handleSaveTradeUrl = useCallback((url) => {
    updateProfile(url, user?.steam_id || "");
    toast.success("✅ Trade URL guardada correctamente. Puedes retirar ahora.");

    // If there was a pending withdraw, retry it
    if (pendingWithdrawId) {
      const res = withdrawSkin(pendingWithdrawId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Error al retirar. Intenta de nuevo.");
      }
      setPendingWithdrawId(null);
    }
  }, [updateProfile, user, withdrawSkin, pendingWithdrawId]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "50px 20px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "50px",
            background: "rgba(255,255,255,0.02)",
            padding: "35px",
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.05)",
            flexWrap: "wrap",
            gap: "20px"
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.8rem",
                fontWeight: "900",
                margin: 0,
                letterSpacing: "-1px",
                background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              MI INVENTARIO
            </h1>
            <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
              <div style={{ fontSize: "1.2rem", color: "#f5ac3b", fontWeight: "900" }}>
                VALOR TOTAL: €{totalValue.toFixed(2)}
              </div>
              <div style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.4)", fontWeight: "bold" }}>
                {inventory.length} OBJETOS
              </div>
            </div>
          </div>

          {inventory.length > 0 && (
            <button
              onClick={handleSellAll}
              style={{
                padding: "16px 36px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                borderRadius: "16px",
                fontWeight: "900",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              VENDER TODO CONVERTIR A SALDO
            </button>
          )}
        </header>

        {inventory.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.01)", borderRadius: "24px", padding: "80px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "1.2rem" }}>
            No tienes skins en tu inventario actual.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
            {inventory.map((skin) => {
              const color = getRarityColor(skin.rarity);
              const isPending = skin.status === "pending_withdraw" || skin.status === "withdrawing" || skin.status === "withdrawn";
              return (
                <div
                  key={skin.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderWidth: "1px 1px 4px 1px",
                    borderStyle: "solid",
                    borderColor: isPending
                      ? "rgba(245, 172, 59, 0.3) rgba(245, 172, 59, 0.3) #f5ac3b rgba(245, 172, 59, 0.3)"
                      : `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                    borderRadius: "20px",
                    padding: "20px",
                    textAlign: "center",
                    position: "relative",
                    opacity: isPending ? 0.6 : 1
                  }}
                >
                  {/* Pending Badge */}
                  {isPending && (
                    <div style={{
                      position: "absolute", top: "10px", left: "10px",
                      background: "#f5ac3b", color: "black", borderRadius: "8px",
                      padding: "3px 8px", fontSize: "0.6rem", fontWeight: "900",
                      display: "flex", alignItems: "center", gap: "4px"
                    }}>
                      ⏳ PENDIENTE
                    </div>
                  )}

                  <img
                    src={getSkinImageUrl(skin.name, skin.image)}
                    alt={skin.name}
onError={(e) => handleImageError(e, skin)}
                    style={{
                      width: "100%",
                      height: "90px",
                      objectFit: "contain",
                      marginBottom: "12px",
                      opacity: skin.image ? 1 : 0.3
                    }}
                  />
                  <div style={{ color: color, fontSize: "0.65rem", fontWeight: "900", marginBottom: "4px" }}>{skin.rarity?.toUpperCase() || "MIL-SPEC"}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{skin.name}</div>
                  <div style={{ color: "#f5ac3b", fontWeight: "900", fontSize: "1.1rem", marginTop: "6px" }}>€{Number(skin.price || 0).toFixed(2)}</div>

                  {!isPending && (
                    <>
                      <div style={{ display: "flex", gap: "6px", marginTop: "15px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleSellSingle(skin.id)}
                          style={{
                            flex: 1, minWidth: "60px",
                            padding: "8px 4px",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "none",
                            color: "#ef4444",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                            cursor: "pointer"
                          }}
                        >
                          Vender
                        </button>
                        <button
                          onClick={() => handleWithdrawOrExchange(skin.id, "exchange")}
                          style={{
                            flex: 1, minWidth: "60px",
                            padding: "8px 4px",
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "none",
                            color: "#10b981",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                            cursor: "pointer"
                          }}
                        >
                          Intercambiar
                        </button>
                        <button
                          onClick={() => handleWithdrawOrExchange(skin.id, "withdraw")}
                          style={{
                            flex: 1, minWidth: "60px",
                            padding: "8px 4px",
                            background: "rgba(59, 130, 246, 0.15)",
                            border: "none",
                            color: "#3b82f6",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                            cursor: "pointer"
                          }}
                        >
                          Retirar
                        </button>
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginTop: "8px" }}>
                        Intercambio: 85% del valor
                      </div>
                    </>
                  )}

                  {isPending && (
                    <div style={{
                      marginTop: "10px", padding: "6px 12px",
                      background: "rgba(245, 172, 59, 0.1)", borderRadius: "8px",
                      fontSize: "0.7rem", color: "#f5ac3b", fontWeight: "bold"
                    }}>
                      {skin.status === "withdrawn" ? "✅ Retirado" : "⏳ En proceso..."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trade URL Modal */}
      <TradeUrlModal
        open={tradeUrlModalOpen}
        onClose={() => { setTradeUrlModalOpen(false); setPendingWithdrawId(null); }}
        onSave={handleSaveTradeUrl}
        currentUrl={user?.link_intercambio || ""}
      />
    </div>
  );
}
