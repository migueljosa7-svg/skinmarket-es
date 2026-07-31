# SUPER PROMPT REFACTOR - PROGRESS TRACKER

## FASE 1: UI/AUTH FIXES
- [x] 1. `StorageService.hasSession()` - Check JWT token first
- [x] 2. `AuthContext` - Initial state sync with token + /api/me mount fetch
- [x] 3. `CaseView.jsx` - Token fallback auth check
- [x] 4. `Login.jsx` - Steam OAuth + Google OAuth with state sync via dispatchEvent
- [x] 5. `Cases.jsx` CaseCard - Redesigned with glow, glassmorphism price badge, heart icon
- [x] 6. `NavBar.jsx` - Hamburger menu with FaBars/FaTimes, backdrop, animations
- [ ] 7. `App.jsx` - Add `lazyWithRetry` wrapper for dynamic imports
- [ ] 8. `public/images/fallback-skin.png` - Local fallback image for Steam 404

## FASE 2: ECONOMÍA REALISTA (DROPS/BACKEND RNG)
- [ ] 9. Backend `server.js` - Add `crypto.randomInt` for cryptographically secure RNG in case opening
- [ ] 10. Backend - Tier odds enforcement (Consumer: 75-85%, Mil-Spec: 10-15%, Classified: 1-3%, Extraordinary: 0.001-0.05%)

## FASE 3: SISTEMA DE DINERO, CÓDIGOS PROMO Y CRYPTO
- [ ] 11. `scripts/init-db.sql` - Add promo_codes + user_promo_usage tables
- [ ] 12. Backend `server.js` - Add promo code routes with single-use validation
- [ ] 13. `paymentController.js` - Add deposit limits (min 5€, max 1000€) + input sanitization

## FASE 4: SEGURIDAD Y WITHDRAW
- [ ] 14. Backend - Verify withdraw requires valid Trade URL before processing
- [ ] 15. Backend - Remove any debug/test endpoints

## FASE 5: GITHUB DEPLOY
- [ ] 16. Commit and push all changes to master branch
