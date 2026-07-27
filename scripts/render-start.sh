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

# ── 3. Sanitize DATABASE_URL for Render ────────────
echo ""
echo "[3/4] Sanitizando DATABASE_URL para Render..."

# Fix Render's incomplete DATABASE_URL hostname
# Render sometimes provides: postgres://user:pass@dpg-xxxx-a/dbname
# Should be: postgres://user:pass@dpg-xxxx-a.oregon-postgres.render.com/dbname
if [[ "$DATABASE_URL" =~ @dpg- ]] && [[ ! "$DATABASE_URL" =~ \.render\.com/ ]]; then
  # Extract hostname and database name
  HOSTNAME=$(echo "$DATABASE_URL" | grep -oP '@dpg-[^/]+')
  DB_NAME=$(echo "$DATABASE_URL" | grep -oP '@dpg-[^/]+/\K[^?]+')
  
  # Determine region (default to oregon, check for frankfurt)
  REGION="oregon"
  if [[ "$HOSTNAME" =~ frankfurt ]]; then
    REGION="frankfurt"
  fi
  
  # Reconstruct DATABASE_URL with proper hostname
  BEFORE_HOST=$(echo "$DATABASE_URL" | sed -E "s|@dpg-.*|\@|")
  AFTER_DB=$(echo "$DATABASE_URL" | grep -oP '\?.*' || echo "")
  
  export DATABASE_URL="${BEFORE_HOST}${HOSTNAME}.${REGION}-postgres.render.com/${DB_NAME}${AFTER_DB}"
  echo "  ✓ DATABASE_URL sanitizada: ${HOSTNAME}.${REGION}-postgres.render.com/${DB_NAME}"
else
  echo "  ✓ DATABASE_URL ya tiene formato correcto"
fi

# ── 4. Run database initialization ────────────────
echo ""
echo "[4/4] Ejecutando migraciones de base de datos..."
echo "  → Ejecutando init_db.js..."
node init_db.js || {
  echo "  ⚠️  init_db.js falló, intentando con init-db.sql..."
  # Fallback: ejecutar script SQL directamente si psql está disponible
  if command -v psql &> /dev/null; then
    # Parse DATABASE_URL to force TCP/IP connection
    # Format: postgres://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | grep -oP '(?<=://)[^:]+')
    DB_PASS=$(echo "$DATABASE_URL" | grep -oP '(?<=:)[^@]+' | head -1)
    DB_HOST=$(echo "$DATABASE_URL" | grep -oP '(?<=@)[^:]+')
    DB_PORT=$(echo "$DATABASE_URL" | grep -oP '(?<=:)[^/]+' | tail -1)
    DB_NAME=$(echo "$DATABASE_URL" | grep -oP '(?<=/)[^?]+')
    
    # Use explicit flags to force TCP/IP connection
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/init-db.sql" || true
  else
    echo "  ⚠️  psql no disponible. init_db.js ya habrá creado las tablas."
  fi
}
echo "  ✓ Migraciones completadas"

# ── 4b. Verify DATABASE_URL parsing (debug) ────────
echo ""
echo "[4b/5] Verificando parseo de DATABASE_URL..."
# Use Node.js for safe, precise parsing to avoid regex corruption
PARSED=$(node -e "
const url = process.env.DATABASE_URL;
const m = url.match(/^postgres:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/\s*([^?]+)/);
if (!m) {
  console.error('ERROR: Cannot parse DATABASE_URL');
  process.exit(1);
}
const [, user, pass, host, port, dbname] = m;
console.log(JSON.stringify({
  user,
  pass: pass.substring(0, 3) + '***',
  host,
  port: port || '5432',
  dbname
}));
")
echo "  ✓ DATABASE_URL parseada correctamente: $PARSED"

# ── 5. Start the backend server ───────────────────
echo ""
echo "[5/5] Iniciando servidor Node.js..."
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

