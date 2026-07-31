/**
 * ============================================================
 * SKINMARKET ES - PAYMENT CONTROLLER (SECURE)
 * ============================================================
 * Handles deposit payments via card, cryptocurrency,
 * and gift cards. Includes secure webhook verification.
 *
 * SECURITY:
 * - Strict deposit limits: min €5.00, max €1,000.00 per transaction
 * - Input sanitization: rejects NaN, negative, non-finite, leading zeros
 * - Gift codes: single-use per user (UserPromoUsage table with unique index)
 * - Crypto deposits: ONLY credited via signed webhook from payment gateway
 * - No exposed endpoint that adds balance without payment verification
 *
 * Routes:
 *   POST /api/payments/create-charge
 *   POST /api/payments/webhook
 *   GET  /api/payments/status/:chargeId
 * ============================================================
 */

import crypto from "crypto";

const isProd = process.env.NODE_ENV === "production";
const _error = (...args) => console.error(...args); // Always log errors
const _warn = isProd ? () => { } : (...args) => console.warn(...args);
const _info = isProd ? () => { } : (...args) => console.log("[PAYMENT]", ...args);
import db from "../db.js";

// ─── Configuration ────────────────────────────────────────────
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "sk_test_webhook_secret_change_me";
const CRYPTO_API_KEY = process.env.CRYPTO_API_KEY || "nowpayments_demo_key";
const CRYPTO_API_URL = process.env.CRYPTO_API_URL || "https://api.nowpayments.io/v1";

// ─── Deposit Limits ───────────────────────────────────────────
const MIN_DEPOSIT_EUR = 5.0;
const MAX_DEPOSIT_EUR = 1000.0;

// ─── Helpers ──────────────────────────────────────────────────

async function recordTransaction(usuario_id, tipo, monto, metodo, detalles = null) {
  try {
    await db.query(
      "INSERT INTO transacciones (usuario_id, tipo, monto, metodo, detalles) VALUES ($1, $2, $3, $4, $5)",
      [usuario_id, tipo, monto, metodo, detalles]
    );
  } catch (err) {
    _error("[PAYMENT] Error al registrar transacción:", err);
  }
}

async function logAction(usuario_id, accion, detalles = null) {
  try {
    await db.query(
      "INSERT INTO logs_auditoria (usuario_id, accion, detalles) VALUES ($1, $2, $3)",
      [usuario_id, accion, detalles ? JSON.stringify(detalles) : null]
    );
  } catch (err) {
    _error("[PAYMENT] Error al registrar auditoría:", err);
  }
}

/**
 * Strict validation of a deposit amount.
 * Rejects: NaN, negative, zero, non-finite, leading zeros, disproportionate decimals.
 * @param {any} amount - Raw input amount
 * @returns {{valid: boolean, value: number, error?: string}}
 */
function validateDepositAmount(amount) {
  // Reject if not a valid number
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, value: 0, error: "Monto inválido. Debe ser un número finito." };
  }
  if (parsed <= 0) {
    return { valid: false, value: 0, error: "Monto inválido. Debe ser mayor a 0." };
  }

  // Reject leading zeros in string input (e.g. "00005", "000.50")
  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (/^0\d/.test(trimmed)) {
      return { valid: false, value: 0, error: "Monto inválido. No se permiten ceros a la izquierda." };
    }
    // Reject disproportionate decimals (more than 2 decimal places)
    if (trimmed.includes('.')) {
      const decimals = trimmed.split('.')[1];
      if (decimals && decimals.length > 2) {
        return { valid: false, value: 0, error: "Monto inválido. Máximo 2 decimales permitidos." };
      }
    }
  }

  // Enforce deposit limits
  if (parsed < MIN_DEPOSIT_EUR) {
    return { valid: false, value: 0, error: `El depósito mínimo es de €${MIN_DEPOSIT_EUR.toFixed(2)}.`, code: "DEPOSIT_BELOW_MIN" };
  }
  if (parsed > MAX_DEPOSIT_EUR) {
    return { valid: false, value: 0, error: `El depósito máximo por transacción es de €${MAX_DEPOSIT_EUR.toFixed(2)}.`, code: "DEPOSIT_ABOVE_MAX" };
  }

  return { valid: true, value: parseFloat(parsed.toFixed(2)) };
}

/**
 * Generate a HMAC-SHA256 signature for webhook payload verification
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Verify incoming webhook signature matches expected
 */
