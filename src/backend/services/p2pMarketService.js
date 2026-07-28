/**
 * ============================================================
 * SKINMARKET ES - P2P MARKET SERVICE
 * ============================================================
 * External P2P marketplace integration for automated skin
 * purchasing when the bot's own inventory lacks the requested item.
 * 
 * Supported Providers:
 *   - Waxpeer (default)
 *   - ShadowPay
 * 
 * Flow:
 *   1. Search marketplace for cheapest listing of requested skin
 *   2. Purchase the skin using API balance
 *   3. Send trade offer directly to the user's tradeUrl
 * ============================================================
 */

import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const _log = isProd ? () => {} : (...args) => _log(...args);
const _warn = isProd ? () => {} : (...args) => _warn(...args);
const _error = (...args) => _error(...args);

class P2PMarketService {
  constructor() {
    // Provider configuration
    this.provider = process.env.P2P_MARKET_PROVIDER || "waxpeer";
    this.apiKey = process.env.P2P_MARKET_API_KEY || "";
    this.apiSecret = process.env.P2P_MARKET_SECRET || "";

    // API endpoints
    this.endpoints = {
      waxpeer: {
        base: "https://api.waxpeer.com/v1",
        search: "/market/search",
        buy: "/market/buy",
        balance: "/user/balance",
        me: "/user/me",
      },
      shadowpay: {
        base: "https://api.shadowpay.com/api/v2",
        search: "/market/listings/search",
        buy: "/market/listings/buy",
        balance: "/user/balance",
        me: "/user/info",
      },
    };

    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.retryDelay = 2000;

    // Cache for search results (avoid repeated API calls)
    this.searchCache = new Map();
    this.cacheTTL = 30000; // 30 seconds

    _log(`[P2P] Servicio de mercado inicializado. Proveedor: ${this.provider || "ninguno (simulación)"}`);
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Check if the P2P service is configured and available.
   */
  isAvailable() {
    return !!(this.apiKey && this.apiKey !== "tu_api_key_aqui");
  }

  /**
   * Search for a skin on the configured P2P marketplace.
   * @param {string} marketHashName - Steam market hash name of the skin
   * @param {object} [options] - Search options
   * @param {number} [options.minPrice] - Minimum price filter
   * @param {number} [options.maxPrice] - Maximum price filter
   * @returns {Promise<Array<{id: string, name: string, price: number, seller: string, wear: string}>>}
   */
  async searchSkin(marketHashName, options = {}) {
    const cacheKey = `${marketHashName}_${JSON.stringify(options)}`;

    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        _log(`[P2P] Usando caché para "${marketHashName}"`);
        return cached.data;
      }
      this.searchCache.delete(cacheKey);
    }

    await this._enforceRateLimit();

