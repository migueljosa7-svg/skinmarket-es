/**
 * ============================================================
 * SKINMARKET ES - STEAM BOT (LEGACY - DEPRECATED)
 * ============================================================
 * ⚠️  THIS FILE IS DEPRECATED AND WILL THROW ON IMPORT  ⚠️
 *
 * Use steam/botEngine.js instead (On-Demand architecture).
 * The new BotEngine implements:
 * - NO auto-login at server startup
 * - NO continuous polling to Steam API
 * - Bot connects ONLY when a user requests a withdraw
 * - Exponential backoff + cooldown for 429 RateLimit errors
 * - Session reuse with TTL-based auto-disconnect
 *
 * This legacy file is kept for reference only.
 * ============================================================
 */

throw new Error(
  '[STEAM BOT LEGACY] ⛔ Este archivo (steamBot.js) está obsoleto. ' +
  'Importa "steam/botEngine.js" en su lugar. ' +
  'Si ves este error, actualiza tus imports para usar el nuevo BotEngine on-demand.'
);
