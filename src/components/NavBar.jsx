import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useState, useEffect } from "react";
import { FaTrophy, FaShoppingBag, FaUser, FaSignOutAlt, FaPlus, FaFire, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { GiTwoCoins } from "react-icons/gi";
import RechargeModal from "./RechargeModal";
import { sound } from "../utils/audio";

const NAV_ITEMS = [
  { to: "/cases", label: "CAJAS" },
  { to: "/upgrade", label: "UPGRADE" },
  { to: "/contracts", label: "CONTRATOS" },
  { to: "/battles", label: "BATALLAS" },
  { to: "/ranking", label: "RANKING" },
];

const ICON_LINKS = [
  { to: "/ranking", icon: FaTrophy, label: "Ranking" },
  { to: "/inventory", icon: FaShoppingBag, label: "Inventario" },
  { to: "/dashboard", icon: FaUser, label: "Perfil" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sound.muted);

  // Audio activation handled globally in main.jsx — no duplicate listeners needed here

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleToggleMute = () => {
    sound.init();
    const newState = sound.toggleMute();
    setIsMuted(!newState);
  };

  return (
    <>
      <style>{`
        .navbar-link { color: rgba(255,255,255,0.7); transition: color 0.2s, background 0.2s; }
        .navbar-link:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .icon-btn { 
          width: 40px; height: 40px; border-radius: 12px; 
          background: rgba(255,255,255,0.05); 
          display: flex; align-items: center; justify-content: center; 
          color: white; text-decoration: none; transition: all 0.2s ease; 
          font-size: 1rem;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .icon-btn:active { transform: translateY(0); }
        .logout-btn {
          padding: 10px 20px; border-radius: 12px; border: none;
          background: rgba(255,85,85,0.1); color: #ff5555;
          font-weight: 900; cursor: pointer; transition: all 0.2s ease;
          font-family: inherit; font-size: 0.85rem;
        }
        .logout-btn:hover { background: rgba(255,85,85,0.2); transform: translateY(-2px); }
        .login-btn {
          padding: 12px 32px; border-radius: 12px; border: none;
          background: #f5ac3b; color: black; font-weight: 900;
          cursor: pointer; box-shadow: 0 4px 15px rgba(245, 172, 59, 0.3);
          transition: all 0.2s ease; font-family: inherit; font-size: 0.95rem;
        }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245, 172, 59, 0.4); }
        @media (max-width: 900px) {
          .nav-links { display: none; }
          .mobile-toggle { display: flex !important; }
          .nav-icons { gap: 8px; }
        }
        @media (min-width: 901px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>

      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 40px",
          height: "80px",
          background: "#0c0d10",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Left: Logo + Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "1.4rem",
              fontWeight: "900",
              color: "white",
              textDecoration: "none",
              letterSpacing: '-0.5px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: '#f5ac3b',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              color: 'black',
              fontSize: '1rem'
            }}>S</div>
            <span>SKINMART<span style={{ color: '#f5ac3b' }}>ES</span></span>
          </Link>

          {user && (
            <div className="nav-links" style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="navbar-link"
                  style={{
                    textDecoration: "none",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: location.pathname.startsWith(item.to) ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: location.pathname.startsWith(item.to) ? '#fff' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: User section */}
        <div className="nav-icons" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {user ? (
            <>
              {/* Balance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: 'rgba(245, 172, 59, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 172, 59, 0.2)'
                }}>
                  <GiTwoCoins style={{ color: '#f5ac3b', fontSize: '1.1rem' }} />
                  <span style={{ fontWeight: '900', color: '#f5ac3b', fontSize: '0.95rem' }}>
                    {Number(user.balance !== undefined ? user.balance : user.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </span>
                </div>
                <button
                  onClick={() => setRechargeOpen(true)}
                  className="icon-btn"
                  style={{ width: '32px', height: '32px', background: '#f5ac3b', color: 'black', border: 'none', cursor: 'pointer' }}
                  title="Recargar saldo"
                >
                  <FaPlus />
                </button>
              </div>

              {/* Icon links */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {ICON_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="icon-btn"
                    title={item.label}
                  >
                    <item.icon />
                  </Link>
                ))}
              </div>

              {/* Sound Toggle */}
              <button
                onClick={handleToggleMute}
                className="icon-btn"
                title={isMuted ? "Activar sonido" : "Silenciar sonido"}
                style={{
                  width: '32px',
                  height: '32px',
                  background: isMuted ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  color: isMuted ? '#ef4444' : '#10b981',
                  cursor: 'pointer'
                }}
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>

              {/* Logout */}
              <button onClick={handleLogout} className="logout-btn" title="Cerrar sesión">
                <FaSignOutAlt style={{ marginRight: '6px' }} />
                SALIR
              </button>
            </>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button className="login-btn">
                LOGIN
              </button>
            </Link>
          )}

          {/* Mobile toggle */}
          {user && (
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              <FaFire />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <div className="mobile-menu" style={{
          position: 'fixed',
          top: '80px',
          left: 0,
          right: 0,
          background: '#0c0d10',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '20px',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="navbar-link"
              style={{
                textDecoration: "none",
                fontSize: "1.1rem",
                fontWeight: "600",
                padding: "12px 16px",
                borderRadius: "12px",
                background: location.pathname.startsWith(item.to) ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: location.pathname.startsWith(item.to) ? '#fff' : 'rgba(255,255,255,0.7)',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <RechargeModal open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
    </>
  );
}
