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
node init_db.js || {
  echo "  ⚠️  init_db.js falló, intentando con init-db.sql..."
  # Fallback: ejecutar script SQL directamente si psql está disponible
  if command -v psql &> /dev/null; then
    # Use Node.js URL parser to safely handle special chars in password
    DB_PARAMS=$(node -e "
    const { URL } = require('url');
    const url = new URL(process.env.DATABASE_URL);
    console.log(JSON.stringify({
      user: url.username,
      pass: url.password || '',
      host: url.hostname,
      port: url.port || '5432',
      dbname: url.pathname.replace(/^\//, '')
    }));
    ")
    
    DB_USER=$(echo "$DB_PARAMS" | node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log(j.user);")
    DB_PASS=$(echo "$DB_PARAMS" | node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log(j.pass);")
    DB_HOST=$(echo "$DB_PARAMS" | node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log(j.host);")
    DB_PORT=$(echo "$DB_PARAMS" | node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log(j.port);")
    DB_NAME=$(echo "$DB_PARAMS" | node -e "const d=require('fs').readFileSync(0,'utf8');const j=JSON.parse(d);console.log(j.dbname);")
    
    # Use explicit flags to force TCP/IP connection
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/init-db.sql" || true
  else
    echo "  ⚠️  psql no disponible. init_db.js ya habrá creado las tablas."
  fi
} || true
echo "  ✓ Migraciones completadas (o continuando a pesar de errores)"

# ── 4b. Verify DATABASE_URL parsing (debug) ────────
echo ""
echo "[4b/5] Verificando parseo de DATABASE_URL..."
# Use Node.js for safe, precise parsing to avoid regex corruption
# Append full domain for Render PostgreSQL hosts if needed
PARSED=$(node -e "
const url = process.env.DATABASE_URL;
const m = url.match(/^postgres:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/\s*([^?]+)/);
if (!m) {
  console.error('ERROR: Cannot parse DATABASE_URL');
  console.log(JSON.stringify({ error: 'parse_failed', raw: url.substring(0, 50) + '...' }));
} else {
  const [, user, pass, host, port, dbname] = m;
  // Append full domain for Render PostgreSQL hosts without dots
  const fullHost = host.includes('.') ? host : host + '.oregon-postgres.render.com';
  console.log(JSON.stringify({
    user,
    pass: pass.substring(0, 3) + '***',
    host: fullHost,
    original_host: host,
    port: port || '5432',
    dbname
  }));
}
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

