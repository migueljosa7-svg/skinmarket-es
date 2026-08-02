/**
 * ============================================================
 * SKINMARKET ES - STEAM BOT ENGINE (ON-DEMAND REDESIGN)
 * ============================================================
 * Production-grade Steam Bot for automated trade management.
 * 
 * ON-DEMAND ARCHITECTURE (KeyDrop-style):
 * - NO continuous polling to Steam API
 * - NO auto-login at server startup
 * - Bot connects ONLY when a user requests a withdraw
 * - Inventory loaded from DB cache, NOT from Steam polling
 * - Exponential backoff + cooldown for 429 RateLimit errors
 * - Session reuse across multiple withdraws within same window
 * 
 * Dependencies: steam-user v5, steamcommunity, steam-totp, steam-tradeoffer-manager
 * ============================================================
 */

import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamTotp from 'steam-totp';
import dotenv from 'dotenv';

dotenv.config();

// ─── Log Silencing (Production) ─────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const _log = isProd ? () => { } : (...args) => console.log(...args);
const _warn = isProd ? () => { } : (...args) => console.warn(...args);
const _error = (...args) => console.error(...args);

class BotEngine {
    constructor() {
        // Steam client instances
        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en',
            pollInterval: 0 // NO POLLING - On-demand only
        });

        // Bot state
        this.isLoggedIn = false;
        this.isReady = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 3;
        this.reconnectTimer = null;
        this.currentBackoff = 1000;
        this.maxBackoff = 60000;
        this.rateLimitExceeded = false;
        this.rateLimitCooldown = null;
        this.rateLimitCooldownLevel = 0; // Track cooldown escalation level
        this.sessionExpiryTimer = null;
        this.lastActivity = null;
        this._startTime = Date.now(); // Start uptime counter immediately

        // Session TTL: auto-disconnect after 15 minutes of inactivity
        this.sessionTTL = 15 * 60 * 1000;

        // Credentials from environment
        this.credentials = {
            accountName: process.env.BOT_USERNAME,
            password: process.env.BOT_PASSWORD,
            sharedSecret: process.env.BOT_SHARED_SECRET,
            identitySecret: process.env.BOT_IDENTITY_SECRET
        };

        // Withdrawal queue
        this.withdrawalQueue = [];
        this.isProcessingQueue = false;

        // Bot inventory cache (loaded from DB, NOT from Steam polling)
        this.botInventory = [];
        this.lastInventoryFetch = 0;
        this.inventoryCacheTTL = 30 * 60 * 1000; // 30 min TTL (KeyDrop-style long cache)

        // Bind event handlers
        this._bindEvents();
    }

    // ============================================================
    // PUBLIC METHODS
    // ============================================================

    /**
     * ON-DEMAND login: Only called when a withdraw is requested.
     * Returns true if already connected, or initiates connection.
     */
    async ensureConnected() {
        // PRODUCTION HARDENING: Validate ALL credentials before any Steam API call
        const configCheck = this._validateCredentialsStrict();
        if (!configCheck.valid) {
            _error(`[BOT ENGINE] 🔴 CONFIG_MISSING: ${configCheck.missing.join(', ')}`);
            return configCheck; // Returns { success: false, error, code: 'CONFIG_MISSING' }
        }

        // If already connected and session valid, reuse it
        if (this._isSessionValid()) {
            this._refreshSessionTTL();
            return true;
        }

        // If rate limited, don't attempt
        if (this.rateLimitExceeded) {
            _warn('[BOT ENGINE] ⚠️ Límite de velocidad excedido. Esperando cooldown...');
            return false;
        }

        if (!this._credentialsAreValid()) {
            _warn('[BOT ENGINE] ⚠️ Credenciales no configuradas. Modo SIMULACIÓN activado.');
            return false;
        }

        // Initiate login
        _log(`[BOT ENGINE] 🔑 Iniciando sesión bajo demanda como ${this.credentials.accountName}...`);
        this.logIn();

        // Wait for connection (up to 30 seconds)
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isLoggedIn && this.isReady) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    this._refreshSessionTTL();
                    _log('[BOT ENGINE] ✅ Conexión bajo demanda establecida');
                    resolve(true);
                }
            }, 500);

            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                _warn('[BOT ENGINE] ⏱️ Timeout esperando conexión bajo demanda');
                resolve(false);
            }, 30000);
        });
    }

    /**
     * Start the bot login process (steam-user v5 compatible)
     */
    logIn() {
        if (this.rateLimitExceeded) {
            _warn('[BOT ENGINE] ⚠️ Límite de velocidad excedido. Esperando cooldown...');
            return false;
        }

        if (!this._credentialsAreValid()) {
            _warn('[BOT ENGINE] ⚠️ Credenciales no configuradas. Modo SIMULACIÓN activado.');
            return false;
        }

        _log(`[BOT ENGINE] 🔑 Iniciando sesión en Steam como ${this.credentials.accountName}...`);
        _log(`[BOT ENGINE] Intento #${this.loginAttempts + 1}`);

        try {
            const twoFactorCode = SteamTotp.generateAuthCode(this.credentials.sharedSecret);
            this.client.logOn({
                accountName: this.credentials.accountName,
                password: this.credentials.password,
                twoFactorCode: twoFactorCode
            });
            this.loginAttempts++;
            return true;
        } catch (err) {
            _error('[BOT ENGINE] ❌ Error generando código 2FA:', err.message);
            return false;
        }
    }

    /**
     * Send a withdrawal trade offer to a user (ON-DEMAND)
     */
    async sendWithdrawOffer(partnerSteamID64, tradeToken, itemName, marketHashName) {
        // Ensure bot is connected (on-demand login)
        const connected = await this.ensureConnected();
        // connected can be: true (OK), false (not available), or { success: false, code: 'CONFIG_MISSING', ... }
        if (!connected || (typeof connected === 'object' && !connected.success)) {
            const errorCode = connected?.code || 'BOT_UNAVAILABLE';
            const errorMsg = connected?.error || 'Servicio de intercambio de Steam no está disponible en este momento. Inténtalo más tarde.';
            return {
                success: false,
                error: errorMsg,
                code: errorCode
            };
        }

        try {
            // Verify bot has the item in inventory (AppID 730 / ContextID 2)
            let itemInBot = await this._findItemInBotInventory(marketHashName || itemName);

            if (!itemInBot && itemName) {
                _log(`[BOT ENGINE] 🔍 Buscando por nombre alternativo: ${itemName}`);
                itemInBot = await this._findItemByPartialName(itemName);
            }

            if (!itemInBot) {
                _warn(`[BOT ENGINE] ⚠️ El bot NO tiene "${itemName}" (${marketHashName}) en su inventario.`);
                return {
                    success: false,
                    error: 'El bot de intercambios no dispone de esta skin en stock en este momento.',
                    code: 'ITEM_OUT_OF_STOCK'
                };
            }

            // Create and send the offer
            _log(`[BOT ENGINE] 📤 Creando oferta para: ${itemInBot.market_hash_name || itemName}`);
            const offerId = await this._createAndSendOffer(partnerSteamID64, tradeToken, [itemInBot]);

            _log(`[BOT ENGINE] ✅ Oferta #${offerId} enviada exitosamente a ${partnerSteamID64}`);
            this._refreshSessionTTL();
            return {
                success: true,
                offerId: offerId,
                message: 'Oferta de intercambio enviada a tu cuenta de Steam.'
            };
        } catch (err) {
            _error(`[BOT ENGINE] ❌ Error al enviar oferta de retiro:`, err.message);

            if (this._isRetryableError(err)) {
                _log('[BOT ENGINE] ⏳ Error recuperable. Añadiendo a cola para reintentar.');
                return this._enqueueWithdrawal(partnerSteamID64, tradeToken, itemName, marketHashName);
            }

            return {
                success: false,
                error: `Error al enviar oferta: ${err.message}`,
                code: 'TRADE_ERROR'
            };
        }
    }

    /**
     * Get the current bot status for health checks
     */
    getStatus() {
        return {
            isLoggedIn: this.isLoggedIn,
            isReady: this.isReady,
            steamID: this.client.steamID ? this.client.steamID.getSteamID64() : null,
            accountName: this.credentials.accountName || 'No configurado',
            uptime: this._getUptime(),
            queueLength: this.withdrawalQueue.length,
            isProcessing: this.isProcessingQueue,
            loginAttempts: this.loginAttempts,
            reconnectBackoff: this.currentBackoff,
            lastActivity: this.lastActivity ? new Date(this.lastActivity).toISOString() : null,
            rateLimitExceeded: this.rateLimitExceeded,
            mode: 'on_demand'
        };
    }

    /**
     * Force refresh the bot's inventory cache
     */
    async refreshInventory() {
        if (!this.isLoggedIn) {
            throw new Error('Bot no está conectado');
        }

        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(
                this.client.steamID,
                730,
                2,
                true,
                (err, items) => {
                    if (err) {
                        return reject(err);
                    }
                    this.botInventory = items || [];
                    this.lastInventoryFetch = Date.now();
                    resolve(this.botInventory);
                }
            );
        });
    }

    /**
     * Disconnect the bot session gracefully (called after inactivity)
     */
    disconnect() {
        _log('[BOT ENGINE] 🔌 Desconectando sesión del bot por inactividad...');
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.sessionExpiryTimer) {
            clearTimeout(this.sessionExpiryTimer);
            this.sessionExpiryTimer = null;
        }
        this.client.logOff();
        this.isLoggedIn = false;
        this.isReady = false;
        this.botInventory = [];
        this.lastInventoryFetch = 0;
    }

    // ============================================================
    // EVENT HANDLERS (PRIVATE)
    // ============================================================

    _bindEvents() {
        this.client.on('loggedOn', () => {
            _log('[BOT ENGINE] ✅ Conectado a Steam (bajo demanda)');
            _log(`[BOT ENGINE] SteamID: ${this.client.steamID.getSteamID64()}`);

            this.client.setPersona(SteamUser.EPersonaState.Online);
            this.isLoggedIn = true;
            this.loginAttempts = 0;
            this.currentBackoff = 1000;
            this.lastActivity = Date.now();
        });

        this.client.on('webSession', (sessionID, cookies) => {
            _log('[BOT ENGINE] 🌐 WebSession establecida');

            this.manager.setCookies(cookies);

            this.community.setCookies(cookies, (err) => {
                if (err) {
                    _error('[BOT ENGINE] ❌ Error configurando cookies en comunidad:', err.message);
                    return;
                }
                this.isReady = true;
                this.lastActivity = Date.now();
                _log('[BOT ENGINE] ✅ Bot completamente listo para operar (bajo demanda)');
                // NOTE: Inventory NOT fetched here - it's loaded ON-DEMAND only
                // when a user requests a withdraw. See _findItemInInventory().
            });
        });

        this.client.on('error', (err) => {
            _error(`[BOT ENGINE] ❌ Error de conexión Steam:`, err.message);
            this.isLoggedIn = false;
            this.isReady = false;
            this.lastActivity = Date.now();

            if (err.eresult !== undefined) {
                switch (err.eresult) {
                    case SteamUser.EResult.InvalidPassword:
                        _error('[BOT ENGINE] 🔴 ERROR: Contraseña o usuario incorrecto en .env');
                        break;
                    case SteamUser.EResult.TwoFactorCodeMismatch:
                        _error('[BOT ENGINE] 🔴 ERROR: Código 2FA incorrecto. Verifica BOT_SHARED_SECRET');
                        break;
                    case SteamUser.EResult.LoggedInElsewhere:
                        _warn('[BOT ENGINE] ⚠️ Sesión iniciada en otro lugar');
                        break;
                    case SteamUser.EResult.RateLimitExceeded:
                        _error('[BOT ENGINE] 🔴 ERROR: Límite de velocidad excedido. Activando cooldown...');
                        this._activateRateLimitCooldown();
                        break;
                    default:
                        _error(`[BOT ENGINE] EResult: ${err.eresult} (${err.message})`);
                }
            }

            // Only schedule reconnect if not rate limited and within max attempts
            if (!this.rateLimitExceeded && this.loginAttempts < this.maxLoginAttempts) {
                this._scheduleReconnect();
            } else if (this.rateLimitExceeded) {
                _warn('[BOT ENGINE] ⚠️ Reconección bloqueada por RateLimitExceeded. Esperando cooldown...');
            } else {
                _error('[BOT ENGINE] 🔴 Se alcanzó el máximo de intentos de reconexión.');
            }
        });

        this.client.on('disconnected', (eresult, reason) => {
            _log(`[BOT ENGINE] 📴 Desconectado (EResult: ${eresult}). Razón: ${reason || 'N/A'}.`);
            this.isLoggedIn = false;
            this.isReady = false;
            // Do NOT auto-reconnect on disconnect - on-demand only
        });

        // --- TradeOfferManager Events ---

        this.manager.on('newOffer', (offer) => {
            _log(`[BOT ENGINE] 📩 Nueva oferta recibida #${offer.id} de ${offer.partner.getSteamID64()}`);

            if (offer.isGloballyCanceled()) return;

            offer.itemsToReceive.forEach(item => {
                _log(`  → Recibiendo: ${item.market_hash_name}`);
            });
            offer.itemsToGive.forEach(item => {
                _log(`  → Enviando: ${item.market_hash_name}`);
            });
        });

        this.manager.on('sentOfferChanged', (offer) => {
            _log(`[BOT ENGINE] 🔄 Estado de oferta #${offer.id} cambiado: ${offer.state}`);
            if (offer.state === TradeOfferManager.EOfferState.Accepted) {
                _log(`[BOT ENGINE] ✅ Oferta #${offer.id} ACEPTADA por el usuario`);
                this.lastActivity = Date.now();
            } else if (offer.state === TradeOfferManager.EOfferState.Declined) {
                _log(`[BOT ENGINE] ❌ Oferta #${offer.id} RECHAZADA por el usuario`);
            } else if (offer.state === TradeOfferManager.EOfferState.Canceled) {
                _log(`[BOT ENGINE] ↩️ Oferta #${offer.id} CANCELADA`);
            } else if (offer.state === TradeOfferManager.EOfferState.Expired) {
                _log(`[BOT ENGINE] ⏰ Oferta #${offer.id} EXPIRADA`);
            }
        });

        this.manager.on('receivedOfferChanged', (offer) => {
            _log(`[BOT ENGINE] 🔄 Oferta recibida #${offer.id} estado: ${offer.state}`);
        });
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    /**
     * PRODUCTION HARDENING: Strict credential validation.
     * Checks all 4 required Steam env vars are present and not placeholder values.
     * Returns { valid: true } or { valid: false, missing: string[] }
     */
    _validateCredentialsStrict() {
        const envVarNameMap = {
            accountName: 'BOT_USERNAME',
            password: 'BOT_PASSWORD',
            sharedSecret: 'BOT_SHARED_SECRET',
            identitySecret: 'BOT_IDENTITY_SECRET'
        };

        const missing = [];
        for (const [field, envName] of Object.entries(envVarNameMap)) {
            const value = process.env[envName];
            if (!value || value.trim() === '' || value === `tu_${field === 'accountName' ? 'usuario' : field}_steam` || value === `your_${field}`) {
                missing.push(envName);
            }
        }

        if (missing.length > 0) {
            return {
                valid: false,
                success: false,
                error: `Configuración de Steam Bot incompleta. Variables faltantes o con valores placeholder: ${missing.join(', ')}. Edita tu archivo .env con credenciales reales de Steam.`,
                code: 'CONFIG_MISSING',
                missing
            };
        }

        return { valid: true };
    }

    _credentialsAreValid() {
        const { accountName, password, sharedSecret, identitySecret } = this.credentials;
        if (!accountName || !password || !sharedSecret || !identitySecret) return false;
        if (accountName === 'tu_usuario_steam' || password === 'tu_password_steam') return false;
        return true;
    }

    _scheduleReconnect() {
        if (this.rateLimitExceeded) {
            _warn('[BOT ENGINE] ⚠️ No se puede reconectar: RateLimitExceeded activo');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const backoff = this.currentBackoff;
        _log(`[BOT ENGINE] ⏳ Reconnectando en ${backoff / 1000} segundos...`);

        this.reconnectTimer = setTimeout(() => {
            _log('[BOT ENGINE] 🔄 Intentando reconexión...');
            this.logIn();

            const jitter = Math.random() * 1000;
            this.currentBackoff = Math.min(
                (this.currentBackoff * 2) + jitter,
                this.maxBackoff
            );
        }, backoff);
    }

    /**
     * Activate rate limit cooldown with exponential backoff
     * Starts at 5 min, doubles each time up to 60 min
     */
    _activateRateLimitCooldown() {
        this.rateLimitExceeded = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.rateLimitCooldown) {
            clearTimeout(this.rateLimitCooldown);
        }

        // Exponential backoff for cooldown: 5min, 10min, 20min, 40min, 60min
        const cooldownLevel = this.rateLimitCooldownLevel || 0;
        const cooldownMinutes = Math.min(5 * Math.pow(2, cooldownLevel), 60);
        const cooldownMs = cooldownMinutes * 60 * 1000;

        this.rateLimitCooldownLevel = cooldownLevel + 1;

        _warn(`[BOT ENGINE] 🚫 Cooldown activado: ${cooldownMinutes} minutos (nivel ${cooldownLevel + 1})`);

        this.rateLimitCooldown = setTimeout(() => {
            _log(`[BOT ENGINE] ✅ Cooldown de ${cooldownMinutes}min finalizado. Reactivando...`);
            this.rateLimitExceeded = false;
            this.rateLimitCooldown = null;
            this.loginAttempts = 0;
            this.currentBackoff = 1000;
            // Do NOT auto-login after cooldown - wait for next on-demand request
        }, cooldownMs);
    }

    _refreshSessionTTL() {
        if (this.sessionExpiryTimer) {
            clearTimeout(this.sessionExpiryTimer);
        }
        // Auto-disconnect after sessionTTL of inactivity
        this.sessionExpiryTimer = setTimeout(() => {
            _log('[BOT ENGINE] ⏰ Sesión expirada por inactividad. Desconectando...');
            this.disconnect();
        }, this.sessionTTL);
    }

    _enqueueWithdrawal(partnerSteamID64, tradeToken, itemName, marketHashName) {
        return new Promise((resolve, reject) => {
            const withdrawal = {
                id: `wd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                partnerSteamID64,
                tradeToken,
                itemName,
                marketHashName,
                retries: 0,
                maxRetries: 3,
                status: 'queued',
                createdAt: new Date(),
                resolve,
                reject
            };

            this.withdrawalQueue.push(withdrawal);
            _log(`[BOT ENGINE] 📋 Retiro #${withdrawal.id} añadido a la cola (posición ${this.withdrawalQueue.length})`);

            if (!this.isProcessingQueue) {
                this._processQueue();
            }
        });
    }

    async _processQueue() {
        if (this.isProcessingQueue || this.withdrawalQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        _log(`[BOT ENGINE] 🔄 Procesando cola de retiros (${this.withdrawalQueue.length} pendientes)...`);

        while (this.withdrawalQueue.length > 0) {
            const withdrawal = this.withdrawalQueue[0];

            try {
                if (!this.isLoggedIn || !this.isReady) {
                    _log('[BOT ENGINE] ⏸️ Bot desconectado. Pausando cola...');
                    break;
                }

                const result = await this.sendWithdrawOffer(
                    withdrawal.partnerSteamID64,
                    withdrawal.tradeToken,
                    withdrawal.itemName,
                    withdrawal.marketHashName
                );

                if (result.success) {
                    withdrawal.status = 'completed';
                    withdrawal.resolve(result);
                    this.withdrawalQueue.shift();
                    _log(`[BOT ENGINE] ✅ Retiro #${withdrawal.id} completado exitosamente`);
                } else {
                    withdrawal.retries++;
                    if (withdrawal.retries >= withdrawal.maxRetries) {
                        withdrawal.status = 'failed';
                        withdrawal.reject(new Error(result.error || 'Máximo de reintentos alcanzado'));
                        this.withdrawalQueue.shift();
                        _error(`[BOT ENGINE] ❌ Retiro #${withdrawal.id} falló después de ${withdrawal.retries} intentos`);
                    } else {
                        withdrawal.status = 'retrying';
                        _log(`[BOT ENGINE] 🔄 Reintentando retiro #${withdrawal.id} (intento ${withdrawal.retries}/${withdrawal.maxRetries})`);
                        await this._sleep(5000);
                    }
                }
            } catch (err) {
                withdrawal.reject(err);
                this.withdrawalQueue.shift();
                _error(`[BOT ENGINE] ❌ Error fatal en retiro #${withdrawal.id}:`, err.message);
            }
        }

        this.isProcessingQueue = false;

        if (this.withdrawalQueue.length > 0) {
            _log(`[BOT ENGINE] ⏳ ${this.withdrawalQueue.length} retiros restantes en cola. Reintentando en 10s...`);
            setTimeout(() => this._processQueue(), 10000);
        }
    }

    /**
     * Ensure bot inventory cache is fresh, then search by predicate.
     * Consolidates the duplicate cache-check logic from _findItemInBotInventory
     * and _findItemByPartialName into a single helper.
     */
    async _findItemInInventory(predicate) {
        const cacheAge = Date.now() - this.lastInventoryFetch;
        if (cacheAge > this.inventoryCacheTTL) {
            await this.refreshInventory();
        }
        return this.botInventory.find(predicate) || null;
    }

    _findItemInBotInventory(marketHashName) {
        return this._findItemInInventory(i => i.market_hash_name === marketHashName);
    }

    _findItemByPartialName(itemName) {
        const searchTerm = itemName.toLowerCase();
        return this._findItemInInventory(i =>
            i.market_hash_name?.toLowerCase().includes(searchTerm) ||
            i.name?.toLowerCase().includes(searchTerm)
        );
    }

    _createAndSendOffer(partnerSteamID64, token, items) {
        return new Promise((resolve, reject) => {
            const offer = this.manager.createOffer(partnerSteamID64, token);
            items.forEach(item => offer.addMyItem(item));
            offer.setMessage('Retiro de objetos desde SkinMarket ES');

            offer.send((err, status) => {
                if (err) return reject(err);

                // Autoconfirmación Instantánea (Steam Guard 2FA)
                this.community.acceptConfirmationGroup(
                    this.credentials.identitySecret,
                    offer.id,
                    (confirmErr) => {
                        if (confirmErr) {
                            _error('[BOT ERROR] Error al autoconfirmar oferta en Steam Guard:', confirmErr);
                        } else {
                            _log('[BOT INFO] Oferta confirmada con éxito en Steam Guard:', offer.id);
                        }
                    }
                );

                if (status === 'pending') {
                    _log(`[BOT ENGINE] 🔐 Oferta #${offer.id} pendiente de confirmación 2FA...`);
                } else {
                    _log(`[BOT ENGINE] ✅ Oferta #${offer.id} enviada (estado: ${status})`);
                }
                resolve(offer.id);
            });
        });
    }

    _isRetryableError(err) {
        const nonRetryableMessages = [
            'does not have',
            'no posee',
            'is not tradable',
            'no es intercambiable',
            'no se puede',
            'cannot trade'
        ];
        return !nonRetryableMessages.some(msg => err.message?.toLowerCase().includes(msg));
    }

    _getUptime() {
        // _startTime is initialized in the constructor, so always available
        return Math.floor((Date.now() - this._startTime) / 1000);
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _isSessionValid() {
        return this.isLoggedIn && this.isReady && this.client.steamID;
    }
}

// Export singleton instance
const botEngine = new BotEngine();
export default botEngine;