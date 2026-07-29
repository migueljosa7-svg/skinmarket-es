# TODO - SKINMARKET ES FINALIZATION

## ✅ = Complete | 🔄 = In Progress | ⬜ = Pending

### STEP A: Akamai CDN + icon_url Integration
- ✅ A1: Modify `useFetchSkins.js` to normalize icon_url from API
- ✅ A2: Real icon_url hashes from ByMykel API - no extra utility needed
- ✅ A3: Update `server.js` `/api/cases/open` and `/api/claim-daily` with dynamic icon URLs + /360fx360f suffix
- ✅ A4: Ensure all image CDN URLs use /360fx360f consistently
- ✅ A5: `init_db.js` already has `icon_url` column in `inventario` table
- ✅ A6: `ImageService.js` already has Akamai CDN as Tier 2 with correct URLs

### STEP B: NPM Security Overrides
- ✅ B1: Add overrides to both `package.json` files (already done!)
- 🔄 B2: Run `npm audit fix --force` in root
- 🔄 B3: Run `cd src/backend && npm audit fix`

### STEP C: CaseView Backend API Integration
- ✅ C1: Modify `startSpin()` to call backend API with localStorage fallback
- ✅ C2: Handle responses properly with proper error propagation and user feedback

### STEP D: Zero Initial Inventory
- ✅ D1: Verify `/api/register` gives no free items — saldo=0, no inventory inserts
- ✅ D2: Verify `/api/login` and Steam auth give no free items

### STEP E: Build, Commit, Push
- 🔄 E1: `npm run build` (0 errors)
- 🔄 E2: `git add . && git commit && git push origin master`

