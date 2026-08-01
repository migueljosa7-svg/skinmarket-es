// ─── NavBar.jsx ───────────────────────────────────────────────────
// NAVBAR RESPONSIVO — CSS puro / Inline Styles
// Desktop (≥1024px): Logo izquierda → menú central → saldo+iconos+mute+salir derecha
// Móvil (<1024px): Logo izquierda → saldo compacto → ☰ → drawer lateral ordenado
// ───────────────────────────────────────────────────────────────────────

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useState } from "react";
import { FaTrophy, FaShoppingBag, FaUser, FaSignOutAlt, FaPlus, FaBars, FaTimes, FaVolumeUp, FaVolumeMute, FaRocket } from "react-icons/fa";
import { GiTwoCoins, GiLevelFour } from "react-icons/gi";
import RechargeModal from "./RechargeModal";
import LevelProgressBar from "./LevelProgressBar";
import { sound } from "../utils/audio";

const NAV_ITEMS = [
  { to: "/cases", label: "CAJAS" },
  { to: "/upgrade", label: "UPGRADE" },
  { to: "/contracts", label: "CONTRATOS" },
  { to: "/battles", label: "BATALLAS" },
  { to: "/airdrop", label: "AIRDROP" },
  { to: "/ranking", label: "RANKING" },
];

