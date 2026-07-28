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

// Fix DNS resolution: append full domain for Render PostgreSQL hosts without dots
if (databaseUrl && isProduction) {
    const urlMatch = databaseUrl.match(/^postgres:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/\s*([^?]+)/);
    if (urlMatch) {
        const host = urlMatch[3];
        // If host doesn't contain a dot, it's a short Render hostname - append full domain
        if (host && !host.includes('.')) {
            databaseUrl = databaseUrl.replace(host, host + '.oregon-postgres.render.com');
        }
    }
}

// Configure SSL: for production (Render), use rejectUnauthorized: false for internal connections
const useSSL = isProduction ? { rejectUnauthorized: false } : false;

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

