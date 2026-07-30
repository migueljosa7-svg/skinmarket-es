# TODO: Fix Session Bug in Withdraw Process

## Pasos completados:
- [x] Diagnóstico completo del bug de sesión
- [x] 1. AuthContext.jsx: Corregir `login()` para llamar a API real y guardar JWT
- [x] 2. AuthContext.jsx: Corregir `register()` para llamar a API real y guardar JWT
- [x] 3. AuthContext.jsx: Agregar `console.log` de diagnóstico del token en `withdrawSkin()`
- [x] 4. Dashboard.jsx: Mejorar `getAuthToken()` con fallback a `localStorage.getItem("token")`
- [x] 5. Dashboard.jsx: Agregar `console.log` de diagnóstico en el inline withdraw handler
- [x] 6. server.js: Mejorar `authenticateToken` para devolver códigos específicos
- [x] 7. Login.jsx: Pasar `password` a `login()` y `register()` para que usen la API real

## Verificación final:
- [x] Verificar que los cambios no rompen el flujo de invitado (guest login sin password funciona via fallback local)
- [x] Flujo de guest login mantiene compatibilidad: cuando no hay password, cae al fallback local

