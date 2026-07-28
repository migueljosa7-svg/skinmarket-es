# SPRINT FINAL DE PRODUCCIÓN - TODO

## BLOQUE 1: RENDIMIENTO, VELOCIDAD, ANTI-LAG

### 1.1 ImageService - Anti-bucle infinito
- [ ] src/services/ImageService.js: Límite 3 reintentos en handleImageError

### 1.2 socket.js - Console limpia en producción
- [ ] src/services/socket.js: Corregir _log/_warn recursivo en producción

### 1.3 LiveDrops - Socket cleanup
- [ ] src/components/LiveDrops.jsx: Socket.io cleanup + correct listener removal

### 1.4 NavBar - Audio listeners redundantes
- [ ] src/components/NavBar.jsx: Eliminar useEffect duplicado de audio

### 1.5 CaseView - Memoización y efectos
- [ ] src/pages/CaseView.jsx: React.memo en SingleMultiRoulette, corregir dependencias startSpin
- [ ] src/pages/CaseView.jsx: Memo en resultados cards

### 1.6 Upgrade - Memoización y dependencias
- [ ] src/pages/Upgrade.jsx: React.memo en UpgradeSpinner, corregir handleAnimationComplete deps

### 1.7 Battles - Memoización y efectos
- [ ] src/pages/Battles.jsx: React.memo en MiniBattleRoulette
- [ ] src/pages/Battles.jsx: Corregir dependencias en useEffects

### 1.8 Inventory - TradeUrlModal cleanup
- [ ] src/components/Inventory.jsx: TradeUrlModal body scroll cleanup

### 1.9 Cases - DailyRouletteModal + CaseCard memo
- [ ] src/pages/Cases.jsx: DailyRouletteModal - refs para spinning/revealed
- [ ] src/pages/Cases.jsx: CaseCard - React.memo

### 1.10 vite.config.js - Tree-shaking optimizado
- [ ] vite.config.js: manualChunks para framer-motion, split chunks

## BLOQUE 2: AJUSTE ECONÓMICO REAL

### 2.1 StorageService - Eliminar saldo demo
- [ ] src/services/StorageService.js: DEFAULT_USER saldo 0.00, nivel 0

### 2.2 Login - Quitar texto saldo inicial
- [ ] src/pages/Login.jsx: Eliminar "€500 de saldo inicial"

### 2.3 AuthContext - claimDaily reward real
- [ ] src/context/AuthContext.jsx: Reward base 0.15, dinámico por nivel

### 2.4 Dashboard - LEVEL_CONFIG rebalanceo
- [ ] src/pages/Dashboard.jsx: Ajustar LEVEL_CONFIG rewards a rangos 0.05€-2.00€

### 2.5 Backend server.js - Validación depósito + rewards
- [ ] src/backend/server.js: Validar totalDepositado >= 2.00€ para claim daily
- [ ] src/backend/server.js: Ajustar LEVEL_THRESHOLDS rewards a máx 2.00€

## BLOQUE 3: COMPILACIÓN Y PUSH

### 3.1 Build
- [ ] npm run build - Verificar compilación

### 3.2 Git Push
- [ ] git add .
- [ ] git commit
- [ ] git push origin master

