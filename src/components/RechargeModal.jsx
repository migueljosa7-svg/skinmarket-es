// src/components/RechargeModal.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useToast } from "./Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TabButton = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: "15px 10px",
      background: active ? "rgba(245, 172, 59, 0.1)" : "transparent",
      borderWidth: "0 0 2px 0",
      borderStyle: "solid",
      borderColor: active ? "#f5ac3b" : "transparent",
      color: active ? "#f5ac3b" : "rgba(255,255,255,0.4)",
      cursor: "pointer",
      fontWeight: "900",
      fontSize: "0.75rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease"
    }}
  >
    <span style={{ fontSize: "1.2rem" }}>{icon}</span>
    {label}
  </button>
);

const MOCK_STEAM_SKINS = [
  { id: "st_1", name: "AK-47 | Slate", price: 12.50, rarity: "Restricted", wear: "Field-Tested", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "st_2", name: "AWP | Atheris", price: 18.00, rarity: "Restricted", wear: "Minimal Wear", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "st_3", name: "M4A1-S | Nightmare", price: 34.00, rarity: "Classified", wear: "Field-Tested", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "st_4", name: "Glock-18 | Water Elemental", price: 8.50, rarity: "Restricted", wear: "Factory New", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" }
];

/**
 * Get auth token from localStorage for API calls
 */
function getAuthToken() {
  try {
    const raw = localStorage.getItem("skinmarket_db_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.token || null;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Call the backend payment API
 */
async function callPaymentAPI(endpoint, body) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}

export default function RechargeModal({ open, onClose }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("card");
  const { user, depositSkins, addToBalance } = useAuth();
  const [steamSkins, setSteamSkins] = useState(MOCK_STEAM_SKINS);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [success, setSuccess] = useState(null);
  const [cryptoData, setCryptoData] = useState(null);
  const [cardData, setCardData] = useState({ number: "", holder: "", expiry: "", cvc: "", amount: "50" });

  useEffect(() => {
    if (open && user?.steam_id) {
      setTimeout(() => {
        setSteamSkins(MOCK_STEAM_SKINS);
      }, 500);
    }
  }, [open, user?.steam_id]);

  if (!open) return null;

  const handleDeposit = async () => {
    const total = selectedItems.reduce((acc, s) => acc + s.price, 0);
    setLoading(true);
    const saved = addToBalance(total);
    if (saved) {
      depositSkins(selectedItems);
      setSuccess(`¡Has depositado ${selectedItems.length} objetos por €${total.toFixed(2)}!`);
      setSelectedItems([]);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } else {
      toast.error("Error al procesar el depósito.");
    }
    setLoading(false);
  };

  const handleCardDeposit = async () => {
    const amountNum = parseFloat(cardData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return toast.error("Monto inválido");
    setLoading(true);

    try {
      // Call backend API for card payment
      const result = await callPaymentAPI("/api/payments/create-charge", {
        amount: amountNum,
        method: "card",
      });

      if (result.success) {
        // Update local balance to reflect the deposit
        addToBalance(amountNum);
        setSuccess(`✅ ${result.message}`);
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);
      } else {
        toast.error(result.error || "Error al procesar el pago.");
      }
    } catch (err) {
      console.error("[RECHARGE] Card deposit error:", err);
      // Fallback to local storage if API is unavailable
      const saved = addToBalance(amountNum);
      if (saved) {
        setSuccess(`💳 Pago simulado: €${amountNum.toFixed(2)} añadidos a tu saldo.`);
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);
      } else {
        toast.error("Error al procesar el pago.");
      }
    }
    setLoading(false);
  };

  const redeemGiftCard = async () => {
    const codeClean = giftCode.trim().toUpperCase();
    if (!codeClean) return;

    setLoading(true);

    try {
      // Call backend API for gift code redemption
      const result = await callPaymentAPI("/api/payments/create-charge", {
        amount: 0,
        method: "gift_code",
        code: codeClean,
      });

      if (result.success) {
        addToBalance(result.amount);
        setSuccess(`🎁 ${result.message}`);
        setGiftCode("");
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);
      } else {
        toast.error(result.error || "Código no válido.");
      }
    } catch (err) {
      console.error("[RECHARGE] Gift code error:", err);
      // Fallback to local codes if API is unavailable
      let amount = 0;
      if (codeClean === "SKINMARKET") amount = 100.00;
      else if (codeClean === "ESPAÑA") amount = 50.00;
      else if (codeClean === "START") amount = 25.00;
      else if (codeClean === "BIENVENIDO") amount = 10.00;

      if (amount > 0) {
        const saved = addToBalance(amount);
        if (saved) {
          setSuccess(`🎁 Código ${codeClean} canjeado (simulado): +€${amount.toFixed(2)}`);
          setGiftCode("");
          setTimeout(() => {
            setSuccess(null);
            onClose();
          }, 2000);
        } else {
          toast.error("Error al canjear el código.");
        }
      } else {
        toast.error("Código no válido.");
      }
    }
    setLoading(false);
  };

  const generateCryptoAddress = async (coin) => {
    setLoading(true);

    try {
      const methodMap = {
        BTC: "crypto_btc",
        ETH: "crypto_eth",
        LTC: "crypto_lte",
        USDT: "crypto_usdt",
        SOL: "crypto_sol",
      };

      const result = await callPaymentAPI("/api/payments/create-charge", {
        amount: parseFloat(cardData.amount || "50"),
        method: methodMap[coin] || "crypto_btc",
      });

      if (result.success) {
        setCryptoData({
          coin: result.coin.toUpperCase(),
          label: result.coinLabel,
          address: result.address,
          network: result.network,
          chargeId: result.chargeId,
        });
      } else {
        toast.error(result.error || "Error al generar dirección.");
      }
    } catch (err) {
      console.error("[RECHARGE] Crypto address error:", err);
      // Fallback to simulated addresses
      const addresses = {
        BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        LTC: "LURJ5XvU4DkM3P3M9TfQp9YQ9YQ9YQ9YQ9YQ9",
        USDT: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        SOL: "7Y4p742d35Cc6634C0532925a3b844Bc454e4438f44e"
      };
      setCryptoData({
        coin,
        label: coin,
        address: addresses[coin] || "ADDRESS_GEN",
        network: coin === "USDT" ? "ERC-20" : coin,
      });
    }
    setLoading(false);
  };

  const toggleSelect = (skin) => {
    if (selectedItems.find((s) => s.id === skin.id)) {
      setSelectedItems(selectedItems.filter((s) => s.id !== skin.id));
    } else {
      setSelectedItems([...selectedItems, skin]);
    }
  };

  const totalSelectedPrice = selectedItems.reduce((acc, s) => acc + s.price, 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          backgroundColor: "#12141a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          overflow: "hidden",
          color: "white"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 25px",
            borderWidth: "0 0 1px 0",
            borderStyle: "solid",
            borderColor: "rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.02)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>💳</span>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Recargar Saldo / Depositar</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: "1.5rem",
              cursor: "pointer"
            }}
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#0c0d10" }}>
          <TabButton active={activeTab === "card"} onClick={() => setActiveTab("card")} label="Tarjeta" icon="💳" />
          <TabButton active={activeTab === "steam"} onClick={() => setActiveTab("steam")} label="Skins Steam" icon="🎮" />
          <TabButton active={activeTab === "crypto"} onClick={() => setActiveTab("crypto")} label="Cripto" icon="₿" />
          <TabButton active={activeTab === "gift"} onClick={() => setActiveTab("gift")} label="Código / Gift" icon="🎁" />
        </div>

        {/* Modal Body */}
        <div style={{ padding: "25px", maxHeight: "70vh", overflowY: "auto" }}>
          {success && (
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                color: "#10b981",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
                textAlign: "center",
                fontWeight: 600
              }}
            >
              {success}
            </div>
          )}

          {/* CARD TAB */}
          {activeTab === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Selecciona o introduce importe (€)</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  {["10", "25", "50", "100", "250"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setCardData({ ...cardData, amount: val })}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: cardData.amount === val ? "#f5ac3b" : "rgba(255,255,255,0.05)",
                        color: cardData.amount === val ? "#000" : "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      €{val}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                placeholder="Otro importe (€)"
                value={cardData.amount}
                onChange={(e) => setCardData({ ...cardData, amount: e.target.value })}
                style={{
                  padding: "12px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white"
                }}
              />
              <input
                type="text"
                placeholder="Número de Tarjeta (Simulado)"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                style={{
                  padding: "12px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white"
                }}
              />
              <button
                onClick={handleCardDeposit}
                disabled={loading}
                style={{
                  padding: "15px",
                  backgroundColor: "#f5ac3b",
                  color: "black",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginTop: "10px"
                }}
              >
                {loading ? "Procesando..." : `Recargar €${cardData.amount || "0"}`}
              </button>
            </div>
          )}

          {/* STEAM SKINS TAB */}
          {activeTab === "steam" && (
            <div>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "15px" }}>
                Selecciona objetos de tu inventario Steam para cambiarlos por saldo instantáneo:
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "10px",
                  maxHeight: "250px",
                  overflowY: "auto"
                }}
              >
                {steamSkins.map((skin) => {
                  const isSelected = !!selectedItems.find((s) => s.id === skin.id);
                  return (
                    <div
                      key={skin.id}
                      onClick={() => toggleSelect(skin)}
                      style={{
                        padding: "10px",
                        background: isSelected ? "rgba(245, 172, 59, 0.2)" : "rgba(255,255,255,0.03)",
                        border: isSelected ? "2px solid #f5ac3b" : "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{skin.name}</div>
                      <div style={{ color: "#f5ac3b", fontSize: "0.85rem", marginTop: "5px" }}>€{skin.price.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "15px",
                    backgroundColor: "#f5ac3b",
                    color: "black",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    marginTop: "15px",
                    cursor: "pointer"
                  }}
                >
                  {loading ? "Depositando..." : `Depositar ${selectedItems.length} skins por €${totalSelectedPrice.toFixed(2)}`}
                </button>
              )}
            </div>
          )}

          {/* CRYPTO TAB */}
          {activeTab === "crypto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                {["BTC", "ETH", "LTC", "USDT", "SOL"].map((coin) => (
                  <button
                    key={coin}
                    onClick={() => generateCryptoAddress(coin)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: cryptoData?.coin === coin ? "#f5ac3b" : "rgba(255,255,255,0.05)",
                      color: cryptoData?.coin === coin ? "#000" : "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    {coin}
                  </button>
                ))}
              </div>
              {cryptoData && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    padding: "15px",
                    borderRadius: "10px",
                    border: "1px dashed #f5ac3b",
                    wordBreak: "break-all",
                    textAlign: "center"
                  }}
                >
                  <p style={{ color: "#9ca3af", margin: "0 0 8px 0", fontSize: "0.8rem" }}>
                    Dirección de depósito {cryptoData.label || cryptoData.coin} ({cryptoData.network}):
                  </p>
                  <code style={{ color: "#f5ac3b", fontSize: "0.9rem" }}>{cryptoData.address}</code>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", marginTop: "10px" }}>
                    Envía los fondos a esta dirección. El saldo se acreditará automáticamente tras las confirmaciones de red.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* GIFT / CODE TAB */}
          {activeTab === "gift" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                ¿Tienes un código promocional o de regalo? Introdúcelo a continuación:
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Ej: SKINMARKET (+€100)"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "white",
                    textTransform: "uppercase"
                  }}
                />
                <button
                  onClick={redeemGiftCard}
                  disabled={loading || !giftCode.trim()}
                  style={{
                    padding: "12px 25px",
                    backgroundColor: "#f5ac3b",
                    color: "black",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  {loading ? "..." : "Canjear"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "5px" }}>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Códigos de prueba:</span>
                <span onClick={() => setGiftCode("SKINMARKET")} style={{ fontSize: "0.75rem", color: "#f5ac3b", cursor: "pointer", textDecoration: "underline" }}>SKINMARKET (+€100)</span>
                <span onClick={() => setGiftCode("ESPAÑA")} style={{ fontSize: "0.75rem", color: "#f5ac3b", cursor: "pointer", textDecoration: "underline" }}>ESPAÑA (+€50)</span>
                <span onClick={() => setGiftCode("START")} style={{ fontSize: "0.75rem", color: "#f5ac3b", cursor: "pointer", textDecoration: "underline" }}>START (+€25)</span>
                <span onClick={() => setGiftCode("BIENVENIDO")} style={{ fontSize: "0.75rem", color: "#f5ac3b", cursor: "pointer", textDecoration: "underline" }}>BIENVENIDO (+€10)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

