import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// ─── ROBUST DATABASE_URL PARSING ──────────────────────────────────
// Elimina comillas simples, dobles, espacios en blanco que Render
// puede inyectar al pasar DATABASE_URL como variable de entorno.
let databaseUrl = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^["']|["']$/g, '') // Remove surrounding single/double quotes
    .replace(/\s+/g, '');        // Remove all whitespace

// Log the final database host used for connection diagnostics
if (databaseUrl) {
    try {
        const dbUrl = new URL(databaseUrl);
        console.log('[DB] Usando DATABASE_URL en producción:', {
            protocol: dbUrl.protocol,
            host: dbUrl.hostname,
            port: dbUrl.port || '5432',
            database: dbUrl.pathname.replace(/^\//, ''),
            user: dbUrl.username ? '***' : null
        });
    } catch (err) {
        console.warn('[DB] No se pudo parsear DATABASE_URL para logging:', err.message);
    }
}

// Configure SSL: for production (Render), use rejectUnauthorized: false for internal connections
// Also enable SSL for external connections to Render databases
const isRenderDatabase = databaseUrl.includes('render.com');
const useSSL = isProduction || isRenderDatabase ? { rejectUnauthorized: false } : false;

if (!databaseUrl) {
    console.error('[DB] DATABASE_URL no está configurada o está vacía.');
}

// ─── DATABASE_URL SANITIZATION (WHATWG URL API) ─────────────────
// IMPORTANTE (root cause del fallo SSL en Render):
// pg-connection-string (usado internamente por node-postgres) interpreta los
// parámetros `sslmode`/`ssl` de la cadena de conexión. Con sslmode=require
// (o similar) hace dos cosas perjudiciales:
//   1. Emite la advertencia de deprecación de pg-connection-string.
//   2. Establece `config.ssl = {}` (objeto vacío) que SOBRESCRIBE nuestra
//      config explícita `ssl: { rejectUnauthorized: false }` al hacer
//      `Object.assign({}, config, parse(connectionString))` en pg.
//      Eso re-activa la verificación del certificado TLS contra la CA interna
//      de Render → el handshake falla → "SSL connection has been closed
//      unexpectedly" / "Connection terminated unexpectedly".
//
// Solución: eliminar TODOS los parámetros ssl* de la cadena y manejar SSL
// exclusivamente mediante la opción `ssl` del Pool (rejectUnauthorized: false).
function sanitizeDatabaseUrl(connStr) {
    if (!connStr) return connStr;
    try {
        const url = new URL(connStr);
        // Elimina parámetros que interferirían con la config SSL explícita
        for (const key of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword']) {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
            }
        }
        // En producción/Render forzamos SSL siempre (nunca sslmode=disable)
        if (isProduction || isRenderDatabase) {
            url.protocol = url.protocol.startsWith('postgres') ? url.protocol : 'postgresql:';
        }
        return url.toString();
    } catch {
        // Si no se puede parsear, devolver la cadena limpia sin parámetros SSL
        // mediante regex conservadora (fallback seguro).
        return connStr.replace(/([?&])(sslmode|ssl|sslrootcert|sslcert|sslkey|sslpassword)=[^&]*/gi, '$1').replace(/[?&]$/, '');
    }
}

const finalDatabaseUrl = sanitizeDatabaseUrl(databaseUrl);

// Log SSL configuration applied (solo host/parámetros, nunca credenciales)
if (finalDatabaseUrl) {
    try {
        const dbUrl = new URL(finalDatabaseUrl);
        console.log('[DB] Configuración SSL aplicada:', {
            ssl: useSSL,
            sslParamsInUrl: dbUrl.searchParams.has('sslmode') || dbUrl.searchParams.has('ssl'),
            host: dbUrl.hostname
        });
    } catch { /* noop */ }
}

const pool = new Pool({
    connectionString: finalDatabaseUrl,
    ssl: useSSL,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    // Keep-alive activo para evitar que Render/RDS cierre sockets idle
    // ("Connection terminated unexpectedly" por timeout de infraestructura)
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Allow more time for Render free-tier PostgreSQL to wake from sleep
    statement_timeout: 30000,
    query_timeout: 30000
});

// Log pool-level errors (e.g. idle client errors) instead of crashing silently
pool.on('error', (err) => {
    console.error('[DB] Pool error (idle client):', err.message);
});

// ─── CONNECTION RETRY ──────────────────────────────────────────
// Render free-tier PostgreSQL can be suspended when idle. On cold start,
// the first connection may fail with "SSL connection has been closed
// unexpectedly". Retry with backoff until the DB is reachable.
export async function waitForDatabase({ maxRetries = 5, baseDelayMs = 2000 } = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            try {
                await client.query('SELECT 1');
            } finally {
                client.release();
            }
            return true;
        } catch (err) {
            const msg = err.message || String(err);
            // Clasificar el error para un diagnóstico claro en los logs de Render
            let errorType = 'CONEXIÓN_GENERAL';
            if (/SSL|TLS|handshake|certificate|ECONNRESET/i.test(msg)) {
                errorType = 'SSL_HANDSHAKE';
            } else if (/terminated|timeout|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
                errorType = 'COLD_START_DB';
            }
            console.warn(`[DB] Intento ${attempt}/${maxRetries} de conexión falló [${errorType}]: ${msg}`);
            if (attempt === maxRetries) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
        }
    }
    return false;
}

export default {
    query: (text, params) => pool.query(text, params),
    pool,
    async withTransaction(callback) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

