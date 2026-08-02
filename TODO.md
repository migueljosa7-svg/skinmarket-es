# ✅ TODOS — Fix Bot + Imágenes 404

## Fix 1: Eliminar errores 404 de imágenes de emergencia
- [x] 1. `src/services/ImageService.js` — Eliminar `getEmergencySkinUrl()` y toda referencia a emergency-skins. El fallback final debe ir directo al SVG placeholder sin generar 404.

## Fix 2: Withdraw automático como venta cuando el bot no está configurado
- [x] 2. `src/backend/server.js` — En `/api/inventory/withdraw`, cuando el bot devuelve `CONFIG_MISSING` o `BOT_UNAVAILABLE`, hacer fallback automático a vender la skin por 100% del valor en saldo.
- [x] 3. `src/backend/server.js` — Agregar endpoint `/api/inventory/withdraw` con detección temprana de si el bot está configurado, y si no, hacer auto-fallback.

## Fix 3: Mejorar mensajes de error en frontend
- [x] 4. `src/components/Inventory.jsx` — Mejorar mensajes cuando el bot no está disponible
- [x] 5. `src/context/AuthContext.jsx` — Mejorar mensajes de error BOT_UNAVAILABLE

## Fix 4: Construir y verificar
- [ ] 6. Ejecutar `npm run build` para verificar
