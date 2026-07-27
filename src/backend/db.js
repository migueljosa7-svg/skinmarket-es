import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Use DATABASE_URL exactly as provided by environment (no modification)
let databaseUrl = process.env.DATABASE_URL || '';

// Fix DNS resolution: append full domain for Render PostgreSQL hosts without dots
if (databaseUrl && isProduction) {
    const urlMatch = databaseUrl.match(/^postgres:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/\s*([^?]+)/);
    if (urlMatch) {
        const host = urlMatch[3];
        // If host doesn't contain a dot, it's a short Render hostname - append full domain
        if (host && !host.includes('.')) {
            databaseUrl = databaseUrl.replace(host, host + '.oregon-postgres.render.com');
            console.log(`[DB] Fixed hostname: ${host} -> ${host}.oregon-postgres.render.com`);
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

