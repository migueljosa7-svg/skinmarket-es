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
  },
  {
    id: "inv_5",
    name: "★ Butterfly Knife | Doppler",
    weapon: "★ Butterfly Knife",
    skin_name: "Doppler",
    price: 1450.00,
    rarity: "Extraordinary",
    wear: "Factory New",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_6",
    name: "AK-47 | Vulcan",
    weapon: "AK-47",
    skin_name: "Vulcan",
    price: 210.00,
    rarity: "Covert",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_7",
    name: "Desert Eagle | Code Red",
    weapon: "Desert Eagle",
    skin_name: "Code Red",
    price: 18.75,
    rarity: "Classified",
    wear: "Minimal Wear",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_8",
    name: "StatTrak™ M4A1-S | Hyper Beast",
    weapon: "M4A1-S",
    skin_name: "Hyper Beast",
    price: 42.50,
    rarity: "Covert",
    wear: "Battle-Scarred",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_9",
    name: "SSG 08 | Dragonfire",
    weapon: "SSG 08",
    skin_name: "Dragonfire",
    price: 7.50,
    rarity: "Classified",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_10",
    name: "Glock-18 | Water Elemental",
    weapon: "Glock-18",
    skin_name: "Water Elemental",
    price: 8.50,
    rarity: "Restricted",
    wear: "Factory New",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_11",
    name: "FAMAS | Eye of Athena",
    weapon: "FAMAS",
    skin_name: "Eye of Athena",
    price: 5.25,
    rarity: "Restricted",
    wear: "Factory New",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_12",
    name: "P250 | Asiimov",
    weapon: "P250",
    skin_name: "Asiimov",
    price: 15.00,
    rarity: "Restricted",
    wear: "Minimal Wear",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_13",
    name: "USP-S | Neo-Noir",
    weapon: "USP-S",
    skin_name: "Neo-Noir",
    price: 9.80,
    rarity: "Restricted",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_14",
    name: "AK-47 | Frontside Misty",
    weapon: "AK-47",
    skin_name: "Frontside Misty",
    price: 22.50,
    rarity: "Classified",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "in_inventory"
  },
  {
    id: "inv_15",
    name: "P2000 | Fire Elemental",
    weapon: "P2000",
    skin_name: "Fire Elemental",
    price: 6.30,
    rarity: "Restricted",
    wear: "Field-Tested",
    image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHT4C56M69bqn225W62x34cbWfooUIDTnComB4qu3l0VdCMcvj_4g4p-1Q99K1R_2O2xM2w0iPGbVjJG4t2zlduKx6v3P7WFlT4D6pwk3-rE9Imsi1ayqRJqYTzzcYeQIFQ3YAvR-1K3ybvng5G9vsuYnXBm73Ur5Srdm0K0hEhsbvEr36KXVw",
    acquiredAt: new Date(Date.now() - 3600000 * 8).toISOString(),
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

  // --- PENDING QUEUE (for withdraw requests) ---
  getPendingQueue() {
    return [...(this.data.pendingQueue || [])];
  }

  addToPendingQueue(skinId) {
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

    // Check if user has trade URL configured
    const user = this.getUser();
    if (!user.link_intercambio || !user.link_intercambio.includes('steamcommunity.com')) {
      return {
        success: false,
        error: "trade_url_missing",
        message: "Configura tu Trade URL de Steam en los ajustes de tu perfil antes de retirar."
      };
    }

    this.data.inventory[skinIndex].status = "withdrawn";
    this.persistAndNotify();
    return {
      success: true,
      message: "✅ Propuesta de intercambio enviada a tu Trade URL. Revisa tu Steam."
    };
  }

  /** Exchange a skin for balance (alternative to withdraw) */
  exchangeSkin(skinId) {
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
