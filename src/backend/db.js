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

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSSL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
});

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