const ICON_LINKS = [
  { to: "/ranking", icon: FaTrophy, label: "Ranking" },
  { to: "/inventory", icon: FaShoppingBag, label: "Inventario" },
  { to: "/dashboard", icon: FaUser, label: "Perfil" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sound.muted);

  const handleLogout = () => {
    logout();
  };

  const handleToggleMute = () => {
    sound.init();
    const newState = sound.toggleMute();
    setIsMuted(!newState);
  };

  // ─── Inline Style Objects ──────────────────────────────────────────
  const navStyle = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: "64px",
    background: "#0c0d10",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box"
  };

  const logoLinkStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "1.1rem",
    fontWeight: 900,
    color: "white",
    textDecoration: "none",
    letterSpacing: "-0.02em",
    flexShrink: 0
  };

  const logoSquareStyle = {
    width: "28px",
    height: "28px",
    background: "#f5ac3b",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    color: "black",
    fontSize: "0.8rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    flexShrink: 0
  };

  const desktopMenuStyle = {
    display: "none",
    alignItems: "center",
    gap: "4px",
    flexShrink: 1,
    overflow: "visible"
  };

  const desktopNavLinkBase = {
    textDecoration: "none",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "8px 10px",
    borderRadius: "8px",
    transition: "background 0.2s ease, color 0.2s ease",
    flexShrink: 0,
    whiteSpace: "nowrap"
  };

  const rightSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0
  };

  const balanceBoxStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    background: "rgba(245,172,59,0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(245,172,59,0.2)",
    flexShrink: 0
  };

  const balanceTextStyle = {
    fontWeight: 900,
    color: "#f5ac3b",
    fontSize: "0.75rem",
    whiteSpace: "nowrap"
  };

  const rechargeBtnStyle = {
    width: "28px",
    height: "28px",
    borderRadius: "12px",
    background: "#f5ac3b",
    color: "black",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  };

  const iconLinkBase = {
    width: "32px",
    height: "32px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    textDecoration: "none",
    transition: "background 0.2s ease, transform 0.2s ease",
    fontSize: "0.8rem",
    flexShrink: 0
  };

  const muteBtnBase = {
    width: "28px",
    height: "28px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease"
  };

  const logoutBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "12px",
    border: "none",
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "0.75rem",
    flexShrink: 0,
    transition: "background 0.2s ease"
  };

  const loginBtnStyle = {
    padding: "10px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#f5ac3b",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "0.75rem",
    boxShadow: "0 4px 15px rgba(245,172,59,0.2)",
    transition: "transform 0.2s ease"
  };

  const hamburgerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    cursor: "pointer",
    color: "white",
    flexShrink: 0
  };

  // Media query style block
  const mediaQueryStyles = `
    @media (min-width: 1024px) {
      .sm-nav { height: 80px; padding: 0 40px; }
      .sm-logo { font-size: 1.3rem; gap: 12px; }
      .sm-logo-square { width: 32px; height: 32px; font-size: 1rem; }
      .sm-desktop-menu { display: flex; }
      .sm-nav-link { font-size: 0.8rem; padding: 8px 12px; }
      .sm-balance { padding: 8px 14px; }
      .sm-balance-text { font-size: 0.8rem; }
      .sm-recharge-btn { width: 32px; height: 32px; }
      .sm-icon-link { width: 36px; height: 36px; font-size: 0.85rem; }
      .sm-mute-btn { width: 32px; height: 32px; }
      .sm-logout-btn { padding: 8px 14px; font-size: 0.8rem; }
      .sm-login-btn { padding: 12px 28px; font-size: 0.85rem; }
      .sm-hamburger { display: none; }
    }
    @media (max-width: 1023px) {
      .sm-desktop-menu { display: none; }
      .sm-desktop-icons { display: none; }
      .sm-nav-link-mobile { display: block; }
    }
    .sm-nav-link:hover { background: rgba(255,255,255,0.05); color: white; }
    .sm-nav-link.active { background: rgba(255,255,255,0.1); color: white; font-weight: 700; }
    .sm-icon-link:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
    .sm-logout-btn:hover { background: rgba(239,68,68,0.2); color: #ef4444; }
    .sm-login-btn:hover { transform: translateY(-2px); }
    .sm-recharge-btn:hover { transform: scale(1.05); }
    .sm-recharge-btn:active { transform: scale(0.95); }
    .sm-drawer-link:hover { background: rgba(255,255,255,0.05); color: white; }
    .sm-drawer-link.active { background: rgba(255,255,255,0.1); color: white; font-weight: 700; }
    .sm-drawer-logout:hover { background: rgba(239,68,68,0.2); }
    .sm-overlay { animation: smFadeIn 0.2s ease; }
    .sm-drawer-panel { animation: smSlideDown 0.25s ease; }
    @keyframes smFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes smSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `;

  return (
    <>
      <style>{mediaQueryStyles}</style>
      <nav className="sm-nav" style={navStyle}>
        {/* Left Side: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexShrink: 0, overflow: "visible" }}>
          <Link to="/" className="sm-logo" style={logoLinkStyle}>
            <div className="sm-logo-square" style={logoSquareStyle}>S</div>
            <span>SKINMART<span style={{ color: "#f5ac3b" }}>ES</span></span>
          </Link>

          {/* Desktop Menu */}
          {user && (
            <div className="sm-desktop-menu" style={desktopMenuStyle}>
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sm-nav-link${isActive ? " active" : ""}`}
                    style={{
                      ...desktopNavLinkBase,
                      color: isActive ? "white" : "rgba(255,255,255,0.7)"
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Controls */}
        <div className="sm-desktop-icons" style={rightSectionStyle}>
          {user ? (
            <>
              {/* Level Badge + XP Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0,
                  padding: "4px 10px",
                  background: "rgba(245,172,59,0.06)",
                  borderRadius: "12px",
                  border: "1px solid rgba(245,172,59,0.12)"
                }}
              >
                <GiLevelFour style={{ color: "#f5ac3b", fontSize: "0.9rem", flexShrink: 0 }} />
                <div style={{ textAlign: "left", minWidth: "0" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#f5ac3b", lineHeight: 1, marginBottom: "2px", letterSpacing: "0.5px" }}>
                    NIVEL {user?.nivel ?? user?.level ?? 0}
                  </div>
                  <LevelProgressBar
                    experiencia={user?.experiencia || 0}
                    nivel={user?.nivel || user?.level || 0}
                    showLabel={false}
                    compact={true}
                    width="80px"
                  />
                </div>
              </div>

              {/* Balance & Recharge */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div className="sm-balance" style={balanceBoxStyle}>
                  <GiTwoCoins style={{ color: "#f5ac3b", fontSize: "0.85rem", flexShrink: 0 }} />
                  <span className="sm-balance-text" style={balanceTextStyle}>
                    {Number(user?.balance ?? user?.saldo ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </span>
                </div>
                <button
                  onClick={() => setRechargeOpen(true)}
                  className="sm-recharge-btn"
                  style={rechargeBtnStyle}
                  title="Recargar saldo"
                >
                  <FaPlus style={{ fontSize: "0.7rem" }} />
                </button>
              </div>

{/* Desktop Icon Links */}
              <div className="sm-desktop-icons-row" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {ICON_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="sm-icon-link"
                    style={iconLinkBase}
                    title={item.label}
                  >
                    <item.icon />
                  </Link>
                ))}
              </div>

              {/* Mute Toggle (Desktop) */}
              <button
                onClick={handleToggleMute}
                className="sm-mute-btn"
                style={{
                  ...muteBtnBase,
                  background: isMuted ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                  borderColor: isMuted ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                  color: isMuted ? "#f87171" : "#34d399"
                }}
                title={isMuted ? "Activar sonido" : "Silenciar sonido"}
              >
                {isMuted ? <FaVolumeMute style={{ fontSize: "0.7rem" }} /> : <FaVolumeUp style={{ fontSize: "0.7rem" }} />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="sm-logout-btn"
                style={logoutBtnStyle}
                title="Cerrar sesión"
              >
                <FaSignOutAlt style={{ fontSize: "0.7rem" }} />
                <span>SALIR</span>
              </button>
            </>
          ) : (
            <Link to="/login" style={{ textDecoration: "none", flexShrink: 0 }}>
              <button className="sm-login-btn" style={loginBtnStyle}>
                LOGIN
              </button>
            </Link>
          )}

          {/* Mobile Hamburger */}
          {user && (
            <button
              className="sm-hamburger"
              style={hamburgerStyle}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <FaTimes style={{ fontSize: "0.9rem" }} /> : <FaBars style={{ fontSize: "0.9rem" }} />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && user && (
        <>
          <div
            className="sm-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 40
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="sm-drawer-panel"
            style={{
              position: "fixed",
              top: "64px",
              left: 0,
              right: 0,
              background: "#0c0d10",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              padding: "20px",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}
          >
            {/* Mobile icon links row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              paddingBottom: "12px",
              marginBottom: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              {ICON_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="sm-drawer-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    transition: "background 0.2s ease"
                  }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Navigation items */}
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`sm-drawer-link${isActive ? " active" : ""}`}
                  style={{
                    textDecoration: "none",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    color: isActive ? "white" : "rgba(255,255,255,0.7)",
                    background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    transition: "background 0.2s ease, color 0.2s ease"
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Logout */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px", marginTop: "8px" }}>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="sm-drawer-logout"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.2s ease"
                }}
              >
                <FaSignOutAlt /> CERRAR SESIÓN
              </button>
            </div>
          </div>
        </>
      )}

      <RechargeModal open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
    </>
  );
}

