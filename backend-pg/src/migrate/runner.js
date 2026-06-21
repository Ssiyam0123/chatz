/**
 * Migration CLI.
 *
 *   node src/migrate/runner.js            # apply pending migrations
 *   node src/migrate/runner.js undo       # revert the latest applied migration
 */
import pool from '../config/pgDatabase.js';
import { applyMigrations, undoLastMigration } from './runner-lib.js';

const main = async () => {
  try {
    await pool.query('SELECT 1');
    const mode = process.argv[2];
    if (mode === 'undo') {
      const undone = await undoLastMigration();
      if (!undone) console.log('Nothing to undo.');
    } else {
      const applied = await applyMigrations();
      if (applied.length === 0) console.log('✅ No pending migrations.');
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.parent) console.error('  DB error:', err.parent.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
};

main();
