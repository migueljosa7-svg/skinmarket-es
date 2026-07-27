# 🔍 Dependency Audit Report — SKINMARKET ES

## 1. PACKAGES USED IN CODE (scanned from imports)

### Root-level packages (used in `src/` frontend):

| Package | Used In | In package.json? | Status |
|---------|---------|-----------------|--------|
| `react` | Components, Pages | ✅ `^19.2.0` | ✅ OK |
| `react-dom` | main.jsx | ✅ `^19.2.0` | ✅ OK |
| `react-router-dom` | App.jsx, NavBar | ✅ `^7.13.0` | ✅ OK |
| `react-icons` | Components | ✅ `^5.5.0` | ✅ OK |
| `socket.io-client` | LiveDrops.jsx | ✅ `^4.8.3` | ✅ OK |
| `framer-motion` | CaseView, Upgrade, etc | ✅ `^12.34.3` | ✅ OK |
| `@vitejs/plugin-react` | vite.config.js | ✅ `^5.1.1` (dev) | ✅ OK |
| `eslint` + plugins | eslint.config.js | ✅ devDeps | ✅ OK |
| `vite` | build tool | ✅ `^7.3.1` (dev) | ✅ OK |

### Backend packages (used in `src/backend/`):

| Package | Used In | In backend package.json? | Status |
|---------|---------|-------------------------|--------|
| `express` | server.js | ✅ `^5.2.1` | ✅ OK |
| `cors` | server.js | ✅ `^2.8.6` | ✅ OK |
| `dotenv` | server.js, db.js, botEngine.js | ✅ `^17.3.1` | ✅ OK |
| `bcrypt` | server.js | ✅ `^5.1.1` | ✅ OK |
| `jsonwebtoken` | server.js | ✅ `^9.0.3` | ✅ OK |
| `pg` (PostgreSQL) | db.js | ✅ `^8.18.0` | ✅ OK |
| `socket.io` | server.js | ✅ `^4.8.3` | ✅ OK |
| `node-fetch` | server.js, p2pMarketService.js | ✅ `^3.3.2` | ✅ OK |
| `node-cron` | server.js | ✅ `^4.6.0` | ✅ OK |
| `helmet` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `hpp` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `express-session` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `connect-redis` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `redis` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `express-rate-limit` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `passport` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `passport-steam` | server.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `steam-user` | botEngine.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `steamcommunity` | botEngine.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `steam-tradeoffer-manager` | botEngine.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `steam-totp` | botEngine.js | ❌ Missing in backend pkg | ⚠️ Only in root |
| `crypto` (node built-in) | paymentController.js, p2pMarketService.js | ✅ Built-in (no install needed) | ✅ OK |
| `path` (node built-in) | server.js, db.js | ✅ Built-in | ✅ OK |
| `url` (node built-in) | server.js, db.js | ✅ Built-in | ✅ OK |
| `child_process` (node built-in) | server.js | ✅ Built-in | ✅ OK |
| `fs` (node built-in) | generate_prices_cache.js | ✅ Built-in | ✅ OK |
| `https` (node built-in) | generate_prices_cache.js | ✅ Built-in | ✅ OK |
| `zlib` (node built-in) | generate_prices_cache.js | ✅ Built-in | ✅ OK |
| `@supabase/supabase-js` | declared in backend pkg | ✅ `^2.97.0` | ❌ NOT USED anywhere in code |
| `bcryptjs` | declared in backend pkg | ✅ `^3.0.3` | ❌ NOT USED (uses `bcrypt` instead) |

---

## 2. ISSUES FOUND

### 🔴 Critical Issues

| # | Issue | Details | Recommendation |
|---|-------|---------|---------------|
| 1 | **Backend `package.json` is incomplete** | The backend server imports 12+ packages that are only listed in the **root** `package.json`, not in `src/backend/package.json`. This works locally because of hoisting but **will fail in Docker** where only backend deps are installed. | Move all backend-used packages from root to `src/backend/package.json` |
| 2 | **`@supabase/supabase-js` installed but never used** | Listed in backend deps (`^2.97.0`) but no import in any file. Unnecessary dependency bloat. | Remove from backend `package.json` |
| 3 | **`bcryptjs` installed alongside `bcrypt`** | Both `bcrypt` and `bcryptjs` are in backend deps. Code only uses `bcrypt`. Duplicate. | Remove `bcryptjs` from backend `package.json` |

### 🟡 Warning Issues

