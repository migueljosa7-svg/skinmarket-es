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
 * Dependencies: steam-user, steamcommunity, steam-totp, steam-tradeoffer-manager
 * ============================================================
 */

import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamTotp from 'steam-totp';
import dotenv from 'dotenv';

dotenv.config();

class BotEngine {
    constructor() {
        // Steam client instances
        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en',
            // Poll interval for incoming offers (ms)
            pollInterval: 10000
        });

        // Bot state
        this.isLoggedIn = false;
        this.isReady = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.reconnectTimer = null;
        this.currentBackoff = 1000; // Start with 1 second
        this.maxBackoff = 60000;    // Max 60 seconds

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
        this.inventoryCacheTTL = 60000; // 1 minute

        // Bind event handlers
        this._bindEvents();
    }

    // ============================================================
    // PUBLIC METHODS
    // ============================================================

    /**
     * Start the bot login process
     * @returns {boolean} Whether login was initiated
     */
    logIn() {
        // Check if credentials are configured
        if (!this._credentialsAreValid()) {
            console.warn('[BOT ENGINE] ⚠️ Credenciales no configuradas. Modo SIMULACIÓN activado.');
            console.warn('[BOT ENGINE] Configura BOT_USERNAME, BOT_PASSWORD, BOT_SHARED_SECRET y BOT_IDENTITY_SECRET en .env');
            return false;
        }

        console.log(`[BOT ENGINE] 🔑 Iniciando sesión en Steam como ${this.credentials.accountName}...`);
        console.log(`[BOT ENGINE] Intento #${this.loginAttempts + 1}`);

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
            console.error('[BOT ENGINE] ❌ Error generando código 2FA:', err.message);
            this._scheduleReconnect();
            return false;
        }
    }

    /**
     * Send a withdrawal trade offer to a user
     * @param {string} partnerSteamID64 - The target user's SteamID64
     * @param {string} tradeToken - The user's trade token
     * @param {string} itemMarketHashName - The item's market hash name
     * @returns {Promise<{success: boolean, offerId?: string, error?: string}>}
     */
    async sendWithdrawOffer(partnerSteamID64, tradeToken, itemName, marketHashName) {
        // Check if bot is ready
        if (!this.isLoggedIn || !this.isReady) {
            console.warn('[BOT ENGINE] ⚠️ Bot no conectado. Añadiendo a cola de retiros.');
            return this._enqueueWithdrawal(partnerSteamID64, tradeToken, itemName, marketHashName);
        }

        try {
            // Verify bot has the item in inventory - try by market_hash_name first, then by name
            let itemInBot = await this._findItemInBotInventory(marketHashName || itemName);

            // If not found by market hash, try searching by partial name match
            if (!itemInBot && itemName) {
                console.log(`[BOT ENGINE] 🔍 Buscando por nombre alternativo: ${itemName}`);
                itemInBot = await this._findItemByPartialName(itemName);
            }

            if (!itemInBot) {
                console.warn(`[BOT ENGINE] ⚠️ El bot NO tiene "${itemName}" (${marketHashName}) en su inventario.`);
                return {
                    success: false,
                    error: `El bot no posee el objeto "${itemName}". Inventario del bot insuficiente.`
                };
            }

            // Create and send the offer
            console.log(`[BOT ENGINE] 📤 Creando oferta para: ${itemInBot.market_hash_name || itemName}`);
            const offerId = await this._createAndSendOffer(partnerSteamID64, tradeToken, [itemInBot]);

            console.log(`[BOT ENGINE] ✅ Oferta #${offerId} enviada exitosamente a ${partnerSteamID64}`);
            return {
                success: true,
                offerId: offerId,
                message: `Oferta #${offerId} enviada y confirmada.`
            };
        } catch (err) {
            console.error(`[BOT ENGINE] ❌ Error al enviar oferta de retiro:`, err.message);

            // Enqueue for retry if it's not a permanent error
            if (this._isRetryableError(err)) {
                console.log('[BOT ENGINE] ⏳ Error recuperable. Añadiendo a cola para reintentar.');
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
     * @returns {object} Bot status object
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
     * @returns {Promise<Array>} Array of items in bot's inventory
     */
    async refreshInventory() {
        if (!this.isLoggedIn) {
            throw new Error('Bot no está conectado');
        }

        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(
                this.client.steamID,
                730, // AppID: CS2
                2,   // ContextID: 2 (inventory)
                true, // Tradeable only
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
        // --- SteamUser Events ---
        this.client.on('loggedOn', (details) => {
            console.log('[BOT ENGINE] ✅ Conectado a Steam');
            console.log(`[BOT ENGINE] SteamID: ${this.client.steamID.getSteamID64()}`);

            // Set online status
            this.client.setPersona(SteamUser.EPersonaState.Online);
            this.isLoggedIn = true;
            this.loginAttempts = 0;
            this.currentBackoff = 1000;
            this.lastActivity = Date.now();
        });

        this.client.on('webSession', (sessionID, cookies) => {
            console.log('[BOT ENGINE] 🌐 WebSession establecida');
            this.manager.setCookies(cookies);
            this.community.setCookies(cookies, (err) => {
                if (err) {
                    console.error('[BOT ENGINE] ❌ Error configurando cookies en comunidad:', err.message);
                    return;
                }
                this.isReady = true;
                this.lastActivity = Date.now();
                console.log('[BOT ENGINE] ✅ Bot completamente listo para operar');

                // Refresh inventory upon ready
                this.refreshInventory().catch(err => {
                    console.warn('[BOT ENGINE] ⚠️ No se pudo cargar inventario inicial:', err.message);
                });
            });
        });

        this.client.on('error', (err) => {
            console.error(`[BOT ENGINE] ❌ Error de conexión Steam:`, err.message);
            this.isLoggedIn = false;
            this.isReady = false;
            this.lastActivity = Date.now();

            // Handle specific error codes
            switch (err.eresult) {
                case SteamUser.EResult.InvalidPassword:
                    console.error('[BOT ENGINE] 🔴 ERROR: Contraseña o usuario incorrecto en .env');
                    break;
                case SteamUser.EResult.TwoFactorCodeMismatch:
                    console.error('[BOT ENGINE] 🔴 ERROR: Código 2FA incorrecto. Verifica BOT_SHARED_SECRET');
                    break;
                case SteamUser.EResult.LoggedInElsewhere:
                    console.warn('[BOT ENGINE] ⚠️ Sesión iniciada en otro lugar');
                    break;
                case SteamUser.EResult.RateLimitExceeded:
                    console.error('[BOT ENGINE] 🔴 ERROR: Límite de velocidad excedido. Esperando...');
                    this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoff);
                    break;
                default:
                    console.error(`[BOT ENGINE] EResult: ${err.eresult} (${err.message})`);
            }

            if (this.loginAttempts < this.maxLoginAttempts) {
                this._scheduleReconnect();
            } else {
                console.error('[BOT ENGINE] 🔴 Se alcanzó el máximo de intentos de reconexión.');
            }
        });

        this.client.on('disconnected', (eresult) => {
            console.log(`[BOT ENGINE] 📴 Desconectado (EResult: ${eresult}). Reconnectando...`);
            this.isLoggedIn = false;
            this.isReady = false;
            this._scheduleReconnect();
        });

        // --- TradeOfferManager Events ---

        this.manager.on('newOffer', (offer) => {
            console.log(`[BOT ENGINE] 📩 Nueva oferta recibida #${offer.id} de ${offer.partner.getSteamID64()}`);

            // Auto-accept incoming offers? (configurable)
            // For security, we'll just log them by default
            if (offer.isGloballyCanceled()) return;

            // Accept offer if it's from a trusted source (all items going TO bot)
            // In a real scenario, you'd check if the offer is depositing items
            console.log(`[BOT ENGINE] Oferta #${offer.id}: ${offer.message || 'Sin mensaje'}`);

            // Log the offer items
            offer.itemsToReceive.forEach(item => {
                console.log(`  → Recibiendo: ${item.market_hash_name}`);
            });
            offer.itemsToGive.forEach(item => {
                console.log(`  → Enviando: ${item.market_hash_name}`);
            });
        });

        this.manager.on('sentOfferChanged', (offer, oldState) => {
            console.log(`[BOT ENGINE] 🔄 Estado de oferta #${offer.id} cambiado: ${offer.state}`);
            if (offer.state === TradeOfferManager.EOfferState.Accepted) {
                console.log(`[BOT ENGINE] ✅ Oferta #${offer.id} ACEPTADA por el usuario`);
                this.lastActivity = Date.now();
            } else if (offer.state === TradeOfferManager.EOfferState.Declined) {
                console.log(`[BOT ENGINE] ❌ Oferta #${offer.id} RECHAZADA por el usuario`);
            } else if (offer.state === TradeOfferManager.EOfferState.Canceled) {
                console.log(`[BOT ENGINE] ↩️ Oferta #${offer.id} CANCELADA`);
            } else if (offer.state === TradeOfferManager.EOfferState.Expired) {
                console.log(`[BOT ENGINE] ⏰ Oferta #${offer.id} EXPIRADA`);
            }
        });

        this.manager.on('receivedOfferChanged', (offer, oldState) => {
            console.log(`[BOT ENGINE] 🔄 Oferta recibida #${offer.id} estado: ${offer.state}`);
        });
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    /**
     * Check if credentials are valid (not placeholder values)
     */
    _credentialsAreValid() {
        const { accountName, password, sharedSecret, identitySecret } = this.credentials;
        if (!accountName || !password || !sharedSecret || !identitySecret) return false;
        if (accountName === 'tu_usuario_steam' || password === 'tu_password_steam') return false;
        return true;
    }

    /**
     * Schedule automatic reconnection with exponential backoff
     */
    _scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const backoff = this.currentBackoff;
        console.log(`[BOT ENGINE] ⏳ Reconnectando en ${backoff / 1000} segundos...`);

        this.reconnectTimer = setTimeout(() => {
            console.log('[BOT ENGINE] 🔄 Intentando reconexión...');
            this.logIn();

            // Exponential backoff with jitter
            const jitter = Math.random() * 1000;
            this.currentBackoff = Math.min(
                (this.currentBackoff * 2) + jitter,
                this.maxBackoff
            );
        }, backoff);
    }

    /**
     * Enqueue a withdrawal for sequential processing
     */
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
            console.log(`[BOT ENGINE] 📋 Retiro #${withdrawal.id} añadido a la cola (posición ${this.withdrawalQueue.length})`);

            if (!this.isProcessingQueue) {
                this._processQueue();
            }
        });
    }

    /**
     * Process the withdrawal queue sequentially
     */
    async _processQueue() {
        if (this.isProcessingQueue || this.withdrawalQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        console.log(`[BOT ENGINE] 🔄 Procesando cola de retiros (${this.withdrawalQueue.length} pendientes)...`);

        while (this.withdrawalQueue.length > 0) {
            const withdrawal = this.withdrawalQueue[0];

            try {
                const client = this.client;
                if (!this.isLoggedIn || !this.isReady) {
                    // Wait for reconnection
                    console.log('[BOT ENGINE] ⏸️ Bot desconectado. Pausando cola...');
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
                    this.withdrawalQueue.shift(); // Remove from queue
                    console.log(`[BOT ENGINE] ✅ Retiro #${withdrawal.id} completado exitosamente`);
                } else {
                    // Retry logic
                    withdrawal.retries++;
                    if (withdrawal.retries >= withdrawal.maxRetries) {
                        withdrawal.status = 'failed';
                        withdrawal.reject(new Error(result.error || 'Máximo de reintentos alcanzado'));
                        this.withdrawalQueue.shift();
                        console.error(`[BOT ENGINE] ❌ Retiro #${withdrawal.id} falló después de ${withdrawal.retries} intentos`);
                    } else {
                        withdrawal.status = 'retrying';
                        console.log(`[BOT ENGINE] 🔄 Reintentando retiro #${withdrawal.id} (intento ${withdrawal.retries}/${withdrawal.maxRetries})`);
                        // Wait before retrying
                        await this._sleep(5000);
                    }
                }
            } catch (err) {
                withdrawal.reject(err);
                this.withdrawalQueue.shift();
                console.error(`[BOT ENGINE] ❌ Error fatal en retiro #${withdrawal.id}:`, err.message);
            }
        }

        this.isProcessingQueue = false;

        if (this.withdrawalQueue.length > 0) {
            // If there are still items (due to disconnect), wait and retry
            console.log(`[BOT ENGINE] ⏳ ${this.withdrawalQueue.length} retiros restantes en cola. Reintentando en 10s...`);
            setTimeout(() => this._processQueue(), 10000);
        }
    }

    /**
     * Find an item in the bot's cached inventory by exact market_hash_name match
     */
    _findItemInBotInventory(marketHashName) {
        return new Promise((resolve, reject) => {
            // Check if cache is stale
            const cacheAge = Date.now() - this.lastInventoryFetch;
            if (cacheAge > this.inventoryCacheTTL) {
                // Refresh inventory
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

    /**
     * Find an item by partial name match (fallback when exact market_hash_name fails)
     */
    _findItemByPartialName(itemName) {
        return new Promise((resolve, reject) => {
            const cacheAge = Date.now() - this.lastInventoryFetch;
            if (cacheAge > this.inventoryCacheTTL) {
                this.refreshInventory()
                    .then(() => {
                        // Try case-insensitive partial match
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

    /**
     * Create and send a trade offer with items
     */
    _createAndSendOffer(partnerSteamID64, token, items) {
        return new Promise((resolve, reject) => {
            const offer = this.manager.createOffer(partnerSteamID64, token);
            items.forEach(item => offer.addMyItem(item));
            offer.setMessage('Retiro de objetos desde SkinMarket ES');

            offer.send((err, status) => {
                if (err) return reject(err);

                if (status === 'pending') {
                    // Confirmation required (mobile auth)
                    console.log(`[BOT ENGINE] 🔐 Oferta #${offer.id} pendiente de confirmación 2FA...`);

                    this.community.acceptConfirmationForObject(
                        this.credentials.identitySecret,
                        offer.id,
                        (err) => {
                            if (err) {
                                console.error(`[BOT ENGINE] ❌ Error confirmando oferta #${offer.id}:`, err.message);
                                return reject(new Error(`No se pudo confirmar la oferta #${offer.id}: ${err.message}`));
                            }
                            console.log(`[BOT ENGINE] ✅ Oferta #${offer.id} confirmada automáticamente`);
                            resolve(offer.id);
                        }
                    );
                } else {
                    // No confirmation needed (already confirmed or Steam guard not enabled)
                    console.log(`[BOT ENGINE] ✅ Oferta #${offer.id} enviada (estado: ${status})`);
                    resolve(offer.id);
                }
            });
        });
    }

    /**
     * Check if an error is retryable
     */
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

    /**
     * Get bot uptime
     */
    _getUptime() {
        if (!this._startTime) {
            this._startTime = Date.now();
        }
        return Math.floor((Date.now() - this._startTime) / 1000);
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const botEngine = new BotEngine();
export default botEngine;

