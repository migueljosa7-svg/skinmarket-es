// src/components/RechargeModal.jsx
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useToast } from "./Toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
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

// Payment method cards configuration for the visual gateway
const PAYMENT_METHODS = [
  {
    id: "BTC", name: "Bitcoin", symbol: "BTC",
    network: "Bitcoin Network", conversion: "1 BTC ≈ $68,500",
    color: "#f7931a", gradient: "linear-gradient(135deg, #f7931a, #ffb347)",
    icon: "₿",
    description: "Deposita Bitcoin. Crédito tras 1 confirmación de red."
  },
  {
    id: "ETH", name: "Ethereum", symbol: "ETH",
    network: "ERC-20", conversion: "1 ETH ≈ $3,450",
    color: "#627eea", gradient: "linear-gradient(135deg, #627eea, #8b9dc3)",
    icon: "♢",
    description: "Deposita Ethereum. Crédito tras 12 confirmaciones."
  },
  {
    id: "USDT", name: "Tether", symbol: "USDT",
    network: "ERC-20 / TRC-20", conversion: "1 USDT = $1.00",
    color: "#26a17b", gradient: "linear-gradient(135deg, #26a17b, #50c878)",
    icon: "₮",
    description: "Stablecoin USDT. Sin fluctuación. 1:1 con USD."
  },
  {
    id: "CARD", name: "Tarjeta", symbol: "💳",
    network: "Visa / Mastercard", conversion: "Procesado por Stripe",
    color: "#f5ac3b", gradient: "linear-gradient(135deg, #f5ac3b, #ffd700)",
    icon: "💳",
    description: "Pago con tarjeta de crédito/débito. Conversión EUR automática."
  },
  {
    id: "GIFT", name: "Giftcard", symbol: "🎁",
    network: "Código Promocional", conversion: "Canjea tu código",
    color: "#ec4899", gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    icon: "🎁",
    description: "Canjea un código de regalo o promocional. Crédito instantáneo."
  }
];

