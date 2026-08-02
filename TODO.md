# TODO — Bug Fix Implementation

## 1. Real Steam image hashes (Bug: Steam images 404)
- [x] Create `src/backend/services/skinImageService.js` (lazy-loads real CSGO-API hashes)
- [x] Add in-memory name→hash cache to `skinImageService.js`
- [x] `src/backend/server.js`: use real hashes in `/api/cases/open` and `/api/claim-daily`
- [x] `src/backend/server.js`: include `icon_url` in inventory queries + `/api/inventory/add`
- [x] `src/backend/server.js`: exclude `destroyed` items from inventory queries

## 2. Withdraw offer not arriving (Bug: bot logs "started" but no offer)
- [x] `src/backend/steam/botEngine.js`: fix `_createAndSendOffer` to await Steam Guard confirmation with retry
- [ ] `src/backend/server.js`: report pending/confirmed offer status to frontend

## 3. Inventory lost on logout/login
- [ ] `src/services/StorageService.js`: add `setInventory(items)`
- [ ] `src/context/AuthContext.jsx`: sync `/api/me` inventory into StorageService on mount/login/register
- [ ] `src/context/AuthContext.jsx`: handle `autoFallback` in `withdrawSkin`

## 4. Upgrade money added on loss
- [ ] `src/services/StorageService.js`: add `destroySkin(skinId)` (consume without credit)
- [ ] `src/backend/server.js`: add `POST /api/inventory/destroy`
- [ ] `src/backend/server.js`: add `POST /api/upgrade/complete`
- [ ] `src/pages/Upgrade.jsx`: use `destroySkin` for consumed skins + sync to backend

## Follow-up
- [ ] Restart backend + frontend and verify all four fixes

