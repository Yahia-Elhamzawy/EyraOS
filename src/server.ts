import { app } from './app';
import { CONFIG } from './config/env';
import { testConnection } from './db/connection';

async function bootstrap() {
    console.log('[EyraOS] Bootstrapping Cognitive Memory Architecture (TypeScript)...');
    
    // Check database connection to Home Server PostgreSQL + pgvector
    const dbOk = await testConnection();
    if (!dbOk) {
        console.error('[EyraOS] FATAL: Cannot connect to PostgreSQL at ' + CONFIG.DATABASE_URL);
        process.exit(1);
    }

    app.listen(CONFIG.PORT, () => {
        console.log(`
=======================================================
EyraOS Cognitive Memory Server (TypeScript Edition)
Local Host: http://localhost:${CONFIG.PORT}
PostgreSQL: ${CONFIG.DB_HOST}:${CONFIG.DB_PORT} (Database: ${CONFIG.DB_NAME})
pgvector: Enabled & Verified
Status: Operational
=======================================================
        `);
    });
}

bootstrap().catch(err => {
    console.error('[EyraOS] Fatal error in bootstrap:', err);
    process.exit(1);
});
