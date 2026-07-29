/**
 * ============================================================
 * SKINMARKET ES - STEAM BOT ENGINE
 * ============================================================
 * Production-grade Steam Bot for automated trade management.
 * 
 * Features:
 * - Auto-login with 2FA code generation (steam-totp)
 * - Automatic reconnection with exponential backoff
 * - Trade offer sending with auto-confirmation
 * - Withdrawal queue for sequential processing
 * - Inventory verification before sending offers
 * - Detailed logging and health reporting
 * - Graceful error recovery
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
            pollInterval: 10000
        });

        // Bot state
        this.isLoggedIn = false;
        this.isReady = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.reconnectTimer = null;
        this.currentBackoff = 1000;
        this.maxBackoff = 60000;
        this.rateLimitExceeded = false;
        this.rateLimitCooldown = null;

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

        // Bot inventory cache
        this.botInventory = [];
        this.lastInventoryFetch = 0;
        this.inventoryCacheTTL = 60000;

        // Bind event handlers
        this._bindEvents();
    }

    // ============================================================
    // PUBLIC METHODS
    // ============================================================

    /**
     * Start the bot login process (steam-user v5 compatible)
     */
    logIn() {
        // Prevent login attempts during rate limit cooldown
        if (this.rateLimitExceeded) {
            _warn('[BOT ENGINE] ⚠️ Límite de velocidad excedido. Esperando cooldown...');
            return false;
        }

        if (!this._credentialsAreValid()) {
            _warn('[BOT ENGINE] ⚠️ Credenciales no configuradas. Modo SIMULACIÓN activado.');
            _warn('[BOT ENGINE] Configura BOT_USERNAME, BOT_PASSWORD, BOT_SHARED_SECRET y BOT_IDENTITY_SECRET en .env');
            return false;
        }

        _log(`[BOT ENGINE] 🔑 Iniciando sesión en Steam como ${this.credentials.accountName}...`);
        _log(`[BOT ENGINE] Intento #${this.loginAttempts + 1}`);

        try {
            // steam-user v5: generate 2FA code
            const twoFactorCode = SteamTotp.generateAuthCode(this.credentials.sharedSecret);

            // steam-user v5: logOn with proper format
            this.client.logOn({
                accountName: this.credentials.accountName,
                password: this.credentials.password,
                twoFactorCode: twoFactorCode
            });

            this.loginAttempts++;
            return true;
        } catch (err) {
            _error('[BOT ENGINE] ❌ Error generando código 2FA:', err.message);
            this._scheduleReconnect();
            return false;
        }
    }

    /**
     * Send a withdrawal trade offer to a user
     */
    async sendWithdrawOffer(partnerSteamID64, tradeToken, itemName, marketHashName) {
        // A. Session Recovery: Verify session is active before proceeding
        if (!this._isSessionValid()) {
            _warn('[BOT ENGINE] ⚠️ Sesión expirada. Intentando refrescar...');
            const refreshed = await this._refreshSession();
            if (!refreshed) {
                return {
                    success: false,
                    error: 'Servicio de intercambio de Steam está reconectándose. Inténtalo en unos instantes.'
                };
            }
        }

        if (!this.isLoggedIn || !this.isReady) {
            _warn('[BOT ENGINE] ⚠️ Bot no conectado. Añadiendo a cola de retiros.');
            return this._enqueueWithdrawal(partnerSteamID64, tradeToken, itemName, marketHashName);
        }

        try {
            // C. Verify bot has the item in inventory (AppID 730 / ContextID 2)
            let itemInBot = await this._findItemInBotInventory(marketHashName || itemName);

            if (!itemInBot && itemName) {
                _log(`[BOT ENGINE] 🔍 Buscando por nombre alternativo: ${itemName}`);
                itemInBot = await this._findItemByPartialName(itemName);
            }

            if (!itemInBot) {
                _warn(`[BOT ENGINE] ⚠️ El bot NO tiene "${itemName}" (${marketHashName}) en su inventario.`);
                return {
                    success: false,
                    error: 'El bot de intercambios no dispone de esta skin en stock en este momento.'
                };
            }

            // Create and send the offer
            _log(`[BOT ENGINE] 📤 Creando oferta para: ${itemInBot.market_hash_name || itemName}`);
            const offerId = await this._createAndSendOffer(partnerSteamID64, tradeToken, [itemInBot]);

            _log(`[BOT ENGINE] ✅ Oferta #${offerId} enviada exitosamente a ${partnerSteamID64}`);
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
                error: `Error al enviar oferta: ${err.message}`
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
            lastActivity: this.lastActivity ? new Date(this.lastActivity).toISOString() : null
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

    // ============================================================
    // EVENT HANDLERS (PRIVATE)
    // ============================================================

    _bindEvents() {
        // --- SteamUser Events (v5 compatible) ---
        this.client.on('loggedOn', (details) => {
            _log('[BOT ENGINE] ✅ Conectado a Steam');
            _log(`[BOT ENGINE] SteamID: ${this.client.steamID.getSteamID64()}`);

            // Set online status
            this.client.setPersona(SteamUser.EPersonaState.Online);
            this.isLoggedIn = true;
            this.loginAttempts = 0;
            this.currentBackoff = 1000;
            this.lastActivity = Date.now();
        });

        this.client.on('webSession', (sessionID, cookies) => {
            _log('[BOT ENGINE] 🌐 WebSession establecida');

            // steam-user v5: set cookies on manager
            this.manager.setCookies(cookies);

            this.community.setCookies(cookies, (err) => {
                if (err) {
                    _error('[BOT ENGINE] ❌ Error configurando cookies en comunidad:', err.message);
                    return;
                }
                this.isReady = true;
                this.lastActivity = Date.now();
                _log('[BOT ENGINE] ✅ Bot completamente listo para operar');

                // Refresh inventory upon ready
                this.refreshInventory().catch(err => {
                    _warn('[BOT ENGINE] ⚠️ No se pudo cargar inventario inicial:', err.message);
                });
            });
        });

        this.client.on('error', (err) => {
            _error(`[BOT ENGINE] ❌ Error de conexión Steam:`, err.message);
            this.isLoggedIn = false;
            this.isReady = false;
            this.lastActivity = Date.now();

            // Handle specific error codes
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

            // Only schedule reconnect if not rate limited
            if (!this.rateLimitExceeded && this.loginAttempts < this.maxLoginAttempts) {
                this._scheduleReconnect();
            } else if (this.rateLimitExceeded) {
                _warn('[BOT ENGINE] ⚠️ Reconección bloqueada por RateLimitExceeded. Esperando cooldown...');
            } else {
                _error('[BOT ENGINE] 🔴 Se alcanzó el máximo de intentos de reconexión.');
            }
        });

        this.client.on('disconnected', (eresult, reason) => {
            _log(`[BOT ENGINE] 📴 Desconectado (EResult: ${eresult}). Razón: ${reason || 'N/A'}. Reconnectando...`);
            this.isLoggedIn = false;
            this.isReady = false;
            this._scheduleReconnect();
        });

        // --- TradeOfferManager Events ---

        this.manager.on('newOffer', (offer) => {
            _log(`[BOT ENGINE] 📩 Nueva oferta recibida #${offer.id} de ${offer.partner.getSteamID64()}`);

            if (offer.isGloballyCanceled()) return;

            _log(`[BOT ENGINE] Oferta #${offer.id}: ${offer.message || 'Sin mensaje'}`);

            offer.itemsToReceive.forEach(item => {
                _log(`  → Recibiendo: ${item.market_hash_name}`);
            });
            offer.itemsToGive.forEach(item => {
                _log(`  → Enviando: ${item.market_hash_name}`);
            });
        });

        this.manager.on('sentOfferChanged', (offer, oldState) => {
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

        this.manager.on('receivedOfferChanged', (offer, oldState) => {
            _log(`[BOT ENGINE] 🔄 Oferta recibida #${offer.id} estado: ${offer.state}`);
        });
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    _credentialsAreValid() {
        const { accountName, password, sharedSecret, identitySecret } = this.credentials;
        if (!accountName || !password || !sharedSecret || !identitySecret) return false;
        if (accountName === 'tu_usuario_steam' || password === 'tu_password_steam') return false;
        return true;
    }

    _scheduleReconnect() {
        // Don't schedule reconnect if rate limited
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
     * Activate rate limit cooldown to prevent IP saturation
     * Stops all reconnection attempts for a extended period
     */
    _activateRateLimitCooldown() {
        this.rateLimitExceeded = true;

        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Clear any existing cooldown timer
        if (this.rateLimitCooldown) {
            clearTimeout(this.rateLimitCooldown);
        }

        // Set extended cooldown period (5 minutes)
        const cooldownMs = 5 * 60 * 1000;
        _warn(`[BOT ENGINE] 🚫 Cooldown activado: ${cooldownMs / 1000 / 60} minutos sin intentos de login`);

        this.rateLimitCooldown = setTimeout(() => {
            _log('[BOT ENGINE] ✅ Cooldown finalizado. Reactivando intentos de conexión...');
            this.rateLimitExceeded = false;
            this.rateLimitCooldown = null;
            this.loginAttempts = 0;
            this.currentBackoff = 1000;

            // Attempt to reconnect after cooldown
            this.logIn();
        }, cooldownMs);
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

    _findItemInBotInventory(marketHashName) {
        return new Promise((resolve, reject) => {
            const cacheAge = Date.now() - this.lastInventoryFetch;
            if (cacheAge > this.inventoryCacheTTL) {
                this.refreshInventory()
                    .then(() => {
                        const item = this.botInventory.find(i => i.market_hash_name === marketHashName);
                        resolve(item || null);
                    })
                    .catch(reject);
            } else {
                const item = this.botInventory.find(i => i.market_hash_name === marketHashName);
                resolve(item || null);
            }
        });
    }

    _findItemByPartialName(itemName) {
        return new Promise((resolve, reject) => {
            const cacheAge = Date.now() - this.lastInventoryFetch;
            if (cacheAge > this.inventoryCacheTTL) {
                this.refreshInventory()
                    .then(() => {
                        const searchTerm = itemName.toLowerCase();
                        const item = this.botInventory.find(i =>
                            i.market_hash_name?.toLowerCase().includes(searchTerm) ||
                            i.name?.toLowerCase().includes(searchTerm)
                        );
                        resolve(item || null);
                    })
                    .catch(reject);
            } else {
                const searchTerm = itemName.toLowerCase();
                const item = this.botInventory.find(i =>
                    i.market_hash_name?.toLowerCase().includes(searchTerm) ||
                    i.name?.toLowerCase().includes(searchTerm)
                );
                resolve(item || null);
            }
        });
    }

    _createAndSendOffer(partnerSteamID64, token, items) {
        return new Promise((resolve, reject) => {
            const offer = this.manager.createOffer(partnerSteamID64, token);
            items.forEach(item => offer.addMyItem(item));
            offer.setMessage('Retiro de objetos desde SkinMarket ES');

            offer.send((err, status) => {
                if (err) return reject(err);

                // D. Autoconfirmación Instantánea (Steam Guard 2FA)
                // Always attempt confirmation regardless of status
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
        if (!this._startTime) {
            this._startTime = Date.now();
        }
        return Math.floor((Date.now() - this._startTime) / 1000);
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // A. Session Recovery: Check if session is still valid
    _isSessionValid() {
        return this.isLoggedIn && this.isReady && this.client.steamID;
    }

    // A. Session Recovery: Force refresh web session
    async _refreshSession() {
        return new Promise((resolve) => {
            if (!this.client) {
                return resolve(false);
            }

            // Trigger webSession refresh
            this.client.webSession();

            // Wait up to 10 seconds for session to refresh
            const timeout = setTimeout(() => {
                _warn('[BOT ENGINE] ⏱️ Timeout esperando refresco de sesión');
                resolve(this._isSessionValid());
            }, 10000);

            // Check if session becomes valid
            const checkInterval = setInterval(() => {
                if (this._isSessionValid()) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    _log('[BOT ENGINE] ✅ Sesión refrescada exitosamente');
                    resolve(true);
                }
            }, 1000);

            // Cleanup after max wait
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 11000);
        });
    }
}

// Export singleton instance
const botEngine = new BotEngine();
export default botEngine;