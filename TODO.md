# TODO: Fix Render Deployment - Database & Startup Issues

## Task List

### 1. Fix `render-start.sh` regex for postgresql:// URLs ✅
- [x] Step [4b/5] now uses WHATWG `new URL()` parser — handles both `postgres://` and `postgresql://` automatically
- [x] psql fallback command uses `?sslmode=require` flags

### 2. Fix `init_db.js` invalid syntax ✅
- [x] Inline `//` comments inside array literals are valid JS (comments allowed wherever whitespace is); `node --check` passes
- [x] Proper error handling via `waitForDatabase` retry + `process.exit(1)` on failure

### 3. Fix `db.js` SSL & connection resilience ✅
- [x] `sslmode=require` added to connection string via `ensureSslMode()`
- [x] Pool error event handler with logging added
- [x] Connection retry logic (`waitForDatabase`) with backoff added
- [x] Pool validation query (`SELECT 1`) on startup

### 4. Fix `render-start.sh` error handling ✅
- [x] `set -e` for proper error propagation
- [x] Diagnostic logging of env vars, DB URL parsing, and startup steps

### 5. Fix `server.js` startup (syntax error from `startServer()` wrapper) ✅
- [x] Replaced broken `async function startServer() { ... }` wrapper (which left the rest of the file outside the function) with **top-level `await`** (ESM)
- [x] `waitForDatabase({ maxRetries: 8, baseDelayMs: 3000 })` now blocks HTTP server startup until DB is reachable (or degrades gracefully)
- [x] `node --check src/backend/server.js` passes — no syntax errors

### 6. Update `render.yaml` placeholder URLs ⚠️
- [ ] Placeholders remain (`your-backend-service.onrender.com`, etc.) — must be replaced with the real URLs after first deploy in the Render dashboard (or set as env vars)

