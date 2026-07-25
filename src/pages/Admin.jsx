// src/pages/Admin.jsx
import { useState, useCallback } from "react";
import { StorageService } from "../services/StorageService";
import { useToast } from "../components/Toast";

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
  const [stats] = useState({
    users: 1420,
    transactions: 8930,
    deposited: 45200.0 + (user?.stats?.totalSpent || 0),
    withdrawn: 38400.0
  });
  const [message, setMessage] = useState("");

  const handleUpdateProbs = useCallback(() => {
    const total = Object.values(probs).reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("La suma de probabilidades debe ser 100%");
      return;
    }

    StorageService.updateAdminSettings({ probabilities: probs });
    setMessage("¡Probabilidades actualizadas con éxito!");
    setTimeout(() => setMessage(""), 3000);
  }, [probs]);

  const totalProb = Object.values(probs).reduce((a, b) => parseFloat(a) + parseFloat(b), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "white", padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "40px" }}>🛡️ PANEL DE ADMINISTRACIÓN</h1>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "50px" }}>
          <StatCard title="USUARIOS ACTIVOS" value={stats.users} color="#3b82f6" />
          <StatCard title="TRANSACCIONES SIMULADAS" value={stats.transactions} color="#a855f7" />
          <StatCard title="TOTAL DEPOSITADO" value={`€${stats.deposited.toFixed(2)}`} color="#10b981" />
          <StatCard title="TOTAL RETIRADO" value={`€${stats.withdrawn.toFixed(2)}`} color="#ef4444" />
        </div>

        {/* Settings Area */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "40px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "15px" }}>⚙️ CONFIGURACIÓN DE PROBABILIDADES (PROVABLY FAIR)</h2>
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
    </div>
  );
}
