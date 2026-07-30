// src/services/StorageService.js
/**
 * Single source of truth for skinmarket LocalStorage data management.
 * Follows SRP, Observer Pattern for reactive React updates, and clean fallback initialization.
 */

const STORAGE_KEY = "skinmarket_db_v1";

const DEFAULT_USER = {
  id: "usr_local_main",
  nombre_usuario: "Invitado",
  email: "guest@skinmarket.es",
  avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
  saldo: 0.00,
  balance: 0.00,
  nivel: 0,
  experiencia: 0,
  steam_id: null,
  link_intercambio: null,
  role: "user",
  ultimo_reclamo_diario: null,
  stats: {
    casesOpened: 0,
    battlesWon: 0,
    totalSpent: 0.00,
    totalWon: 0.00,
    upgradesWon: 0
  }
};

// INVENTARIO INICIAL CERO ABSOLUTO — Como KeyDrop, SkinRave, Clash.GG
// Los nuevos usuarios empiezan con 0 SKINS y 0.00 € en el inventario.
// Las skins se obtienen exclusivamente abriendo cajas, ganando batallas,
// completando contratos o depositando.
const INITIAL_INVENTORY = [];

const INITIAL_LIVE_DROPS = [
  {
    id: "drop_1",
    user: "CSGO_God",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80",
    item: { name: "★ Butterfly Knife | Doppler", price: 1450.00, rarity: "Extraordinary", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
    caseName: "Cosmic Infinity",
    timestamp: new Date().toISOString()
  },
  {
    id: "drop_2",
    user: "ProGamer_ES",
    userAvatar: DEFAULT_USER.avatar,
    item: { name: "AWP | Asiimov", price: 115.00, rarity: "Covert", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
    caseName: "Phoenix Flame",
    timestamp: new Date(Date.now() - 30000).toISOString()
  },
  {
    id: "drop_3",
    user: "Alex_Sniper",
    userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&auto=format&fit=crop&q=80",
    item: { name: "AK-47 | Vulcan", price: 210.00, rarity: "Covert", image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw" },
    caseName: "Sentinel Guardian",
    timestamp: new Date(Date.now() - 60000).toISOString()
  }
];

class StorageServiceClass {
  constructor() {
    this.listeners = new Set();
    this.data = this.loadInitialData();
  }

  loadInitialData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Validate that raw is not undefined/null and is valid JSON
        if (raw === 'undefined' || raw === 'null' || raw.trim() === '') {
          console.warn("StorageService: Invalid localStorage value detected, clearing.");
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        const parsed = JSON.parse(raw);
        // Validate parsed data structure
        if (!parsed || typeof parsed !== 'object' || parsed === null) {
          console.warn("StorageService: Corrupted localStorage data detected, clearing.");
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return {
          user: { ...DEFAULT_USER, ...(parsed.user || {}) },
          inventory: Array.isArray(parsed.inventory) ? parsed.inventory : INITIAL_INVENTORY,
          history: Array.isArray(parsed.history) ? parsed.history : [],
          liveDrops: Array.isArray(parsed.liveDrops) ? parsed.liveDrops : INITIAL_LIVE_DROPS,
          adminSettings: parsed.adminSettings && typeof parsed.adminSettings === 'object' ? parsed.adminSettings : { dropMultiplier: 1.0, winRateBonus: 0, customCases: [] }
        };
      }
      // If localStorage is empty (clean incognito, first visit, or after logout),
      // return null data to signal "no user" state
      return null;
    } catch (e) {
      console.warn("StorageService: Failed to parse localStorage data, clearing corrupted data.", e);
      // Clear corrupted data to prevent repeated errors
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearErr) {
        // Ignore if we can't clear
      }
    }
    return null;
  }

  saveDataDirect(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("StorageService: Failed to write to localStorage", e);
    }
  }

  persistAndNotify() {
    this.saveDataDirect(this.data);
    this.listeners.forEach((listener) => {
      try {
        listener(this.data);
      } catch (err) {
        console.error("StorageService: Listener error", err);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Initial call
    listener(this.data);
    return () => this.listeners.delete(listener);
  }

  // --- USER API ---
  getUser() {
    // If no data in localStorage, return null to indicate "no user"
    if (!this.data) return null;
    return { ...this.data.user };
  }

  updateUser(updater) {
    // Ensure data exists before updating
    if (!this.data) {
      // Initialize default data if it doesn't exist
      this.data = this.createInitialData();
    }
    const nextUser = typeof updater === "function" ? updater(this.data.user) : { ...this.data.user, ...updater };
    // Ensure numeric types
    if (nextUser.balance !== undefined) {
      nextUser.balance = Number(parseFloat(nextUser.balance).toFixed(2));
      nextUser.saldo = nextUser.balance;
    }
    this.data.user = nextUser;
    this.persistAndNotify();
    return this.data.user;
  }

  createInitialData() {
    return {
      user: DEFAULT_USER,
      inventory: INITIAL_INVENTORY,
      history: [],
      liveDrops: INITIAL_LIVE_DROPS,
      adminSettings: { dropMultiplier: 1.0, winRateBonus: 0, customCases: [] }
    };
  }

  addBalance(amount) {
    if (!this.data) return false;
    const num = Number(parseFloat(amount).toFixed(2));
    if (isNaN(num) || num <= 0) return false;
    const newBalance = Number((this.data.user.balance + num).toFixed(2));
    this.updateUser({ balance: newBalance });
    return newBalance;
  }

  deductBalance(amount) {
    if (!this.data) return false;
    const num = Number(parseFloat(amount).toFixed(2));
    if (isNaN(num) || num <= 0) return false;
    if (this.data.user.balance < num) return false;
    const newBalance = Number((this.data.user.balance - num).toFixed(2));
    this.updateUser({ balance: newBalance });
    return newBalance;
  }

  // --- INVENTORY API ---
  getInventory() {
    if (!this.data) return [];
    return [...(this.data.inventory || [])];
  }

  // --- PENDING QUEUE (for withdraw requests) ---
  getPendingQueue() {
    if (!this.data) return [];
    return [...(this.data.pendingQueue || [])];
  }

  addToPendingQueue(skinId) {
    if (!this.data) return { success: false, error: "No hay datos de sesión" };
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return { success: false, error: "Skin no encontrada" };

    this.data.inventory[skinIndex].status = "pending_withdraw";
    this.data.pendingQueue = this.data.pendingQueue || [];
    this.data.pendingQueue.push({
      id: `pq_${Date.now()}`,
      skinId: skinId,
      skinName: this.data.inventory[skinIndex].name,
      skinPrice: this.data.inventory[skinIndex].price,
      requestedAt: new Date().toISOString(),
      status: "pending"
    });
    this.persistAndNotify();
    return { success: true, message: "Solicitud de retiro añadida a la cola. Revisa tu Steam pronto." };
  }

  processPendingQueue(skinId) {
    if (!this.data) return { success: false, error: "No hay datos de sesión" };
    this.data.pendingQueue = this.data.pendingQueue || [];
    const queueIndex = this.data.pendingQueue.findIndex((q) => q.skinId === skinId && q.status === "pending");
    if (queueIndex === -1) return { success: false, error: "No hay solicitud pendiente para esta skin" };

    this.data.pendingQueue[queueIndex].status = "processed";
    this.data.pendingQueue[queueIndex].processedAt = new Date().toISOString();

    // Update inventory status
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex !== -1) {
      this.data.inventory[skinIndex].status = "withdrawn";
    }

    this.persistAndNotify();
    return { success: true, message: "Retiro procesado correctamente." };
  }

  addSkinsToInventory(skins) {
    if (!this.data) {
      this.data = this.createInitialData();
    }
    const items = (Array.isArray(skins) ? skins : [skins]).map((s) => ({
      id: s.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: s.name || "Skin",
      weapon: s.weapon || (s.name ? s.name.split("|")[0].trim() : "Weapon"),
      skin_name: s.skin_name || (s.name ? (s.name.split("|")[1] || s.name).trim() : "Skin"),
      price: Number(parseFloat(s.price || 1.0).toFixed(2)),
      rarity: s.rarity || "Mil-Spec",
      wear: s.wear || "Field-Tested",
      image: s.image || "",
      acquiredAt: new Date().toISOString(),
      status: "in_inventory"
    }));

    this.data.inventory = [...items, ...this.data.inventory];
    this.persistAndNotify();
    return items;
  }

  sellSkin(skinId) {
    if (!this.data) return false;
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return false;

    const skin = this.data.inventory[skinIndex];
    this.data.inventory.splice(skinIndex, 1);
    this.addBalance(skin.price);
    return true;
  }

  sellAllSkins() {
    if (!this.data) return 0;
    const total = this.data.inventory.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
    this.data.inventory = [];
    if (total > 0) {
      this.addBalance(total);
    }
    return total;
  }

  withdrawSkin(skinId) {
    // This is now a LOCAL-ONLY fallback. Real withdraw is handled via API in AuthContext.
    // Only marks the skin locally after a successful API call.
    if (!this.data) return { success: false, error: "No hay datos de sesión" };
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return { success: false, error: "Skin no encontrada" };
    this.data.inventory[skinIndex].status = "withdrawn";
    this.persistAndNotify();
    return { success: true, message: "Skin marcada como retirada en almacenamiento local." };
  }

  /** Exchange a skin for balance (alternative to withdraw) */
  exchangeSkin(skinId) {
    if (!this.data) return { success: false, error: "No hay datos de sesión" };
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return { success: false, error: "Skin no encontrada" };

    const skin = this.data.inventory[skinIndex];
    // Exchange gives 85% of value as balance (better than selling)
    const exchangeValue = Number((skin.price * 0.85).toFixed(2));

    this.data.inventory.splice(skinIndex, 1);
    this.addBalance(exchangeValue);

    // Record transaction
    this.data.history = [
      {
        type: "exchange",
        skinName: skin.name,
        value: exchangeValue,
        timestamp: new Date().toISOString()
      },
      ...this.data.history.slice(0, 99)
    ];

    this.persistAndNotify();
    return {
      success: true,
      value: exchangeValue,
      message: `🔄 Skin intercambiada por €${exchangeValue} en saldo (85% de valor).`
    };
  }

  /** Get pending queue items */
  getPendingWithdrawals() {
    if (!this.data) return [];
    return this.data.inventory.filter(s => s.status === "pending_withdraw" || s.status === "withdrawing");
  }

  /** Validate trade URL format */
  validateTradeUrl(url) {
    if (!url) return { valid: false, reason: "Trade URL no proporcionada" };
    const partnerMatch = url.match(/partner=(\d+)/);
    const tokenMatch = url.match(/token=([\w-]+)/);
    if (!partnerMatch || !tokenMatch) {
      return { valid: false, reason: "Formato de Trade URL inválido. Debe contener 'partner' y 'token'." };
    }
    return { valid: true, steamId: partnerMatch[1], token: tokenMatch[1] };
  }

  // --- LIVE DROPS API ---
  getLiveDrops() {
    if (!this.data) return [];
    return [...(this.data.liveDrops || [])];
  }

  addLiveDrop(dropData) {
    if (!this.data) {
      this.data = this.createInitialData();
    }
    const drop = {
      id: `drop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user: dropData.user || this.data.user.nombre_usuario,
      userAvatar: dropData.userAvatar || this.data.user.avatar,
      item: {
        name: dropData.item.name,
        price: Number(parseFloat(dropData.item.price).toFixed(2)),
        rarity: dropData.item.rarity,
        image: dropData.item.image
      },
      caseName: dropData.caseName || "Caja",
      timestamp: new Date().toISOString()
    };

    this.data.liveDrops = [drop, ...this.data.liveDrops.slice(0, 49)];
    this.persistAndNotify();
    return drop;
  }

  // --- ADMIN & SETTINGS ---
  getAdminSettings() {
    if (!this.data) return null;
    return { ...this.data.adminSettings };
  }

  updateAdminSettings(newSettings) {
    if (!this.data) return null;
    this.data.adminSettings = { ...this.data.adminSettings, ...newSettings };
    this.persistAndNotify();
    return this.data.adminSettings;
  }

  // Reset tool - clears everything
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = null;
    this.persistAndNotify();
  }

  // Check if there's actual user data stored (not just defaults)
  hasSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || raw === 'undefined' || raw === 'null' || raw.trim() === '') return false;
      const parsed = JSON.parse(raw);
      // Validate parsed data
      if (!parsed || typeof parsed !== 'object' || !parsed.user) return false;
      // If we have a token or the user is not the default guest, we have a session
      const token = localStorage.getItem("token");
      if (token) return true;
      if (parsed.user.email && parsed.user.email !== "guest@skinmarket.es") return true;
      return false;
    } catch {
      return false;
    }
  }

  // Destroy session data - used by logout
  destroySession() {
    localStorage.removeItem("token");
    localStorage.removeItem(STORAGE_KEY);
    this.data = null;
    this.persistAndNotify();
  }
}

export const StorageService = new StorageServiceClass();

