# ✅ PLAN: Diagnosticar y mejorar el bot de intercambio (BOT_UNAVAILABLE)

## Contexto
El bot de Steam en producción (`skinmarket-backend-f0cb.onrender.com`) está desconfigurado/desconectado:
`{"isLoggedIn":false,"loginAttempts":4,"accountName":"migueljosa","rateLimitExceeded":false}`.
Al retirar, `ensureConnected()` devuelve `false` → `BOT_UNAVAILABLE` → "El bot de intercambio no está disponible".

## Pasos

- [ ] 1. `src/backend/steam/botEngine.js` — Añadir diagnóstico `lastError` / `lastErrorCode` / `lastErrorAt` al constructor y exponerlos en `getStatus()`.
- [ ] 2. `src/backend/steam/botEngine.js` — Mejorar `_validateCredentialsStrict()` para detectar placeholders reales (`tu_contraseña_steam`, `tu_shared_secret`, `AQUI`, `your_*`).
- [ ] 3. `src/backend/steam/botEngine.js` — `ensureConnected()` fail-fast: si `logIn()` falla devolver el error específico inmediatamente (sin esperar 30s). En timeout devolver código `LOGIN_TIMEOUT`.
- [ ] 4. `src/backend/steam/botEngine.js` — Manejar `AccountLogonDenied` / `AccountLoginDenied` / `InvalidPassword` / `TwoFactorCodeMismatch` con códigos específicos (`STEAM_EMAIL_CODE_REQUIRED`, `INVALID_CREDENTIALS`, `INVALID_2FA`).
- [ ] 5. `src/backend/steam/botEngine.js` — Añadir helpers `_setLastError()` / `_clearLastError()` y limpiar error al conectar con éxito.
- [ ] 6. `src/backend/server.js` — Propagar `botDiagnostics` (lastError, lastErrorCode, lastErrorAt) en la respuesta de error del retiro.
- [ ] 7. `src/context/AuthContext.jsx` — Mapear nuevos códigos de error a mensajes claros y accionables.
- [ ] 8. `src/components/Inventory.jsx` — Añadir nuevos códigos a ambos mapas de mensajes (withdraw y saveTradeUrl).
- [ ] 9. `src/pages/Dashboard.jsx` — Añadir nuevos códigos al manejador del botón "Retirar".
- [ ] 10. Verificar: revisar `GET /api/bot/status` y probar retiro para confirmar mensaje específico.
- [ ] 11. **Acción del usuario**: Corregir `BOT_PASSWORD`, `BOT_SHARED_SECRET`, `BOT_IDENTITY_SECRET` en el panel de Render para que el bot realmente conecte (cuenta Steam secundaria con Steam Guard Mobile Authenticator/SDA).

