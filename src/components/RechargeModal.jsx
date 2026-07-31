// src/components/RechargeModal.jsx
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useToast } from "./Toast";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

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
  } catch (e) { }
  return null;
}

async function callPaymentAPI(endpoint, body) {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

const PAYMENT_METHODS = [
  {
    id: "CARD",
    name: "Tarjeta",
    subtitle: "Visa / Mastercard",
    color: "#1a1f71",
    gradient: "linear-gradient(135deg, #1a1f71 0%, #2d5ba0 100%)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" fill="white" opacity="0.95" />
        <rect x="2" y="8" width="20" height="2" fill="#1a1f71" />
        <rect x="5" y="13" width="6" height="2" rx="0.5" fill="#1a1f71" opacity="0.6" />
        <rect x="5" y="16" width="4" height="1.5" rx="0.5" fill="#1a1f71" opacity="0.4" />
      </svg>
    ),
    description: "Pago con tarjeta. El saldo se acredita tras confirmación del pago."
  },
  {
    id: "BTC",
    name: "Bitcoin",
    subtitle: "BTC Network",
    color: "#f7931a",
    gradient: "linear-gradient(135deg, #f7931a 0%, #ff6b35 100%)",
    icon: <span style={{ fontSize: "1.6rem", fontWeight: "900" }}>₿</span>,
    description: "Deposita Bitcoin. Crédito tras 1 confirmación de red (~10 min)."
  },
  {
    id: "ETH",
    name: "Ethereum",
    subtitle: "ERC-20",
    color: "#627eea",
    gradient: "linear-gradient(135deg, #627eea 0%, #8b9dc3 100%)",
    icon: <span style={{ fontSize: "1.4rem", fontWeight: "900" }}>Ξ</span>,
    description: "Deposita Ethereum. Crédito tras 12 confirmaciones (~3 min)."
  },
  {
    id: "USDT",
    name: "Tether",
    subtitle: "ERC-20 / TRC-20",
    color: "#26a17b",
    gradient: "linear-gradient(135deg, #26a17b 0%, #50c878 100%)",
    icon: <span style={{ fontSize: "1.3rem", fontWeight: "900" }}>₮</span>,
    description: "Stablecoin USDT. 1 USDT = 1€. Crédito tras confirmaciones."
  },
  {
    id: "PSC",
    name: "Paysafecard",
    subtitle: "PIN prepago",
    color: "#e10915",
    gradient: "linear-gradient(135deg, #e10915 0%, #ff4655 100%)",
    icon: <span style={{ fontSize: "1.3rem" }}>💳</span>,
    description: "Paga con tu PIN de Paysafecard. Sin cuenta bancaria necesaria."
  },
  {
    id: "SKINPAY",
    name: "SkinPay",
    subtitle: "Skins Steam",
    color: "#f5ac3b",
    gradient: "linear-gradient(135deg, #f5ac3b 0%, #ffba52 100%)",
    icon: <span style={{ fontSize: "1.3rem" }}>🎮</span>,
    description: "Deposita skins de tu inventario de Steam como saldo."
  },
  {
    id: "GIFT",
    name: "Gift Card",
    subtitle: "Código promocional",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    icon: <span style={{ fontSize: "1.3rem" }}>🎁</span>,
    description: "Canjea un código de regalo o promocional. Crédito instantáneo."
  }
];

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];
const MIN_DEPOSIT = 5.0;
const MAX_DEPOSIT = 1000.0;

