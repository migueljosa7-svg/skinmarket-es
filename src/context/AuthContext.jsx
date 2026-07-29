// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useCallback } from "react";
import { StorageService } from "../services/StorageService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => StorageService.getUser());
  const [inventory, setInventory] = useState(() => StorageService.getInventory());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to StorageService state changes
    const unsubscribe = StorageService.subscribe((data) => {
      setUser(data.user);
      setInventory(data.inventory);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email) => {
    // Simulated local login
    setLoading(true);
    try {
      const currentUser = StorageService.getUser();
      const updatedUser = StorageService.updateUser({
        email: email || currentUser.email,
        nombre_usuario: email ? email.split("@")[0] : currentUser.nombre_usuario
      });
      return updatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (nombre_usuario, email) => {
    setLoading(true);
    try {
      const updatedUser = StorageService.updateUser({
        nombre_usuario,
        email
      });
      return updatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    StorageService.updateUser({
      nombre_usuario: "Invitado",
      email: "guest@skinmarket.es"
    });
  }, []);

  const updateUser = useCallback((updatedUserOrFn) => {
    StorageService.updateUser(updatedUserOrFn);
  }, []);

  const fetchInventory = useCallback(() => {
    setInventory(StorageService.getInventory());
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
    const token = localStorage.getItem("token");
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
