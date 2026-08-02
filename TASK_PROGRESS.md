# Task Progress - Auth Real & Economic Balance

## Phase 1: Google OAuth Real (No Mock Messages)
- [x] Fix Login.jsx - Remove "proximamente disponible en produccion" mock message
- [x] Ensure Google OAuth flow works end-to-end with real token verification
- [x] Add proper error handling for missing GOOGLE_CLIENT_ID

## Phase 2: Steam Login & Trade URL Guard
- [x] Verify Steam callback properly saves JWT and syncs user data (avatar, username, steamID64)
- [x] Add Trade URL validation check on profile page
- [x] Ensure withdraw is blocked without valid Trade URL
- [x] Add Trade URL modal trigger from profile page

## Phase 3: Restructure Case Prices (Economic Balance)
- [x] Update cases.js price ranges to match requirements:
  - Economic: 0.50€ - 2.50€
  - Intermediate: 5.00€ - 25.00€
  - Premium: 50.00€ - 300.00€
  - Limited: 50.00€ - 300.00€
  - Add Risk Zone / High Risk: 10.00€ - 150.00€
- [x] Update backend casePrices map in server.js
- [x] Add Risk Zone category with high volatility logic

## Phase 4: Decimal Precision & Sell Sync
- [x] Audit all monetary operations for toFixed(2) usage
- [x] Verify sell skin removes from inventory synchronously (atomic transactions with FOR UPDATE)
- [x] Ensure balance updates are exact to DB price

## Build Verification
- [ ] Run npm build to verify no compilation errors