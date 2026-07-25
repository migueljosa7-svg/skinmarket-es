// src/pages/Ranking.jsx
import { useMemo } from "react";
import { StorageService } from "../services/StorageService";

const MOCK_TOP_PLAYERS = [
  { name: "CSGO_God", balance: 14250.00, level: 85, exp: 9400 },
  { name: "CryptoWhale", balance: 9800.50, level: 64, exp: 7100 },
  { name: "ProGamer_ES", balance: 5400.00, level: 42, exp: 4500 },
  { name: "SkinCollector", balance: 3200.00, level: 31, exp: 3400 },
  { name: "Zeus_Awp", balance: 2850.00, level: 28, exp: 2900 },
  { name: "Viper_ES", balance: 2100.00, level: 22, exp: 2300 },
  { name: "NeonRider", balance: 1750.00, level: 19, exp: 1950 },
  { name: "LuckyStrike", balance: 1400.00, level: 15, exp: 1600 }
];

export default function Ranking() {
  const rankingData = useMemo(() => {
    const currentUser = StorageService.getUser();
    const invVal = StorageService.getInventory().reduce((acc, s) => acc + Number(s.price || 0), 0);
    const totalVal = (currentUser.balance || 0) + invVal;

    const userEntry = {
      name: currentUser.nombre_usuario || "Jugador Local",
      balance: Number(totalVal.toFixed(2)),
      level: currentUser.nivel || 1,
      exp: currentUser.experiencia || 0,
      isCurrent: true
    };

    return [...MOCK_TOP_PLAYERS.filter((p) => p.name !== currentUser.nombre_usuario), userEntry]
      .sort((a, b) => b.balance - a.balance);
  }, []);

  const top3 = rankingData.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "50px 20px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "60px" }}>
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "900",
              margin: 0,
              background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-2px"
            }}
          >
            TOP RANKING
          </h1>
          <p style={{ color: "#f5ac3b", fontWeight: "bold", letterSpacing: "3px", textTransform: "uppercase", marginTop: "10px" }}>
            Los mejores jugadores de la plataforma
          </p>
        </header>

        {/* Podium */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "20px", marginBottom: "60px", flexWrap: "wrap" }}>
          {top3[1] && <PodiumCard player={top3[1]} place={2} height="200px" color="#94a3b8" />}
          {top3[0] && <PodiumCard player={top3[0]} place={1} height="260px" color="#f5ac3b" />}
          {top3[2] && <PodiumCard player={top3[2]} place={3} height="170px" color="#b45309" />}
        </div>

        {/* List Table */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={thStyle}>POSICIÓN</th>
                <th style={thStyle}>JUGADOR</th>
                <th style={thStyle}>VALOR TOTAL</th>
                <th style={thStyle}>NIVEL</th>
                <th style={thStyle}>EXPERIENCIA</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.map((u, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", background: u.isCurrent ? "rgba(245, 172, 59, 0.08)" : "transparent" }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: "900", fontSize: "1.1rem", color: idx < 3 ? "#f5ac3b" : "rgba(255,255,255,0.4)" }}>#{idx + 1}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "1.4rem" }}>👤</span>
                      <span style={{ fontWeight: "bold" }}>{u.name} {u.isCurrent && "(TÚ)"}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: "#f5ac3b", fontWeight: "900" }}>€{Number(u.balance).toFixed(2)}</span>
                  </td>
                  <td style={tdStyle}>Nivel {u.level || 1}</td>
                  <td style={tdStyle}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>{u.exp} XP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({ player, place, height, color }) {
  return (
    <div style={{ width: "260px", textAlign: "center" }}>
      <div style={{ fontSize: place === 1 ? "3.5rem" : "2.5rem", marginBottom: "10px" }}>👤</div>
      <div style={{ fontWeight: "900", fontSize: "1.1rem", marginBottom: "10px" }}>{player.name}</div>
      <div
        style={{
          height: height,
          background: `linear-gradient(180deg, ${color}22 0%, ${color}05 100%)`,
          border: `2px solid ${color}`,
          borderRadius: "24px 24px 0 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        <div style={{ fontSize: "2.5rem", fontWeight: "900", color: color }}>#{place}</div>
        <div
          style={{
            position: "absolute",
            top: "-15px",
            background: color,
            color: "black",
            padding: "4px 14px",
            borderRadius: "8px",
            fontWeight: "900",
            fontSize: "0.8rem"
          }}
        >
          €{Number(player.balance).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "18px 25px",
  fontSize: "0.75rem",
  color: "rgba(255,255,255,0.4)",
  fontWeight: "900",
  letterSpacing: "2px"
};

const tdStyle = {
  padding: "20px 25px",
  fontSize: "0.95rem"
};