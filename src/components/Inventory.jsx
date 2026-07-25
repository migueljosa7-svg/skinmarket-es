import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import { useCallback } from "react";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { useToast } from "./Toast";

export default function Inventory() {
  const { user, sellSkin, sellAllSkins, withdrawSkin } = useAuth();
  const toast = useToast();

  const inventory = user?.inventory || [];

  const totalValue = inventory.reduce((acc, skin) => acc + (skin.price || 0), 0);

  const handleSellSingle = useCallback(
    (skinId) => {
      sellSkin(skinId);
    },
    [sellSkin]
  );

  const handleSellAll = useCallback(() => {
    if (inventory.length === 0) return;
    const total = sellAllSkins();
    toast.success(`¡Todas las skins vendidas por €${Number(total || 0).toFixed(2)}!`);
  }, [inventory.length, sellAllSkins]);

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {inventory.map((skin) => {
              const color = getRarityColor(skin.rarity);
              return (
                <div
                  key={skin.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderWidth: "1px 1px 4px 1px",
                    borderStyle: "solid",
                    borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                    borderRadius: "20px",
                    padding: "20px",
                    textAlign: "center"
                  }}
                >
                  <img
                    src={skin.image || getPlaceholderImage(skin.name)}
                    alt={skin.name}
                    onError={(e) => handleImageError(e, skin.name, skin.image)}
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

                  <div style={{ display: "flex", gap: "8px", marginTop: "15px" }}>
                    <button
                      onClick={() => handleSellSingle(skin.id)}
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
                        const res = withdrawSkin(skin.id);
                        toast.success(res.message || "Retiro enviado a tu Steam.");
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
    </div>
  );
}

