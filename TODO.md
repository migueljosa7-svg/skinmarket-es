# TODO - CORRECCIÓN INTEGRAL - EN PROGRESO

## ✅ = Completo | 🔄 = En Progreso | ⬜ = Pendiente

### BLOQUE 1: Sistema de Cajas Diarias → Ruleta con Skin
- ✅ `server.js` - `/api/claim-daily`: genera skin real, inserta en inventario con transacción atómica, devuelve datos de skin
- ⬜ `Dashboard.jsx` - `handleClaimDailyReward`: manejar respuesta con skin del backend
- ⬜ `AuthContext.jsx` - `claimDaily()`: retornar skin en lugar de dinero directo

### BLOQUE 1.5: APIs Oficiales + Imágenes CDN + Inventario Cero
- ✅ Steam CDN URLs limpias con `getSkinImageSources()` ya implementado (4-tier fallback)
- ✅ Placeholder SVG con gradiente por nombre de skin (estilo SkinRave)
- ✅ Inventario inicial ELIMINADO (0 skins, INITIAL_INVENTORY = [])
- ✅ INITIAL_INVENTORY eliminado de StorageService.js

### BLOQUE 2: Fix DB + Render
- ✅ `db.js` - Parseo robusto de DATABASE_URL (trim, quitar comillas simples/dobles, quitar espacios)

### BLOQUE 3: Consola 0 errores
- ✅ `ImageService.js` - `onerror = null` en fallback final, max 2 retries, sin localStorage dependency
- ✅ `socket.js` - transports `['websocket', 'polling']`, VITE_API_URL o VITE_BACKEND_URL

### BLOQUE 4: Inventario DB + Bot + CaseView
- ⬜ `CaseView.jsx` - `startSpin()` llama a `POST /api/cases/open` (backend, no localStorage)
- ✅ Trade URL validation estricta en `/api/inventory/withdraw` (verifica steam_id + trade_token)

### BLOQUE 5: npm audit + build + commit + push
- ⬜ npm audit fix --force frontend + backend
- ⬜ npm run build (0 errores)
- ⬜ git add . && commit && push origin master

