# Fix Plan

## Issues
1. **Profile photo not showing** — `avatar` field not saved to StorageService
2. **"Cannot read properties of undefined (reading 'price')"** — Unguarded `.price` access and undefined entries in skin arrays

## Steps

- [x] Step 1: Fix `AuthContext.jsx` — Add `avatar: userData.avatar` to updateUser() ✅
- [x] Step 2: Fix `LoginSuccess.jsx` — Add `avatar: userData.avatar` to updateUser() ✅
- [x] Step 3: Fix `Cases.jsx` — Guard against undefined entries in `assignSkinsToCase()` + local usedIndices Set ✅
- [x] Step 4: Fix `UploadSkin.jsx` — Add optional chaining `s?.price || 0` in reduce calls ✅

## All fixes applied!
