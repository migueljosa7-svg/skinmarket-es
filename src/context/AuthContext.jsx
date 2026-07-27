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

  const sellSkin = useCallback((skinId) => {
    return StorageService.sellSkin(skinId);
  }, []);

  const sellAllSkins = useCallback(() => {
    return StorageService.sellAllSkins();
  }, []);

  const withdrawSkin = useCallback((skinId) => {
    return StorageService.withdrawSkin(skinId);
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

    const reward = 5.00;
    const expReward = 100;
    StorageService.addBalance(reward);
    StorageService.updateUser({
      experiencia: (currentUser.experiencia || 0) + expReward,
      ultimo_reclamo_diario: now.toISOString()
    });

    return {
      success: true,
      reward,
      expReward,
      message: "¡Recompensa diaria de $5.00 reclamada!"
    };
  }, []);

  const recoverPassword = useCallback((email) => {
    return `Se ha enviado un correo de recuperación a ${email} (Simulado)`;
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