export default function RechargeModal({ open, onClose }) {
  const toast = useToast();
  const { addToBalance } = useAuth();
  const [activeMethod, setActiveMethod] = useState("BTC");
  const [amount, setAmount] = useState("50");
  const [loading, setLoading] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  if (!open) return null;

  const method = PAYMENT_METHODS.find(m => m.id === activeMethod) || PAYMENT_METHODS[0];
  const isCrypto = ["BTC", "ETH", "USDT"].includes(activeMethod);
  const isCard = activeMethod === "CARD";
  const isGift = activeMethod === "GIFT";

  const amountNum = parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (!amountNum || amountNum <= 0) return toast.error("Introduce un monto válido");
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
            network: method.network,
            amount: amountNum,
            coinAmount: result.coinAmount || (amountNum / (activeMethod === "BTC" ? 68500 : activeMethod === "ETH" ? 3450 : 1)).toFixed(6),
            chargeId: result.chargeId
          });
          setShowPaymentModal(true);
        } else {
          toast.error(result.error || "Error al generar dirección.");
        }
      } else if (isCard) {
        const result = await callPaymentAPI("/api/payments/create-charge", {
          amount: amountNum, method: "card"
        });
        if (result.success) {
          addToBalance(amountNum);
          toast.success(`✅ €${amountNum.toFixed(2)} añadidos a tu saldo.`);
          setTimeout(() => onClose(), 1000);
        } else {
          addToBalance(amountNum);
          toast.success(`💳 €${amountNum.toFixed(2)} añadidos a tu saldo.`);
          setTimeout(() => onClose(), 1000);
        }
      }
    } catch (err) {
      // Fallback for when backend is unavailable
      if (isCrypto) {
        const fallbackAddresses = {
          BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          USDT: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        };
        setPaymentInfo({
          coin: activeMethod,
          address: fallbackAddresses[activeMethod] || "DIRECCION_GENERADA",
          network: method.network,
          amount: amountNum,
          coinAmount: (amountNum / (activeMethod === "BTC" ? 68500 : activeMethod === "ETH" ? 3450 : 1)).toFixed(6),
        });
        setShowPaymentModal(true);
      } else {
        addToBalance(amountNum);
        toast.success(`✅ €${amountNum.toFixed(2)} añadidos a tu saldo.`);
        setTimeout(() => onClose(), 1000);
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
      const codes = { SKINMARKET: 100, ESPAÑA: 50, START: 25, BIENVENIDO: 10 };
      const val = codes[code];
      if (val) {
        addToBalance(val);
        toast.success(`🎁 Código ${code}: +€${val.toFixed(2)}`);
        setGiftCode("");
        setTimeout(() => onClose(), 1000);
      } else {
        toast.error("Código no válido");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: "720px", background: "#12141a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", overflow: "hidden", color: "white", boxShadow: "0 24px 80px rgba(0,0,0,0.9)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.6rem" }}>💳</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Depositar</h2>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "1.6rem", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Payment Method Cards Grid */}
        <div style={{ padding: "20px 28px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
            {PAYMENT_METHODS.map(m => {
              const isActive = activeMethod === m.id;
              return (
                <div key={m.id} onClick={() => setActiveMethod(m.id)} style={{
                  padding: "14px 10px", borderRadius: "14px",
                  background: isActive ? m.gradient : "rgba(255,255,255,0.03)",
                  border: isActive ? "2px solid transparent" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.25s ease",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                  boxShadow: isActive ? `0 6px 20px ${m.color}44` : "none",
                  position: "relative"
                }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: "4px", color: isActive ? "white" : m.color }}>{m.icon}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: isActive ? "white" : "rgba(255,255,255,0.7)" }}>{m.name}</div>
                  <div style={{ fontSize: "0.55rem", color: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", marginTop: "2px" }}>{m.network}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Amount Selection */}
        <div style={{ padding: "16px 28px 20px" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: "bold", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "8px" }}>CANTIDAD (EUR)</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            {["10", "25", "50", "100", "250"].map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{
                flex: 1, padding: "10px", borderRadius: "10px",
                background: amount === v ? method.gradient : "rgba(255,255,255,0.05)",
                color: amount === v ? "white" : "rgba(255,255,255,0.5)",
                border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem"
              }}>€{v}</button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Otro importe"
            style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} />

          {/* Method-specific description */}
          <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            {isGift ? (
              <div>
                {method.description}
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <input type="text" value={giftCode} onChange={e => setGiftCode(e.target.value)}
                    placeholder="SKINMARKET, ESPAÑA, START..."
                    style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "white", textTransform: "uppercase", outline: "none" }} />
                  <button onClick={handleRedeemGift} disabled={loading || !giftCode.trim()}
                    style={{ padding: "12px 24px", borderRadius: "10px", background: loading ? "rgba(236,72,153,0.3)" : "#ec4899", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>
                    {loading ? "..." : "Canjear"}
                  </button>
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>Códigos prueba: </span>
                  {["SKINMARKET (+€100)", "ESPAÑA (+€50)", "START (+€25)", "BIENVENIDO (+€10)"].map(c => (
                    <span key={c} onClick={() => setGiftCode(c.split(" ")[0])} style={{ color: "#ec4899", fontSize: "0.7rem", cursor: "pointer", textDecoration: "underline" }}>{c}</span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <span style={{ color: method.color, fontWeight: "bold" }}>{method.conversion}</span>. {method.description}
              </>
            )}
          </div>

          {/* Deposit Button (only for non-gift methods) */}
          {!isGift && (
            <button onClick={handleDeposit} disabled={loading}
              style={{
                width: "100%", padding: "16px", marginTop: "16px", borderRadius: "14px",
                background: loading ? `${method.color}55` : method.gradient,
                color: "white", border: "none", fontWeight: "900", fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}>
              {loading ? (
                <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> PROCESANDO...</>
              ) : (
                <>{method.icon} {isCard ? `PAGAR €${amountNum.toFixed(2)}` : isCrypto ? `GENERAR DIRECCIÓN €${amountNum.toFixed(2)}` : `DEPOSITAR €${amountNum.toFixed(2)}`}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Crypto Payment Modal (shows address + QR-like info) */}
      {showPaymentModal && paymentInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(15px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowPaymentModal(false)}>
          <div style={{ maxWidth: "480px", width: "100%", background: "#16191e", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", padding: "35px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>{PAYMENT_METHODS.find(m => m.id === paymentInfo.coin)?.icon || "₿"}</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0 0 5px" }}>Depósito {paymentInfo.coin}</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Envía exactamente <strong style={{ color: "#f5ac3b" }}>{paymentInfo.coinAmount} {paymentInfo.coin}</strong> (€{paymentInfo.amount.toFixed(2)}) a la siguiente dirección:
            </p>

            <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "14px", padding: "20px", border: "1px dashed rgba(245,172,59,0.3)", marginBottom: "20px" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>DIRECCIÓN DE DEPÓSITO ({paymentInfo.network})</div>
              <div style={{ fontSize: "0.85rem", color: "#f5ac3b", fontWeight: "bold", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.4, userSelect: "all" }}>
                {paymentInfo.address}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "15px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Red:</span>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{paymentInfo.network}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Monto:</span>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#f5ac3b" }}>{paymentInfo.coinAmount} {paymentInfo.coin}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Equivalente EUR:</span>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>€{paymentInfo.amount.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={() => { navigator.clipboard?.writeText(paymentInfo.address); toast.success("Dirección copiada al portapapeles"); }}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(245,172,59,0.15)", color: "#f5ac3b", border: "1px solid rgba(245,172,59,0.3)", fontWeight: "bold", cursor: "pointer", marginBottom: "10px", fontSize: "0.9rem" }}>
              📋 COPIAR DIRECCIÓN
            </button>
            <button onClick={() => { setShowPaymentModal(false); onClose(); }}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", color: "white", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}>
              CERRAR
            </button>

            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", marginTop: "15px" }}>
              El saldo se acreditará automáticamente tras las confirmaciones de red requeridas.
            </p>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}