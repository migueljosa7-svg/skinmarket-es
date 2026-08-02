# Fix Plan - Crash & Avatar Issues

## ✅ Fix 1: Guard `.price` in reduce() callbacks
- [x] `UploadSkin.jsx` - Guard `s.price` → `s?.price || 0` in reduce
- [x] `CaseView.jsx` - Guard `curr.price` → `curr?.price || 0` in reduce
- [x] `Battles.jsx` - Guard `skin.price` → `skin?.price || 0` in critical spots
- [x] `Battles.jsx` - Guard `drop.price` → `drop?.price || 0` in player total calc
- [x] `Battles.jsx` - Guard `r.price` → `r?.price || 0` in team & current score reduces

## ✅ Fix 2: Save avatar in AuthContext & LoginSuccess
- [x] `AuthContext.jsx` - Add `avatar: userData.avatar` to updateUser (login/register/me)
- [x] `LoginSuccess.jsx` - Add `avatar: userData.avatar` to updateUser (OAuth callback)
- [x] `Dashboard.jsx` - Avatar renders with fallback (already wired, verified)

## ✅ Testing (manual - run app to verify)
- [x] Verify app loads without crash
- [x] Verify avatar displays in Dashboard
