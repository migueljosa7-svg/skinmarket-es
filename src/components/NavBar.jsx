import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useState } from "react";
import { FaTrophy, FaShoppingBag, FaUser, FaSignOutAlt, FaPlus, FaBars, FaTimes, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
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

  return (
    <>
      <nav className="flex flex-wrap md:flex-nowrap justify-between items-center px-3 sm:px-6 lg:px-10 py-2.5 md:py-0 min-h-[64px] md:h-20 bg-[#0c0d10] border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl min-w-0 overflow-visible w-full">
        {/* Left Side: Brand & Main Navigation */}
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-10 flex-shrink-0 min-w-0 overflow-visible">
          <Link to="/" className="inline-flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl font-black text-white no-underline tracking-tight flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#f5ac3b] rounded-lg flex items-center justify-center font-black text-black text-sm sm:text-base shadow-sm">S</div>
            <span>SKINMART<span className="text-[#f5ac3b]">ES</span></span>
          </Link>

          {user && (
            <div className="hidden lg:flex items-center gap-1 xl:gap-2 flex-shrink min-w-0 overflow-visible">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`no-underline text-xs xl:text-sm font-semibold px-2.5 xl:px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                    location.pathname.startsWith(item.to)
                      ? "bg-white/10 text-white font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: User Controls, Balance, Profile & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 flex-shrink-0 min-w-0 overflow-visible">
          {user ? (
            <>
              {/* Balance & Recharge */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 bg-[#f5ac3b]/10 rounded-xl border border-[#f5ac3b]/20 flex-shrink-0">
                  <GiTwoCoins className="text-[#f5ac3b] text-sm sm:text-base flex-shrink-0" />
                  <span className="font-black text-[#f5ac3b] text-xs sm:text-sm whitespace-nowrap">
                    {Number(user?.balance ?? user?.saldo ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </span>
                </div>
                <button
                  onClick={() => setRechargeOpen(true)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#f5ac3b] text-black border-none cursor-pointer flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
                  title="Recargar saldo"
                >
                  <FaPlus className="text-xs sm:text-sm" />
                </button>
              </div>

              {/* Desktop Icon Links (Ranking, Inventory, Profile) */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                {ICON_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-white/5 flex items-center justify-center color-white text-white no-underline hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs lg:text-sm flex-shrink-0"
                    title={item.label}
                  >
                    <item.icon />
                  </Link>
                ))}
              </div>

              {/* Mute Audio Toggle */}
              <button
                onClick={handleToggleMute}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 border cursor-pointer transition-all ${
                  isMuted
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}
                title={isMuted ? "Activar sonido" : "Silenciar sonido"}
              >
                {isMuted ? <FaVolumeMute className="text-xs sm:text-sm" /> : <FaVolumeUp className="text-xs sm:text-sm" />}
              </button>

              {/* Logout Button ("Salir") */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border-none bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-black cursor-pointer text-xs sm:text-sm flex-shrink-0 transition-all"
                title="Cerrar sesion"
              >
                <FaSignOutAlt className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">SALIR</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="no-underline flex-shrink-0">
              <button className="px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl border-none bg-[#f5ac3b] text-black font-black cursor-pointer shadow-lg shadow-[#f5ac3b]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm">
                LOGIN
              </button>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              className="lg:hidden flex items-center justify-center p-2 text-white bg-white/5 rounded-xl border border-white/10 cursor-pointer flex-shrink-0"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileOpen ? <FaTimes className="text-base sm:text-lg" /> : <FaBars className="text-base sm:text-lg" />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay & Drawer */}
      {mobileOpen && user && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-[64px] sm:top-[80px] left-0 right-0 bg-[#0c0d10] border-b border-white/10 p-5 z-40 lg:hidden flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top duration-200">
            {/* Quick Profile & Inventory icons for mobile drawer */}
            <div className="flex items-center justify-around pb-3 mb-2 border-b border-white/5 md:hidden">
              {ICON_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white no-underline text-sm font-semibold hover:bg-white/10"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`no-underline text-base font-semibold px-4 py-3 rounded-xl transition-colors ${
                  location.pathname.startsWith(item.to)
                    ? "bg-white/10 text-white font-bold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="border-t border-white/10 pt-3 mt-2">
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black text-sm cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <FaSignOutAlt /> CERRAR SESION
              </button>
            </div>
          </div>
        </>
      )}

      <RechargeModal open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
    </>
  );
}