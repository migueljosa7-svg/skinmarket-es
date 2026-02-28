# ETAPA 1: Construcción del Frontend (React + Vite)
FROM node:20 AS build-stage
WORKDIR /app

# Instalar TODAS las dependencias (necesarias para build de React)
COPY package*.json ./
RUN npm install

# Copiar el código y construir el frontend (crea la carpeta 'dist')
COPY . .
RUN npm run build

# ETAPA 2: Servidor Final de Producción (Node.js)
FROM node:20-alpine
WORKDIR /app

# Copiar dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el backend y el build del frontend de la etapa anterior
COPY --from=build-stage /app/src /app/src
COPY --from=build-stage /app/dist /app/dist

# Exponer el puerto del Backend (Render asignará PORT por defecto si no, pero 3001 internamente)
EXPOSE 3001

# Iniciar tu servidor Node.js que alojará la API, Bot de Steam y base de datos
CMD ["node", "src/backend/server.js"]
