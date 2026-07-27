// src/pages/UploadSkin.jsx
import { useState, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { getRarityColor } from "../constants/colors.js";
import { StorageService } from "../services/StorageService";
import { getPlaceholderImage, handleImageError, getSkinImageUrl } from "../services/ImageService";
import { useToast } from "../components/Toast";

const MOCK_STEAM_INVENTORY = [
  { id: "sp_1", name: "AK-47 | Redline", price: 28.50, rarity: "Classified", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "sp_2", name: "AWP | Asiimov", price: 115.00, rarity: "Covert", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "sp_3", name: "USP-S | Cyrex", price: 14.20, rarity: "Classified", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
  { id: "sp_4", name: "M4A4 | Desolate Space", price: 22.00, rarity: "Classified", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" }
];

export default function UploadSkin() {
  const { user } = useAuth();
  const toast = useToast();
  const [steamId, setSteamId] = useState(user?.steam_id || "");
  const [loading, setLoading] = useState(false);
  const [steamInventory, setSteamInventory] = useState(MOCK_STEAM_INVENTORY);
  const [selectedSkins, setSelectedSkins] = useState([]);

  const handleImportSteam = useCallback(() => {
    if (!steamId.trim()) return toast.error("Introduce una SteamID válida");
    setLoading(true);
    setTimeout(() => {
      setSteamInventory(MOCK_STEAM_INVENTORY);
      setLoading(false);
    }, 400);
  }, [steamId]);

  const toggleSelectSkin = (skin) => {
    if (selectedSkins.find((s) => s.id === skin.id)) {
      setSelectedSkins(selectedSkins.filter((s) => s.id !== skin.id));
    } else {
      setSelectedSkins([...selectedSkins, skin]);
    }
  };

  const handleDeposit = () => {
    if (selectedSkins.length === 0) return;

    const totalValue = selectedSkins.reduce((acc, s) => acc + s.price, 0);
    StorageService.addBalance(totalValue);
    StorageService.addSkinsToInventory(selectedSkins);

    toast.success(`¡Depositadas ${selectedSkins.length} skins por un total de €${totalValue.toFixed(2)}!`);

    const remaining = steamInventory.filter((s) => !selectedSkins.find((sel) => sel.id === s.id));
    setSteamInventory(remaining);
    setSelectedSkins([]);
  };

  const totalDepositValue = selectedSkins.reduce((acc, s) => acc + s.price, 0);

  return (
    <div style={{ width: "100%", minHeight: "100vh", padding: "60px 20px", background: "#0f1115", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "30px" }}>📥 DEPOSITAR SKINS DESDE STEAM</h1>

        <div style={{ background: "rgba(255,255,255,0.02)", padding: "30px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "30px" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "10px" }}>
            STEAM ID 64 O LINK DE INTERCAMBIO
          </label>
          <div style={{ display: "flex", gap: "15px" }}>
            <input
              type="text"
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="76561198888888888"
              style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            />
            <button
              onClick={handleImportSteam}
              disabled={loading}
              style={{ padding: "14px 28px", borderRadius: "12px", background: "#f5ac3b", color: "black", border: "none", fontWeight: "900", cursor: "pointer" }}
            >
              {loading ? "CARGANDO..." : "CARGAR INVENTARIO"}
            </button>
          </div>
        </div>

        {steamInventory.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "900", margin: 0 }}>INVENTARIO STEAM ({steamInventory.length})</h2>
              {selectedSkins.length > 0 && (
                <button
                  onClick={handleDeposit}
                  style={{ padding: "12px 24px", borderRadius: "12px", background: "#10b981", color: "white", border: "none", fontWeight: "900", cursor: "pointer" }}
                >
                  DEPOSITAR {selectedSkins.length} SKINS (€{totalDepositValue.toFixed(2)})
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "20px" }}>
              {steamInventory.map((skin) => {
                const isSelected = !!selectedSkins.find((s) => s.id === skin.id);
                const color = getRarityColor(skin.rarity);
                return (
                  <div
                    key={skin.id}
                    onClick={() => toggleSelectSkin(skin)}
                    style={{
                      background: isSelected ? "rgba(245, 172, 59, 0.2)" : "rgba(255,255,255,0.02)",
                      borderWidth: isSelected ? "2px 2px 4px 2px" : "1px 1px 4px 1px",
                      borderStyle: "solid",
                      borderColor: isSelected ? `#f5ac3b #f5ac3b ${color} #f5ac3b` : `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                      borderRadius: "18px",
                      padding: "18px",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <img
                      src={getSkinImageUrl(skin.name, skin.image)}
                      alt={skin.name}
                      onError={(e) => handleImageError(e, skin)}
                      style={{ width: "100%", height: "80px", objectFit: "contain", marginBottom: "10px", opacity: skin.image ? 1 : 0.3 }}
                    />
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{skin.name}</div>
                    <div style={{ fontSize: "1rem", color: "#f5ac3b", fontWeight: "900", marginTop: "5px" }}>€{Number(skin.price || 0).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}