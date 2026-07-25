// src/pages/Cases.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateAllCases } from "../constants/cases.js";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { getRarityColor } from "../constants/colors";
import { StorageService } from "../services/StorageService";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { useAuth } from "../context/useAuth";
import { useToast } from "../components/Toast";

const DailyRouletteModal = ({ isOpen, onClose, rewardAmount, skinsPool }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [reel, setReel] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isSpinning && !hasRevealed && skinsPool.length > 0) {
      const newReel = [];
      for (let i = 0; i < 50; i++) {
        newReel.push(skinsPool[Math.floor(Math.random() * skinsPool.length)]);
      }
      const winnerSkin = skinsPool.find((s) => s.price >= rewardAmount) || skinsPool[0];
      newReel.push(winnerSkin);
      for (let i = 0; i < 5; i++) {
        newReel.push(skinsPool[Math.floor(Math.random() * skinsPool.length)]);
      }

      const frame = requestAnimationFrame(() => {
        setReel(newReel);
      });

      const t1 = setTimeout(() => {
        setIsSpinning(true);
        if (containerRef.current) {
          const cardWidth = 160;
          const winnerIndex = newReel.length - 6;
          const offset = winnerIndex * cardWidth - (window.innerWidth < 600 ? 100 : 250);
          containerRef.current.style.transition = "transform 5.5s cubic-bezier(0.1, 0.7, 0.1, 1)";
          containerRef.current.style.transform = `translateX(-${offset}px)`;
        }
      }, 300);

      const t2 = setTimeout(() => {
        setHasRevealed(true);
      }, 6000);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, isSpinning, hasRevealed, skinsPool, rewardAmount]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(10px)",
        color: "white"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          background: "#16191e",
          borderRadius: "32px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "35px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <h2 style={{ color: "white", textAlign: "center", marginBottom: "25px", fontWeight: "900", letterSpacing: "2px" }}>
          RECOMPENSA DIARIA
        </h2>

        <div
          style={{
            height: "180px",
            background: "#0c0d10",
            border: "2px solid rgba(255,255,255,0.05)",
            borderRadius: "20px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "4px",
              background: "#f5ac3b",
              zIndex: 10,
              transform: "translateX(-50%)",
              boxShadow: "0 0 20px #f5ac3b"
            }}
          />

          <div ref={containerRef} style={{ display: "flex", gap: "10px", paddingLeft: "50%", transition: "none" }}>
            {reel.map((skin, i) => (
              <div
                key={i}
                style={{
                  minWidth: "150px",
                  height: "150px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px",
                  borderWidth: "0 0 4px 0",
                  borderStyle: "solid",
                  borderColor: getRarityColor(skin?.rarity || "Common")
                }}
              >
                <img src={skin?.image} alt={skin?.name} style={{ width: "80px", height: "auto", marginBottom: "8px" }} />
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {skin?.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasRevealed && (
          <div style={{ textAlign: "center", marginTop: "25px" }}>
            <div style={{ color: "#10b981", fontSize: "2.2rem", fontWeight: "900", marginBottom: "8px" }}>
              +€{rewardAmount.toFixed(2)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontWeight: "bold" }}>AÑADIDOS A TU SALDO</div>
            <button
              onClick={() => {
                setHasRevealed(false);
                setIsSpinning(false);
                onClose();
              }}
              style={{
                padding: "14px 35px",
                borderRadius: "14px",
                background: "#f5ac3b",
                color: "black",
                border: "none",
                fontWeight: "900",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              ¡RECLAMAR RECOMPENSA!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CaseCard = ({ c, skinsPool, onClick }) => {
  const skins = useMemo(() => {
    if (!skinsPool || skinsPool.length === 0) return [];
    return skinsPool.slice(0, 4);
  }, [skinsPool]);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        border: "1.5px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          height: "220px",
          background: `radial-gradient(circle at center, ${c.color}22 0%, transparent 70%), ${c.bgGradient}`,
          backgroundBlendMode: "overlay",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "20px"
        }}
      >
        <div style={{ fontSize: "4.5rem", filter: `drop-shadow(0 15px 25px ${c.color}66)` }}>{c.emoji || "📦"}</div>
        <div style={{ position: "absolute", bottom: "15px", fontWeight: "900", fontSize: "1.1rem", color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
          {c.name}
        </div>
      </div>

      <div style={{ padding: "20px", background: "#121419", display: "flex", flexDirection: "column", gap: "15px", flex: 1, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
          {skins.map((skin, i) => (
            <img
              key={i}
              src={skin.image || getPlaceholderImage(skin.name)}
              alt={skin.name}
              onError={(e) => handleImageError(e, skin.name, skin.image)}
              style={{
                width: "35px",
                height: "35px",
                objectFit: "contain",
                opacity: skin.image ? 0.8 : 0.3
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: "900", color: "#f5ac3b" }}>€{Number(c.price).toFixed(2)}</div>
          <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "rgba(255,255,255,0.4)" }}>ABRIR →</span>
        </div>
      </div>
    </div>
  );
};

export default function Cases() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, claimDaily, addToBalance } = useAuth();
  const { skins: allSkins } = useFetchSkins(2000, true);
  const [filterCategory, setFilterCategory] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("price-asc");
  const [rouletteData, setRouletteData] = useState({ isOpen: false, reward: 0 });

  const allCases = useMemo(() => generateAllCases(), []);

  const filteredCases = useMemo(() => {
    let filtered = [...allCases];
    if (filterCategory !== "todos") filtered = filtered.filter((c) => c.category === filterCategory);
    if (searchTerm) filtered = filtered.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return filtered.sort((a, b) => {
      if (sortBy === "price-asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price-desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "alpha-asc") return a.name.localeCompare(b.name);
      if (sortBy === "alpha-desc") return b.name.localeCompare(a.name);
      return 0;
    });
  }, [allCases, filterCategory, searchTerm, sortBy]);

  const categories = [
    { id: "todos", label: "TODAS", icon: "📦" },
    { id: "económica", label: "ECONÓMICAS", icon: "🍕" },
    { id: "intermedia", label: "ESTÁNDAR", icon: "🔥" },
    { id: "premium", label: "PREMIUM", icon: "💎" },
    { id: "limited", label: "LIMITADAS", icon: "🌟" }
  ];

  const sortOptions = [
    { id: "price-asc", label: "Precio: Menor a Mayor" },
    { id: "price-desc", label: "Precio: Mayor a Menor" },
    { id: "alpha-asc", label: "Nombre: A-Z" },
    { id: "alpha-desc", label: "Nombre: Z-A" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", padding: "50px 20px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "50px" }}>
          <h1 style={{ fontSize: "3.5rem", fontWeight: "900", margin: "0 0 10px 0" }}>TIENDA DE CAJAS</h1>
          <p style={{ color: "#f5ac3b", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" }}>
            Abre cajas exclusivas y obtén las mejores skins instantáneamente
          </p>
        </header>

        {/* Filters & Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  padding: "12px 22px",
                  borderRadius: "14px",
                  background: filterCategory === cat.id ? "#f5ac3b" : "rgba(255,255,255,0.03)",
                  color: filterCategory === cat.id ? "black" : "white",
                  border: "1px solid rgba(255,255,255,0.05)",
                  fontWeight: "900",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              onClick={() => {
                if (!user) {
                  toast.error("Inicia sesión para reclamar tu recompensa diaria");
                  return;
                }
                const res = claimDaily();
                if (res.success) {
                  setRouletteData({ isOpen: true, reward: res.reward });
                } else {
                  toast.error(res.error || "Reclama la recompensa diaria en tu panel.");
                }
              }}
              style={{
                padding: "12px 22px",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: "900",
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              🎁 RECOMPENSA DIARIA
            </button>
            <input
              type="text"
              placeholder="Buscar caja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "12px 18px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "12px 18px", borderRadius: "12px", background: "#16191e", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontWeight: "bold" }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cases Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "25px" }}>
          {filteredCases.map((c) => (
            <CaseCard key={c.id} c={c} skinsPool={allSkins} onClick={() => navigate(`/case/${c.id}`)} />
          ))}
        </div>
      </div>

      <DailyRouletteModal
        isOpen={rouletteData.isOpen}
        onClose={() => setRouletteData({ isOpen: false, reward: 0 })}
        rewardAmount={rouletteData.reward}
        skinsPool={allSkins}
      />
    </div>
  );
}