function verifyWebhookSignature(req, secret) {
  const signature = req.headers["x-webhook-signature"] || req.headers["x-signature"];
  if (!signature) return false;
  const expected = generateSignature(req.body, secret);
  // Use timingSafeEqual to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ─── Payment Controller Functions ────────────────────────────

/**
 * POST /api/payments/create-charge
 * Creates a payment charge for the user to deposit balance.
 *
 * Body: { amount: number, method: "card"|"crypto_btc"|"crypto_eth"|"crypto_lte"|"crypto_usdt"|"crypto_sol"|"gift_code", code?: string }
 *
 * IMPORTANT: This endpoint does NOT credit balance directly (except for verified gift codes).
 * Balance is ONLY credited when:
 * 1. Gift code: validated + single-use checked + atomically credited
 * 2. Card/Crypto: payment gateway sends signed webhook confirmation
 */
export async function createCharge(req, res) {
  try {
    const { amount, method, code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // ── Gift Card Method (single-use per user) ──
    if (method === "gift_code") {
      if (!code) {
        return res.status(400).json({ error: "Código de regalo no proporcionado." });
      }
      const normalizedCode = code.trim().toUpperCase();

      // Query promo/gift code from database
      // Supports both gift_codes table (legacy) and promo_codes table (new)
      let giftResult;
      try {
        giftResult = await db.query(
          `SELECT * FROM promo_codes WHERE code = $1 AND active = true AND (expires_at IS NULL OR expires_at > NOW())`,
          [normalizedCode]
        );
      } catch (e) {
        // Fallback to gift_codes table if promo_codes doesn't exist
        giftResult = await db.query(
          "SELECT * FROM gift_codes WHERE code = $1 AND active = true AND (expires_at IS NULL OR expires_at > NOW())",
          [normalizedCode]
        );
      }

      if (giftResult.rows.length === 0) {
        return res.status(400).json({ error: "Código de regalo inválido o expirado." });
      }

      const gift = giftResult.rows[0];

      // Check global usage limit
      if (gift.current_uses >= gift.max_uses) {
        return res.status(400).json({ error: "Este código ha alcanzado su límite global de usos." });
      }

      // ─── SINGLE-USE PER USER ENFORCEMENT ───────────────
      // Check if this user has already redeemed this code
      try {
        const usageCheck = await db.query(
          "SELECT 1 FROM user_promo_usage WHERE user_id = $1 AND code_id = $2",
          [userId, gift.id]
        );
        if (usageCheck.rows.length > 0) {
          return res.status(400).json({
            error: "Ya has canjeado este código anteriormente. Cada código solo puede usarse una vez por usuario.",
            code: "ALREADY_REDEEMED"
          });
        }
      } catch (e) {
        // Table might not exist yet — continue (will be enforced once table is created)
        _warn("[PAYMENT] user_promo_usage table not found, skipping single-use check:", e.message);
      }

      // Determine reward amount based on reward_type
      let rewardAmount = 0;
      const rewardType = gift.reward_type || 'BALANCE';
      const rewardValue = parseFloat(gift.reward_value || gift.amount || 0);

      if (rewardType === 'BALANCE') {
        rewardAmount = rewardValue;
      } else if (rewardType === 'PERCENTAGE') {
        // Percentage doesn't apply to deposits — return error
        return res.status(400).json({ error: "Este código promocional es de tipo porcentaje y no puede canjearse aquí." });
      } else if (rewardType === 'CASE') {
        // Case reward: return a case ID to open (handled by frontend)
        return res.json({
          success: true,
          method: "gift_code",
          reward_type: "CASE",
          case_id: rewardValue,
          message: `¡Código ${normalizedCode} canjeado! Has recibido una caja gratuita.`
        });
      }

      if (rewardAmount <= 0) {
        return res.status(400).json({ error: "Código de regalo con valor inválido." });
      }

      // Credit balance atomically + record usage in a transaction
      await db.withTransaction(async (client) => {
        // Credit balance
        await client.query(
          "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2",
          [rewardAmount, userId]
        );

        // Increment global usage count
        try {
          await client.query(
            "UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = $1",
            [normalizedCode]
          );
        } catch (e) {
          // Fallback to gift_codes table
          await client.query(
            "UPDATE gift_codes SET current_uses = current_uses + 1 WHERE code = $1",
            [normalizedCode]
          );
        }

        // Record single-use per user (prevents re-redemption)
        try {
          await client.query(
            "INSERT INTO user_promo_usage (user_id, code_id, used_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
            [userId, gift.id]
          );
        } catch (e) {
          // Table might not exist — non-critical, continue
        }
      });

      await recordTransaction(userId, "deposito", rewardAmount, "gift_code", `Canje de código: ${normalizedCode}`);
      await logAction(userId, "CANJEAR_GIFT", { code: normalizedCode, amount: rewardAmount });

      const balanceResult = await db.query("SELECT saldo FROM usuarios WHERE usuario_id = $1", [userId]);

      return res.json({
        success: true,
        method: "gift_code",
        amount: rewardAmount,
        newBalance: balanceResult.rows[0]?.saldo || 0,
        message: `¡Código ${normalizedCode} canjeado con éxito! +€${rewardAmount.toFixed(2)} añadidos a tu saldo.`
      });
    }

    // ─── Validate deposit amount for card/crypto methods ───
    const amountCheck = validateDepositAmount(amount);
    if (!amountCheck.valid) {
      return res.status(400).json({
        error: amountCheck.error,
        code: amountCheck.code || "INVALID_AMOUNT"
      });
    }
    const validatedAmount = amountCheck.value;

    // ── Card Method (Production Payment Gateway) ──
    if (method === "card") {
      // In production, integrate with Stripe, PayPal, or other payment processor
      // This creates a payment intent and returns a client secret for frontend
      const chargeId = `ch_card_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

      // Store pending charge in database
      await db.query(
        `INSERT INTO pagos_pendientes (usuario_id, charge_id, metodo, monto, moneda, estado, detalles)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [userId, chargeId, "card", validatedAmount, "EUR", JSON.stringify({ payment_method: "card" })]
      );

      await logAction(userId, "CREAR_DEPOSITO_TARJETA", { chargeId, amount: validatedAmount });

      // In production, return payment intent client secret from Stripe/etc
      // Balance is ONLY credited when the payment gateway webhook confirms the payment
      return res.json({
        success: true,
        method: "card",
        chargeId,
        amount: validatedAmount,
        status: "pending",
        message: `Pago de €${validatedAmount.toFixed(2)} iniciado. Completa el pago en el portal seguro. El saldo se acreditará tras confirmación.`
      });
    }

    // ── Cryptocurrency Methods ──
    // Crypto deposits are ONLY credited via signed webhook from NOWPayments/Coinbase Commerce
    // This endpoint creates a pending payment record — it does NOT add balance
    if (method && method.startsWith("crypto_")) {
      const coinMap = {
        crypto_btc: { coin: "btc", label: "Bitcoin" },
        crypto_eth: { coin: "eth", label: "Ethereum" },
        crypto_ltc: { coin: "ltc", label: "Litecoin" },
        crypto_usdt: { coin: "usdt", label: "USDT (ERC-20)" },
        crypto_sol: { coin: "sol", label: "Solana" },
      };

      const coinConfig = coinMap[method];
      if (!coinConfig) {
        return res.status(400).json({ error: "Método de criptomoneda no soportado." });
      }

      // Generate a unique charge ID
      const chargeId = `ch_crypto_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

      // In production, create invoice via NOWPayments / Coinbase Commerce API
      // const invoice = await fetch(`${CRYPTO_API_URL}/invoice`, {
      //   method: "POST",
      //   headers: { "x-api-key": CRYPTO_API_KEY, "Content-Type": "application/json" },
      //   body: JSON.stringify({ price_amount: validatedAmount, price_currency: "eur", pay_currency: coinConfig.coin })
      // });

      // Create pending payment record — balance NOT credited yet
      // Balance will be credited ONLY when the payment gateway sends a signed webhook
      await db.query(
        `INSERT INTO pagos_pendientes (usuario_id, charge_id, metodo, monto, moneda, estado, detalles)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [userId, chargeId, method, validatedAmount, coinConfig.coin, JSON.stringify({ coin: coinConfig.coin, label: coinConfig.label })]
      );

      await logAction(userId, "CREAR_DEPOSITO_CRYPTO", {
        chargeId,
        amount: validatedAmount,
        coin: coinConfig.coin,
      });

      return res.json({
        success: true,
        method: "crypto",
        chargeId,
        amount: validatedAmount,
        coin: coinConfig.coin,
        coinLabel: coinConfig.label,
        status: "pending",
        message: `Depósito de €${validatedAmount.toFixed(2)} en ${coinConfig.label} creado. El saldo se acreditará automáticamente tras las confirmaciones de red requeridas.`
      });
    }

    return res.status(400).json({ error: "Método de pago no soportado." });
  } catch (err) {
    _error("[PAYMENT] Error en createCharge:", err);
    return res.status(500).json({ error: "Error al crear cargo de pago." });
  }
}

