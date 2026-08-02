# TODO - Fix PostgreSQL SSL Handshake & Render DB Deployment

## Objetivo
Corregir de raíz los fallos de conexión PostgreSQL SSL entre el backend Node.js y Render ("Connection terminated unexpectedly" / "SSL connection has been closed unexpectedly").

## Pasos

### 1. Crear rama de corrección
- [x] Crear rama `fix/postgres-ssl-render` desde `master`

### 2. Corregir `src/backend/db.js`
- [x] Reemplazar `ensureSslMode()` por `sanitizeDatabaseUrl()` usando WHATWG URL API
  - [x] Eliminar `sslmode`, `ssl`, `sslrootcert`, `sslcert`, `sslkey` de DATABASE_URL
  - [x] Evitar la advertencia de deprecación de `pg-connection-string`
  - [x] Evitar que `parse()` sobrescriba `ssl: { rejectUnauthorized: false }` con `ssl: {}`
- [x] Mantener `ssl: { rejectUnauthorized: false }` explícito en producción/Render
- [x] Añadir `keepAlive: true` + `keepAliveInitialDelayMillis` al Pool
- [x] Mejorar `waitForDatabase()` con logging clasificado de errores SSL/cold-start

### 3. Corregir `src/backend/init_db.js`
- [x] Añadir logging del error en el bloque `catch`
- [x] Mantener lógica de reintentos (`maxRetries: 6, baseDelayMs: 3000`)

### 4. Mejorar `scripts/render-start.sh`
- [x] Mejorar paso 4b: detectar/advertir `sslmode`/`ssl` residuales en DATABASE_URL

### 5. Verificación y compilación
- [x] `node --check src/backend/db.js`
- [x] `node --check src/backend/init_db.js`
- [x] `node --check src/backend/server.js`

### 6. Commit y push
- [ ] Commit con mensaje descriptivo
- [ ] Push a `origin fix/postgres-ssl-render` (dispara auto-deploy en Render)
- [ ] Verificar logs del deploy en Render (conexión DB exitosa, sin warning pg-connection-string)

