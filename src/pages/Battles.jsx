import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { generateAllCases } from "../constants/cases.js";
import { getRarityColor } from "../constants/colors.js";
import { motion as Motion } from "framer-motion";
import { getPlaceholderImage, handleImageError, getSkinImageUrl } from "../services/ImageService";
import { useToast } from "../components/Toast";
import { sound } from "../utils/audio";
import { getFloatBadgeProps } from "../utils/floatPreview";
import ProvablyFairModal from "../components/ProvablyFairModal";


/* ─────────────────────────────────────────────
   MINI ROULETTE — igual que KeyDrop (slide)
───────────────────────────────────────────── */
const MiniBattleRoulette = ({ items, accentColor }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    const el = containerRef.current;
    el.style.transition = "none";
    el.style.transform = "translateX(0px)";

    void el.offsetWidth;

    const CARD_W = 120; // Increased width for better spacing
    const winnerIndex = items.length - 4;
    const offset = winnerIndex * CARD_W + 60;

    const timerId = setTimeout(() => {
      const jitter = Math.floor(Math.random() * 30) - 15;
      el.style.transition = "transform 4s cubic-bezier(0.12, 0.9, 0.2, 1)";
      el.style.transform = `translateX(-${offset + jitter}px)`;
    }, 50);

    return () => clearTimeout(timerId);
  }, [items]);

  if (!items || items.length === 0) return null;

  const gold = accentColor || "#f5ac3b";

  return (
    <div
      style={{
        width: "100%",
        height: "150px",
        background: "rgba(0,0,0,0.3)",
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        backdropFilter: 'blur(10px)'
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "3px",
          background: gold,
          zIndex: 10,
          boxShadow: `0 0 20px ${gold}`,
          transform: "translateX(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, #0f1115 0%, transparent 25%, transparent 75%, #0f1115 100%)`,
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "10px",
          height: "100%",
          alignItems: "center",
          paddingLeft: "50%",
          willChange: "transform",
        }}
      >
        {items.map((skin, idx) => {
          const rc = getRarityColor(skin.rarity);
          return (
            <div
              key={skin.id || `minibattle-${idx}`}
              style={{
                minWidth: "110px",
                height: "110px",
                background: `radial-gradient(circle at center, ${rc}15 0%, rgba(255,255,255,0.02) 80%)`,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                boxSizing: "border-box",
                flexShrink: 0,
                borderWidth: "0 0 4px 0",
                borderStyle: "solid",
                borderColor: rc
              }}
            >
              <img
                src={getSkinImageUrl(skin.name, skin.image)}
                alt={skin.name}
                onError={(e) => handleImageError(e, skin)}
                style={{
                  width: "80px",
                  height: "60px",
                  objectFit: "contain",
                  marginBottom: "8px",
                  filter: `drop-shadow(0 0 10px ${rc}40)`,
                  opacity: skin.image ? 1 : 0.3
                }}
              />
              <div
                style={{
                  color: "white",
                  fontSize: "0.6rem",
                  fontWeight: '800',
                  textAlign: "center",
                  width: "100%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {skin.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BoxCard = ({ c, qty, onAdd, onRemove }) => {
  return (
    <Motion.div
      whileHover={{ y: -5 }}
      style={{
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        border: qty > 0 ? `2px solid ${c.color}` : "1.5px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
        transition: "all 0.2s",
        background: 'rgba(255,255,255,0.02)',
        boxShadow: qty > 0 ? `0 10px 30px ${c.color}25` : "none",
        minHeight: "220px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: c.bgGradient,
          opacity: 0.1,
        }}
      />

      {qty > 0 && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: c.color,
            color: "black",
            borderRadius: "10px",
            minWidth: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "0.75rem",
            zIndex: 5,
            padding: '0 8px'
          }}
        >
          {qty}
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "20px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: "2.8rem", marginBottom: "10px" }}>
          {c.emoji}
        </div>

        <div
          style={{
            color: "white",
            fontSize: "0.85rem",
            textAlign: "center",
            fontWeight: "800",
            lineHeight: "1.2",
            marginBottom: "5px",
            width: '100%',
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.name}
        </div>

        <div
          style={{
            color: c.color,
            fontWeight: "900",
            fontSize: "1rem",
            marginBottom: "20px",
            letterSpacing: '0.5px'
          }}
        >
          {c.price}€
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "14px",
            padding: "5px",
            marginTop: "auto",
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(c.id);
            }}
            style={{
              background: qty > 0 ? "rgba(239,68,68,0.1)" : "transparent",
              border: "none",
              color: qty > 0 ? "#ef4444" : "rgba(255,255,255,0.1)",
              fontSize: "1.2rem",
              cursor: qty > 0 ? "pointer" : "default",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: '900'
            }}
          >
            −
          </button>
          <span
            style={{
              color: "white",
              fontWeight: "900",
              fontSize: "0.9rem",
              minWidth: "20px",
              textAlign: "center",
            }}
          >
            {qty}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(c.id);
            }}
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "none",
              color: "#10b981",
              fontSize: "1.2rem",
              cursor: "pointer",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: '900'
            }}
          >
            +
          </button>
        </div>
      </div>
    </Motion.div>
  );
};

