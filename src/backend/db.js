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

// For Render PostgreSQL, append sslmode=require to the connection string if not present.
// This helps avoid "SSL connection has been closed unexpectedly" on cold starts.
function ensureSslMode(connStr) {
    if (!connStr || (isProduction || isRenderDatabase)) {
        // node-postgres uses the `ssl` option directly; sslmode is handled by pg's
        // connectionString parsing for the `?sslmode=` param. Adding it is harmless
        // and helps some pooled/proxied setups.
        try {
            const url = new URL(connStr);
            if (!url.searchParams.has('sslmode') && (isProduction || isRenderDatabase)) {
                url.searchParams.set('sslmode', 'require');
            }
            return url.toString();
        } catch {
            return connStr;
        }
    }
    return connStr;
}

const finalDatabaseUrl = ensureSslMode(databaseUrl);

const pool = new Pool({
    connectionString: finalDatabaseUrl,
    ssl: useSSL,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
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
            console.warn(`[DB] Intento ${attempt}/${maxRetries} de conexión falló: ${err.message}`);
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

