// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useCallback } from "react";
import { StorageService } from "../services/StorageService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (token && token.length > 10) {
      // JWT token exists — user is authenticated even if backend sync hasn't happened yet
      const storedUser = StorageService.getUser();
      if (storedUser && storedUser.email !== "guest@skinmarket.es") return storedUser;
      return {
        id: "oauth_user",
        nombre_usuario: "Jugador",
        email: "oauth@skinmarket.es",
        balance: 0,
        saldo: 0,
        nivel: 0,
        experiencia: 0,
        steam_id: null,
        link_intercambio: null,
        role: "user",
        inventory: []
      };
    }
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
          // Silently fail - user will still have minimal access via token
        });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = StorageService.subscribe((data) => {
      if (data) {
        setUser(data.user);
        setInventory(data.inventory);
      } else {
        setUser(null);
        setInventory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
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
            localStorage.setItem("token", data.token);
            setToken(data.token);
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
        } catch (err) {
          console.warn('[LOGIN] Backend unavailable, falling back to local:', err.message);
        }
      }
      const currentUser = StorageService.getUser();
      const updatedUser = StorageService.updateUser({
        email: email || currentUser?.email || "guest@skinmarket.es",
        nombre_usuario: email ? email.split("@")[0] : currentUser?.nombre_usuario || "Invitado"
      });
      localStorage.removeItem("token");
      setToken(null);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (nombre_usuario, email, password) => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || "";
      if (password) {
        const response = await fetch(`${API}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre_usuario, email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
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
      }
      if (!password) {
        const updatedUser = StorageService.updateUser({
          nombre_usuario,
          email
        });
        localStorage.removeItem("token");
        setToken(null);
        return updatedUser;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    StorageService.destroySession();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
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
          StorageService.sellSkin(skinId);
          return { success: true, newBalance: data.newBalance };
        }
        const errData = await response.json().catch(() => ({}));
        return { success: false, error: errData.error || "Error al vender en servidor" };
      } catch (err) {
        console.warn("[SELL] API call failed, falling back to local:", err.message);
      }
    }
    StorageService.sellSkin(skinId);
    return { success: true };
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
    let token = localStorage.getItem("token");
    if (!token) {
      try {
        const raw = localStorage.getItem("skinmarket_db_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.user?.token || null;
        }
      } catch (e) { }
    }
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
      } catch (err) {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Error de conexion con el servidor. Verifica tu conexion e intenta de nuevo.',
          code: 'NETWORK_ERROR'
        };
      }
    }
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'Debes iniciar sesion para retirar skins.',
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
      return { success: false, error: "Debes iniciar sesion para reclamar la recompensa diaria." };
    }
    const now = new Date();
    const lastClaim = currentUser.ultimo_reclamo_diario ? new Date(currentUser.ultimo_reclamo_diario) : null;
    if (lastClaim && now - lastClaim < 86400000) {
      const remainingMs = 86400000 - (now - lastClaim);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      return { success: false, error: `Debes esperar ${hours}h para reclamar de nuevo.` };
    }
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
      message: `Recompensa diaria de ${reward} reclamada!`
    };
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
        checkAuth: () => { }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
