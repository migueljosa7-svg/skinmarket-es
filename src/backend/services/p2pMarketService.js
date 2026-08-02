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
const _log = isProd ? () => { } : (...args) => console.log(...args);
const _warn = isProd ? () => { } : (...args) => console.warn(...args);
const _error = (...args) => console.error(...args);

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

    _log(`[P2P] Servicio de mercado inicializado. Proveedor: ${this.provider || "ninguno"}`);
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Check if the P2P service is configured and available.
   */
  isAvailable() {
    return !!(this.apiKey && this.apiKey.length > 0);
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
            throw new Error(`Proveedor P2P no soportado: ${this.provider}`);
        }
      } else {
        throw new Error("P2P Market API no configurada. Configura P2P_MARKET_API_KEY en .env");
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
      throw err;
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
              throw new Error(`Proveedor P2P no soportado: ${this.provider}`);
          }
        } else {
          throw new Error("P2P Market API no configurada");
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
            throw new Error(`Proveedor P2P no soportado: ${this.provider}`);
        }
      }
      throw new Error("P2P Market API no configurada");
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
  async _searchShadowPay(marketHashName) {
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

  // ─── Simulation Methods (REMOVED FOR PRODUCTION) ──────────────────────────

  _simulateSearch() {
    throw new Error("P2P simulation no disponible en producción. Configura P2P_MARKET_API_KEY.");
  }

  _simulatePurchase() {
    throw new Error("P2P simulation no disponible en producción. Configura P2P_MARKET_API_KEY.");
  }

  _estimatePrice() {
    throw new Error("P2P price estimation no disponible en producción.");
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

