// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useCallback, useMemo } from "react";
import { StorageService } from "../services/StorageService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (token && token.length > 10) {
      const storedUser = StorageService.getUser();
      if (storedUser && storedUser.email && storedUser.email !== "guest@skinmarket.es") {
        return storedUser;
      }
      return null;
    }
    const guestMode = localStorage.getItem("guest_mode") === "true";
    if (guestMode) {
      const storedUser = StorageService.getUser();
      if (storedUser && storedUser.email === "guest@skinmarket.es") {
        return storedUser;
      }
    }
    return null;
  });
  const [inventory, setInventory] = useState(() => {
    if (StorageService.hasSession()) {
      return StorageService.getInventory();
    }
    const guestMode = localStorage.getItem("guest_mode") === "true";
    if (guestMode) {
      return StorageService.getInventory();
    }
    return [];
  });
  const [, setTokenState] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = localStorage.getItem("token");
    if (existingToken && existingToken.length > 10) {
      const API = import.meta.env.VITE_API_URL || "";
      fetch(`${API}/api/me`, {
        headers: { Authorization: `Bearer ${existingToken}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Not authenticated');
          return res.json();
        })
        .then(userData => {
          if (userData) {
            StorageService.updateUser({
              nombre_usuario: userData.nombre_usuario || userData.name,
              email: userData.email,
              saldo: userData.saldo || 0,
              balance: userData.saldo || userData.balance || 0,
              nivel: userData.nivel || userData.level || 0,
              experiencia: userData.experiencia || 0,
              steam_id: userData.steam_id || null,
              link_intercambio: userData.link_intercambio || null
            });
            setUser(StorageService.getUser());
          }
        })
        .catch(() => {
          // Token exists but backend fetch failed — user stays unauthenticated
          localStorage.removeItem('token');
          setTokenState(null);
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = StorageService.subscribe((data) => {
      if (!data) {
        setUser(null);
        setInventory([]);
        return;
      }

      const guestMode = localStorage.getItem("guest_mode") === "true";
      if (data.user?.email === "guest@skinmarket.es" && !guestMode) {
        return;
      }

      setUser(data.user);
      setInventory(data.inventory);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || "";
      if (!password) {
        throw new Error("La contraseña es obligatoria");
      }
      const response = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Credenciales inválidas");
      }
      const data = await response.json();
      localStorage.removeItem("guest_mode");
      localStorage.setItem("token", data.token);
      setTokenState(data.token);
      StorageService.updateUser({
        ...data.user,
        nombre_usuario: data.user.nombre_usuario,
        email: data.user.email,
        saldo: data.user.saldo,
        balance: data.user.saldo,
        nivel: data.user.nivel || 0,
        experiencia: data.user.experiencia || 0
      });
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (nombre_usuario, email, password) => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || "";
      if (!password) {
        throw new Error("La contraseña es obligatoria");
      }
      const response = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario, email, password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.removeItem("guest_mode");
        localStorage.removeItem("guest_mode");
        localStorage.removeItem("guest_mode");
        localStorage.setItem("token", data.token);
        setTokenState(data.token);
        StorageService.updateUser({
          ...data.user,
          nombre_usuario: data.user.nombre_usuario,
          email: data.user.email,
          saldo: data.user.saldo,
          balance: data.user.saldo,
          nivel: data.user.nivel || 0,
          experiencia: data.user.experiencia || 0
        });
        return data.user;
      }
      const errorMsg = data.error || "Error al registrar en el servidor";
      if (response.status === 409) {
        throw new Error(errorMsg);
      } else if (response.status === 503) {
        throw new Error(errorMsg);
      } else if (response.status === 400) {
        throw new Error(errorMsg);
      } else {
        throw new Error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    StorageService.destroySession();
    localStorage.removeItem('token');
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('user');
    setUser(null);
    setTokenState(null);
    setInventory([]);
    window.location.href = "/";
  }, []);

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
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, error: "Debes iniciar sesión para vender skins" };
    }
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
        StorageService.sellSkin(skinId);
        return { success: true, newBalance: data.newBalance };
      }
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.error || "Error al vender en servidor" };
    } catch {
      return { success: false, error: "Error de conexión al vender. Intenta de nuevo." };
    }
  }, []);

  const sellAllSkins = useCallback(() => {
    const total = StorageService.sellAllSkins();
    const token = localStorage.getItem("token");
    if (token) {
      StorageService.getInventory().forEach(skin => {
        if (skin.status === 'in_inventory') {
          const API = import.meta.env.VITE_API_URL || "";
          fetch(`${API}/api/inventory/sell`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemId: skin.id })
          }).catch(() => { });
        }
      });
    }
    return total;
  }, []);

  const withdrawSkin = useCallback(async (skinId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        success: false,
        error: 'NOT_LOGGED_IN',
        message: 'Debes iniciar sesion para retirar skins.',
        code: 'NOT_LOGGED_IN'
      };
    }
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
        StorageService.withdrawSkin(skinId);
        return { success: true, offerId: data.offerId, message: data.message || "Oferta enviada a Steam." };
      }
      const errorCode = data.code || 'UNKNOWN_ERROR';
      const errorMessage = data.error || "Error al procesar el retiro.";
      const errorMessages = {
        'TRADE_URL_MISSING': 'Debes configurar tu Steam Trade URL en tu perfil antes de solicitar un retiro.',
        'ITEM_OUT_OF_STOCK': 'El bot no tiene esta skin en stock actualmente. Intenta mas tarde o usa la opcion de venta.',
        'RATE_LIMIT_EXCEEDED': 'Steam esta limitando las solicitudes. Espera 5 minutos e intenta de nuevo.',
        'RATE_LIMIT_WITHDRAW': 'Has excedido el limite de retiros. Espera 1 minuto e intenta de nuevo.',
        'BOT_UNAVAILABLE': 'El bot de intercambios no esta disponible en este momento. Intentelo mas tarde.',
        'CONFIG_MISSING': 'El bot no esta configurado correctamente. Contacta al administrador.',
        'BOT_ERROR': 'Error del bot al procesar el retiro. Intenta de nuevo.',
        'TRADE_ERROR': 'Error en la oferta de intercambio. La skin puede no ser intercambiable.',
        'CONNECTION_ERROR': 'Error de conexion con Steam. Verifica tu conexion e intenta de nuevo.',
        'TRADE_OFFER_FAILED': 'No se pudo enviar la oferta de intercambio. Intenta de nuevo.'
      };
      return {
        success: false,
        error: errorCode,
        message: errorMessages[errorCode] || errorMessage,
        code: errorCode
      };
    } catch {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Error de conexion con el servidor. Verifica tu conexion e intenta de nuevo.',
        code: 'NETWORK_ERROR'
      };
    }
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

  /**
   * Award XP to the current user. Locally persists via StorageService.
   * Backend awards XP server-side on /api/cases/open and /api/battles/*,
   * but this helper keeps the local UI in sync for guest/local sessions.
   * Rule: 1€ spent = 100 XP.
   * @param {number} xpAmount - XP to add
   * @returns {number} New total XP
   */
  const awardXP = useCallback((xpAmount) => {
    return StorageService.awardXP(xpAmount);
  }, []);

  const claimDaily = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, error: "Debes iniciar sesion para reclamar la recompensa diaria." };
    }
    try {
      const API = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API}/api/claim-daily`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Update local storage with the new skin and balance from the server
        if (data.skin) {
          StorageService.addSkinsToInventory([data.skin]);
        }
        if (data.expReward) {
          const currentUser = StorageService.getUser();
          StorageService.updateUser({
            experiencia: (currentUser?.experiencia || 0) + data.expReward
          });
        }
        return {
          success: true,
          reward: data.skin?.price || 0,
          expReward: data.expReward || 0,
          skin: data.skin,
          message: data.message || `Recompensa diaria reclamada!`
        };
      }
      // Handle cooldown error (remaining time)
      if (response.status === 400 && data.remainingMs) {
        const remainingMs = data.remainingMs;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        return {
          success: false,
          error: `⏳ ${hours}h ${minutes}m ${seconds}s`,
          remainingMs,
          canOpen: false
        };
      }
      return {
        success: false,
        error: data.error || "Error al reclamar la recompensa diaria."
      };
    } catch {
      return {
        success: false,
        error: "Error de conexion al reclamar la recompensa diaria."
      };
    }
  }, []);

  const recoverPassword = useCallback(async (email) => {
    try {
      const API = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return data.message || `Se ha enviado un correo de recuperacion a ${email}`;
      } else {
        throw new Error(data.error || "Error al procesar la solicitud");
      }
    } catch (err) {
      throw new Error(err.message || "Error al conectar con el servidor");
    }
  }, []);

  // Memoize the merged user+inventory object to prevent unnecessary re-renders
  // of all consumers when only internal state references change.
  const userWithInventory = useMemo(() => user ? {
    ...user,
    inventory,
    balance: Number(user.balance ?? user.saldo ?? 0),
    saldo: Number(user.saldo ?? user.balance ?? 0)
  } : null, [user, inventory]);

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
        awardXP,
        fetchInventory,
        claimDaily,
        recoverPassword,
        checkAuth: () => { }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
