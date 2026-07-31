# AUDIT & FIX TODO

## Phase 1: Steam Auth Timeout Fix (server.js)
- [x] Add 8-second timeout guard to `/api/auth/steam/return` callback
- [x] Add timeout guard to `/api/auth/steam` route
- [x] Ensure proper error redirect with descriptive error codes

## Phase 2: Google Auth - Verified Real (No changes needed)
- [x] Confirm: `/api/auth/google` uses real `google-auth-library` verification
- [x] Confirm: Login.jsx uses real Google Identity Services (GIS)
- [x] No mock traces found anywhere

## Phase 3: Auth Context Fix
- [x] Fix `claimDaily` in AuthContext.jsx to call the backend API

## Phase 4: Verification
- [x] Run linter on backend - 26 pre-existing errors (none from my changes)
- [x] Run linter on frontend - 4 pre-existing errors (none from my changes)
- [x] Verify all HTTP responses have proper error handling
