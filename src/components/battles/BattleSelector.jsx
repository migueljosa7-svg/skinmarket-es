// src/components/battles/BattleSelector.jsx
// Battle configuration modal (format, game mode, boxes, bots).
// Extracted from Battles.jsx (PHASE 6.2 refactor).
import { useState, useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { FiLock, FiUnlock, FiCopy, FiCheck, FiPercent, FiLink } from "react-icons/fi";
import { BOT_TEMPLATES, GAME_MODES, BATTLE_FORMATS } from "./battleConfig";
import { closeButtonStyle, boxesGridStyle, footerStyle, costLabelStyle, primaryButtonStyle, secondaryButtonStyle, botSlotStyle } from "./battleStyles";
import BoxCard from "./BoxCard";
import SectionHeader from "./SectionHeader";

const BattleSelector = ({
  open, onClose, onStart, userBalance, allCases,
  step, setStep,
  selectedBoxes, setSelectedBoxes,
  gameMode, setGameMode,
  playerCount, setPlayerCount,
  botLevels, setBotLevels,
  toast,
  isPrivate, setIsPrivate,
  loanPercent, setLoanPercent,
  inviteCode, setInviteCode
}) => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-asc");
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const totalCost = useMemo(() => {
    return Object.entries(selectedBoxes).reduce((acc, [id, qty]) => {
      const cData = allCases.find((c) => c.id === id);
      return acc + (parseFloat(cData?.price || 0) * qty);
    }, 0);
  }, [selectedBoxes, allCases]);

  // In private mode with loan, the creator pays entry + loan percentage of opponent's entry
  const loanMultiplier = loanPercent / 100;
  const opponentCost = totalCost * (playerCount - 1);
  const creatorLoanCost = loanPercent > 0 ? opponentCost * loanMultiplier : 0;
  const effectiveTotalCost = isPrivate ? totalCost + creatorLoanCost : totalCost;

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

  const canAfford = totalCost > 0 && effectiveTotalCost <= userBalance;

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

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const togglePrivate = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    if (next && !inviteCode) {
      setInviteCode(generateInviteCode());
    }
  };

  const copyInvite = () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/battles?invite=${inviteCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

            {/* Private Battle Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isPrivate ? 'rgba(245,172,59,0.06)' : 'rgba(255,255,255,0.02)',
              border: isPrivate ? '1px solid rgba(245,172,59,0.25)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: '20px',
              padding: '18px 24px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '14px',
                  background: isPrivate ? 'rgba(245,172,59,0.15)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {isPrivate ? <FiLock color="#f5ac3b" /> : <FiUnlock color="rgba(255,255,255,0.4)" />}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: '900', fontSize: '1rem' }}>
                    Batalla Privada
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Solo accesible por invitación con enlace
                  </div>
                </div>
              </div>
              <button
                onClick={togglePrivate}
                style={{
                  padding: '10px 22px',
                  borderRadius: '14px',
                  border: isPrivate ? '1px solid rgba(245,172,59,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  background: isPrivate ? 'rgba(245,172,59,0.12)' : 'rgba(255,255,255,0.04)',
                  color: isPrivate ? '#f5ac3b' : 'rgba(255,255,255,0.6)',
                  fontWeight: '900',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {isPrivate ? 'PRIVADA ACTIVADA' : 'ACTIVAR PRIVADA'}
              </button>
            </div>

            {isPrivate && (
              <div style={{
                background: 'rgba(245,172,59,0.04)',
                border: '1px solid rgba(245,172,59,0.15)',
                borderRadius: '20px',
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Código de Invitación
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: '900',
                        color: '#f5ac3b', letterSpacing: '3px'
                      }}>
                        {inviteCode || '—'}
                      </span>
                      <button
                        onClick={copyInvite}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '10px',
                          background: 'rgba(245,172,59,0.1)', border: '1px solid rgba(245,172,59,0.25)',
                          color: '#f5ac3b', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        {copied ? <FiCheck /> : <FiCopy />}
                        {copied ? 'COPIADO' : 'COPIAR'}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', maxWidth: '280px', lineHeight: '1.5' }}>
                    Comparte el enlace de invitación para que otros jugadores se unan a tu batalla privada.
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                  borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiPercent color="#f5ac3b" />
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '0.9rem' }}>Préstamo de entrada</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                    {[0, 10, 25, 50, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setLoanPercent(pct)}
                        style={{
                          padding: '8px 16px', borderRadius: '10px',
                          background: loanPercent === pct ? 'rgba(245,172,59,0.15)' : 'rgba(255,255,255,0.03)',
                          border: loanPercent === pct ? '1px solid #f5ac3b' : '1px solid rgba(255,255,255,0.08)',
                          color: loanPercent === pct ? '#f5ac3b' : 'rgba(255,255,255,0.5)',
                          fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >
                        {pct === 0 ? 'Sin préstamo' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {loanPercent > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px 16px' }}>
                    <FiLink style={{ marginRight: '8px', verticalAlign: 'middle' }} color="#f5ac3b" />
                    Pagarás el {loanPercent}% de la entrada de tus rivales: <b style={{ color: '#f5ac3b' }}>{creatorLoanCost.toFixed(2)}€</b> adicionales (coste total: <b style={{ color: '#f5ac3b' }}>{effectiveTotalCost.toFixed(2)}€</b>)
                  </div>
                )}
              </div>
            )}

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
                <div style={costLabelStyle}>{isPrivate ? 'Costo Total (Entrada + Préstamo)' : 'Costo de Entrada'}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: canAfford ? '#f5ac3b' : '#ef4444' }}>{effectiveTotalCost.toFixed(2)}€</div>
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

export default BattleSelector;