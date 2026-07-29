# TODO - Refactorización Integral SkinMarket

## ✅ Paso 1: BotEngine - Validación estricta de credenciales (CONFIG_MISSING)
- [x] Agregar `_validateCredentialsStrict()` que verifica BOT_USERNAME, BOT_PASSWORD, BOT_SHARED_SECRET, BOT_IDENTITY_SECRET
- [x] Llamar desde `ensureConnected()` → retorna error `CONFIG_MISSING` si faltan
- [x] Detección de valores placeholder (`tu_usuario_steam`, `tu_password_steam`)

## ✅ Paso 2: Server.js - Tuning Socket.io (heartbeat + timeout)
- [x] `pingTimeout: 30000` (antes 60s) → detección más rápida de conexiones caídas
- [x] `connectTimeout: 45000` → tolerancia a cold starts en Render
- [x] `maxHttpBufferSize: 1e6` → límite de tamaño de mensaje

## ✅ Paso 3: socket.js - Reconexión inteligente con exponential backoff
- [x] `reconnectionAttempts: 15` (antes 10)
- [x] `reconnectionDelayMax: 30000` con `randomizationFactor: 0.5`
- [x] `consecutiveFailures` tracker para silenciar errores repetitivos
- [x] Reintento manual tras fallar todos los intentos automáticos (30s)
- [x] Manejo de "io server disconnect" con delay de 5s

## ✅ Paso 4: Dashboard.jsx - Manejo de errores RATE_LIMIT / BOT_COOLDOWN / CONFIG_MISSING
- [x] Toast específico por cada código de error: RATE_LIMIT, BOT_COOLDOWN, CONFIG_MISSING, BOT_UNAVAILABLE, ITEM_OUT_OF_STOCK, TRADE_URL_MISSING, CONNECTION_ERROR
- [x] Mensajes UX en español para cada escenario

## ✅ Paso 5: Limpieza de archivos temporales
- [x] Eliminar fix_server.cjs, fix_server.py, fix_server.js de la raíz