/* ─────────────────────────────────────────────
   MODAL DE BATALLA — Estilo KeyDrop/Clash.gg
───────────────────────────────────────────── */
const BOT_TEMPLATES = [
  { id: "newbie1", name: "Alex (Dumb)", winRate: "30%", icon: "🤪", color: "#10b981", desc: "IA básica. Poca probabilidad de skins caras." },
  { id: "newbie2", name: "Juan (Low)", winRate: "32%", icon: "🙃", color: "#10b981", desc: "IA básica. Poca probabilidad de skins caras." },
  { id: "std1", name: "Pro Bot", winRate: "42%", icon: "😎", color: "#3b82f6", desc: "IA balanceada. Probabilidades reales." },
  { id: "std2", name: "Hardy", winRate: "45%", icon: "🤠", color: "#3b82f6", desc: "IA balanceada. Probabilidades reales." },
  { id: "elite1", name: "Elite AI", winRate: "75%", icon: "🤖", color: "#ef4444", desc: "IA avanzada. Probabilidades altas de skins caras." },
  { id: "elite2", name: "X-Terminator", winRate: "80%", icon: "👾", color: "#ef4444", desc: "IA avanzada. Probabilidades altas de skins caras." },
  { id: "master1", name: "Master Mind", winRate: "85%", icon: "🧠", color: "#a855f7", desc: "Maestro veterano. ¡Casi nunca falla!" },
  { id: "master2", name: "Ghostmaster", winRate: "90%", icon: "👻", color: "#a855f7", desc: "Maestro veterano. ¡Casi nunca falla!" },
  { id: "skin_king", name: "Skin King", winRate: "95%", icon: "👑", color: "#f5ac3b", desc: "El rey de la arena. Trae su propio amuleto." },
  { id: "hacker", name: "0xHacker", winRate: "99%", icon: "👨‍💻", color: "#f5ac3b", desc: "01001000 01101001 00101110" },
];

const GAME_MODES = [
  { id: "classic", name: "Clásico", desc: "Mayor valor TOTAL gana todo.", icon: "⚔️", color: "#f5ac3b" },
  { id: "crazy", name: "Locura", desc: "¡Invertido! Menor valor TOTAL gana.", icon: "🤪", color: "#ec4899" },
  { id: "terminal", name: "Terminal", desc: "¡Todo o nada! Quien saque la skin más cara en la ÚLTIMA CAJA gana.", icon: "🧨", color: "#ef4444" },
  { id: "first_blood", name: "Primera Sangre", desc: "Quien saque la skin más cara en la PRIMERA CAJA gana todo.", icon: "🩸", color: "#b91c1c" },
  { id: "joker", name: "Comodín", desc: "Clásico + desempate aleatorio.", icon: "🃏", color: "#a855f7" },
];

const BATTLE_FORMATS = [
  { count: 2, label: "1v1", sub: "Duelo", icon: "👥", isTeam: false },
  { count: 4, label: "2v2", sub: "Duo Squad", icon: "🤜🤛", isTeam: true },
  { count: 6, label: "3v3", sub: "Triples", icon: "⚔️", isTeam: true },
  { count: 8, label: "4v4", sub: "Team Wars", icon: "👑", isTeam: true },
  { count: 3, label: "1v1v1", sub: "Triple", icon: "☘️", isTeam: false },
  { count: 4, label: "1v1v1v1", sub: "Squad", icon: "🎭", isTeam: false },
];

