/**
 * Database bootstrap helper.
 *
 * Schema changes are now applied via SQL migrations (see `src/migrate/runner.js`
 * and `migrations/`). This file delegates to the runner so `npm run db:migrate`
 * and any programmatic caller use the same code path.
 *
 * `sequelize.sync()` is intentionally NOT used — Sequelize discourages it for
 * production. Models are kept in sync with the migrated schema by hand.
 */
import pool from './pgDatabase.js';
import { applyMigrations } from '../migrate/runner-lib.js';

async function initDatabase() {
  try {
    // Check connection
    await pool.query('SELECT 1');
    console.log('🔄 Applying pending migrations...');
    await applyMigrations();
    console.log('✅ Database is up to date!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database init failed:', error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

// Allow `node src/config/initDb.js` to run the bootstrap.
if (process.argv[1] && process.argv[1].endsWith('initDb.js')) {
  initDatabase();
}

export default initDatabase;
