# TODO: Unify Inventory Image Resolution + Multi-CDN Pipeline

## Step 1: `src/services/ImageService.js` ✅
- [x] Reorder CDN tiers to 7-tier pipeline (name-based CDNs first)
- [x] Add Swap.gg CDN (Tier 3)
- [x] Add ByMykel Web Mirror (Tier 4)
- [x] Move Steam hash CDNs to Tier 5-6
- [x] Updated `getSkinImageSources()` to generate 7 ordered sources
- [x] Updated `handleImageError()` to handle all 7 levels

## Step 2: `src/pages/Upgrade.jsx` ✅
- [x] Import `getSkinImageUrl` from ImageService
- [x] Fix LEFT inventory cards: use `getSkinImageUrl(skin.name, skin.image)`
- [x] Fix RIGHT target cards: use `getSkinImageUrl(skin.name, skin.image)`

## Step 3: `src/components/Inventory.jsx` ✅
- [x] Import `getSkinImageUrl` from ImageService
- [x] Fix inventory skin cards: use `getSkinImageUrl(skin.name, skin.image)`

## Step 4: Build & Deploy 🔄
- [ ] Run `npx vite build` to verify compilation
- [ ] Git commit & push to master