    try {
      let results;

      if (this.isAvailable()) {
        switch (this.provider) {
          case "waxpeer":
            results = await this._searchWaxpeer(marketHashName, options);
            break;
          case "shadowpay":
            results = await this._searchShadowPay(marketHashName, options);
            break;
          default:
            results = this._simulateSearch(marketHashName, options);
        }
      } else {
        _log(`[P2P] API no configurada. Usando datos simulados para "${marketHashName}".`);
        results = this._simulateSearch(marketHashName, options);
      }

      // Sort by price ascending (cheapest first)
      results.sort((a, b) => a.price - b.price);

      // Cache result
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      _log(`[P2P] Búsqueda para "${marketHashName}": ${results.length} resultados. Más barato: €${results[0]?.price?.toFixed(2) || "N/A"}`);
      return results;
    } catch (err) {
      _error(`[P2P] Error en búsqueda de "${marketHashName}":`, err.message);
      // Fallback to simulated data on API error
      const fallback = this._simulateSearch(marketHashName, options);
      _log(`[P2P] Usando datos de respaldo (simulados) para "${marketHashName}"`);
      return fallback;
    }
  }

  /**
   * Purchase a skin from the marketplace and send it to a user.
   * @param {string} listingId - The marketplace listing ID to purchase
   * @param {string} marketHashName - Steam market hash name
   * @param {string} partnerSteamID64 - Recipient's SteamID64
   * @param {string} tradeToken - Recipient's trade token
   * @param {number} maxPrice - Maximum acceptable price
   * @returns {Promise<{success: boolean, offerId?: string, price?: number, error?: string}>}
   */
  async purchaseAndSend(listingId, marketHashName, partnerSteamID64, tradeToken, maxPrice) {
    _log(`[P2P] Iniciando compra de "${marketHashName}" (listing: ${listingId}) para ${partnerSteamID64}...`);

    await this._enforceRateLimit();

    // Check API balance first
    const balance = await this.getBalance();
    if (balance < maxPrice) {
      return {
        success: false,
        error: `Saldo P2P insuficiente: €${balance.toFixed(2)} disponible, se necesitan €${maxPrice.toFixed(2)}.`
      };
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        let result;

        if (this.isAvailable()) {
          switch (this.provider) {
            case "waxpeer":
              result = await this._buyWaxpeer(listingId, partnerSteamID64, tradeToken);
              break;
            case "shadowpay":
              result = await this._buyShadowPay(listingId, partnerSteamID64, tradeToken);
              break;
            default:
              result = this._simulatePurchase(listingId, marketHashName, partnerSteamID64, tradeToken, maxPrice);
          }
        } else {
          result = this._simulatePurchase(listingId, marketHashName, partnerSteamID64, tradeToken, maxPrice);
        }

        if (result.success) {
          _log(`[P2P] ✅ Compra exitosa de "${marketHashName}" por €${result.price?.toFixed(2)}. Oferta #${result.offerId}`);
        }

        return result;
      } catch (err) {
        _error(`[P2P] Intento ${attempt + 1}/${this.maxRetries} falló:`, err.message);
        if (attempt < this.maxRetries - 1) {
          await this._sleep(this.retryDelay * (attempt + 1));
        } else {
          return {
            success: false,
            error: `Error después de ${this.maxRetries} intentos: ${err.message}`
          };
        }
      }
    }
  }

  /**
   * Get the P2P marketplace account balance.
   * @returns {Promise<number>} Available balance in EUR
   */
  async getBalance() {
    await this._enforceRateLimit();

    try {
      if (this.isAvailable()) {
        switch (this.provider) {
          case "waxpeer": {
            const response = await this._apiRequest("get", "waxpeer", "balance");
            return parseFloat(response.data?.balance || 0);
          }
          case "shadowpay": {
            const response = await this._apiRequest("get", "shadowpay", "balance");
            return parseFloat(response.data?.balance || 0);
          }
          default:
            return 5000.00; // Simulated balance
        }
      }
      return 5000.00; // Simulated balance for demo
    } catch (err) {
      _error("[P2P] Error al obtener balance:", err.message);
      return 0;
    }
  }

  /**
   * Get P2P service status info.
   */
  getStatus() {
    return {
      provider: this.provider,
      configured: this.isAvailable(),
      simulated: !this.isAvailable(),
      balance: "Consultar vía getBalance()",
      cacheSize: this.searchCache.size,
    };
  }

  // ─── Provider-specific API Calls ────────────────────────────

  /**
   * Search Waxpeer marketplace
   */
  async _searchWaxpeer(marketHashName, options) {
    const response = await this._apiRequest("get", "waxpeer", "search", {
      query: marketHashName,
      limit: 20,
      min_price: options.minPrice || 0,
      max_price: options.maxPrice || 10000,
    });

    if (!response.data?.items) return [];

    return response.data.items
      .filter((item) => {
        const nameMatch = item.market_hash_name
          ?.toLowerCase()
          .includes(marketHashName.toLowerCase());
        return nameMatch && item.price > 0;
      })
      .map((item) => ({
        id: item.id?.toString(),
        marketplaceId: item.id?.toString(),
        name: item.market_hash_name || marketHashName,
        price: parseFloat((item.price || 0) / 100), // Convert cents to EUR
        seller: item.seller || "Desconocido",
        wear: item.wear || "Field-Tested",
        float: item.float,
        instant: item.instant_sale || false,
      }));
  }

  /**
   * Search ShadowPay marketplace
   */
  async _searchShadowPay(marketHashName, options) {
    const response = await this._apiRequest("get", "shadowpay", "search", {
      search: marketHashName,
      sort: "price_asc",
      currency: "EUR",
      limit: 20,
    });

    if (!response.data?.listings) return [];

    return response.data.listings
      .filter((item) => {
        const nameMatch = item.name
          ?.toLowerCase()
          .includes(marketHashName.toLowerCase());
        return nameMatch && item.price > 0;
      })
      .map((item) => ({
        id: item.id?.toString(),
        marketplaceId: item.id?.toString(),
        name: item.name || marketHashName,
        price: parseFloat(item.price || 0),
        seller: item.seller_steam_id || "Desconocido",
        wear: item.wear || "Field-Tested",
        float: item.float_value,
        instant: item.instant_trade || false,
      }));
  }

  /**
   * Buy from Waxpeer
   */
  async _buyWaxpeer(listingId, partnerSteamID64, tradeToken) {
    const response = await this._apiRequest("post", "waxpeer", "buy", {
      item_id: listingId,
      trade_url: `https://steamcommunity.com/tradeoffer/new/?partner=${partnerSteamID64}&token=${tradeToken}`,
    });

    if (response.data?.success) {
      return {
        success: true,
        offerId: response.data.offer_id?.toString() || `wp_offer_${Date.now()}`,
        price: parseFloat(response.data.price || 0) / 100,
      };
    }

    throw new Error(response.data?.error || "Error en compra Waxpeer");
  }

  /**
   * Buy from ShadowPay
   */
  async _buyShadowPay(listingId, partnerSteamID64, tradeToken) {
    const response = await this._apiRequest("post", "shadowpay", "buy", {
      listing_id: listingId,
      trade_url: `https://steamcommunity.com/tradeoffer/new/?partner=${partnerSteamID64}&token=${tradeToken}`,
      auto_confirmation: true,
    });

    if (response.data?.success) {
      return {
        success: true,
        offerId: response.data.trade_offer_id?.toString() || `sp_offer_${Date.now()}`,
        price: parseFloat(response.data.price || 0),
      };
    }

    throw new Error(response.data?.error || "Error en compra ShadowPay");
  }

  // ─── Generic API Request Handler ────────────────────────────

  async _apiRequest(method, provider, endpoint, data = {}) {
    const config = this.endpoints[provider];
    if (!config) throw new Error(`Proveedor desconocido: ${provider}`);

    const url = `${config.base}${config[endpoint]}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
      "User-Agent": "SkinMarketES/1.0",
    };

    // Add signature for providers that require it
    if (this.apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac("sha256", this.apiSecret)
        .update(`${timestamp}${method}${endpoint}${JSON.stringify(data)}`)
        .digest("hex");
      headers["X-Timestamp"] = timestamp;
      headers["X-Signature"] = signature;
    }

    const options = {
      method: method.toUpperCase(),
      headers,
    };

    if (method === "post" && Object.keys(data).length > 0) {
      options.body = JSON.stringify(data);
    }

    _log(`[P2P API] ${method.toUpperCase()} ${url}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${provider} respondió ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  // ─── Simulation Methods (Fallback) ──────────────────────────

  _simulateSearch(marketHashName, options) {
    // Generate realistic simulated listings based on skin name rarity
    const basePrice = this._estimatePrice(marketHashName);
    const count = Math.floor(Math.random() * 8) + 3; // 3-10 listings
    const results = [];

    const wears = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
    const wearMultipliers = { "Factory New": 1.0, "Minimal Wear": 0.85, "Field-Tested": 0.7, "Well-Worn": 0.55, "Battle-Scarred": 0.4 };

    for (let i = 0; i < count; i++) {
      const wear = wears[Math.floor(Math.random() * wears.length)];
      const wearMult = wearMultipliers[wear] || 0.7;
      const priceVariance = 0.9 + Math.random() * 0.3; // 0.9x - 1.2x
      const price = parseFloat((basePrice * wearMult * priceVariance).toFixed(2));

      if (options.minPrice && price < options.minPrice) continue;
      if (options.maxPrice && price > options.maxPrice) continue;

      results.push({
        id: `sim_listing_${i}_${Date.now()}`,
        marketplaceId: `sim_${i}_${Date.now()}`,
        name: marketHashName,
        price,
        seller: `Seller_${Math.random().toString(36).substr(2, 8)}`,
        wear,
        float: parseFloat((Math.random() * 0.5 + 0.01).toFixed(4)),
        instant: Math.random() > 0.3, // 70% chance of instant trade
        simulated: true,
      });
    }

    return results;
  }

  _simulatePurchase(listingId, marketHashName, partnerSteamID64, tradeToken, maxPrice) {
    const price = parseFloat((maxPrice * (0.85 + Math.random() * 0.15)).toFixed(2));
    const delay = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds

    // Simulate async processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          offerId: `sim_p2p_offer_${Date.now()}`,
          price,
          simulated: true,
          message: `Skin adquirida en mercado P2P (simulado) por €${price.toFixed(2)}. Oferta enviada a tu Steam.`,
        });
      }, delay);
    });
  }

  /**
   * Estimate a market price based on the skin name keywords.
   */
  _estimatePrice(marketHashName) {
    const name = marketHashName || "";
    const lower = name.toLowerCase();

    // Price estimation based on keywords
    if (lower.includes("★") || lower.includes("knife") || lower.includes("gloves") || lower.includes("★ ")) {
      if (lower.includes("doppler") || lower.includes("fade") || lower.includes("marble")) return 350 + Math.random() * 800;
      if (lower.includes("crimson") || lower.includes("tiger") || lower.includes("slaughter")) return 200 + Math.random() * 400;
      return 100 + Math.random() * 200;
    }
    if (lower.includes("ak-47") || lower.includes("ak47")) {
      if (lower.includes("redline") || lower.includes("vulcan") || lower.includes("fire serpent")) return 40 + Math.random() * 200;
      if (lower.includes("asiimov") || lower.includes("frontside")) return 15 + Math.random() * 30;
      return 5 + Math.random() * 20;
    }
    if (lower.includes("awp")) {
      if (lower.includes("dragon lore") || lower.includes("gungnir")) return 500 + Math.random() * 1500;
      if (lower.includes("asiimov") || lower.includes("therus") || lower.includes("wildfire")) return 30 + Math.random() * 100;
      return 10 + Math.random() * 30;
    }
    if (lower.includes("m4a1") || lower.includes("m4a4")) {
      if (lower.includes("howl") || lower.includes("hot rod") || lower.includes("neo-noir")) return 30 + Math.random() * 80;
      return 5 + Math.random() * 25;
    }
    if (lower.includes("desert") || lower.includes("deagle")) {
      if (lower.includes("blaze") || lower.includes("hand cannon")) return 15 + Math.random() * 40;
      return 2 + Math.random() * 15;
    }
    if (lower.includes("usp") || lower.includes("glock")) {
      return 2 + Math.random() * 20;
    }

    // Default: common skin
    return 1 + Math.random() * 10;
  }

  // ─── Utility ────────────────────────────────────────────────

  async _enforceRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await this._sleep(this.minRequestInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
const p2pMarketService = new P2PMarketService();
export default p2pMarketService;

