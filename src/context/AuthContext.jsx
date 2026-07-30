// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StorageService } from "../services/StorageService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // FIX: In incognito/clean tab, user should be null (not a default guest)
  // Only set user from StorageService if there's an actual stored session
  const [user, setUser] = useState(() => {
    if (StorageService.hasSession()) {
      return StorageService.getUser();
    }
    return null;
  });
  const [inventory, setInventory] = useState(() => {
    if (StorageService.hasSession()) {
      return StorageService.getInventory();
    }
    return [];
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to StorageService state changes
    const unsubscribe = StorageService.subscribe((data) => {
      if (data) {
        setUser(data.user);
        setInventory(data.inventory);
      } else {
        // Data was cleared (e.g., after logout)
        setUser(null);
        setInventory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      // Try backend login first to get a real JWT
      const API = import.meta.env.VITE_API_URL || "";
      if (password) {
        try {
          const response = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          if (response.ok) {
            const data = await response.json();
            // Store JWT in localStorage
            localStorage.setItem("token", data.token);
            setToken(data.token);
            // Sync user data with StorageService
            StorageService.updateUser({
              ...data.user,
              nombre_usuario: data.user.nombre_usuario,
              email: data.user.email,
              saldo: data.user.saldo,
              balance: data.user.saldo,
              nivel: data.user.nivel || 0,
              experiencia: data.user.experiencia || 0
            });
            console.log('🔑 [LOGIN] Token JWT obtained from backend and stored');
            return data.user;
          }
        } catch (err) {
          console.warn('[LOGIN] Backend unavailable, falling back to local:', err.message);
        }
      }

      // Fallback: simulated local login (for guest or when backend is down)
      const currentUser = StorageService.getUser();
      const updatedUser = StorageService.updateUser({
        email: email || currentUser?.email || "guest@skinmarket.es",
        nombre_usuario: email ? email.split("@")[0] : currentUser?.nombre_usuario || "Invitado"
      });
      // Remove any stale token on local fallback
      localStorage.removeItem("token");
      setToken(null);
      console.log('🔑 [LOGIN] Local fallback (no JWT token stored)');
      return updatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (nombre_usuario, email, password) => {
    setLoading(true);
    try {
      // Try backend register first to get a real JWT
      const API = import.meta.env.VITE_API_URL || "";
      if (password) {
        try {
          const response = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_usuario, email, password })
          });
          if (response.ok) {
            const data = await response.json();
            // Store JWT in localStorage
            localStorage.setItem("token", data.token);
            setToken(data.token);
            // Sync user data with StorageService
            StorageService.updateUser({
              ...data.user,
              nombre_usuario: data.user.nombre_usuario,
              email: data.user.email,
              saldo: data.user.saldo,
              balance: data.user.saldo,
              nivel: data.user.nivel || 0,
              experiencia: data.user.experiencia || 0
            });
            console.log('🔑 [REGISTER] Token JWT obtained from backend and stored');
            return data.user;
          }
        } catch (err) {
          console.warn('[REGISTER] Backend unavailable, falling back to local:', err.message);
        }
      }

      // Fallback: simulated local register
      const updatedUser = StorageService.updateUser({
        nombre_usuario,
        email
      });
      // Remove any stale token on local fallback
      localStorage.removeItem("token");
      setToken(null);
      console.log('🔑 [REGISTER] Local fallback (no JWT token stored)');
      return updatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX: Complete logout that clears everything and redirects
  const logout = useCallback(() => {
    // 1. Destroy all session data from StorageService
    StorageService.destroySession();

    // 2. Clear any remaining localStorage keys
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 3. Reset React state
    setUser(null);
    setToken(null);
    setInventory([]);

    // 4. Redirect to home
    navigate("/");

    console.log('🔓 [LOGOUT] Session cleaned and redirected to home');
  }, [navigate]);

  const updateUser = useCallback((updatedUserOrFn) => {
    StorageService.updateUser(updatedUserOrFn);
  }, []);

  const fetchInventory = useCallback(() => {
    if (StorageService.hasSession()) {
      setInventory(StorageService.getInventory());
    } else {
      setInventory([]);
    }
  }, []);

  const sellSkin = useCallback(async (skinId) => {
    // Try backend API first
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const API = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API}/api/inventory/sell`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ itemId: skinId })
        });
        if (response.ok) {
          const data = await response.json();
          // Sync local state after successful API sell
          StorageService.sellSkin(skinId);
          return { success: true, newBalance: data.newBalance };
        }
        const errData = await response.json().catch(() => ({}));
        return { success: false, error: errData.error || "Error al vender en servidor" };
      } catch (err) {
        console.warn("[SELL] API call failed, falling back to local:", err.message);
      }
    }
    // Fallback to local
    StorageService.sellSkin(skinId);
    return { success: true };
  }, []);

  const sellAllSkins = useCallback(() => {
    const total = StorageService.sellAllSkins();
    // Attempt backend sync if token exists
    const token = localStorage.getItem("token");
    if (token) {
      StorageService.getInventory().forEach(skin => {
        if (skin.status === 'in_inventory') {
          const API = import.meta.env.VITE_API_URL || "";
          fetch(`${API}/api/inventory/sell`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemId: skin.id })
          }).catch(() => {});
        }
      });
    }
    return total;
  }, []);

  const withdrawSkin = useCallback(async (skinId) => {
    // Get token from multiple possible sources
    let token = localStorage.getItem("token");
    // Fallback: try getting token from StorageService (skinmarket_db_v1.user.token)
    if (!token) {
      try {
        const raw = localStorage.getItem("skinmarket_db_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.user?.token || null;
        }
      } catch (e) {}
    }
    console.log('🔑 [TOKEN CHECK]', token ? 'Token presente' : 'TOKEN MISSING');
    if (token) {
      try {
        const API = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API}/api/inventory/withdraw`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ itemId: skinId })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Sync local state after successful API withdraw
          StorageService.withdrawSkin(skinId);
          return { success: true, offerId: data.offerId, message: data.message || "Oferta enviada a Steam." };
        }

        // Handle specific error codes from backend
        const errorCode = data.code || 'UNKNOWN_ERROR';
        const errorMessage = data.error || "Error al procesar el retiro.";

        // Map backend error codes to user-friendly messages
        const errorMessages = {
          'TRADE_URL_MISSING': 'Debes configurar tu Steam Trade URL en tu perfil antes de solicitar un retiro.',
          'ITEM_OUT_OF_STOCK': 'El bot no tiene esta skin en stock actualmente. Intenta más tarde o usa la opción de venta.',
          'RATE_LIMIT_EXCEEDED': 'Steam está limitando las solicitudes. Espera 5 minutos e intenta de nuevo.',
          'RATE_LIMIT_WITHDRAW': 'Has excedido el límite de retiros. Espera 1 minuto e intenta de nuevo.',
          'BOT_UNAVAILABLE': 'El bot de intercambios no está disponible en este momento. Inténtalo más tarde.',
          'CONFIG_MISSING': 'El bot no está configurado correctamente. Contacta al administrador.',
          'BOT_ERROR': 'Error del bot al procesar el retiro. Intenta de nuevo.',
          'TRADE_ERROR': 'Error en la oferta de intercambio. La skin puede no ser intercambiable.',
          'CONNECTION_ERROR': 'Error de conexión con Steam. Verifica tu conexión e intenta de nuevo.',
          'TRADE_OFFER_FAILED': 'No se pudo enviar la oferta de intercambio. Intenta de nuevo.'
        };

        return {
          success: false,
          error: errorCode,
          message: errorMessages[errorCode] || errorMessage,
          code: errorCode
        };
      } catch (err) {
        console.error('[WITHDRAW] API call error:', err.message);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Error de conexión con el servidor. Verifica tu conexión e intenta de nuevo.',
          code: 'NETWORK_ERROR'
        };
      }
    }

    // No token - user not logged in to backend
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'Debes iniciar sesión para retirar skins.',
      code: 'NOT_LOGGED_IN'
    };
  }, []);

  const depositSkins = useCallback((skins) => {
    return StorageService.addSkinsToInventory(skins);
  }, []);

  const updateProfile = useCallback((tradeLink, steamId) => {
    const patch = {};
    if (tradeLink) patch.link_intercambio = tradeLink;
    if (steamId) patch.steam_id = steamId;
    StorageService.updateUser(patch);
    return true;
  }, []);

  const addToBalance = useCallback((amount) => {
    const newBal = StorageService.addBalance(amount);
    return newBal !== false;
  }, []);

  const claimDaily = useCallback(() => {
    const currentUser = StorageService.getUser();
    if (!currentUser) {
      return { success: false, error: "Debes iniciar sesión para reclamar la recompensa diaria." };
    }
    const now = new Date();
    const lastClaim = currentUser.ultimo_reclamo_diario ? new Date(currentUser.ultimo_reclamo_diario) : null;

    if (lastClaim && now - lastClaim < 86400000) {
      const remainingMs = 86400000 - (now - lastClaim);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      return { success: false, error: `Debes esperar ${hours}h para reclamar de nuevo.` };
    }

    // KeyDrop-style: reward basado en nivel (máx 2.00€ para cajas diarias)
    const level = currentUser.nivel || 0;
    let baseReward = 0.15;
    if (level >= 5) baseReward = 2.00;
    else if (level >= 4) baseReward = 1.00;
    else if (level >= 3) baseReward = 0.50;
    else if (level >= 2) baseReward = 0.25;
    else baseReward = 0.15;

    const reward = parseFloat((baseReward + Math.random() * baseReward).toFixed(2));
    const expReward = Math.max(15, level * 15);
    StorageService.addBalance(reward);
    StorageService.updateUser({
      experiencia: (currentUser.experiencia || 0) + expReward,
      ultimo_reclamo_diario: now.toISOString()
    });

    return {
      success: true,
      reward,
      expReward,
      message: `🎉 ¡Recompensa diaria de €${reward} reclamada!`
    };
  }, []);

  const recoverPassword = useCallback((email) => {
    return `Se ha enviado un correo de recuperación a ${email}`;
  }, []);

// Normalize balance/saldo and merge inventory into user object
  const userWithInventory = user ? { 
    ...user, 
    inventory,
    balance: Number(user.balance ?? user.saldo ?? 0),
    saldo: Number(user.saldo ?? user.balance ?? 0)
  } : null;

  return (
    <AuthContext.Provider
      value={{
        user: userWithInventory,
        inventory,
        loading,
        login,
        register,
        logout,
        updateUser,
        sellSkin,
        sellAllSkins,
        withdrawSkin,
        depositSkins,
        updateProfile,
        addToBalance,
        fetchInventory,
        claimDaily,
        recoverPassword,
        checkAuth: () => {}
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

