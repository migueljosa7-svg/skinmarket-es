# 🚀 SKINMARKET ES - GUÍA DE DESPLIEGUE A PRODUCCIÓN

## 📋 Requisitos del Servidor VPS (Ubuntu 22.04)

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU     | 2 vCPUs | 4 vCPUs |
| RAM     | 4 GB    | 8 GB    |
| Disco   | 20 GB SSD | 40 GB SSD |
| SO      | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

Dominio configurado apuntando al IP del VPS (ej: `steamclubclash.gg`).

---

## 🛠️ PASO 1: CONFIGURACIÓN INICIAL DEL SERVIDOR

```bash
# 1. Conectarse al servidor
ssh root@tu-ip-del-vps

# 2. Actualizar sistema
apt update && apt upgrade -y

# 3. Crear usuario no-root (recomendado)
adduser deployer
usermod -aG sudo deployer
su - deployer

# 4. Reforzar SSH (opcional pero recomendado)
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 📦 PASO 2: INSTALAR DOCKER, DOCKER COMPOSE Y GIT

```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Instalar Docker Compose
sudo apt-get install -y docker-compose-plugin

# 3. Instalar Git
sudo apt-get install -y git

# 4. Verificar instalación
docker --version
docker compose version
git --version
```

---

## 🔑 PASO 3: CONFIGURAR VARIABLES DE ENTORNO

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/skinmarket.git
cd skinmarket

# 2. Copiar template de variables de entorno
cp .env.production.example .env

# 3. EDITAR el archivo .env con tus valores reales
nano .env
```

### Variables requeridas en `.env`:

```ini
# ============================================================
# DOMINIO
# ============================================================
DOMAIN=https://steamclubclash.gg          # TU DOMINIO REAL
FRONTEND_URL=${DOMAIN}
BACKEND_URL=${DOMAIN}
NODE_ENV=production

# ============================================================
# BASE DE DATOS
# ============================================================
DB_USER=postgres
DB_PASSWORD=GeneraUnaContraseñaSeguraAqui123!  # CÁMBIALO
DB_NAME=skinmarket
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# ============================================================
# REDIS
# ============================================================
REDIS_PASSWORD=OtraContraseñaSeguraParaRedis       # CÁMBIALO
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ============================================================
# JWT - Generar con: openssl rand -hex 64
# ============================================================
JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# ============================================================
# STEAM API KEY - https://steamcommunity.com/dev/apikey
# ============================================================
STEAM_API_KEY=tu_steam_api_key_aqui

# ============================================================
# BOT DE STEAM (cuenta secundaria, NO tu cuenta principal)
# ============================================================
BOT_USERNAME=usuario_del_bot
BOT_PASSWORD=contraseña_del_bot
BOT_SHARED_SECRET=base64_desde_sda
BOT_IDENTITY_SECRET=base64_desde_sda
```

> ⚠️ **IMPORTANTE**: El BOT debe ser una cuenta Steam **SECUNDARIA** (no uses tu cuenta personal). El `BOT_SHARED_SECRET` y `BOT_IDENTITY_SECRET` se obtienen de **Steam Desktop Authenticator (SDA)**.

---

## 🏗️ PASO 4: CONSTRUIR Y LEVANTAR CONTENEDORES

```bash
# 1. Construir imágenes y levantar servicios
docker compose --env-file .env up -d --build

# 2. Verificar que todos los contenedores estén corriendo
docker compose ps

# 3. Ver logs de la aplicación
docker compose logs -f app

# 4. Si todo está bien, deberías ver:
#    - skinmarket-db    (PostgreSQL)
#    - skinmarket-redis (Redis)
#    - skinmarket-app   (Backend Node.js)
```

---

## 🔒 PASO 5: GENERAR CERTIFICADO SSL (HTTPS)

### Opción A: Certbot Manual (recomendada)

```bash
# 1. Detener temporalmente Nginx de Docker (para no interferir con Certbot)
docker compose stop nginx

# 2. Instalar Certbot en el servidor (NO dentro del contenedor)
sudo apt-get install -y certbot

# 3. Generar certificado
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# 4. Copiar certificados al directorio SSL del proyecto
sudo mkdir -p ssl
sudo cp -L /etc/letsencrypt/live/tu-dominio.com/fullchain.pem ssl/
sudo cp -L /etc/letsencrypt/live/tu-dominio.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/

# 5. Iniciar Nginx de Docker nuevamente
docker compose start nginx
```

### Opción B: Auto-Certbot con Docker (usando el perfil certbot)

```bash
# Primera vez - generar certificado manualmente:
docker compose --profile certbot run --rm certbot certonly --webroot -w /var/www/certbot -d tu-dominio.com

# Luego levantar todo con:
docker compose --env-file .env up -d --build
```

---

## ✅ PASO 6: VERIFICAR DESPLIEGUE