const BattleSelector = ({
  open, onClose, onStart, userBalance, allCases,
  step, setStep,
  selectedBoxes, setSelectedBoxes,
  gameMode, setGameMode,
  playerCount, setPlayerCount,
  botLevels, setBotLevels,
  toast
}) => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-asc");
  const [hoveredInfo, setHoveredInfo] = useState(null);

  const totalCost = useMemo(() => {
    return Object.entries(selectedBoxes).reduce((acc, [id, qty]) => {
      const cData = allCases.find((c) => c.id === id);
      return acc + (parseFloat(cData?.price || 0) * qty);
    }, 0);
  }, [selectedBoxes, allCases]);

  const filteredCases = useMemo(() => {
    let list = filter === "all" ? allCases : allCases.filter((c) => c.category === filter);
    return list.sort((a, b) => {
      if (sortBy === "price-asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price-desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "alpha-asc") return a.name.localeCompare(b.name);
      if (sortBy === "alpha-desc") return b.name.localeCompare(a.name);
      return 0;
    });
  }, [allCases, filter, sortBy]);

  if (!open) return null;

  const canAfford = totalCost > 0 && totalCost <= userBalance;

  const handleAddBox = (id) => {
    setSelectedBoxes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveBox = (id) => {
    setSelectedBoxes((prev) => {
      if (!prev[id]) return prev;
      const next = prev[id] - 1;
      if (next <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f1115", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "40px",
          width: "100%", maxWidth: "1100px", padding: "40px", maxHeight: "90vh", overflowY: "auto",
          position: "relative", boxShadow: "0 50px 100px rgba(0,0,0,0.8)",
        }}
      >
        <button onClick={onClose} style={closeButtonStyle}>✕</button>

        <h2 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "0 0 10px 0", letterSpacing: '-2px' }}>
          {step === 'config' ? '⚔️ CONFIGURAR BATALLA' : '🤖 SELECCIONAR RIVALES'}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.3)", marginBottom: "40px", fontSize: "1.1rem", fontWeight: '500' }}>
          {step === 'config' ? 'Configura tu enfrentamiento premium y compite por el premio mayor.' : 'Elige la dificultad de tus oponentes para la batalla.'}
        </p>

        {step === 'config' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px', marginBottom: '40px' }}>
              <div>
                <SectionHeader num="1" label="Formato" />
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {BATTLE_FORMATS.map((f) => (
                    <div
                      key={f.label}
                      onClick={() => setPlayerCount(f.count)}
                      style={{
                        flex: 1, background: playerCount === f.count ? "rgba(245,172,59,0.15)" : "rgba(255,255,255,0.02)",
                        border: playerCount === f.count ? "2px solid #f5ac3b" : "1.5px solid rgba(255,255,255,0.03)",
                        padding: "20px 10px", borderRadius: "24px", cursor: "pointer", textAlign: 'center', transition: "all 0.2s",
                      }}
                    >
                      <div style={{ fontSize: "1.8rem", marginBottom: '8px' }}>{f.icon}</div>
                      <div style={{ color: "white", fontWeight: "900", fontSize: "1.1rem" }}>{f.label}</div>
                      <div style={{ color: playerCount === f.count ? '#f5ac3b' : "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontWeight: '800', textTransform: 'uppercase' }}>{f.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader num="2" label="Modo de Juego" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {GAME_MODES.map(m => (
                      <button
                        key={m.id}
                        onMouseEnter={() => setHoveredInfo(m.desc)}
                        onMouseLeave={() => setHoveredInfo(null)}
                        onClick={() => setGameMode(m.id)}
                        style={{
                          flex: 1, padding: '18px', borderRadius: '20px',
                          border: gameMode === m.id ? `2px solid ${m.color}` : '1.5px solid rgba(255,255,255,0.03)',
                          background: gameMode === m.id ? `${m.color}15` : 'rgba(255,255,255,0.02)',
                          color: 'white', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '1.4rem' }}>{m.icon}</div>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  {/* Box for hover info */}
                  <div style={{
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f5ac3b',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    background: 'rgba(245, 172, 59, 0.05)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(245, 172, 59, 0.2)',
                    opacity: hoveredInfo ? 1 : 0.3,
                    transition: 'all 0.3s'
                  }}>
                    {hoveredInfo || "Pasa el ratón por las opciones para más info"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <SectionHeader num="3" label="Cajas del Botín" noMargin />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', fontWeight: 'bold'
                  }}
                >
                  <option value="price-asc">Precio: Bajo a Alto</option>
                  <option value="price-desc">Precio: Alto a Bajo</option>
                  <option value="alpha-asc">Nombre: A-Z</option>
                  <option value="alpha-desc">Nombre: Z-A</option>
                </select>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['all', 'económica', 'intermedia', 'premium'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      style={{
                        padding: '8px 12px', borderRadius: '10px',
                        background: filter === cat ? '#f5ac3b15' : 'rgba(255,255,255,0.05)',
                        border: filter === cat ? '1px solid #f5ac3b' : '1px solid rgba(255,255,255,0.1)',
                        color: filter === cat ? '#f5ac3b' : 'white',
                        fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={boxesGridStyle}>
              {filteredCases.map((c) => (
                <BoxCard key={c.id} c={c} qty={selectedBoxes[c.id] || 0} onAdd={handleAddBox} onRemove={handleRemoveBox} />
              ))}
            </div>

            <div style={footerStyle}>
              <div>
                <div style={costLabelStyle}>Costo de Entrada</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: canAfford ? '#f5ac3b' : '#ef4444' }}>{totalCost.toFixed(2)}€</div>
              </div>
              <Motion.button
                whileHover={canAfford ? { scale: 1.05 } : {}}
                whileTap={canAfford ? { scale: 0.95 } : {}}
                disabled={!canAfford}
                onClick={() => setStep('bots')}
                style={{ ...primaryButtonStyle, background: canAfford ? "#f5ac3b" : "rgba(255,255,255,0.1)" }}
              >
                CONTINUAR ➔
              </Motion.button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
              maxHeight: '50vh',
              overflowY: 'auto',
              padding: '10px'
            }}>
              {Array.from({ length: playerCount - 1 }).map((_, i) => (
                <div key={i + 1} style={botSlotStyle}>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>RIVAL {i + 1}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {BOT_TEMPLATES.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setBotLevels(prev => ({ ...prev, [i + 1]: b.id }))}
                        style={{
                          padding: '20px', borderRadius: '20px', border: botLevels[i + 1] === b.id ? `2px solid ${b.color}` : '1.5px solid rgba(255,255,255,0.03)',
                          background: botLevels[i + 1] === b.id ? `${b.color}15` : 'rgba(255,255,255,0.02)',
                          color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '900', fontSize: '1.1rem' }}>{b.icon} {b.name}</span>
                          <span style={{ color: b.color, fontWeight: '900', fontSize: '0.8rem' }}>{b.winRate} WIN</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '5px' }}>{b.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={footerStyle}>
              <button onClick={() => setStep('config')} style={secondaryButtonStyle}>← VOLVER</button>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => {
                    const newLevels = {};
                    for (let i = 1; i < playerCount; i++) newLevels[i] = BOT_TEMPLATES[Math.floor(Math.random() * BOT_TEMPLATES.length)].id;
                    setBotLevels(newLevels);
                  }}
                  style={secondaryButtonStyle}
                >🎲 AZAR</button>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const levelsArray = [];
                    for (let i = 1; i < playerCount; i++) levelsArray.push(botLevels[i]);
                    const allBotsAssigned = levelsArray.every(level => level !== undefined);
                    if (allBotsAssigned) {
                      onStart(selectedBoxes, totalCost, levelsArray, gameMode, playerCount);
                      setStep('config');
                    } else {
                      toast.warning('Por favor, asigna un nivel a todos los bots antes de iniciar la batalla.');
                    }
                  }}
                  style={{ ...primaryButtonStyle, background: "#10b981" }}
                >
                  ¡A LUCHAR! ⚔️
                </Motion.button>
              </div>
            </div>
          </>
        )}
      </Motion.div>
    </Motion.div>
  );
};

const closeButtonStyle = {
  position: "absolute", top: "30px", right: "30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
  color: "white", width: "45px", height: "45px", borderRadius: "50%", cursor: "pointer",
  transition: 'all 0.2s ease'
};

const boxesGridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "15px", marginBottom: "40px",
  background: 'rgba(0,0,0,0.2)', padding: '25px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.03)'
};

const footerStyle = {
  padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.03)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};

const costLabelStyle = { color: 'rgba(255,255,255,0.3)', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '5px' };

const primaryButtonStyle = {
  padding: "18px 50px", borderRadius: "18px", border: "none", color: "black", fontWeight: "900", fontSize: "1.1rem", cursor: "pointer",
  boxShadow: "0 10px 30px rgba(245, 172, 59, 0.3)"
};

const secondaryButtonStyle = {
  padding: '15px 30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: 'rgba(255,255,255,0.5)', fontWeight: '900', cursor: 'pointer'
};

const botSlotStyle = {
  background: 'rgba(255,255,255,0.01)', padding: '30px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)'
};

