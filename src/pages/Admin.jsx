// src/pages/Admin.jsx
import { useState, useCallback, useEffect } from "react";
import { StorageService } from "../services/StorageService";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getAuthToken() {
  try {
    const raw = localStorage.getItem("skinmarket_db_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user?.token || null;
    }
  } catch {
    // Ignore errors
   }
  return null;
}

const StatCard = ({ title, value, color }) => (
  <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.05)`, borderLeft: `4px solid ${color}`, borderRadius: "18px", padding: "25px" }}>
    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: "bold" }}>{title}</div>
    <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>{value}</div>
  </div>
);

const ProbInput = ({ label, value, onChange, color }) => (
  <div>
    <label style={{ fontSize: "0.8rem", fontWeight: "900", color, display: "block", marginBottom: "8px" }}>{label}</label>
    <input
      type="number"
      step="0.1"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontWeight: "bold" }}
    />
  </div>
);

export default function Admin() {
  const toast = useToast();
  const adminSettings = StorageService.getAdminSettings();
  const user = StorageService.getUser();

  const [probs, setProbs] = useState(
    adminSettings.probabilities || { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 }
  );
  const [stats, setStats] = useState({
    users: 1420,
    transactions: 8930,
    deposited: 45200.0 + (user?.stats?.totalSpent || 0),
    withdrawn: 38400.0
  });
  const [message, setMessage] = useState("");

  // Steam Inspector State
  const [inspectorSteamId, setInspectorSteamId] = useState("");
  const [inspectorItems, setInspectorItems] = useState([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorError, setInspectorError] = useState("");
  const [inspectorTotalValue, setInspectorTotalValue] = useState(0);
  const [inspectorTotalItems, setInspectorTotalItems] = useState(0);
  const [inspectorQueryTime, setInspectorQueryTime] = useState("");

  // Fetch real stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/admin/stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch {
        // Use local stats as fallback
      }
    };
    fetchStats();
  }, []);

  const handleUpdateProbs = useCallback(async () => {
    const total = Object.values(probs).reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("La suma de probabilidades debe ser 100%");
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/admin/settings/probabilities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ probabilities: probs })
      });
      if (response.ok) {
        StorageService.updateAdminSettings({ probabilities: probs });
        setMessage("¡Probabilidades actualizadas con éxito!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        toast.error("Error al guardar en el servidor");
      }
    } catch {
      // Fallback to local
      StorageService.updateAdminSettings({ probabilities: probs });
      setMessage("¡Probabilidades actualizadas localmente!");
      setTimeout(() => setMessage(""), 3000);
    }
  }, [probs, toast]);

  // Steam Inventory Inspector
  const handleInspectInventory = async () => {
    const steamId = inspectorSteamId.trim();
    if (!steamId) {
      setInspectorError("Introduce un SteamID64");
      return;
    }

    setInspectorLoading(true);
    setInspectorError("");
    setInspectorItems([]);
    setInspectorTotalValue(0);
    setInspectorTotalItems(0);

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/steam/inspector/${steamId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setInspectorItems(data.items || []);
      setInspectorTotalValue(data.totalValue || 0);
      setInspectorTotalItems(data.totalItems || 0);
      setInspectorQueryTime(data.queryTime || "");
    } catch (err) {
      setInspectorError(err.message);
    } finally {
      setInspectorLoading(false);
    }
  };

  const totalProb = Object.values(probs).reduce((a, b) => parseFloat(a) + parseFloat(b), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "white", padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "40px" }}>◆ PANEL DE ADMINISTRACIÓN</h1>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "50px" }}>
          <StatCard title="USUARIOS ACTIVOS" value={stats.users} color="#3b82f6" />
          <StatCard title="TRANSACCIONES" value={stats.transactions} color="#a855f7" />
          <StatCard title="TOTAL DEPOSITADO" value={`€${Number(stats.deposited || 0).toFixed(2)}`} color="#10b981" />
          <StatCard title="TOTAL RETIRADO" value={`€${Number(stats.withdrawn || 0).toFixed(2)}`} color="#ef4444" />
        </div>

        {/* Steam Inventory Inspector */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "40px", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "15px" }}>◆ INSPECTOR DE INVENTARIO DE ESPECTADORES</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "25px" }}>
            Inspecciona el inventario de CS2 de cualquier usuario de Steam. Introduce su SteamID64 o URL de Trade.
          </p>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="SteamID64 (ej: 76561198888888888) o Trade URL"
              value={inspectorSteamId}
              onChange={(e) => setInspectorSteamId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInspectInventory()}
              style={{
                flex: 1,
                minWidth: "300px",
                padding: "14px 18px",
                borderRadius: "14px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.95rem",
                outline: "none"
              }}
            />
            <button
              onClick={handleInspectInventory}
              disabled={inspectorLoading}
              style={{
                padding: "14px 32px",
                borderRadius: "14px",
                background: inspectorLoading ? "rgba(59, 130, 246, 0.3)" : "#3b82f6",
                color: "white",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: "900",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {inspectorLoading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  CONSULTANDO...
                </>
              ) : (
                "◆ INSPECCIONAR"
              )}
            </button>
          </div>

          {inspectorError && (
            <div style={{ padding: "15px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", color: "#ef4444", marginBottom: "20px", fontWeight: "bold" }}>
              ◆ {inspectorError}
            </div>
          )}

          {inspectorItems.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{inspectorTotalItems} objetos encontrados</span>
                  <span style={{ marginLeft: "15px", color: "#10b981", fontSize: "1.1rem", fontWeight: "900" }}>
                    Valor estimado: €{inspectorTotalValue.toFixed(2)}
                  </span>
                </div>
                {inspectorQueryTime && (
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
                    Consulta: {new Date(inspectorQueryTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "15px", maxHeight: "600px", overflowY: "auto" }}>
                {inspectorItems.map((item, index) => {
                  const rarityColors = {
                    "Covert": "#eb4b4b",
                    "Classified": "#d32ce6",
                    "Restricted": "#8847ff",
                    "Mil-Spec Grade": "#4b69ff",
                    "Industrial Grade": "#5e98d9",
                    "Consumer Grade": "#b0c3d9",
                    "Extraordinary": "#ffd700",
                    "Contraband": "#ff6b6b"
                  };
                  const color = rarityColors[item.rarity] || "#b0c3d9";

                  return (
                    <div
                      key={item.assetid || index}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid rgba(255,255,255,0.05)`,
                        borderBottom: `3px solid ${color}`,
                        borderRadius: "14px",
                        padding: "12px",
                        textAlign: "center",
                        transition: "transform 0.2s",
                        cursor: "default"
                      }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => { e.target.style.display = "none"; }}
                          style={{ width: "100%", height: "80px", objectFit: "contain", marginBottom: "8px" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "80px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                          🎮
                        </div>
                      )}
                      <div style={{ color, fontSize: "0.6rem", fontWeight: "900", marginBottom: "3px" }}>
                        {item.rarity?.toUpperCase() || "ITEM"}
                      </div>
                      <div style={{ fontSize: "0.75rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </div>
                      {item.weapon && (
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                          {item.weapon}
                        </div>
                      )}
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "4px", wordBreak: "break-all" }}>
                        <code style={{ fontSize: "0.55rem" }}>ID: {item.assetid?.slice(0, 12)}...</code>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {inspectorItems.length === 0 && !inspectorLoading && !inspectorError && (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
              Introduce un SteamID64 para inspeccionar el inventario de CS2 de cualquier usuario.
            </div>
          )}
        </div>

        {/* Settings Area */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "15px" }}>◆ CONFIGURACIÓN DE PROBABILIDADES (PROVABLY FAIR)</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "30px" }}>Define los porcentajes (%) de aparición de cada rareza en las aperturas.</p>

          {message && (
            <div style={{ padding: "15px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#10b981", borderRadius: "12px", marginBottom: "25px", fontWeight: "bold" }}>
              {message}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "25px", marginBottom: "35px" }}>
            <ProbInput label="COVERT (Rojo)" value={probs.covert} onChange={(v) => setProbs({ ...probs, covert: v })} color="#eb4b4b" />
            <ProbInput label="CLASSIFIED (Rosa)" value={probs.classified} onChange={(v) => setProbs({ ...probs, classified: v })} color="#d32ce6" />
            <ProbInput label="RESTRICTED (Púrpura)" value={probs.restricted} onChange={(v) => setProbs({ ...probs, restricted: v })} color="#8847ff" />
            <ProbInput label="MIL-SPEC (Azul)" value={probs.mil_spec} onChange={(v) => setProbs({ ...probs, mil_spec: v })} color="#4b69ff" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "15px" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
              SUMA TOTAL:{" "}
              <span style={{ color: Math.abs(totalProb - 100) < 0.01 ? "#10b981" : "#ef4444" }}>
                {totalProb.toFixed(2)}%
              </span>
            </div>
            <button
              onClick={handleUpdateProbs}
              style={{
                padding: "16px 36px",
                borderRadius: "16px",
                background: "#f5ac3b",
                color: "black",
                border: "none",
                fontSize: "1rem",
                fontWeight: "900",
                cursor: "pointer"
              }}
            >
              GUARDAR PROBABILIDADES
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}