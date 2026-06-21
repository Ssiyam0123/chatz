/**
 * Reusable migration engine. The CLI (`runner.js`) and `initDb.js` both
 * import `applyMigrations` / `undoLastMigration` from here.
 */
import pool from '../config/pgDatabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

const ENSURE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id          TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const ensureTrackingTable = async () => {
  await pool.query(ENSURE_TRACKING_TABLE);
};

const getApplied = async () => {
  const { rows } = await pool.query('SELECT id FROM schema_migrations ORDER BY id ASC');
  return rows.map((r) => r.id);
};

const tableExists = async (tableName) => {
  const { rows } = await pool.query(
    'SELECT to_regclass($1) AS exists',
    [`public.${tableName}`]
  );
  return Boolean(rows[0] && rows[0].exists);
};

// Split a migration file into statements on `;`, ignoring `$$ ... $$`
// dollar-quoted bodies (used for DO blocks / functions).
const splitStatements = (sql) => {
  const statements = [];
  let buffer = '';
  let inDollar = false;
  const lines = sql.split(/\r?\n/);
  for (const line of lines) {
    const dollarTags = line.match(/\$\$/g);
    if (dollarTags) inDollar = !inDollar;
    buffer += line + '\n';
    if (!inDollar && line.trim().endsWith(';')) {
      const stmt = buffer.trim();
      if (stmt) statements.push(stmt);
      buffer = '';
    }
  }
  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
};

const runMigrationFile = async (filePath) => {
  const sql = fs.readFileSync(filePath, 'utf8');
  if (!sql.trim()) return;
  const statements = splitStatements(sql);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const discover = () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const byId = new Map();
  for (const f of files) {
    const match = f.match(/^(\d{3})_(.+)\.(up|down)\.sql$/);
    if (!match) continue;
    const [, id, name, kind] = match;
    if (!byId.has(id)) byId.set(id, { id, name });
    byId.get(id)[kind === 'up' ? 'upPath' : 'downPath'] = path.join(MIGRATIONS_DIR, f);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
};

const recordApplied = async (id) => {
  await pool.query(
    'INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING',
    [id]
  );
};

const removeApplied = async (id) => {
  await pool.query('DELETE FROM schema_migrations WHERE id = $1', [id]);
};

export const applyMigrations = async () => {
  await ensureTrackingTable();
  let applied = await getApplied();

  // Safe bootstrap: live DB already has data but no migration history.
  if (applied.length === 0 && (await tableExists('users'))) {
    const migrations = discover();
    if (migrations.some((m) => m.id === '000')) {
      console.log('⚠️  Existing database detected with no migration history.');
      console.log('   Marking 000_baseline as applied WITHOUT running it (safe bootstrap).');
      await recordApplied('000');
      applied = await getApplied();
    }
  }

  const migrations = discover();
  const pending = migrations.filter((m) => !applied.includes(m.id));
  if (pending.length === 0) {
    return [];
  }

  const appliedNow = [];
  for (const m of pending) {
    if (!m.upPath) {
      throw new Error(`Migration ${m.id}_${m.name} has no .up.sql file`);
    }
    console.log(`▶ Applying ${m.id}_${m.name} ...`);
    await runMigrationFile(m.upPath);
    await recordApplied(m.id);
    console.log(`✔ Applied  ${m.id}_${m.name}`);
    appliedNow.push(m.id);
  }
  return appliedNow;
};

export const undoLastMigration = async () => {
  await ensureTrackingTable();
  const applied = await getApplied();
  if (applied.length === 0) {
    return null;
  }
  const lastId = applied[applied.length - 1];
  const migrations = discover();
  const m = migrations.find((x) => x.id === lastId);
  if (!m || !m.downPath) {
    throw new Error(`Cannot undo ${lastId}: no .down.sql file`);
  }
  console.log(`◀ Reverting ${m.id}_${m.name} ...`);
  await runMigrationFile(m.downPath);
  await removeApplied(m.id);
  console.log(`✔ Reverted  ${m.id}_${m.name}`);
  return lastId;
};
