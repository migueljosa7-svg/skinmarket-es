#!/bin/bash
# ============================================================
# SKINMARKET ES - Render Startup Script
# ============================================================
# This script is the entrypoint for Render Web Service.
# It verifies environment, runs DB migrations, and starts
# the Node.js backend server with Steam Bot + WebSockets.
# ============================================================

set -e

echo "=============================================="
echo "  SKINMARKET ES - RENDER STARTUP SCRIPT"
echo "=============================================="

# ── 1. Verify critical environment variables ──────
echo ""
echo "[1/4] Verificando variables de entorno críticas..."

REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "FRONTEND_URL"
  "BACKEND_URL"
  "STEAM_API_KEY"
)

MISSING_VARS=0
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "  ✗ $VAR — NO CONFIGURADA"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    echo "  ✓ $VAR — configurada"
  fi
done

if [ $MISSING_VARS -gt 0 ]; then
  echo ""
  echo "⚠️  Hay $MISSING_VARS variable(s) sin configurar."
  echo "   El servidor podría no funcionar correctamente."
  echo "   Revisa las Environment Variables en Render Dashboard."
  echo "   Continuando de todas formas..."
fi

# ── 2. Install backend dependencies ───────────────
echo ""
echo "[2/4] Instalando dependencias del backend..."
cd "$(dirname "$0")/../src/backend" 2>/dev/null || cd "$(dirname "$0")/../../src/backend" 2>/dev/null || cd /opt/render/project/src/src/backend 2>/dev/null
npm install --omit=dev
echo "  ✓ Dependencias instaladas"

# ── 3. Verify DATABASE_URL ─────────────────────────
echo ""
echo "[3/4] Verificando DATABASE_URL..."

if [ -z "$DATABASE_URL" ]; then
  echo "  ✗ DATABASE_URL no está configurada"
  echo "  ⚠️  El servidor no podrá conectarse a la base de datos"
else
  echo "  ✓ DATABASE_URL configurada (se usará tal cual viene de Render)"
fi

# ── 4. Run database initialization ────────────────
echo ""
echo "[4/4] Ejecutando migraciones de base de datos..."
echo "  → Ejecutando init_db.js..."
# init_db.js now has built-in retry logic (waitForDatabase) so it can handle
# Render free-tier PostgreSQL cold-start / wake-from-sleep SSL issues.
# Migration failure is NOT fatal: the server still starts (tables use
# CREATE TABLE IF NOT EXISTS, so a previous successful run is preserved).
node init_db.js && echo "  ✓ Migraciones completadas (init_db.js terminó correctamente)" || echo "  ⚠️  init_db.js no terminó — continuando sin detener el despliegue."

# ── 4a. Fallback (only if init_db.js is unavailable) ──
# NOTE: El archivo init-db.sql no existe y NO se usa. init_db.js se encarga
# de TODA la inicialización de la base de datos (tablas, índices, seeds).
# La línea psql fue eliminada para evitar errores de archivo no encontrado.
# ── (psql fallback eliminado — init_db.js es el único método de migración) ──

# ── 4b. Verify DATABASE_URL parsing (debug) ────────
echo ""
echo "[4b/5] Verificando parseo de DATABASE_URL..."
# Use Node.js with WHATWG URL API for safe, precise parsing (handles postgresql:// and postgres://)
# Also detect residual sslmode/ssl params which interfere with the explicit
# ssl: { rejectUnauthorized: false } option in db.js (pg-connection-string override).
PARSED=$(node -e "
try {
  const url = new URL(process.env.DATABASE_URL);
  if (!url.hostname || !url.pathname) throw new Error('Invalid URL components');
  const sslParams = ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword']
    .filter(k => url.searchParams.has(k));
  console.log(JSON.stringify({
    user: decodeURIComponent(url.username || ''),
    pass: (url.password || '').substring(0, 3) + '***',
    host: url.hostname,
    port: url.port || '5432',
    dbname: url.pathname.replace(/^\//, '').split('?')[0],
    residualSslParams: sslParams
  }));
} catch (err) {
  console.error('ERROR: Cannot parse DATABASE_URL:', err.message);
  console.log(JSON.stringify({ error: 'parse_failed', raw: String(process.env.DATABASE_URL || '').substring(0, 50) + '...' }));
}
")
echo "  ✓ DATABASE_URL parseada correctamente: $PARSED"

# Warning if residual SSL params are present (db.js strips them, but warn the operator)
if echo "$PARSED" | grep -q 'residualSslParams\":\[' && ! echo "$PARSED" | grep -q 'residualSslParams\":\[\]'; then
  echo ""
  echo "  ⚠️  DATABASE_URL contiene parámetros sslmode/ssl residuales."
  echo "     db.js los elimina automáticamente y usa ssl: { rejectUnauthorized: false }."
  echo "     Recomendado: configurar DATABASE_URL en Render SIN sslmode para evitar"
  echo "     la advertencia de deprecación de pg-connection-string."
fi

# ── 5. Start the backend server ───────────────────
echo ""
echo "[5/5] Iniciando servidor Node.js..."
if [ -z "$PORT" ]; then
  echo "  ⚠️  PORT no está definido. Render debe inyectarlo automáticamente en el entorno."
  echo "     Usando fallback local 3001 para continuar en modo de desarrollo."
fi

echo "  → Puerto: ${PORT:-3001}"
echo "  → Modo: ${NODE_ENV:-production}"
echo "  → WebSockets: activos"
echo "  → BotEngine Steam: $(if [ -n "$BOT_USERNAME" ] && [ "$BOT_USERNAME" != "tu_usuario_steam" ]; then echo "ACTIVO"; else echo "SIMULACIÓN (sin bot)"; fi)"
echo "  → Pasarela de pagos: activa"
echo ""
echo "=============================================="
echo "  SKINMARKET ES — ARRANCANDO SERVIDOR..."
echo "=============================================="
echo ""

exec node server.js

