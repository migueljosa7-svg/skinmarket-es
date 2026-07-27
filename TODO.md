# TODO: Auditoría Técnica Integral - SkinMarket ES

## 🔴 Issue 1: `render.yaml` - `fromService` en Frontend Static Site
- **File**: `render.yaml`
- **Problem**: `VITE_API_URL` y `VITE_WS_URL` usan `fromService` que NO está soportado en static sites de Render
- **Fix**: Reemplazar con `sync: false` para configurar manualmente en Render Dashboard
- **Status**: ✅ COMPLETED

## 🔴 Issue 2: `render.yaml` - `FRONTEND_URL` referencia a static site
- **File**: `render.yaml`
- **Problem**: `fromService` apuntando a `skinmarket-frontend` (static site) no funciona
- **Fix**: Cambiar a `fromService` apuntando a `skinmarket-backend` (ambos sirven en misma URL)
- **Status**: ✅ COMPLETED

## 🔴 Issue 3: `server.js` - `app` usado antes de ser definida
- **File**: `src/backend/server.js`
- **Problem**: Código Bot y `app.get("/api/bot/status")` ejecutado ANTES de `const app = express()`
- **Fix**: Mover bloque del bot DESPUÉS de la creación de `app`
- **Status**: ✅ COMPLETED

## 🔴 Issue 4: `server.js` - Catch-all SPA shadowea rutas de payment/P2P
- **File**: `src/backend/server.js`
- **Problem**: `app.get(/(.*)/, ...)` está ANTES de las rutas de payments y P2P
- **Fix**: Mover catch-all al FINAL del archivo, después de TODAS las rutas API (antes de Socket.io listen)
- **Status**: ✅ COMPLETED

## 🔴 Issue 5: `server.js` - Redis fallback ausente
- **Files**: `src/backend/server.js`
- **Problem**: No hay Redis en Render. `RedisStore` con cliente fallido lanza error
- **Fix**: Implementar fallback a MemoryStore si Redis no está disponible o falla
- **Status**: ✅ COMPLETED

## 🟡 Issue 6: `server.js` - `import fetch` en medio del archivo
- **File**: `src/backend/server.js`
- **Problem**: `import fetch from 'node-fetch'` estaba en medio del archivo
- **Fix**: Movido al tope con los demás imports (junto con `path`, `fileURLToPath`, `cron`)
- **Status**: ✅ COMPLETED

## 🟡 Issue 7: `init_db.js` - Tabla `pagos_pendientes` faltante
- **File**: `src/backend/init_db.js`
- **Problem**: PaymentController referencia tabla `pagos_pendientes` que no se crea en init_db.js
- **Fix**: Agregar `CREATE TABLE IF NOT EXISTS pagos_pendientes` a init_db.js
- **Status**: ✅ COMPLETED

## 🟡 Issue 8: `init_db.js` - Columna `role` faltante en tabla usuarios
- **File**: `src/backend/init_db.js`
- **Problem**: Middleware `isAdmin` consulta `SELECT role FROM usuarios` pero columna no existe
- **Fix**: Agregar `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`
- **Status**: ✅ COMPLETED

## 🟡 Issue 9: Frontend API URLs absolutas en producción
- **Files**: `src/components/LiveDrops.jsx`, `src/components/RechargeModal.jsx`
- **Problem**: Usaban `import.meta.env.VITE_API_URL || "http://localhost:3001"` — en producción deben usar rutas relativas
- **Fix**: 
  - `LiveDrops.jsx`: Usar `VITE_WS_URL || window.location.origin`
  - `RechargeModal.jsx`: Usar `VITE_API_URL || ""` (cadena vacía = ruta relativa)
- **Status**: ✅ COMPLETED

## 🟡 Issue 10: `render-start.sh` - Path relativo frágil
- **File**: `scripts/render-start.sh`
- **Problem**: `cd "$(dirname "$0")/../src/backend"` puede fallar según desde dónde se ejecute
- **Fix**: Agregar múltiples fallbacks de ruta, incluyendo path absoluto de Render
- **Status**: ✅ COMPLETED

