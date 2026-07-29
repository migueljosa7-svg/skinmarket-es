import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamTotp from 'steam-totp';
import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const _log = isProd ? () => { } : (...args) => console.log(...args);
const _warn = isProd ? () => { } : (...args) => console.warn(...args);
const _error = (...args) => console.error(...args);

class SteamBot {
    constructor() {
        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en'
        });

        this.isLoggedIn = false;
        this.credentials = {
            accountName: process.env.BOT_USERNAME,
            password: process.env.BOT_PASSWORD,
            sharedSecret: process.env.BOT_SHARED_SECRET,
            identitySecret: process.env.BOT_IDENTITY_SECRET
        };
    }

    async logIn() {
        if (!this.credentials.accountName || !this.credentials.password ||
            this.credentials.accountName === 'tu_usuario_steam' ||
            this.credentials.password === 'tu_password_steam') {
            _warn("[BOT] CONFIGURACIÓN REQUERIDA: Las credenciales de Steam en el archivo .env son valores de ejemplo.");
            _warn("[BOT] Por favor, edita el archivo .env con tu usuario y contraseña real para activar los retiros automáticos.");
            _warn("[BOT] El sitio funcionará en MODO SIMULACIÓN para los retiros hasta que se configure.");
            return;
        }

        _log(`[BOT] Intentando iniciar sesión en Steam como ${this.credentials.accountName}...`);

        try {
            this.client.logOn({
                accountName: this.credentials.accountName,
                password: this.credentials.password,
                twoFactorCode: SteamTotp.getAuthCode(this.credentials.sharedSecret)
            });
        } catch (err) {
            _error("[BOT] Error al generar código 2FA o iniciar proceso de login:", err.message);
        }

        this.client.on('loggedOn', (details) => {
            _log("[BOT] ¡Sesión iniciada con éxito! Conectado a Steam como:", this.client.steamID.getSteamID64());
        });

        this.client.on('webSession', (sessionID, cookies) => {
            this.manager.setCookies(cookies);
            this.community.setCookies(cookies);
            this.isLoggedIn = true;
            _log("[BOT] WebSession establecida y cookies configuradas.");
        });

        this.client.on('error', (err) => {
            _error("[BOT] Error de sesión en Steam:", err.message);
            if (err.eresult === 5) {
                _error("[BOT] CONSEJO: El error 'InvalidPassword' indica que la contraseña o el usuario en .env son incorrectos.");
            } else if (err.eresult === 85) {
                _error("[BOT] CONSEJO: Se necesita el Shared Secret correcto para el 2FA.");
            }
            this.isLoggedIn = false;
        });
    }

    /**
     * Envía una oferta de intercambio a un usuario
     * @param {string} partnerSteamID64 
     * @param {string} token 
     * @param {string} itemMarketHashName 
     */
    async sendWithdrawOffer(partnerSteamID64, token, itemMarketHashName) {
        if (!this.isLoggedIn) {
            throw new Error("El bot no ha iniciado sesión.");
        }

        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(this.client.steamID, 730, 2, true, (err, inventory) => {
                if (err) return reject(err);

                // Buscar el objeto por nombre
                const item = inventory.find(i => i.market_hash_name === itemMarketHashName);
                if (!item) {
                    return reject(new Error(`El bot no tiene el objeto: ${itemMarketHashName}`));
                }

                const offer = this.manager.createOffer(partnerSteamID64, token);
                offer.addMyItem(item);
                offer.setMessage(`Retiro de SkinMarket: ${itemMarketHashName}`);

                offer.send((err, status) => {
                    if (err) return reject(err);

                    if (status === 'pending') {
                        _log(`[BOT] Oferta #${offer.id} enviada, esperando confirmación 2FA...`);
                        this.community.acceptConfirmationGroup(this.credentials.identitySecret, offer.id, (err) => {
                            if (err) {
                                _error(`[BOT] Error al confirmar oferta #${offer.id}:`, err);
                                return reject(err);
                            }
                            _log(`[BOT] Oferta #${offer.id} confirmada automáticamente.`);
                            resolve(offer.id);
                        });
                    } else {
                        _log(`[BOT] Oferta #${offer.id} enviada directamente.`);
                        resolve(offer.id);
                    }
                });
            });
        });
    }
}

export default new SteamBot();