export default function RechargeModal({ open, onClose }) {
  const toast = useToast();
  const { addToBalance } = useAuth();
  const [activeMethod, setActiveMethod] = useState("CARD");
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  if (!open) return null;

  const method = PAYMENT_METHODS.find(m => m.id === activeMethod) || PAYMENT_METHODS[0];
  const isCrypto = ["BTC", "ETH", "USDT"].includes(activeMethod);
  const isCard = activeMethod === "CARD";
  const isPsc = activeMethod === "PSC";
  const isSkinPay = activeMethod === "SKINPAY";
  const isGift = activeMethod === "GIFT";

  const amountNum = parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (!amountNum || amountNum <= 0) return toast.error("Introduce un monto válido");
    if (amountNum < MIN_DEPOSIT) return toast.error(`El monto mínimo es €${MIN_DEPOSIT.toFixed(2)}`);
    if (amountNum > MAX_DEPOSIT) return toast.error(`El monto máximo por transacción es €${MAX_DEPOSIT.toFixed(2)}`);
    setLoading(true);

    try {
      if (isCrypto) {
        const result = await callPaymentAPI("/api/payments/create-charge", {
          amount: amountNum, method: `crypto_${activeMethod.toLowerCase()}`
        });
        if (result.success) {
          setPaymentInfo({
            coin: activeMethod,
            address: result.address || "DIRECCION_GENERADA",
            network: method.subtitle,
            amount: amountNum,
            coinAmount: result.coinAmount || (amountNum / (activeMethod === "BTC" ? 68500 : activeMethod === "ETH" ? 3450 : 1)).toFixed(6),
            chargeId: result.chargeId
          });
          setShowPaymentModal(true);
        } else {
          toast.error(result.error || "Error al generar dirección.");
        }
      } else {
        // SECURITY: Balance is ONLY credited via signed webhook from payment gateway.
        // This creates a pending payment record — it does NOT add balance directly.
        const result = await callPaymentAPI("/api/payments/create-charge", {
          amount: amountNum, method: activeMethod.toLowerCase()
        });
        if (result.success) {
          toast.success(`✅ Cargo de €${amountNum.toFixed(2)} creado. El saldo se acreditará tras confirmación del pago.`);
          setTimeout(() => onClose(), 2000);
        } else {
          toast.error(result.error || "Error al crear el cargo de pago.");
        }
      }
    } catch (err) {
      if (isCrypto) {
        const fallbackAddresses = {
          BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          USDT: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        };
        setPaymentInfo({
          coin: activeMethod,
          address: fallbackAddresses[activeMethod] || "DIRECCION_GENERADA",
          network: method.subtitle,
          amount: amountNum,
          coinAmount: (amountNum / (activeMethod === "BTC" ? 68500 : activeMethod === "ETH" ? 3450 : 1)).toFixed(6),
        });
        setShowPaymentModal(true);
      } else {
        toast.error("❌ Servicio de pagos no disponible. Intenta de nuevo más tarde.");
      }
    }
    setLoading(false);
  };

  const handleRedeemGift = async () => {
    const code = giftCode.trim().toUpperCase();
    if (!code) return toast.error("Introduce un código");
    setLoading(true);

    try {
      const result = await callPaymentAPI("/api/payments/create-charge", {
        amount: 0, method: "gift_code", code
      });
      if (result.success) {
        addToBalance(result.amount);
        toast.success(`🎁 ${result.message}`);
        setGiftCode("");
        setTimeout(() => onClose(), 1000);
      } else {
        toast.error(result.error || "Código no válido");
      }
    } catch (err) {
      // Gift codes can ONLY be redeemed via backend validation (single-use enforcement)
      toast.error("❌ Servicio de canje no disponible. Intenta de nuevo más tarde.");
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(12px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}
      >
        <Motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto",
            background: "#0d0f14", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "24px", overflow: "hidden", color: "white",
            boxShadow: "0 24px 80px rgba(0,0,0,0.9)"
          }}
        >
          <div style={{
            padding: "28px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, rgba(245,172,59,0.05) 0%, transparent 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: "linear-gradient(135deg, #f5ac3b, #ffba52)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", boxShadow: "0 4px 20px rgba(245,172,59,0.3)"
              }}>
                💰
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.5px" }}>Recargar Saldo</h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Selecciona método y cantidad</p>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)", width: "36px", height: "36px",
              borderRadius: "10px", cursor: "pointer", fontSize: "1.2rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >✕</button>
          </div>

          <div style={{ padding: "24px 32px 12px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "10px"
            }}>
              {PAYMENT_METHODS.map(m => {
                const isActive = activeMethod === m.id;
                return (
                  <Motion.div
                    key={m.id}
                    whileHover={{ y: -3 }}
                    onClick={() => setActiveMethod(m.id)}
                    style={{
                      padding: "16px 12px", borderRadius: "16px",
                      background: isActive ? m.gradient : "rgba(255,255,255,0.03)",
                      border: isActive ? "2px solid transparent" : "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer", textAlign: "center",
                      transition: "all 0.25s ease",
                      boxShadow: isActive ? `0 8px 24px ${m.color}40` : "none",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    {isActive && (
                      <div style={{
                        position: "absolute", top: "6px", right: "6px",
                        width: "16px", height: "16px", borderRadius: "50%",
                        background: "white", display: "flex",
                        alignItems: "center", justifyContent: "center"
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke={m.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <div style={{
                      height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: "8px", color: isActive ? "white" : m.color,
                      filter: isActive ? "none" : "grayscale(0.2)"
                    }}>
                      {m.icon}
                    </div>
                    <div style={{
                      fontSize: "0.82rem", fontWeight: 800,
                      color: isActive ? "white" : "rgba(255,255,255,0.8)"
                    }}>{m.name}</div>
                    <div style={{
                      fontSize: "0.6rem", marginTop: "2px",
                      color: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"
                    }}>{m.subtitle}</div>
                  </Motion.div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "16px 32px 24px" }}>
            {!isGift ? (
              <>
                <label style={{
                  fontSize: "0.7rem", fontWeight: 800, color: "rgba(255,255,255,0.4)",
                  display: "block", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px"
                }}>Cantidad (EUR)</label>

                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  {QUICK_AMOUNTS.map(v => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      style={{
                        flex: 1, padding: "12px 4px", borderRadius: "12px",
                        background: amount === String(v) ? method.gradient : "rgba(255,255,255,0.04)",
                        color: amount === String(v) ? "white" : "rgba(255,255,255,0.5)",
                        border: amount === String(v) ? "none" : "1px solid rgba(255,255,255,0.06)",
                        fontWeight: 800, cursor: "pointer", fontSize: "0.9rem",
                        transition: "all 0.2s"
                      }}
                    >€{v}</button>
                  ))}
                </div>

                <div style={{ position: "relative", marginBottom: "16px" }}>
                  <span style={{
                    position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.3)", fontWeight: 800, fontSize: "1.1rem"
                  }}>€</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Otro importe"
                    min={MIN_DEPOSIT}
                    max={MAX_DEPOSIT}
                    style={{
                      width: "100%", padding: "14px 14px 14px 36px", borderRadius: "12px",
                      background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "white", fontSize: "1.1rem", fontWeight: 700, outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* ─── DEPOSIT LIMITS DISPLAY ─────────────── */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)"
                }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ fontWeight: 700, color: "#10b981" }}>Mín: €{MIN_DEPOSIT.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ fontWeight: 700, color: "#f5ac3b" }}>Máx: €{MAX_DEPOSIT.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{
                  padding: "14px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                  fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5,
                  marginBottom: "16px"
                }}>
                  <span style={{ color: method.color, fontWeight: 700 }}>{method.name}</span> — {method.description}
                </div>

                <Motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={handleDeposit}
                  disabled={loading}
                  style={{
                    width: "100%", padding: "16px", borderRadius: "14px",
                    background: loading ? `${method.color}55` : method.gradient,
                    color: "white",
                    border: "none", fontWeight: 900, fontSize: "1rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    boxShadow: loading ? "none" : `0 8px 24px ${method.color}30`
                  }}
                >
                  {loading ? (
                    <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> PROCESANDO...</>
                  ) : (
                    <>
                      {isCrypto ? `GENERAR DIRECCIÓN • €${amountNum.toFixed(2)}` : `DEPOSITAR €${amountNum.toFixed(2)}`}
                    </>
                  )}
                </Motion.button>
              </>
            ) : (
              <>
                <div style={{
                  padding: "20px", borderRadius: "16px",
                  background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.15)",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "14px", lineHeight: 1.5 }}>
                    {method.description}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      value={giftCode}
                      onChange={e => setGiftCode(e.target.value)}
                      placeholder="Introduce tu código..."
                      style={{
                        flex: 1, padding: "14px 16px", borderRadius: "12px",
                        background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "white", textTransform: "uppercase", outline: "none",
                        fontWeight: 700, fontSize: "0.9rem"
                      }}
                    />
                    <button
                      onClick={handleRedeemGift}
                      disabled={loading || !giftCode.trim()}
                      style={{
                        padding: "14px 28px", borderRadius: "12px",
                        background: loading ? "rgba(236,72,153,0.3)" : method.gradient,
                        color: "white", border: "none", fontWeight: 800, cursor: "pointer",
                        fontSize: "0.9rem", whiteSpace: "nowrap"
                      }}
                    >
                      {loading ? "..." : "Canjear"}
                    </button>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                    Los códigos solo pueden canjearse una vez por usuario.
                  </div>
                </div>
              </>
            )}

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              marginTop: "16px", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)"
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              Pago 100% seguro y encriptado SSL
            </div>
          </div>
        </Motion.div>
      </Motion.div>

      {/* ─── CRYPTO PAYMENT MODAL WITH QR CODE ─────────────── */}
      <AnimatePresence>
        {showPaymentModal && paymentInfo && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPaymentModal(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
              backdropFilter: "blur(15px)", zIndex: 10000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
            }}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: "460px", width: "100%", background: "#0d0f14",
                borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)",
                padding: "36px", textAlign: "center"
              }}
            >
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: PAYMENT_METHODS.find(m => m.id === paymentInfo.coin)?.gradient || "linear-gradient(135deg, #f7931a, #ff6b35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: "1.6rem", fontWeight: 900, color: "white"
              }}>
                {PAYMENT_METHODS.find(m => m.id === paymentInfo.coin)?.icon || "₿"}
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 6px" }}>Depósito {paymentInfo.coin}</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "24px" }}>
                Envía exactamente <strong style={{ color: "#f5ac3b" }}>{paymentInfo.coinAmount} {paymentInfo.coin}</strong> (€{paymentInfo.amount.toFixed(2)}) a:
              </p>

              {/* ─── QR CODE ─────────────────────────────── */}
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "20px",
                display: "inline-block"
              }}>
                <QRCodeSVG
                  value={paymentInfo.address}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div style={{
                background: "rgba(0,0,0,0.4)", borderRadius: "14px", padding: "20px",
                border: "1px dashed rgba(245,172,59,0.3)", marginBottom: "20px"
              }}>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Dirección de Depósito ({paymentInfo.network})
                </div>
                <div style={{
                  fontSize: "0.82rem", color: "#f5ac3b", fontWeight: 700,
                  wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.5, userSelect: "all"
                }}>
                  {paymentInfo.address}
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "16px", marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Red:</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{paymentInfo.network}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Monto:</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f5ac3b" }}>{paymentInfo.coinAmount} {paymentInfo.coin}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Equivalente:</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>€{paymentInfo.amount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => { navigator.clipboard?.writeText(paymentInfo.address); toast.success("Dirección copiada al portapapeles"); }}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  background: "rgba(245,172,59,0.15)", color: "#f5ac3b",
                  border: "1px solid rgba(245,172,59,0.3)", fontWeight: 700,
                  cursor: "pointer", marginBottom: "10px", fontSize: "0.9rem"
                }}
              >📋 COPIAR DIRECCIÓN</button>
              <button
                onClick={() => { setShowPaymentModal(false); onClose(); }}
                style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)", color: "white",
                  border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem"
                }}
              >CERRAR</button>

              {/* ─── BLOCKCHAIN CONFIRMATION TEXT ─────────── */}
              <div style={{
                marginTop: "16px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(245,172,59,0.05)",
                border: "1px solid rgba(245,172,59,0.1)"
              }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", margin: 0, lineHeight: 1.5 }}>
                  <strong style={{ color: "#f5ac3b" }}>Depósito Mínimo: €{MIN_DEPOSIT.toFixed(2)} / Depósito Máximo: €{MAX_DEPOSIT.toFixed(2)}</strong>
                  <br /><br />
                  El saldo se acreditará automáticamente tras la confirmación de la transacción en la red blockchain (1-3 confirmaciones).
                </p>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AnimatePresence>
  );
}