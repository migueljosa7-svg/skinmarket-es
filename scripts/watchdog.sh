#!/bin/bash
# ============================================================
# SKINMARKET ES - WATCHDOG SCRIPT (Docker Version)
# ============================================================
# Verifica que los contenedores Docker estén activos
# y los reinicia si es necesario.
# Ejecutar con cron: */5 * * * * /path/to/scripts/watchdog.sh
# ============================================================

LOG_FILE="/var/log/skinmarket-watchdog.log"
PROJECT_DIR="/root/skinmarket"  # CAMBIAR si el proyecto está en otra ruta
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
ENV_FILE="${PROJECT_DIR}/.env"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Verificar que Docker está instalado y funcionando
if ! command -v docker &> /dev/null; then
    log "❌ Docker no está instalado. Abortando."
    exit 1
fi

if ! docker info &> /dev/null; then
    log "❌ Docker daemon no está corriendo. Intentando iniciar..."
    sudo systemctl start docker
    sleep 5
fi

# Verificar cada contenedor
check_container() {
    local container_name=$1
    local service_name=$2

    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        # Verificar health check (si tiene)
        local health=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null)
        if [ "$health" = "unhealthy" ]; then
            log "⚠️  Contenedor ${container_name} no saludable (health: ${health}). Reiniciando..."
            cd $PROJECT_DIR && docker compose --env-file $ENV_FILE restart $service_name
        else
            log "✅ ${container_name} activo (health: ${health:-N/A})"
        fi
    else
        log "❌ Contenedor ${container_name} NO está corriendo. Iniciando..."
        cd $PROJECT_DIR && docker compose --env-file $ENV_FILE up -d $service_name
    fi
}

cd $PROJECT_DIR || {
    log "❌ Directorio ${PROJECT_DIR} no encontrado"
    exit 1
}

log "=== Watchdog ejecutándose ==="

# Verificar servicios
check_container "skinmarket-db" "db"
check_container "skinmarket-redis" "redis"
check_container "skinmarket-app" "app"
check_container "skinmarket-nginx" "nginx"

# Verificar que la aplicación responde
APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$APP_HEALTH" != "200" ]; then
    log "⚠️  Health check de la app falló (HTTP ${APP_HEALTH}). Reiniciando app..."
    cd $PROJECT_DIR && docker compose --env-file $ENV_FILE restart app
fi

# Verificar que Nginx responde
NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null)
if [ "$NGINX_HEALTH" != "200" ]; then
    log "⚠️  Health check de Nginx falló (HTTP ${NGINX_HEALTH}). Reiniciando nginx..."
    cd $PROJECT_DIR && docker compose --env-file $ENV_FILE restart nginx
fi

log "=== Watchdog completado ==="

