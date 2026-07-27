import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Sanitizes DATABASE_URL for Render PostgreSQL deployments
 * Render sometimes provides hostnames without the full domain (e.g., @dpg-xxxx-a/)
 * This function adds the proper .render.com domain
 */
function sanitizeDatabaseUrl(databaseUrl) {
    if (!databaseUrl) return databaseUrl;

    // Check if URL contains @dpg- and doesn't already end with .render.com/
    if (databaseUrl.includes('@dpg-') && !databaseUrl.includes('.render.com/')) {
        // Replace the pattern @dpg-xxxx-a/ with @dpg-xxxx-a.oregon-postgres.render.com/
        // or @dpg-xxxx-a.frankfurt-postgres.render.com/
        const sanitized = databaseUrl.replace(
            /(@dpg-[^/]+)\/(.+)$/,
            (match, hostname, dbName) => {
                // Determine region based on common Render instance ID patterns
                // Oregon is the default, Frankfurt instances typically have different ID patterns
                const region = hostname.includes('frankfurt') ? 'frankfurt' : 'oregon';
                return `${hostname}.${region}-postgres.render.com/${dbName}`;
            }
        );
        console.log('[DB] DATABASE_URL sanitized for Render deployment');
        return sanitized;
    }

    return databaseUrl;
}

const isProduction = process.env.NODE_ENV === 'production';

// Sanitize DATABASE_URL before using it
const sanitizedDatabaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);

// Determine if we should use SSL: production OR Render host
const databaseUrl = sanitizedDatabaseUrl || process.env.DATABASE_URL || '';
const isRenderHost = databaseUrl.includes('.render.com') || databaseUrl.includes('@dpg-');
const useSSL = isProduction || isRenderHost;

const pool = new Pool({
    connectionString: sanitizedDatabaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
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

