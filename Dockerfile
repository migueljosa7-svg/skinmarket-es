# ============================================================
# STAGE 1: Build Frontend (React + Vite)
# ============================================================
FROM node:20-alpine AS build-stage
WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source code and build
COPY . .
RUN npm run build

# ============================================================
# STAGE 2: Production Backend (Node.js + PM2)
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy production dependencies only (root: for vite build output serving)
COPY package*.json ./
RUN npm ci --omit=dev --frozen-lockfile

# Copy backend source
COPY src/backend ./src/backend

# Copy only the built frontend from stage 1
COPY --from=build-stage /app/dist ./dist

# Copy generate_prices_cache.js (needed by cron job)
COPY generate_prices_cache.js ./

# Copy ecosystem config for PM2
COPY ecosystem.config.cjs ./

# Create .env symlink or ensure it's mounted from docker-compose
# The .env file will be provided via docker-compose environment variables

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use PM2 in production mode with no-daemon (foreground)
CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]

