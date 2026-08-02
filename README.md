# 🎮 SkinMarket ES - Plataforma de Cajas y Skins CS:GO

Plataforma moderna y profesional para comprar, vender y abrir cajas de skins de CS:GO. Construida con React, Vite y diseño responsive.

## ✨ Características

- 🎁 **80+ Cajas Temáticas** - Económicas, Intermedias y Premium
- 🔐 **Sistema de Login seguro** - Autenticación con localStorage
- 💰 **Gestión de balance** - Saldo de usuario actualizado en tiempo real
- 📊 **Inventario dinámico** - Control de skins adquiridas
- 🛒 **API centralizada** - Una sola fuente de verdad para todos los datos
- ⚡ **Performance optimizado** - Sistema de caché para API
- 🎨 **Diseño profesional** - Gradientes, animaciones y tema oscuro
- 📱 **Responsive design** - Funciona en todos los dispositivos

## 🚀 Inicio Rápido

### Requisitos previos
- Node.js 16+ instalado
- npm o yarn

### Instalación

```bash
# 1. Clonar o descargar el repositorio
cd skinmarket-es

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:5173`

## 📦 Estructura del Proyecto

```
src/
├── pages/              # Páginas principales de la app
│   ├── Home.jsx       # Página de inicio (mejorada con hero section)
│   ├── Login.jsx      # Login profesional con validaciones
│   ├── Cases.jsx      # 80+ cajas interactivas
│   ├── Dashboard.jsx  # Panel de usuario
│   ├── Battles.jsx    # Sistema de batallas
│   ├── Inventory.jsx  # Inventario de skins
│   ├── Upgrade.jsx    # Sistema de upgrade
│   └── UploadSkin.jsx # Subir skins personalizadas
├── components/        # Componentes reutilizables
│   ├── NavBar.jsx     # Navegación global
│   ├── SkinCard.jsx   # Tarjeta de skin
│   ├── Carrusel.jsx   # Carrusel de últimas skins
│   ├── CaseRoulette.jsx
│   ├── BattleModal.jsx
│   ├── ProtectedRoute.jsx
│   └── Inventory.jsx
├── context/           # React Context
│   └── AuthContext.jsx # Gestión de autenticación y usuario
├── hooks/             # Custom React Hooks
│   └── useFetchSkins.js    # Hook centralizado para API de skins
├── constants/         # Constantes globales
│   ├── colors.js      # Paleta de colores y rarities
│   ├── images.js      # Emojis y mapeos de armas
│   └── cases.js       # Nombres y datos de cajas (120+)
├── App.jsx            # Componente raíz
├── App.css            # Estilos globales mejorados
└── index.css          # Estilos de reset y globales

public/
└── logo.png          # Logo de la aplicación
```

## 🔑 Características Técnicas

### 1. **Login Funcional** 
- Validación de email en tiempo real
- Contraseña mínimo 6 caracteres
- Datos guardados en localStorage
- Usuario obtiene 3 skins iniciales y €1000 de balance

### 2. **Cajas Interactivas (Cases.jsx)**
- 40 cajas económicas (€0.99 - €3.49)
- 40 cajas intermedias (€4.99 - €7.99)
- 40 cajas premium (€8.99 - €19.99)
- Cada caja tiene nombre único y ícono temático
- Sistema de filtrado (categoría, precio, nombre)
- Abrir 1-100 cajas a la vez
- Resultados animados con rareza visual

### 3. **API Centralizada**
Archivo: `src/hooks/useFetchSkins.js`

```javascript
// Usar en cualquier componente:
import { useFetchSkins, getSkins } from "../hooks/useFetchSkins";

// Como hook en componentes:
const { skins, loading, error } = useFetchSkins(6, true);

// Como función directa:
const skins = await getSkins();
```

**Características:**
- Sistema de caché para evitar múltiples requests
- Mismo endpoint usado en toda la app
- Manejo de errores integrado
- Loading states automáticos

### 4. **Sistema de Autenticación**
Archivo: `src/context/AuthContext.jsx`

Estados disponibles:
```javascript
const { user, login, logout, updateUser } = useAuth();

// Estructura del user:
{
  email: "usuario@example.com",
  balance: 1000,      // € disponibles
  inventory: [...]    // Skins poseídas
}
```

### 5. **Constantes y Configuración**
- **colors.js**: Paleta de rarities, colores temáticos
- **images.js**: Mapeo de emojis para armas
- **cases.js**: Datos de 120 cajas diferentes

## 🎨 Diseño y UX

### Tema
- **Color primario**: Verde neon (#00ff88)
- **Color secundario**: Azul tech (#3b82f6)
- **Fondo**: Gradientes oscuros profesionales
- **Tipografía**: Segoe UI y monospace

### Componentes UI
- Botones con hover effects
- Animaciones suaves (fade in, slide down, pulse)
- Validación visual en tiempo real
- Estados loading distintos
- Mensajes de error/success contextuales

## 🔒 Seguridad

- ✅ Validación de emails
- ✅ Contraseña hash-ready (implementable)
- ✅ LocalStorage para datos de usuario
- ✅ ProtectedRoute para páginas restringidas
- ✅ Sin exposición de credenciales en cliente

## 🌐 Desplegar a Internet

### Opción 1: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Opción 2: Netlify

```bash
# Build para producción
npm run build

# Drag & drop la carpeta 'dist' a Netlify
# O usar Netlify CLI
netlify deploy --prod --dir=dist
```

### Opción 3: Servidor personalizado

```bash
# Build para producción
npm run build

# Subir carpeta 'dist' a tu servidor
# Configurar web server para servir index.html en todas las rutas
```

## 📋 Checklist antes de Producción

- ✅ Sin errores de consola
- ✅ Todas las rutas funcionan
- ✅ Login guarda datos correctamente
- ✅ API centralizada cacheando bien
- ✅ Responsive en móvil
- ✅ Animaciones suaves
- ✅ Imágenes optimizadas
- ✅ Variables de entorno configuradas (.env)

## 🛠️ Scripts disponibles

```bash
npm run dev      # Inicia servidor de desarrollo
npm run build    # Crea build para producción
npm run preview  # Preview del build
npm run lint     # Verifica código
```

## 📝 Variables de Entorno (.env)

```
VITE_API_URL=https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
```

## 🤝 API Utilizada

**ByMykel CSGO-API**
- URL: `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json`
- Formato: JSON
- Skins disponibles: 1000+
- Actualización: Regular

## 📚 Tecnologías

- **Frontend Framework**: React 18+
- **Build Tool**: Vite  
- **Estilos**: CSS-in-JS (inline + CSS puro)
- **Gestión de estado**: React Context
- **Routing**: React Router v6
- **HTTP Client**: Fetch API
- **Package Manager**: npm

## 🚀 Mejoras Futuras

- [ ] Sistema de trading entre usuarios
- [ ] Leaderboard global
- [ ] Sistema de misiones diarias
- [ ] Notificaciones en tiempo real
- [ ] Backend con base de datos
- [ ] Autenticación con OAuth
- [ ] Sistema de suscripción
- [ ] Chat en vivo

## 📞 Soporte

Para reportar bugs o sugerencias, contacta al desarrollador.

## 📄 Licencia

Proyecto hecho para uso educativo y personal.

---

**Última actualización**: Febrero 2026  
**Versión**: 2.0 Professional Edition  
**Estado**: ✅ Listo para Producción
