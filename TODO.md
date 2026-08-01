# SkinMarket ES - Remaining Phases Implementation Plan

## PHASE 3.b: BATTLES BACKEND ENDPOINTS
- [x] 3.b.1 Add battleRooms Map + TTL cleanup in server.js
- [x] 3.b.2 Add atomicDeductAndAwardXP helper (atomic balance deduction + XP)
- [x] 3.b.3 Add POST /api/battles/create endpoint
- [x] 3.b.4 Add POST /api/battles/join endpoint
- [x] 3.b.5 Award XP in POST /api/cases/open

## PHASE 4: XP LEVEL SYSTEM UI
- [x] 4.1 NavBar.jsx: Add LEVEL badge + shiny XP progress bar next to balance
- [x] 4.2 Dashboard.jsx: Add "Nivel y Progreso" card (XP actual, objetivo, porcentaje)
- [x] 4.3 AuthContext.jsx: Add awardXP helper ($1 = 100 XP) + wire into spend flows
- [x] 4.4 Battles.jsx: Wire private battles to create/join endpoints + awardXP
- [x] 4.5 CaseView.jsx: Wire awardXP into case open (backend + local fallback)

## PHASE 5: AIRDROP MODULE
- [x] 5.1 Create src/pages/Airdrop.jsx (24h countdown, prize pool, daily claim, recent drops)
- [x] 5.2 NavBar.jsx: Add AIRDROP button (top bar + mobile drawer)
- [x] 5.3 App.jsx: Register /airdrop route

## PHASE 6: CODE REFACTOR
- [x] 6.1 Extract SingleMultiRoulette → src/components/RouletteWheel.jsx
- [x] 6.2 Extract Battles subcomponents → src/components/battles/
  - [x] battleConfig.js (BOT_TEMPLATES, GAME_MODES, BATTLE_FORMATS)
  - [x] battleStyles.js (shared style constants)
  - [x] MiniBattleRoulette.jsx
  - [x] BoxCard.jsx
  - [x] SectionHeader.jsx
  - [x] BattleSelector.jsx
  - [x] Update Battles.jsx to import from new files
- [x] 6.3 Extract DailyRouletteModal → src/components/DailyRouletteModal.jsx

## PHASE 7: BUILD & GIT PUSH
- [x] 7.1 Validate backend: node --check src/backend/server.js
- [x] 7.2 Build frontend: npm run build
- [x] 7.3 git add . && git commit && git push origin master