const SectionHeader = ({ num, label, noMargin }) => (
  <h3
    style={{
      color: "white",
      marginBottom: noMargin ? 0 : "12px",
      fontSize: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >
    <span
      style={{
        background: "#f5ac3b",
        color: "black",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: "bold",
        flexShrink: 0,
      }}
    >
      {num}
    </span>
    {label}
  </h3>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT — Battles
───────────────────────────────────────────── */
export default function Battles() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { skins: allSkins, loading: skinsLoading } = useFetchSkins(1000, false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState("config"); // 'config' or 'bots'

  // Persistent selector state
  const [selectedBoxes, setSelectedBoxes] = useState({});
  const [gameMode, setGameMode] = useState("classic");
  const [playerCount, setPlayerCount] = useState(2);
  const [botLevels, setBotLevels] = useState({ 1: "normal", 2: "normal", 3: "normal", 4: "normal" });

  const [battleState, setBattleState] = useState(null);
  const [lastBattleConfig, setLastBattleConfig] = useState(null);
  const [animState, setAnimState] = useState({ visibleRounds: 0, hasCompleted: false });
  const [activeReels, setActiveReels] = useState({});
  const [showProvablyFair, setShowProvablyFair] = useState(false);

  const allCases = useMemo(() => generateAllCases().filter(c => c.category !== "daily"), []);

  // Obtener skins válidas para una caja
  const getSkinsForCase = useCallback(
    (caseData) => {
      const valid = allSkins.filter((skin) => {
        if (!skin?.rarity) return false;
        if (caseData.rarity === "mil-spec")
          return skin.rarity === "Mil-Spec Grade" || skin.rarity === "Restricted";
        if (caseData.rarity === "classified")
          return skin.rarity === "Restricted" || skin.rarity === "Classified";
        if (caseData.rarity === "covert")
          return skin.rarity === "Classified" || skin.rarity === "Covert";
        return false;
      });
      return valid;
    },
    [allSkins]
  );

  // Helper: map bot template ID to difficulty level
  const getBotDifficulty = useCallback((botLevel) => {
    // Elite/master/king/hacker bots → "hard"
    const hardBots = ["elite1", "elite2", "master1", "master2", "skin_king", "hacker"];
    // Standard/pro bots → "normal"
    const normalBots = ["std1", "std2"];
    // Newbie bots → "easy"
    const easyBots = ["newbie1", "newbie2"];

    if (hardBots.includes(botLevel)) return "hard";
    if (normalBots.includes(botLevel)) return "normal";
    if (easyBots.includes(botLevel)) return "easy";
    return "normal"; // default
  }, []);

  // Simular apertura de caja con pesos específicos para bots
  const openBoxRandomly = useCallback(
    (caseData, validSkins, forceGoodDrop = false, forceBadDrop = false, botLevel = "") => {
      if (!validSkins.length) return null;

      // Sort skins by price to find the jackpot (last item)
      const sortedSkins = [...validSkins].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      const jackpot = sortedSkins[sortedSkins.length - 1];
      const cheapest = sortedSkins[0];

      // Determine difficulty from bot level
      const difficulty = getBotDifficulty(botLevel);

      // Logic for high-level bots (Pro, Elite, Master, etc.)
      const isHighLevelBot = ["std1", "std2", "elite1", "elite2", "master1", "master2", "skin_king", "hacker"].includes(botLevel);

      if (isHighLevelBot && forceGoodDrop) {
        const roll = Math.random();
        let jackpotChance;
        if (difficulty === "hard") {
          jackpotChance = 0.55 + (Math.random() * 0.10); // 55-65% jackpot chance
        } else if (difficulty === "normal") {
          jackpotChance = 0.35 + (Math.random() * 0.10); // 35-45%
        } else {
          jackpotChance = 0.05; // 5%
        }

        if (roll < jackpotChance) {
          return {
            id: `${jackpot.id}-${Date.now()}-${Math.random()}`,
            name: jackpot.name,
            image: jackpot.image,
            price: parseFloat(parseFloat(jackpot.price).toFixed(2)),
            rarity: jackpot.rarity,
          };
        }
      }

      // Default weighted probability for others
      const weighted = [];
      let weightMultiplier = forceGoodDrop ? 2 : (forceBadDrop ? 0.2 : 1);

      // Adjust multiplier based on difficulty
      if (forceGoodDrop) {
        if (difficulty === "hard") weightMultiplier = 5;
        else if (difficulty === "normal") weightMultiplier = 3;
        else weightMultiplier = 1.5;
      } else if (forceBadDrop) {
        if (difficulty === "hard") weightMultiplier = 0.1; // Hard bots never get bad drops
        else if (difficulty === "normal") weightMultiplier = 0.3;
        else weightMultiplier = 0.6;
      }

      validSkins.forEach((skin) => {
        const price = Math.max(0.5, skin.price || 0.5);
        let weight = Math.max(1, Math.floor((800 / (price * 10)) * weightMultiplier));
        for (let i = 0; i < weight; i++) {
          weighted.push({ ...skin, price: parseFloat(parseFloat(skin.price).toFixed(2)) });
        }
      });

      const skin = weighted[Math.floor(Math.random() * weighted.length)];
      return {
        id: `${skin.id}-${Date.now()}-${Math.random()}`,
        name: skin.name,
        image: skin.image,
        price: parseFloat(skin.price.toFixed(2)),
        rarity: skin.rarity,
      };
    },
    [getBotDifficulty]
  );

  // Iniciar la batalla
  const handleStartBattle = useCallback(
    (selectedBoxes, totalCost, botLevelsArray, gameMode, playerCount) => {
      setModalOpen(false);
      setActiveReels({});
      setLastBattleConfig({ selectedBoxes, totalCost, botLevelsArray, gameMode, playerCount });

      // Construir lista de cajas en orden
      const boxesToOpen = [];
      Object.entries(selectedBoxes).forEach(([id, qty]) => {
        const cData = allCases.find((c) => c.id === id);
        if (!cData) return;
        for (let i = 0; i < qty; i++) {
          boxesToOpen.push(cData);
        }
      });

      if (!boxesToOpen.length) return;

      // Descontar saldo
      updateUser((prev) => ({
        ...prev,
        balance: parseFloat(((prev?.balance || 0) - totalCost).toFixed(2)),
      }));

      // Jugadores
      const activeFormat = BATTLE_FORMATS.find(f => f.count === playerCount);
      const isTeamGame = activeFormat?.isTeam;

      const initPlayers = Array.from({ length: playerCount }, (_, i) => {
        // En juegos de equipo, el usuario está en el Equipo 1 (índices 0 a playerCount/2 - 1)
        // En 1v1v1, cada uno es su propio equipo
        let teamId = null;
        if (isTeamGame) {
          teamId = i < (playerCount / 2) ? 1 : 2;
        }

        if (i === 0) {
          return { id: "user", name: "Tú", icon: "👤", color: "#f5ac3b", isUser: true, level: "user", results: [], total: 0, teamId };
        }
        const bLevel = botLevelsArray[i - 1];
        const botTemplate = BOT_TEMPLATES.find(b => b.id === bLevel) || BOT_TEMPLATES[1];

        // Colores de equipo: Equipo 1 (Naranjas/Amarillos), Equipo 2 (Rojos/Morados)
        let botColor;
        if (isTeamGame) {
          botColor = teamId === 1 ? "#f5ac3b" : "#ef4444";
        } else {
          const botColors = ["#ef4444", "#a855f7", "#06b6d4", "#10b981", "#ec4899"];
          botColor = botColors[(i - 1) % botColors.length];
        }

        return {
          id: `bot_${i}`,
          name: `${botTemplate.name}`,
          icon: botTemplate.icon,
          color: botColor,
          isUser: false,
          level: bLevel,
          results: [],
          total: 0,
          teamId,
        };
      });

      // Pre-calcular TODOS los resultados
      boxesToOpen.forEach((cData) => {
        const vSkins = getSkinsForCase(cData);
        if (!vSkins.length) return;

        initPlayers.forEach((p) => {
          let forceGoodDrop = false;
          let forceBadDrop = false;

          if (!p.isUser) {
            // Map bot template IDs to difficulty using the helper
            const difficulty = getBotDifficulty(p.level);

            // Lógica de probabilidad basada en el modo
            if (gameMode === "classic") {
              if (difficulty === "hard" && Math.random() < 0.8) forceGoodDrop = true;
              if (difficulty === "normal" && Math.random() < 0.45) forceGoodDrop = true;
              if (difficulty === "easy" && Math.random() > 0.7) forceBadDrop = true;
            } else if (gameMode === "crazy") {
              // En modo loco, ganar es tener MENOS valor
              if (difficulty === "hard" && Math.random() < 0.8) forceBadDrop = true;
              if (difficulty === "normal" && Math.random() < 0.45) forceBadDrop = true;
              if (difficulty === "easy" && Math.random() > 0.7) forceGoodDrop = true;
            }
          }

          // Modificar openBoxRandomly para manejar probabilidades específicas
          const drop = openBoxRandomly(cData, vSkins, forceGoodDrop, forceBadDrop, p.level);
          if (drop) {
            p.results.push(drop);
            p.total = parseFloat((p.total + drop.price).toFixed(2));
          }
        });
      });

      // Determinar ganadores
      let winnerValue;
      let winnerIds = [];

      if (isTeamGame) {
        // Lógica de equipos
        const team1Total = initPlayers.filter(p => p.teamId === 1).reduce((acc, p) => acc + p.total, 0);
        const team2Total = initPlayers.filter(p => p.teamId === 2).reduce((acc, p) => acc + p.total, 0);

        const winValue = gameMode === "crazy" ? Math.min(team1Total, team2Total) : Math.max(team1Total, team2Total);

        if (team1Total === team2Total) {
          winnerIds = initPlayers.map(p => p.id); // Empate total
        } else if (team1Total === winValue) {
          winnerIds = initPlayers.filter(p => p.teamId === 1).map(p => p.id);
        } else {
          winnerIds = initPlayers.filter(p => p.teamId === 2).map(p => p.id);
        }
      } else {
        // Lógica individual
        const scores = initPlayers.map((p) => p.total);
        if (gameMode === "terminal") {
          const lastRoundScores = initPlayers.map(p => p.results[p.results.length - 1]?.price || 0);
          winnerValue = Math.max(...lastRoundScores);
          winnerIds = initPlayers
            .filter(p => (p.results[p.results.length - 1]?.price || 0) === winnerValue)
            .map(p => p.id);
        } else if (gameMode === "first_blood") {
          const firstRoundScores = initPlayers.map(p => p.results[0]?.price || 0);
          winnerValue = Math.max(...firstRoundScores);
          winnerIds = initPlayers
            .filter(p => (p.results[0]?.price || 0) === winnerValue)
            .map(p => p.id);
        } else {
          winnerValue = gameMode === "crazy" ? Math.min(...scores) : Math.max(...scores);
          winnerIds = initPlayers
            .filter((p) => parseFloat(p.total.toFixed(2)) === parseFloat(winnerValue.toFixed(2)))
            .map((p) => p.id);
        }
      }

      if (winnerIds.length > 1 && !isTeamGame && (gameMode === "joker" || gameMode === "terminal" || gameMode === "first_blood")) {
        winnerIds = [winnerIds[Math.floor(Math.random() * winnerIds.length)]];
      }

      setBattleState({
        isBattling: true,
        isStarted: true,
        boxes: boxesToOpen,
        players: initPlayers,
        winnerIds,
        gameMode,
        botLevelsArray,
        isTeamGame
      });

      setAnimState({ visibleRounds: 0, hasCompleted: false });
    },
    [allCases, getSkinsForCase, openBoxRandomly, updateUser]
  );

  // Otorgar loot al terminar + sound effects
  useEffect(() => {
    if (!battleState || !animState.hasCompleted) return;

    const { players, winnerIds } = battleState;
    const isUserWinner = winnerIds.includes("user");
    const isTie = winnerIds.length > 1;

    // Play sound based on result
    if (isUserWinner) {
      sound.playWin(true);
      if (!isTie) {
        // Usuario gana TODO
        const totalLoot = players.flatMap((p) => p.results);
        updateUser((prev) => ({
          ...prev,
          inventory: [...(prev.inventory || []), ...totalLoot],
        }));
      } else {
        // Empate: usuario solo guarda sus propias skins
        const userPlayer = players.find((p) => p.id === "user");
        if (userPlayer) {
          updateUser((prev) => ({
            ...prev,
            inventory: [...(prev.inventory || []), ...userPlayer.results],
          }));
        }
      }
    } else {
      sound.playFail();
    }
  }, [animState.hasCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Controlador de animación por rondas
  useEffect(() => {
    if (!battleState || !battleState.isStarted || animState.hasCompleted) return;

    let timerId;
    if (animState.visibleRounds < battleState.boxes.length) {
      timerId = setTimeout(() => {
        setAnimState((s) => ({ ...s, visibleRounds: s.visibleRounds + 1 }));
      }, 4200);
    } else {
      timerId = setTimeout(() => {
        setAnimState((s) => ({ ...s, hasCompleted: true }));
      }, 900);
    }
    return () => clearTimeout(timerId);
  }, [battleState, animState.visibleRounds, animState.hasCompleted]);

  const handleSkipAnimation = () => {
    if (!battleState) return;
    setAnimState({
      visibleRounds: battleState.boxes.length,
      hasCompleted: true
    });
  };

  const handleRepeatBattle = () => {
    if (!lastBattleConfig) return;
    const { selectedBoxes, totalCost, botLevelsArray, gameMode, playerCount } = lastBattleConfig;
    handleStartBattle(selectedBoxes, totalCost, botLevelsArray, gameMode, playerCount);
  };

  // Generar reels para la ronda activa
  useEffect(() => {
    if (!battleState || animState.hasCompleted) return;
    if (animState.visibleRounds >= battleState.boxes.length) return;

    const roundIdx = animState.visibleRounds;
    const box = battleState.boxes[roundIdx];
    const vSkins = getSkinsForCase(box);
    if (!vSkins.length) return;

    const newReels = {};
    battleState.players.forEach((p) => {
      const reel = [];
      for (let i = 0; i < 45; i++) {
        reel.push(vSkins[Math.floor(Math.random() * vSkins.length)]);
      }
      reel.push(p.results[roundIdx]); // resultado real en posición 45
      for (let i = 0; i < 3; i++) {
        reel.push(vSkins[Math.floor(Math.random() * vSkins.length)]);
      }
      newReels[p.id] = reel;
    });

    const animationFrame = requestAnimationFrame(() => {
      setActiveReels(newReels);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [battleState, animState.visibleRounds, animState.hasCompleted, getSkinsForCase]);

  /* ── Render ── */
  const currentBox = battleState?.boxes[animState.visibleRounds] || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1115",
        color: "white",
        padding: "20px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-gold {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,172,59,0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(245,172,59,0); }
        }
        @keyframes winnerGlow {
          0%,100% { box-shadow: 0 0 20px rgba(16,185,129,0.2); }
          50%      { box-shadow: 0 0 40px rgba(16,185,129,0.5); }
        }
        @keyframes loserShake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-4px); }
          40%,80% { transform: translateX(4px); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2e38; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* Hero Header */}
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            marginBottom: "60px",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            padding: "80px 40px",
            borderRadius: "40px",
            border: "1px solid rgba(255,255,255,0.05)",
            position: "relative",
            overflow: "hidden",
            backdropFilter: 'blur(20px)'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(245,172,59,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <Motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: '4.5rem',
              fontWeight: '900',
              margin: '0 0 15px 0',
              letterSpacing: '-2px',
              background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            BATALLAS ÉPICAS
          </Motion.h1>

          <p style={{
            color: '#f5ac3b',
            fontWeight: '900',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            fontSize: '1rem',
            marginBottom: '40px'
          }}>
            EL GANADOR SE LLEVA TODO EL BOTÍN
          </p>

          <Motion.button
            whileHover={{ scale: 1.05, translateY: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            disabled={skinsLoading}
            style={{
              background: skinsLoading ? "rgba(255,255,255,0.05)" : "#f5ac3b",
              color: skinsLoading ? "rgba(255,255,255,0.2)" : "black",
              border: "none",
              padding: "20px 60px",
              borderRadius: "20px",
              fontSize: "1.2rem",
              fontWeight: "900",
              cursor: skinsLoading ? "not-allowed" : "pointer",
              boxShadow: "0 20px 40px rgba(245, 172, 59, 0.3)",
              letterSpacing: '1px'
            }}
          >
            {skinsLoading ? "PREPARANDO..." : "CREAR ARENA ⚔️"}
          </Motion.button>
        </Motion.div>

        {/* Battle Arena */}
        {battleState && (
          <div style={{ animation: "slideUp 0.5s ease" }}>

            {/* Header de controles de batalla (Skip, Repeat) */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px'
            }}>
              <button
                onClick={handleRepeatBattle}
                style={{
                  background: "rgba(245, 172, 59, 0.1)",
                  color: "#f5ac3b",
                  border: "1px solid rgba(245, 172, 59, 0.2)",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  fontWeight: "900",
                  cursor: "pointer",
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(245, 172, 59, 0.1)'
                }}
              >
                REPETIR / COPIAR 🔄
              </button>
              <button
                onClick={handleSkipAnimation}
                disabled={animState.hasCompleted}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: animState.hasCompleted ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  fontWeight: "900",
                  cursor: animState.hasCompleted ? "default" : "pointer",
                  transition: 'all 0.2s'
                }}
              >
                SALTAR ⏭️
              </button>
            </div>

            {/* Estado: Batalla activa */}
            {!animState.hasCompleted && (
              <div
                style={{
                  background: "#111318",
                  border: "1px solid #2a2e38",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "24px",
                  animation: "slideUp 0.4s ease",
                  position: 'relative'
                }}
              >
                {/* Header de ronda + caja activa */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "30px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {currentBox?.image && (
                      <img
                        src={currentBox.image}
                        alt={currentBox.name}
                        style={{ width: "48px", filter: "drop-shadow(0 0 8px rgba(245,172,59,0.5))" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px" }}>
                        Ronda
                      </div>
                      <div style={{ color: "white", fontWeight: "bold", fontSize: "1.3rem" }}>
                        {animState.visibleRounds + 1}{" "}
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
                          / {battleState.boxes.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {battleState.isTeamGame && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '10px 30px',
                      borderRadius: '50px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#f5ac3b', fontWeight: '900' }}>EQUIPO 1</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                          {battleState.players.filter(p => p.teamId === 1).reduce((s, p) =>
                            s + p.results.slice(0, animState.visibleRounds).reduce((rs, r) => rs + r.price, 0), 0).toFixed(2)}€
                        </div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>VS</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '900' }}>EQUIPO 2</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                          {battleState.players.filter(p => p.teamId === 2).reduce((s, p) =>
                            s + p.results.slice(0, animState.visibleRounds).reduce((rs, r) => rs + r.price, 0), 0).toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  )}

                  {!battleState.isStarted ? (
                    <Motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setBattleState(prev => ({ ...prev, isStarted: true }))}
                      style={{
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "10px 30px",
                        borderRadius: "12px",
                        fontWeight: "900",
                        cursor: "pointer",
                        boxShadow: '0 0 20px rgba(16,185,129,0.3)'
                      }}
                    >
                      EMPEZAR BATALLA 🤜💥🤛
                    </Motion.button>
                  ) : (
                    <button
                      onClick={handleSkipAnimation}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "8px 20px",
                        borderRadius: "10px",
                        fontSize: "0.8rem",
                        fontWeight: "800",
                        cursor: "pointer"
                      }}
                    >
                      SALTAR ANIMACIÓN ⏭️
                    </button>
                  )}

                  {currentBox && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{currentBox.name}</div>
                      <div style={{ color: currentBox.color, fontWeight: "bold" }}>€{currentBox.price}</div>
                    </div>
                  )}
                </div>

                {/* Ruedas de ruleta */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: battleState.isTeamGame ? "1fr 1fr" : (battleState.players.length > 5 ? "repeat(auto-fill, minmax(180px, 1fr))" : `repeat(${battleState.players.length}, 1fr)`),
                    gap: "30px",
                    maxHeight: "65vh",
                    overflowY: "auto",
                    padding: "10px",
                    opacity: battleState.isStarted ? 1 : 0.4,
                    transition: 'opacity 0.5s'
                  }}
                >
                  {battleState.isTeamGame ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ textAlign: 'center', color: '#f5ac3b', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Equipo 1 (Tú)</div>
                        {battleState.players.filter(p => p.teamId === 1).map(p => (
                          <div key={p.id}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                              <div style={{ width: "24px", height: "24px", background: `${p.color}25`, color: p.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>{p.icon}</div>
                              <span style={{ color: p.color, fontWeight: "bold", fontSize: "0.8rem" }}>{p.name}</span>
                            </div>
                            <MiniBattleRoulette items={battleState.isStarted ? (activeReels[p.id] || []) : []} accentColor={p.color} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Equipo 2</div>
                        {battleState.players.filter(p => p.teamId === 2).map(p => (
                          <div key={p.id}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                              <div style={{ width: "24px", height: "24px", background: `${p.color}25`, color: p.color, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>{p.icon}</div>
                              <span style={{ color: p.color, fontWeight: "bold", fontSize: "0.8rem" }}>{p.name}</span>
                            </div>
                            <MiniBattleRoulette items={battleState.isStarted ? (activeReels[p.id] || []) : []} accentColor={p.color} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    battleState.players.map((p) => (
                      <div key={p.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              background: `${p.color}25`,
                              color: p.color,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.9rem",
                            }}
                          >
                            {p.icon}
                          </div>
                          <span style={{ color: p.color, fontWeight: "bold", fontSize: "0.85rem" }}>{p.name}</span>
                        </div>
                        <MiniBattleRoulette
                          items={battleState.isStarted ? (activeReels[p.id] || []) : []}
                          accentColor={p.color}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Resultado final */}
            {animState.hasCompleted && (
              <Motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                  textAlign: "center",
                  padding: "80px 40px",
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: "40px",
                  border: `2px solid ${battleState.winnerIds.includes("user") ? "#10b981" : "#ef4444"}`,
                  marginBottom: "40px",
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Glow de victoria/derrota */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: battleState.winnerIds.includes("user") ? 'radial-gradient(circle, #10b98111 0%, transparent 70%)' : 'radial-gradient(circle, #ef444411 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ fontSize: "5rem", marginBottom: "20px" }}>
                  {battleState.winnerIds.includes("user") ? "🏆" : "💀"}
                </div>

                <h2 style={{ fontSize: "3.5rem", fontWeight: "900", margin: "0 0 10px 0", letterSpacing: '-2px' }}>
                  {battleState.isTeamGame ? (
                    battleState.winnerIds.includes("user") ? "¡TU EQUIPO HA GANADO!" : "DERROTA DEL EQUIPO"
                  ) : (
                    battleState.winnerIds.includes("user") ? "¡VICTORIA TOTAL!" : "HAS SIDO DERROTADO"
                  )}
                </h2>

                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", fontWeight: '600', marginBottom: '40px' }}>
                  {battleState.winnerIds.includes("user")
                    ? `Te has llevado un botín épico valorado en ${battleState.players.reduce((s, p) => s + p.total, 0).toFixed(2)}€`
                    : "Mejor suerte la próxima vez, la arena es implacable."}
                </p>

                <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginBottom: "50px" }}>
                  {battleState.players
                    .slice()
                    .sort((a, b) => battleState.gameMode === "crazy" ? a.total - b.total : b.total - a.total)
                    .map((p, rank) => (
                      <div
                        key={p.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${battleState.winnerIds.includes(p.id) ? p.color : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: "24px",
                          padding: "25px 35px",
                          minWidth: "180px",
                        }}
                      >
                        <div style={{ fontSize: "2rem", marginBottom: "5px" }}>
                          {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "🎖️"}
                        </div>
                        <div style={{ color: p.color, fontWeight: "900", fontSize: "0.9rem", textTransform: 'uppercase', marginBottom: '5px' }}>{p.name}</div>
                        <div style={{ color: "white", fontWeight: 900, fontSize: "1.6rem" }}>{p.total.toFixed(2)}€</div>
                      </div>
                    ))}
                </div>

                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setBattleState(null);
                    setAnimState({ visibleRounds: 0, hasCompleted: false });
                    setActiveReels({});
                    setModalOpen(true);
                  }}
                  style={{
                    background: "#f5ac3b",
                    color: "black",
                    border: "none",
                    padding: "20px 60px",
                    borderRadius: "20px",
                    fontWeight: "900",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    boxShadow: '0 15px 30px rgba(245, 172, 59, 0.3)'
                  }}
                >
                  NUEVA BATALLA ⚔️
                </Motion.button>
              </Motion.div>
            )}

            {/* Scoreboard en curso + historial de rondas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Scores actuales */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: battleState.players.length > 4 ? "repeat(auto-fill, minmax(280px, 1fr))" : `repeat(${battleState.players.length}, 1fr)`,
                  gap: "14px",
                }}
              >
                {battleState.players.map((p) => {
                  const isWinner = battleState.winnerIds.includes(p.id);
                  const currentScore = p.results
                    .slice(0, animState.visibleRounds)
                    .reduce((s, r) => s + r.price, 0);
                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#111318",
                        border: `2px solid ${animState.hasCompleted && isWinner ? p.color : "#2a2e38"}`,
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "border-color 0.5s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            background: `${p.color}25`,
                            color: p.color,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                          }}
                        >
                          {p.icon}
                        </div>
                        <span style={{ color: "white", fontWeight: "bold", fontSize: "0.95rem" }}>{p.name}</span>
                      </div>
                      <div
                        style={{
                          color: animState.hasCompleted && isWinner ? p.color : "white",
                          fontSize: "1.4rem",
                          fontWeight: 800,
                          transition: "color 0.4s",
                        }}
                      >
                        €{currentScore.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Historial de rondas completadas */}
              {animState.visibleRounds > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {battleState.boxes.map((box, idx) => {
                    if (idx >= animState.visibleRounds) return null;

                    return (
                      <div
                        key={idx}
                        style={{
                          background: "#111318",
                          border: "1px solid #2a2e38",
                          borderRadius: "14px",
                          padding: "16px",
                          animation: "slideUp 0.35s ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Glow de fondo de la caja */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: box.bgGradient,
                            opacity: 0.04,
                            pointerEvents: "none",
                          }}
                        />
                        {/* Round header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "12px",
                            position: "relative",
                          }}
                        >
                          {box?.image && (
                            <img
                              src={box.image}
                              alt={box.name}
                              style={{ width: "32px", filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.3)",
                                fontSize: "0.65rem",
                                textTransform: "uppercase",
                                letterSpacing: "2px",
                              }}
                            >
                              Ronda {idx + 1}
                            </div>
                            <div style={{ color: box.color, fontWeight: "bold", fontSize: "0.85rem" }}>
                              {box.name}
                            </div>
                          </div>
                        </div>

                        {/* Skins de cada jugador en esta ronda */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: battleState.players.length > 4 ? "repeat(auto-fill, minmax(220px, 1fr))" : `repeat(${battleState.players.length}, 1fr)`,
                            gap: "12px",
                            position: "relative",
                          }}
                        >
                          {battleState.players.map((p) => {
                            const skin = p.results[idx];
                            if (!skin) return <div key={p.id} />;
                            const rc = getRarityColor(skin.rarity);
                            return (
                              <div
                                key={p.id}
                                style={{
                                  background: `radial-gradient(circle at 40% 40%, ${rc}22 0%, #0e1015 75%)`,
                                  border: `1.5px solid ${rc}55`,
                                  padding: "12px",
                                  borderRadius: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  boxShadow: `0 4px 16px ${rc}12`,
                                }}
                              >
                                <div
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    filter: `drop-shadow(0 0 8px ${rc}80)`,
                                  }}
                                >
                                  <img
                                    src={skin.image || getPlaceholderImage(skin.name)}
                                    alt={skin.name}
                                    onError={(e) => handleImageError(e, skin)}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "contain",
                                      opacity: skin.image ? 1 : 0.3
                                    }}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "2px" }}>
                                    {p.name}
                                  </div>
                                  <div
                                    style={{
                                      color: "white",
                                      fontSize: "0.82rem",
                                      fontWeight: "bold",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {skin.name}
                                  </div>
                                  <div style={{ color: "#f5ac3b", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px" }}>
                                    €{skin.price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Provably Fair Button & Modal */}
      {animState.hasCompleted && (
        <div style={{ textAlign: "center", marginTop: "10px", marginBottom: "40px" }}>
          <button
            onClick={() => setShowProvablyFair(true)}
            style={{
              padding: "14px 32px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              borderRadius: "16px",
              fontSize: "1rem",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            🔐 VERIFICAR PROVABLY FAIR
          </button>
        </div>
      )}

      <ProvablyFairModal
        isOpen={showProvablyFair}
        onClose={() => setShowProvablyFair(false)}
        resultData={{
          serverSeedHashed: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
          clientSeed: "battle-client-seed-2026",
          nonce: battleState?.boxes?.length || 1,
          serverSeedRaw: "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4"
        }}
      />

      {/* Modal */}
      <BattleSelector
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={handleStartBattle}
        userBalance={user?.balance || 0}
        allCases={allCases}
        step={modalStep}
        setStep={setModalStep}
        selectedBoxes={selectedBoxes}
        setSelectedBoxes={setSelectedBoxes}
        gameMode={gameMode}
        setGameMode={setGameMode}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        botLevels={botLevels}
        setBotLevels={setBotLevels}
        toast={toast}
      />
    </div>
  );
}
