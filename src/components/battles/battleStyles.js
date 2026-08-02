// src/components/battles/battleStyles.js
// Shared style constants for battle components.
// Extracted from Battles.jsx (PHASE 6.2 refactor).

export const closeButtonStyle = {
  position: "absolute", top: "30px", right: "30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
  color: "white", width: "45px", height: "45px", borderRadius: "50%", cursor: "pointer",
  transition: 'all 0.2s ease'
};

export const boxesGridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "15px", marginBottom: "40px",
  background: 'rgba(0,0,0,0.2)', padding: '25px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.03)'
};

export const footerStyle = {
  padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.03)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};

export const costLabelStyle = { color: 'rgba(255,255,255,0.3)', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '5px' };

export const primaryButtonStyle = {
  padding: "18px 50px", borderRadius: "18px", border: "none", color: "black", fontWeight: "900", fontSize: "1.1rem", cursor: "pointer",
  boxShadow: "0 10px 30px rgba(245, 172, 59, 0.3)"
};

export const secondaryButtonStyle = {
  padding: '15px 30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: 'rgba(255,255,255,0.5)', fontWeight: '900', cursor: 'pointer'
};

export const botSlotStyle = {
  background: 'rgba(255,255,255,0.01)', padding: '30px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)'
};