# TODO — Fase Visual: Cajas KeyDrop/SkinClub + Navbar Responsivo

## 1. CaseCardRenderer.jsx — Rediseño "Weapon Banner" (Opción A)
- [ ] Reescritura completa con CSS puro / Inline Styles
- [ ] Tarjeta = banner del arma protagonista HD (drop-shadow neón)
- [ ] Fondos temáticos con gradientes + glowColor según rareza
- [ ] Placeholder SVG con silueta de arma (cero imágenes borrosas/cartón)
- [ ] Badges de categoría/precio, título, favorito y franja de previews

## 2. Cases.jsx — Asignación de skins protagonistas únicas
- [ ] Hash determinista por nombre de caja
- [ ] Hero skin + 4 previews únicos desde allSkins (pool real CS2 HD)
- [ ] Cero repetición entre cajas (Set compartido entre categorías)
- [ ] glowColor + bgGradient únicos por tarjeta

## 3. NavBar.jsx — Rediseño limpio y responsive (CSS puro / Media Queries)
- [ ] Desktop (≥1024px): Logo izq → menú central → saldo + perfil + salir (1 línea)
- [ ] Móvil (<1024px): Logo izq → saldo compacto → ☰ único → drawer lateral ordenado
- [ ] Eliminar dependencia de clases Tailwind inertes

## 4. Verificación
- [ ] `npm run build` sin errores
- [ ] Actualizar este TODO y preparar push a master

