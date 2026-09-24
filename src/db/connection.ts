import { Pool, QueryResult, QueryResultRow } from 'pg';
import { CONFIG } from '../config/env';

export const pool = new Pool({
    connectionString: CONFIG.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[EyraOS DB] Unexpected error on idle client:', err.message);
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        if (duration > 500) {
            console.warn(`[EyraOS DB] Slow query (${duration}ms):`, text);
        }
        return res;
    } catch (err: any) {
        console.error('[EyraOS DB] Query Error:', err.message, '\nQuery:', text);
        throw err;
    }
}

export async function testConnection(): Promise<boolean> {
    try {
        const res = await pool.query('SELECT NOW() as current_time, count(*) as entity_count FROM entities');
        console.log(`[EyraOS DB] Connected to PostgreSQL at ${CONFIG.DB_HOST}:${CONFIG.DB_PORT}. Active entities: ${res.rows[0].entity_count}`);
        return true;
    } catch (err: any) {
        console.error('[EyraOS DB] Database connection failed:', err.message);
        return false;
    }
}
