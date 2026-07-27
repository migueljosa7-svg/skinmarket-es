# Deployment Fix TODO (Phase 1)

- [x] Create plan (approved)
- [x] 1. Edit `src/backend/package.json` — add `bcrypt` dependency
- [x] 2. Edit `src/backend/db.js` — add SSL config + connection timeout
- [x] 3. Edit `src/backend/init_db.js` — add retry logic with backoff
- [x] 4. Run `cd src/backend && npm install` to install bcrypt
- [x] 5. Commit: `fix(deploy): add bcrypt dependency and fix postgres hostname resolution`
- [x] 6. Push to `master`

# Dependency Audit & Fix (Phase 2)

- [x] 1. Run dependency scanner across all files
- [x] 2. Create DEPENDENCY_AUDIT.md with full report
- [x] 3. Add 12 missing dependencies to `src/backend/package.json` (helmet, hpp, express-session, connect-redis, redis, express-rate-limit, passport, passport-steam, steam-user, steamcommunity, steam-tradeoffer-manager, steam-totp)
- [x] 4. Remove unused deps from `src/backend/package.json` (`@supabase/supabase-js`, `bcryptjs`)
- [x] 5. Run `npm install` in `src/backend/` to sync package-lock.json
- [x] 6. Commit: `fix(deps): add missing backend dependencies and cleanup unused packages`
- [x] 7. Push to `master`

