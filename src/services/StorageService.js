// src/services/StorageService.js
/**
 * Single source of truth for skinmarket LocalStorage data management.
 * Follows SRP, Observer Pattern for reactive React updates, and clean fallback initialization.
 */

const STORAGE_KEY = "skinmarket_db_v1";

const DEFAULT_USER = {
  id: "usr_local_main",
  nombre_usuario: "ProGamer_ES",
  email: "player@skinmarket.es",
  avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
  saldo: 500.00,
  balance: 500.00,
  nivel: 15,
  experiencia: 3450,
  steam_id: "76561198888888888",
  link_intercambio: "https://steamcommunity.com/tradeoffer/new/?partner=88888888&token=SkinMarket",
  role: "admin",
  ultimo_reclamo_diario: null,
  stats: {
    casesOpened: 28,
    battlesWon: 8,
    totalSpent: 450.00,
    totalWon: 1280.00,
    upgradesWon: 5
  }
};

const INITIAL_INVENTORY = [
  {
    id: "inv_1",
    name: "AK-47 | Redline",
    weapon: "AK-47",
    skin_name: "Redline",
    price: 28.50,
    rarity: "Classified",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_2",
    name: "AWP | Asiimov",
    weapon: "AWP",
    skin_name: "Asiimov",
    price: 115.00,
    rarity: "Covert",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_3",
    name: "M4A4 | Neo-Noir",
    weapon: "M4A4",
    skin_name: "Neo-Noir",
    price: 45.00,
    rarity: "Covert",
    wear: "Minimal Wear",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_4",
    name: "USP-S | Kill Confirmed",
    weapon: "USP-S",
    skin_name: "Kill Confirmed",
    price: 85.00,
    rarity: "Covert",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "in_inventory"
  }
];

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
        const parsed = JSON.parse(raw);
        return {
          user: { ...DEFAULT_USER, ...parsed.user },
          inventory: parsed.inventory || INITIAL_INVENTORY,
          history: parsed.history || [],
          liveDrops: parsed.liveDrops || INITIAL_LIVE_DROPS,
          adminSettings: parsed.adminSettings || { dropMultiplier: 1.0, winRateBonus: 0, customCases: [] }
        };
      }
    } catch (e) {
      console.warn("StorageService: Failed to parse localStorage data, resetting.", e);
    }
    const initial = {
      user: DEFAULT_USER,
      inventory: INITIAL_INVENTORY,
      history: [],
      liveDrops: INITIAL_LIVE_DROPS,
      adminSettings: { dropMultiplier: 1.0, winRateBonus: 0, customCases: [] }
    };
    this.saveDataDirect(initial);
    return initial;
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
    return { ...this.data.user };
  }

  updateUser(updater) {
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

  addBalance(amount) {
    const num = Number(parseFloat(amount).toFixed(2));
    if (isNaN(num) || num <= 0) return false;
    const newBalance = Number((this.data.user.balance + num).toFixed(2));
    this.updateUser({ balance: newBalance });
    return newBalance;
  }

  deductBalance(amount) {
    const num = Number(parseFloat(amount).toFixed(2));
    if (isNaN(num) || num <= 0) return false;
    if (this.data.user.balance < num) return false;
    const newBalance = Number((this.data.user.balance - num).toFixed(2));
    this.updateUser({ balance: newBalance });
    return newBalance;
  }

  // --- INVENTORY API ---
  getInventory() {
    return [...(this.data.inventory || [])];
  }

  addSkinsToInventory(skins) {
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
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return false;

    const skin = this.data.inventory[skinIndex];
    this.data.inventory.splice(skinIndex, 1);
    this.addBalance(skin.price);
    return true;
  }

  sellAllSkins() {
    const total = this.data.inventory.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
    this.data.inventory = [];
    if (total > 0) {
      this.addBalance(total);
    }
    return total;
  }

  withdrawSkin(skinId) {
    const skinIndex = this.data.inventory.findIndex((s) => s.id === skinId);
    if (skinIndex === -1) return { success: false, error: "Skin no encontrada" };

    this.data.inventory[skinIndex].status = "withdrawn";
    this.persistAndNotify();
    return {
      success: true,
      message: "Propuesta de intercambio enviada a tu Trade URL. Revisa tu Steam."
    };
  }

  // --- LIVE DROPS API ---
  getLiveDrops() {
    return [...(this.data.liveDrops || [])];
  }

  addLiveDrop(dropData) {
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
    return { ...this.data.adminSettings };
  }

  updateAdminSettings(newSettings) {
    this.data.adminSettings = { ...this.data.adminSettings, ...newSettings };
    this.persistAndNotify();
    return this.data.adminSettings;
  }

  // Reset tool
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.loadInitialData();
    this.persistAndNotify();
  }
}

export const StorageService = new StorageServiceClass();