```bash
# 1. Verificar todos los servicios
docker compose ps

# 2. Ver logs en tiempo real
docker compose logs -f --tail=100

# 3. Probar health check
curl http://localhost:3001/api/health

# 4. Verificar desde internet (debe responder con HTTPS)
curl -I https://tu-dominio.com/api/health
```

**Respuesta esperada:**
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

---

## 📊 MONITOREO Y MANTENIMIENTO

### Comandos útiles:

```bash
# Ver logs de un servicio específico
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f db

# Reiniciar un servicio
docker compose restart app

# Reconstruir y actualizar (después de cambios en el código)
docker compose up -d --build app

# Ver uso de recursos
docker stats

# Acceder al contenedor de la app
docker exec -it skinmarket-app sh

# Ver logs de la base de datos
docker compose logs -f db
```

### Script de watchdog (`scripts/watchdog.sh`):

El script watchdog monitorea los contenedores cada 5 minutos y los reinicia si es necesario.

```bash
# Dar permisos de ejecución
chmod +x scripts/watchdog.sh

# Ejecutar en segundo plano (opcional - Docker ya maneja auto-reinicio)
nohup ./scripts/watchdog.sh &
```

---

## 🔄 ACTUALIZAR LA APLICACIÓN

```bash
# 1. Ir al directorio del proyecto
cd ~/skinmarket

# 2. Obtener últimos cambios
git pull origin main

# 3. Reconstruir y reiniciar solo la app
docker compose up -d --build app

# 4. Verificar que funciona
curl http://localhost:3001/api/health
```

---

## 🐛 RESOLUCIÓN DE PROBLEMAS

### Problema: La base de datos no se conecta
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps db

# Ver logs
docker compose logs db

# Verificar credenciales en .env
cat .env | grep DB_
```

### Problema: El Bot de Steam no inicia sesión
```bash
# Ver logs del bot
docker compose logs app | grep "BOT ENGINE"

# Verificar credenciales en .env
# Asegúrate de que BOT_SHARED_SECRET y BOT_IDENTITY_SECRET son correctos
# El BOT debe tener Steam Guard Mobile Authenticator activado
```

### Problema: Socket.io no funciona (WebSockets)
```bash
# Verificar que Nginx tiene la configuración correcta
docker compose exec nginx nginx -t

# Verificar los headers de WebSocket
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://tu-dominio.com/socket.io/
```

### Problema: Certificado SSL expirado
```bash
# Renovar manualmente
sudo certbot renew

# O automáticamente (el servicio certbot en Docker lo hace cada 12h)
```

---

## 📁 ESTRUCTURA DE ARCHIVOS EN PRODUCCIÓN

```
~/skinmarket/
├── .env                    # Variables de entorno (NO subir a Git)
├── .env.production.example # Template de variables
├── docker-compose.yml      # Orquestación de contenedores
├── Dockerfile              # Imagen de la app
├── nginx.conf              # Configuración de Nginx
├── ssl/                    # Certificados SSL (NO subir a Git)
│   ├── fullchain.pem
│   └── privkey.pem
├── data/
│   └── certbot/
│       └── www/            # Archivos ACME challenge
├── src/
│   └── backend/
│       ├── server.js
│       ├── db.js
│       └── steam/
│           └── botEngine.js
└── dist/                   # Frontend compilado (generado en build)
```

---

## 🎯 RESUMEN DE COMANDOS RÁPIDOS

```bash
# Despliegue inicial (después de configurar .env)
docker compose --env-file .env up -d --build

# Ver estado
docker compose ps

# Ver logs
docker compose logs -f --tail=50

# Actualizar app
git pull && docker compose up -d --build app

# Detener todo
docker compose down

# Detener y eliminar volúmenes (¡CUIDADO! borra datos)
docker compose down -v
```

---

## 🛡️ SEGURIDAD

1. **Nunca subas el archivo `.env` a Git** (ya está en `.gitignore`)
2. **Usa contraseñas fuertes** para DB_PASSWORD y REDIS_PASSWORD
3. **Puertos expuestos**: Solo 80 y 443 son públicos. DB, Redis y App están en `127.0.0.1` o en la red interna de Docker.
4. **Firewall**: Configurar UFW para permitir solo 22, 80, 443:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
5. **SSL**: Forzado desde Nginx (HTTP redirige a HTTPS automáticamente)
6. **Headers de seguridad**: CSP, HSTS, X-Frame-Options configurados en nginx.conf

---

## 📞 SOPORTE

Si encuentras problemas durante el despliegue:

1. Revisa los logs: `docker compose logs -f app`
2. Verifica la conexión a la base de datos
3. Asegúrate de que el dominio apunte al IP del servidor
4. Confirma que el puerto 443 esté abierto en el firewall

---

¡Tu plataforma SKINMARKET ES ahora está en producción! 🎉

