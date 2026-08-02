# PRODUCTION AUDIT PLAN - FINAL POLISH & CERTIFICATION

## INFORMATION GATHERED

After exhaustive review of the codebase (~30 files analyzed), I've identified the following key areas requiring production hardening:

### Critical Issues Found:

1. **Simulation/Mock Patterns**:
   - `AuthContext.jsx` lines 42-50: Creates fake `"oauth_user"` when backend `/api/me` fails
   - `AuthContext.jsx` login (lines 92-107): Falls back to local storage guest user when backend is unavailable
   - `StorageService.js`: `DEFAULT_USER` with `guest@skinmarket.es` enables anonymous play
   - `Login.jsx`: "Entrar como Invitado" button creates fake sessions
   - `CaseView.jsx` lines 237-240: Falls back to client-side `pickWeightedSkin()` when backend fails

2. **Steam Auth - Avatar Sync Missing**:
   - Steam callback (`/api/auth/steam/return`) creates JWT but does NOT sync Steam avatar
   - `passport.use(new SteamStrategy(...))` has `profile.photos?.[0]?.value` which is the avatar URL but it's not stored

3. **Profile Persistence Relies on LocalStorage**:
   - `StorageService` is a LocalStorage-based data layer that acts as fallback source of truth
   - Balance updates in `CaseView.jsx` go to StorageService first, then optionally to backend
   - `AuthContext.updateUser` writes to `StorageService`, not to backend

4. **Backend Exception Gaps**:
   - `GET /api/steam-inventory/:steamId` - No try/catch wrapper
   - `GET /api/steam-price` - No try/catch wrapper
   - Various legacy endpoints

5. **Console Logging in Production**:
   - `StorageService.js`: `console.warn` on invalid data, `console.error` on write failure
   - `AuthContext.jsx`: `console.warn('[LOGIN] Backend unavailable...')`, `console.warn("[SELL] API call failed...")`
   - `useFetchSkins.js`: `console.warn('Could not load prices...')`, `console.error("Error cargando skins...")`
   - `socket.js`: Logs are silenced with `isProd` guard - good pattern but inconsistent

6. **Withdraw Flow - Trade URL Check**:
   - `Inventory.jsx`: After saving Trade URL, auto-retries withdraw - good UX
   - `Dashboard.jsx` withdraw button: Uses direct fetch instead of `withdrawSkin` from context - inconsistent
   - `CaseView.jsx` withdraw button: Checks `link_intercambio` but uses `withdrawSkin` from context

---

## PLAN

### Phase 1: ELIMINATE ALL SIMULATION/MOCK PATTERNS

**File: `src/context/AuthContext.jsx`**
1. Remove fake user creation when `/api/me` fails (lines 42-50)
2. Remove local storage fallback in `login` function when password is provided and backend fails
3. Remove fallback to local storage in `register` function
4. Remove fallback in `sellSkin` when token exists but API fails
5. Remove fallback in `withdrawSkin` reading token from `skinmarket_db_v1`

**File: `src/services/StorageService.js`**
1. Remove `DEFAULT_USER` guest pattern - users without backend auth should be null
2. Remove `hasSession()` check that returns true for non-guest users - only tokens should determine auth

**File: `src/pages/Login.jsx`**
1. Remove "Entrar como Invitado" button (guest login)
2. After OAuth token received, redirect directly to dashboard without guest path

**File: `src/pages/CaseView.jsx`**
1. Remove local StorageService.deductBalance fallback when token exists
2. Remove client-side `pickWeightedSkin()` fallback - only backend should determine outcomes

### Phase 2: STEAM AUTH & AVATAR SYNC

**File: `src/backend/server.js`**
1. In SteamStrategy callback, store `profile.photos?.[0]?.value` as avatar
2. Update avatar on subsequent logins

**File: `src/pages/Login.jsx`**
1. After Steam callback, sync avatar from backend `/api/me` response
2. Clean up URL params without page reload

### Phase 3: PROFILE & INVENTORY PERSISTENCE

**File: `src/context/AuthContext.jsx`**
1. Add `/api/me` polling/re-fetch on navigation
2. `updateUser` should push changes to backend when token exists
3. `fetchInventory` should always call backend when token exists

**File: `src/pages/Dashboard.jsx`**
1. After daily claim, re-fetch `/api/me` immediately 
2. Sell button should always go through backend when token exists

### Phase 4: BACKEND EXCEPTION HARDENING

**File: `src/backend/server.js`**
1. Add try/catch to `GET /api/steam-inventory/:steamId`
2. Add try/catch to `GET /api/steam-price`
3. Add try/catch to Steam auth callback routes
4. Ensure all endpoints return structured JSON on error

### Phase 5: CONSOLE CLEANUP

**File: `src/services/StorageService.js`** - Remove all console.warn, use silent try/catch
**File: `src/context/AuthContext.jsx`** - Remove all console.warn fallback messages
**File: `src/hooks/useFetchSkins.js`** - Remove console.warn/error (or guard with isProd)
**File: `src/services/socket.js`** - Pattern is good, keep as-is

### Phase 6: WITHDRAW FLOW CONSISTENCY

**File: `src/pages/Dashboard.jsx`** - Use `withdrawSkin` from context instead of direct fetch
**File: `src/components/Inventory.jsx`** - Ensure exchange (85%) also syncs to backend

---

## DEPENDENT FILES TO EDIT

1. `src/context/AuthContext.jsx` - MAJOR changes
2. `src/services/StorageService.js` - MAJOR changes  
3. `src/pages/Login.jsx` - Remove guest, improve OAuth
4. `src/backend/server.js` - Steam avatar, exception hardening
5. `src/pages/CaseView.jsx` - Remove client-side fallbacks
6. `src/pages/Dashboard.jsx` - Use context withdraw, fix daily claim sync
7. `src/components/Inventory.jsx` - Exchange sync to backend
8. `src/hooks/useFetchSkins.js` - Console cleanup
9. `src/services/socket.js` - Verify no console leaks

## FOLLOWUP STEPS

1. Run `npm run build` to verify zero errors
2. Run `npm run lint` for ESLint check
3. Verify console is clean by checking all `console.*` calls are guarded
4. Test auth flows: Steam login, Google login, Email registration
5. Test inventory: Open case -> skin appears -> sell updates balance
6. Test withdraw: Configure trade URL -> withdraw -> offer sent
7. Run production build test

---

## CONFIRMATION REQUEST

Do you approve this plan? I'll proceed with implementation phase by phase.

