import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  // Configuración de build optimizada para producción
  build: {
    // Generar sourcemaps solo en desarrollo
    sourcemap: process.env.NODE_ENV !== 'production',
    // Tamaño máximo de chunk (en kB) antes de generar advertencia
    chunkSizeWarningLimit: 1000,
    // PRODUCCIÓN: Marcar console.log/warn/info/debug como funciones puras
    // para que esbuild las elimine del bundle de producción
    esbuild: {
      pure: process.env.NODE_ENV === 'production'
        ? ['console.log', 'console.warn', 'console.info', 'console.debug']
        : [],
    },
    // Dividir chunks manualmente para mejor caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-icons', 'react-circular-progressbar'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    strictPort: false,
    // Proxy para APIs en desarrollo
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