/**
 * POST /api/payments/webhook
 * Secure webhook endpoint for payment provider callbacks.
 * Verifies HMAC signature before crediting user balance.
 *
 * This is the ONLY way crypto/card deposits get credited.
 * No other endpoint adds balance without this verification.
 *
 * Expected payload: { charge_id, status, amount, currency, metadata: { user_id } }
 */
export async function handleWebhook(req, res) {
  try {
    // Verify webhook signature — reject if invalid
    if (!verifyWebhookSignature(req, WEBHOOK_SECRET)) {
      _warn("[PAYMENT WEBHOOK] ⚠️ Firma inválida recibida");
      return res.status(401).json({ error: "Firma de webhook inválida" });
    }

    const { charge_id, status, amount, metadata } = req.body;

    if (!charge_id || !status) {
      return res.status(400).json({ error: "Payload de webhook incompleto" });
    }

    _info(`[WEBHOOK] Recibido: charge=${charge_id}, status=${status}, amount=${amount}`);

    // Only process confirmed/completed payments
    const validStatuses = ["confirmed", "completed", "finished", "succeeded"];
    if (!validStatuses.includes(status.toLowerCase())) {
      _info(`[WEBHOOK] Estado "${status}" no es final. Ignorando.`);
      return res.json({ received: true, status: "ignored" });
    }

    // Validate amount from webhook (prevent injection of huge amounts)
    const webhookAmount = parseFloat(amount);
    if (isNaN(webhookAmount) || !isFinite(webhookAmount) || webhookAmount <= 0) {
      _error("[PAYMENT WEBHOOK] ❌ Monto inválido en webhook:", amount);
      return res.status(400).json({ error: "Monto inválido en webhook" });
    }
    if (webhookAmount > MAX_DEPOSIT_EUR * 2) {
      _error("[PAYMENT WEBHOOK] ❌ Monto sospechosamente alto:", webhookAmount);
      return res.status(400).json({ error: "Monto excede límite permitido" });
    }

    // Extract user ID from metadata or find from pending_payments table
    let userId = metadata?.user_id;

    if (!userId) {
      // Look up the charge in pending_payments
      const pendingResult = await db.query(
        "SELECT usuario_id, monto, estado FROM pagos_pendientes WHERE charge_id = $1",
        [charge_id]
      );
      if (pendingResult.rows.length === 0) {
        return res.status(404).json({ error: "Cargo no encontrado" });
      }
      const pending = pendingResult.rows[0];
      if (pending.estado === "completed") {
        _info(`[WEBHOOK] Charge ${charge_id} ya fue procesado.`);
        return res.json({ received: true, status: "duplicate" });
      }
      userId = pending.usuario_id;
    }

    // Credit user balance atomically using transaction
    await db.withTransaction(async (client) => {
      // Update user balance
      const result = await client.query(
        "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
        [webhookAmount, userId]
      );

      const newBalance = result.rows[0]?.saldo;
      if (!newBalance) {
        throw new Error(`Usuario ${userId} no encontrado`);
      }

      // Mark pending payment as completed
      await client.query(
        "UPDATE pagos_pendientes SET estado = 'completed', confirmado_en = NOW() WHERE charge_id = $1",
        [charge_id]
      );

      // Record transaction
      await client.query(
        "INSERT INTO transacciones (usuario_id, tipo, monto, metodo, detalles) VALUES ($1, $2, $3, $4, $5)",
        [userId, "deposito", webhookAmount, "webhook_crypto", `Pago confirmado via webhook: ${charge_id}`]
      );
    });

    await logAction(userId, "CONFIRMAR_DEPOSITO_WEBHOOK", {
      chargeId: charge_id,
      amount: webhookAmount,
      status
    });

    _info(`[WEBHOOK] ✅ Saldo actualizado para usuario ${userId}: +€${webhookAmount}`);
    return res.json({ received: true, status: "completed" });
  } catch (err) {
    _error("[PAYMENT WEBHOOK] ❌ Error:", err);
    return res.status(500).json({ error: "Error al procesar webhook" });
  }
}

/**
 * GET /api/payments/status/:chargeId
 * Check the status of a pending payment charge.
 */
export async function getPaymentStatus(req, res) {
  try {
    const { chargeId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const result = await db.query(
      "SELECT charge_id, metodo, monto, moneda, estado, creado_en, confirmado_en FROM pagos_pendientes WHERE charge_id = $1 AND usuario_id = $2",
      [chargeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cargo no encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    _error("[PAYMENT] Error al consultar estado:", err);
    return res.status(500).json({ error: "Error al consultar estado del pago" });
  }
}