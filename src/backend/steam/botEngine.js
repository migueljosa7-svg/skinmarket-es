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
import SteamID from 'steamid';
import SteamTotp from 'steam-totp';
import p2pMarketService from '../services/p2pMarketService.js';
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

        // Last error diagnostics (exposed via /api/bot/status)
        this.lastError = null;
        this.lastErrorCode = null;
        this.lastErrorAt = null;
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
            return {
                success: false,
                code: 'RATE_LIMIT_EXCEEDED',
                error: 'Steam está limitando las solicitudes del bot. Espera unos minutos e intenta de nuevo.'
            };
        }

        if (!this._credentialsAreValid()) {
            const missingFields = [];
            if (!this.credentials.accountName || this.credentials.accountName === 'tu_usuario_steam') missingFields.push('BOT_USERNAME');
            if (!this.credentials.password || this.credentials.password === 'tu_password_steam' || this.credentials.password === 'tu_contraseña_steam') missingFields.push('BOT_PASSWORD');
            if (!this.credentials.sharedSecret || this.credentials.sharedSecret === 'tu_shared_secret') missingFields.push('BOT_SHARED_SECRET');
            if (!this.credentials.identitySecret || this.credentials.identitySecret === 'tu_identity_secret') missingFields.push('BOT_IDENTITY_SECRET');
            _warn(`[BOT ENGINE] ⚠️ Credenciales no configuradas: ${missingFields.join(', ')}`);
            return {
                success: false,
                code: 'CONFIG_MISSING',
                error: `El bot de Steam no está configurado. Variables faltantes o con valores placeholder: ${missingFields.join(', ')}. Contacta al administrador para configurar las credenciales reales de Steam.`
            };
        }

        // Initiate login
        _log(`[BOT ENGINE] 🔑 Iniciando sesión bajo demanda como ${this.credentials.accountName}...`);
        const loginStarted = this.logIn();

        // If login failed immediately (e.g. 2FA code generation error), return specific error
        if (!loginStarted) {
            const lastError = this._getLastError();
            _error(`[BOT ENGINE] ❌ Login no iniciado: ${lastError?.code || 'LOGIN_FAILED'} - ${lastError?.error || 'Error al iniciar sesión en Steam.'}`);
            return {
                success: false,
                code: lastError?.code || 'LOGIN_FAILED',
                error: lastError?.error || 'Error al iniciar sesión en Steam.'
            };
        }

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

                // Fail fast: if a login error was captured (invalid creds, 2FA, etc.)
                // return the specific error instead of waiting for the full timeout.
                if (this.lastError && this.lastErrorAt) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    const err = { code: this.lastErrorCode || 'LOGIN_FAILED', error: this.lastError };
                    _warn(`[BOT ENGINE] ❌ Login falló: ${err.code} - ${err.error}`);
                    resolve({
                        success: false,
                        code: err.code,
                        error: err.error
                    });
                }
            }, 500);

            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                this._setLastError(
                    'LOGIN_TIMEOUT',
                    'El bot de Steam no respondió a tiempo. Es posible que Steam esté limitando solicitudes o que las credenciales del bot no sean válidas.'
                );
                _warn('[BOT ENGINE] ⏱️ Timeout esperando conexión bajo demanda');
                resolve({
                    success: false,
                    code: 'LOGIN_TIMEOUT',
                    error: 'El bot de Steam no respondió a tiempo. Es posible que Steam esté limitando solicitudes o que las credenciales del bot no sean válidas.'
                });
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
            this._clearLastError();
            return true;
        } catch (err) {
            _error('[BOT ENGINE] ❌ Error generando código 2FA:', err.message);
            this._setLastError(
                'INVALID_2FA',
                `Error generando el código 2FA: ${err.message}. Verifica que BOT_SHARED_SECRET sea correcto (debe ser el shared_secret de Steam Desktop Authenticator).`
            );
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
                _log(`[BOT ENGINE] 🔄 Intentando comprar la skin del mercado P2P (Waxpeer/ShadowPay)...`);

                // Try to purchase the skin from the P2P marketplace and send directly to user
                try {
                    if (p2pMarketService.isAvailable()) {
                        _log(`[BOT ENGINE] 🔍 Buscando "${marketHashName || itemName}" en mercado P2P...`);
                        const searchResults = await p2pMarketService.searchSkin(marketHashName || itemName, { maxPrice: 5000 });

                        if (searchResults && searchResults.length > 0) {
                            const cheapest = searchResults[0];
                            _log(`[BOT ENGINE] 💰 Skin encontrada en P2P: €${cheapest.price.toFixed(2)} (ID: ${cheapest.id})`);

                            const purchaseResult = await p2pMarketService.purchaseAndSend(
                                cheapest.id,
                                marketHashName || itemName,
                                partnerSteamID64,
                                tradeToken,
                                cheapest.price * 1.1 // 10% margin max
                            );

                            if (purchaseResult.success) {
                                _log(`[BOT ENGINE] ✅ Compra P2P exitosa. Oferta #${purchaseResult.offerId} enviada directamente a ${partnerSteamID64}`);
                                this._refreshSessionTTL();
                                return {
                                    success: true,
                                    offerId: purchaseResult.offerId,
                                    message: '✅ Skin comprada del mercado y enviada directamente a tu cuenta de Steam.'
                                };
                            } else {
                                _error(`[BOT ENGINE] ❌ Compra P2P falló: ${purchaseResult.error}`);
                                return {
                                    success: false,
                                    error: `No se pudo comprar la skin del mercado: ${purchaseResult.error}`,
                                    code: 'P2P_PURCHASE_FAILED'
                                };
                            }
                        } else {
                            _warn(`[BOT ENGINE] ⚠️ "${marketHashName || itemName}" no encontrado en el mercado P2P.`);
                            return {
                                success: false,
                                error: 'La skin no está disponible ni en el inventario del bot ni en el mercado externo.',
                                code: 'ITEM_OUT_OF_STOCK'
                            };
                        }
                    } else {
                        _warn('[BOT ENGINE] ⚠️ P2P Market no configurado. No se puede comprar la skin.');
                        return {
                            success: false,
                            error: 'El bot no tiene la skin en stock y el mercado P2P no está configurado.',
                            code: 'ITEM_OUT_OF_STOCK'
                        };
                    }
                } catch (p2pErr) {
                    _error(`[BOT ENGINE] ❌ Error en mercado P2P:`, p2pErr.message);
                    return {
                        success: false,
                        error: `Error al buscar/comprar skin en mercado externo: ${p2pErr.message}`,
                        code: 'P2P_ERROR'
                    };
                }
            }

            // Create and send the offer (bot has the item in its own inventory)
            _log(`[BOT ENGINE] 📤 Creando oferta para: ${itemInBot.market_hash_name || itemName}`);
            const offerResult = await this._createAndSendOffer(partnerSteamID64, tradeToken, [itemInBot]);
            // _createAndSendOffer now resolves with { offerId, confirmed, status }
            const offerId = (offerResult && typeof offerResult === 'object') ? offerResult.offerId : offerResult;

            _log(`[BOT ENGINE] ✅ Oferta #${offerId} enviada exitosamente a ${partnerSteamID64}`);
            this._refreshSessionTTL();
            return {
                success: true,
                offerId: offerId,
                // _createAndSendOffer now only resolves AFTER Steam Guard confirms the
                // offer, so the offer is always fully confirmed at this point.
                offerStatus: (offerResult && typeof offerResult === 'object' && offerResult.status) || 'confirmed',
                confirmed: !!(offerResult && typeof offerResult === 'object' && offerResult.confirmed),
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

            // BUG 2 FIX: steamcommunity@3.50.x setCookies() is SYNCHRONOUS and
            // accepts NO callback. The old code passed a callback that never
            // fired, so `isReady` was never set and ensureConnected() always
            // timed out with LOGIN_TIMEOUT — the offer was never sent.
            try {
                this.community.setCookies(cookies);
                this.isReady = true;
                this.lastActivity = Date.now();
                _log('[BOT ENGINE] ✅ Bot completamente listo para operar (bajo demanda)');
                // NOTE: Inventory NOT fetched here - it's loaded ON-DEMAND only
                // when a user requests a withdraw. See _findItemInInventory().
            } catch (err) {
                _error('[BOT ENGINE] ❌ Error configurando cookies en comunidad:', err.message);
            }
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
                        this._setLastError(
                            'INVALID_CREDENTIALS',
                            'El bot de Steam no pudo iniciar sesión: usuario o contraseña incorrectos. Verifica BOT_USERNAME y BOT_PASSWORD en la configuración.'
                        );
                        break;
                    case SteamUser.EResult.TwoFactorCodeMismatch:
                        _error('[BOT ENGINE] 🔴 ERROR: Código 2FA incorrecto. Verifica BOT_SHARED_SECRET');
                        this._setLastError(
                            'INVALID_2FA',
                            'El bot de Steam no pudo iniciar sesión: código 2FA incorrecto. Verifica que BOT_SHARED_SECRET sea el shared_secret real del autenticador móvil (SDA).'
                        );
                        break;
                    case SteamUser.EResult.AccountLogonDenied:
                    case SteamUser.EResult.AccountLoginDenied:
                        _error('[BOT ENGINE] 🔴 ERROR: Steam requiere confirmación de nuevo dispositivo por email.');
                        this._setLastError(
                            'STEAM_EMAIL_CODE_REQUIRED',
                            'Steam ha enviado un código de confirmación al email de la cuenta del bot. Es necesario confirmarlo (o usar Steam Guard Mobile Authenticator con BOT_SHARED_SECRET válido).'
                        );
                        break;
                    case SteamUser.EResult.LoggedInElsewhere:
                        _warn('[BOT ENGINE] ⚠️ Sesión iniciada en otro lugar');
                        this._setLastError(
                            'LOGGED_IN_ELSEWHERE',
                            'La cuenta del bot está conectada en otro lugar. Cierra la sesión de Steam del bot en otros dispositivos o cambia la contraseña.'
                        );
                        break;
                    case SteamUser.EResult.RateLimitExceeded:
                        _error('[BOT ENGINE] 🔴 ERROR: Límite de velocidad excedido. Activando cooldown...');
                        this._setLastError(
                            'RATE_LIMIT_EXCEEDED',
                            'Steam está limitando las solicitudes de inicio de sesión del bot. Espera unos minutos antes de reintentar.'
                        );
                        this._activateRateLimitCooldown();
                        break;
                    default:
                        _error(`[BOT ENGINE] EResult: ${err.eresult} (${err.message})`);
                        this._setLastError(
                            'LOGIN_FAILED',
                            `Steam rechazó el inicio de sesión del bot (EResult ${err.eresult}: ${err.message}).`
                        );
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

                if (status === 'pending') {
                    _log(`[BOT ENGINE] 🔐 Oferta #${offer.id} pendiente de confirmación 2FA...`);
                } else {
                    _log(`[BOT ENGINE] ✅ Oferta #${offer.id} enviada (estado: ${status})`);
                }

                // ─── STEAM GUARD CONFIRMATION (FIX) ─────────────────────
                // The offer is NOT delivered until the bot confirms it via the
                // mobile authenticator. Previously this ran fire-and-forget, so
                // the promise resolved before Steam actually sent the offer —
                // and if the confirmation silently failed, the user never got it.
                // BUG 2 FIX: steamcommunity@3.50.x has NO `acceptConfirmationGroup`
                // method — calling it throws a synchronous TypeError and the
                // trade never completes. The real API is `acceptConfirmationForObject
                // (identitySecret, objectID, callback)`, which fetches the
                // confirmation list, matches it to this offer ID and accepts it.
                // We await it with up to 3 retries and only resolve AFTER the
                // confirmation succeeds.
                const maxConfirmAttempts = 3;
                let confirmAttempt = 0;

                const attemptConfirmation = () => {
                    confirmAttempt++;
                    this.community.acceptConfirmationForObject(
                        this.credentials.identitySecret,
                        offer.id,
                        (confirmErr) => {
                            if (confirmErr) {
                                _error(
                                    `[BOT ENGINE] ❌ Error al autoconfirmar oferta #${offer.id} en Steam Guard (intento ${confirmAttempt}/${maxConfirmAttempts}):`,
                                    confirmErr.message || confirmErr
                                );

                                if (confirmAttempt < maxConfirmAttempts) {
                                    // Wait a moment then retry — Steam Guard can lag
                                    setTimeout(attemptConfirmation, 3000 * confirmAttempt);
                                } else {
                                    // Confirmation failed after all retries. Try to
                                    // cancel the pending offer so the item isn't stuck.
                                    _error(
                                        `[BOT ENGINE] 🔴 No se pudo confirmar la oferta #${offer.id} tras ${maxConfirmAttempts} intentos. Cancelando oferta...`
                                    );
                                    offer.cancel((cancelErr) => {
                                        if (cancelErr) {
                                            _error('[BOT ENGINE] ⚠️ Error al cancelar la oferta no confirmada:', cancelErr.message || cancelErr);
                                        }
                                        reject(new Error(`STEAM_GUARD_CONFIRMATION_FAILED: No se pudo confirmar la oferta #${offer.id} en Steam Guard tras ${maxConfirmAttempts} intentos.`));
                                    });
                                }
                                return;
                            }

                            _log(`[BOT ENGINE] ✅ Oferta #${offer.id} CONFIRMADA en Steam Guard`);
                            resolve({
                                offerId: offer.id,
                                confirmed: true,
                                status: 'confirmed'
                            });
                        }
                    );
                };

                attemptConfirmation();
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

    /**
     * Set the last error diagnostic info.
     * @param {string} code - Machine-readable error code
     * @param {string} message - Human-readable error description
     */
    _setLastError(code, message) {
        this.lastError = message;
        this.lastErrorCode = code;
        this.lastErrorAt = Date.now();
        // Always log lastError to console.error for server diagnostics
        _error(`[BOT DIAGNOSTIC] ${code}: ${message}`);
    }

    /**
     * Clear the last error diagnostic info.
     */
    _clearLastError() {
        this.lastError = null;
        this.lastErrorCode = null;
        this.lastErrorAt = null;
    }

    /**
     * Get the last error as a structured object.
     * @returns {{code: string, error: string}|null}
     */
    _getLastError() {
        if (!this.lastError || !this.lastErrorCode) return null;
        return {
            code: this.lastErrorCode,
            error: this.lastError,
            at: this.lastErrorAt ? new Date(this.lastErrorAt).toISOString() : null
        };
    }
}

// Export singleton instance
const botEngine = new BotEngine();
export default botEngine;