| # | Issue | Details | Recommendation |
|---|-------|---------|---------------|
| 4 | **Root `package.json` has both frontend AND backend deps mixed** | Backend deps (helmet, hpp, express-session, redis, passport, steam-*, etc.) are in root. Root should only have frontend/Vite deps. | Clean separation: root = frontend only, backend = backend only |
| 5 | **`react-circular-progressbar`, `react-slick`, `slick-carousel`** | Listed in root deps but their imports weren't found by the scanner. May be used dynamically. | Verify if actually used; if not, remove |
| 6 | **`babel-plugin-react-compiler`** | devDep in root. Not imported directly. May be used by Vite config. | Verify usage in vite.config.js |

### 🟢 Informational

| # | Info |
|---|------|
| 7 | Frontend uses React 19.2.0, Vite 7.3.1 — modern stack ✅ |
| 8 | Backend uses Express 5.2.1 — latest ✅ |
| 9 | Node built-ins (crypto, path, fs, url, child_process, https, zlib) are correctly used without npm install |

---

## 3. DEPENDENCY MAP

### Root `package.json` (should be Frontend-only)

```
Root (Frontend + mixed)
├── react, react-dom, react-router-dom, react-icons
├── framer-motion
├── socket.io-client
├── react-circular-progressbar, react-slick, slick-carousel
├── vite, @vitejs/plugin-react (dev)
├── eslint, eslint-plugin-* (dev)
│
├── ❌ BACKEND DEPS (should move to backend/package.json):
│   ├── helmet, hpp
│   ├── express-session, connect-redis, redis
│   ├── express-rate-limit
│   ├── passport, passport-steam
│   ├── steam-user, steamcommunity, steam-tradeoffer-manager, steam-totp
│   ├── cors, dotenv, bcrypt
│   ├── jsonwebtoken, node-cron, node-fetch, express
│   └── socket.io
```

### Backend `package.json` (actual usage)

```
Backend (src/backend/)
├── Actually used:
│   ├── express ^5.2.1
│   ├── cors ^2.8.6
│   ├── dotenv ^17.3.1
│   ├── bcrypt ^5.1.1
│   ├── jsonwebtoken ^9.0.3
│   ├── pg ^8.18.0
│   ├── socket.io ^4.8.3
│   ├── node-fetch ^3.3.2
│   ├── node-cron ^4.6.0
│   └── (12+ MISSING packages)
│
├── NOT used:
│   ├── @supabase/supabase-js ^2.97.0  ← REMOVE
│   └── bcryptjs ^3.0.3                ← REMOVE
│
├── Missing (needs to be added):
│   ├── helmet, hpp
│   ├── express-session, connect-redis, redis
│   ├── express-rate-limit
│   ├── passport, passport-steam
│   ├── steam-user, steamcommunity, steam-tradeoffer-manager, steam-totp
│   └── bcrypt (already present)
```

---

## 4. RECOMMENDED ACTIONS

### Step 1: Fix Backend `package.json`
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "connect-redis": "^9.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.2.1",
    "express-session": "^1.19.0",
    "helmet": "^8.1.0",
    "hpp": "^0.2.3",
    "jsonwebtoken": "^9.0.3",
    "node-cron": "^4.6.0",
    "node-fetch": "^3.3.2",
    "passport": "^0.7.0",
    "passport-steam": "^1.0.18",
    "pg": "^8.18.0",
    "redis": "^5.11.0",
    "socket.io": "^4.8.3",
    "steam-totp": "^2.1.2",
    "steam-tradeoffer-manager": "^2.12.2",
    "steam-user": "^5.3.0",
    "steamcommunity": "^3.49.0"
  },
  "devDependencies": {}
}
```

### Step 2: Clean Root `package.json`
Remove these backend-only dependencies from root:
- `helmet`, `hpp`, `express-session`, `connect-redis`, `redis`
- `express-rate-limit`, `passport`, `passport-steam`
- `steam-*` packages
- `socket.io` (keep `socket.io-client` for frontend)

### Step 3: Remove Unused Backend Dependencies
- `@supabase/supabase-js`
- `bcryptjs`

### Step 4: Regenerate `package-lock.json`
```bash
cd src/backend && rm -rf node_modules package-lock.json && npm install
```

---

## 5. SUMMARY

- **Total packages in root package.json**: 44 (deps + devDeps)
- **Total packages in backend package.json**: 11
- **Packages missing from backend**: 12 (critical for Docker)
- **Unused installed packages**: `@supabase/supabase-js`, `bcryptjs`
- **Duplicate packages**: `bcrypt` + `bcryptjs`
- **Risk level**: 🔴 **HIGH** — Docker deployment will fail because backend container won't have required packages installed

