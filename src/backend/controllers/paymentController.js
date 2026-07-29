/**
 * ============================================================
 * SKINMARKET ES - PAYMENT CONTROLLER
 * ============================================================
 * Handles deposit payments via card, cryptocurrency,
 * and gift cards. Includes secure webhook verification.
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
import db from "../db.js";

// ─── Configuration ────────────────────────────────────────────
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "sk_test_webhook_secret_change_me";
const CRYPTO_API_KEY = process.env.CRYPTO_API_KEY || "nowpayments_demo_key";
const CRYPTO_API_URL = process.env.CRYPTO_API_URL || "https://api.nowpayments.io/v1";

// Gift card codes (DB-backed in production)
const GIFT_CODES = new Map(); // Loaded from database

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
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Payment Controller Functions ────────────────────────────

/**
 * POST /api/payments/create-charge
 * Creates a payment charge for the user to deposit balance.
 * 
 * Body: { amount: number, method: "card"|"crypto_btc"|"crypto_eth"|"crypto_lte"|"crypto_usdt"|"crypto_sol"|"gift_code", code?: string }
 */
export async function createCharge(req, res) {
  try {
    const { amount, method, code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Monto inválido. Debe ser mayor a 0." });
    }

    const minAmount = 1.0;
    const maxAmount = 5000.0;
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        error: `El monto debe estar entre €${minAmount.toFixed(2)} y €${maxAmount.toFixed(2)}.`
      });
    }

    // ── Gift Card Method ──
    if (method === "gift_code") {
      if (!code) {
        return res.status(400).json({ error: "Código de regalo no proporcionado." });
      }
      const normalizedCode = code.trim().toUpperCase();

      // Query gift code from database
      const giftResult = await db.query(
        "SELECT * FROM gift_codes WHERE code = $1 AND active = true AND (expires_at IS NULL OR expires_at > NOW())",
        [normalizedCode]
      );

      if (giftResult.rows.length === 0) {
        return res.status(400).json({ error: "Código de regalo inválido o expirado." });
      }

      const gift = giftResult.rows[0];

      if (gift.current_uses >= gift.max_uses) {
        return res.status(400).json({ error: "Este código ha alcanzado su límite de usos." });
      }

      // Credit balance atomically
      const result = await db.query(
        "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
        [gift.amount, userId]
      );

      // Mark gift code as used
      await db.query(
        "UPDATE gift_codes SET current_uses = current_uses + 1 WHERE code = $1",
        [normalizedCode]
      );

      await recordTransaction(userId, "deposito", gift.amount, "gift_code", `Canje de código: ${normalizedCode}`);
      await logAction(userId, "CANJEAR_GIFT", { code: normalizedCode, amount: gift.amount });

      return res.json({
        success: true,
        method: "gift_code",
        amount: gift.amount,
        newBalance: result.rows[0].saldo,
        message: `¡Código ${normalizedCode} canjeado con éxito! +€${gift.amount.toFixed(2)} añadidos a tu saldo.`
      });
    }

    // ── Card Method (Production Payment Gateway) ──
    if (method === "card") {
      // In production, integrate with Stripe, PayPal, or other payment processor
      // This creates a payment intent and returns a client secret for frontend
      const chargeId = `ch_card_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

      // Store pending charge in database
      await db.query(
        `INSERT INTO pagos_pendientes (usuario_id, charge_id, metodo, monto, moneda, estado, detalles)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [userId, chargeId, "card", amount, "EUR", JSON.stringify({ payment_method: "card" })]
      );

      await logAction(userId, "CREAR_DEPOSITO_TARJETA", { chargeId, amount });

      // In production, return payment intent client secret from Stripe/etc
      // For now, return the charge ID for tracking
      return res.json({
        success: true,
        method: "card",
        chargeId,
        amount,
        status: "pending",
        message: `Pago de €${amount.toFixed(2)} iniciado. Completa el pago en el portal seguro.`
      });
    }

    // ── Cryptocurrency Methods ──
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
      // const invoice = await fetch(`${CRYPTO_API_URL}/invoice`, { ... });

      // For now, create pending payment record
      // The actual crypto address will be provided by the payment processor
      await db.query(
        `INSERT INTO pagos_pendientes (usuario_id, charge_id, metodo, monto, moneda, estado, detalles)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [userId, chargeId, method, amount, coinConfig.coin, JSON.stringify({ coin: coinConfig.coin, label: coinConfig.label })]
      );

      await logAction(userId, "CREAR_DEPOSITO_CRYPTO", {
        chargeId,
        amount,
        coin: coinConfig.coin,
      });

      return res.json({
        success: true,
        method: "crypto",
        chargeId,
        amount,
        coin: coinConfig.coin,
        coinLabel: coinConfig.label,
        status: "pending",
        message: `Depósito de €${amount.toFixed(2)} en ${coinConfig.label}. Espera la confirmación del pago.`
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
 * Expected payload: { charge_id, status, amount, currency, metadata: { user_id } }
 */
export async function handleWebhook(req, res) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req, WEBHOOK_SECRET)) {
      _warn("[PAYMENT WEBHOOK] ⚠️ Firma inválida recibida");
      return res.status(401).json({ error: "Firma de webhook inválida" });
    }

    const { charge_id, status, amount, metadata } = req.body;

    if (!charge_id || !status) {
      return res.status(400).json({ error: "Payload de webhook incompleto" });
    }

    // console.log(`[PAYMENT WEBHOOK] 🔔 Recibido: charge=${charge_id}, status=${status}, amount=${amount}`);

    // Only process confirmed/completed payments
    const validStatuses = ["confirmed", "completed", "finished", "succeeded"];
    if (!validStatuses.includes(status.toLowerCase())) {
      // console.log(`[PAYMENT WEBHOOK] Estado "${status}" no es final. Ignorando.`);
      return res.json({ received: true, status: "ignored" });
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
        // console.log(`[PAYMENT WEBHOOK] Charge ${charge_id} ya fue procesado.`);
        return res.json({ received: true, status: "duplicate" });
      }
      userId = pending.usuario_id;
    }

    // Credit user balance atomically using transaction
    await db.withTransaction(async (client) => {
      // Update user balance
      const result = await client.query(
        "UPDATE usuarios SET saldo = saldo + $1 WHERE usuario_id = $2 RETURNING saldo",
        [parseFloat(amount), userId]
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
        [userId, "deposito", parseFloat(amount), "webhook_crypto", `Pago cripto confirmado: ${charge_id}`]
      );
    });

    await logAction(userId, "CONFIRMAR_DEPOSITO_WEBHOOK", {
      chargeId: charge_id,
      amount,
      status
    });

    // console.log(`[PAYMENT WEBHOOK] ✅ Saldo actualizado para usuario ${userId}: +${amount}`);
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

