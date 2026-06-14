import dotenv from 'dotenv';
dotenv.config();

const neonUrl = process.env.DATABASE_URL;
if (!neonUrl) {
  console.error("❌ DATABASE_URL (Neon) not found in .env");
  process.exit(1);
}

// Remove DATABASE_URL so that importing database.js returns the local PostgreSQL instance
delete process.env.DATABASE_URL;

import { Sequelize } from 'sequelize';

const localHost = process.env.DB_HOST || 'localhost';
const localPort = parseInt(process.env.DB_PORT || '5432');
const localUser = process.env.DB_USER || 'postgres';
const localPass = process.env.DB_PASSWORD || 'postgres';
const localDb = process.env.DB_NAME || 'chatz';

console.log("Terminating existing connections and resetting public schema...");
const adminSequelize = new Sequelize(localDb, localUser, localPass, {
  host: localHost,
  port: localPort,
  dialect: 'postgres',
  logging: false,
});

try {
  await adminSequelize.authenticate();
  
  // Terminate other connections
  await adminSequelize.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${localDb}'
      AND pid <> pg_backend_pid();
  `);

  console.log("Wiping schema public...");
  await adminSequelize.query('DROP SCHEMA public CASCADE');
  await adminSequelize.query('CREATE SCHEMA public');
  await adminSequelize.query(`GRANT ALL ON SCHEMA public TO "${localUser}"`);
  await adminSequelize.query('GRANT ALL ON SCHEMA public TO public');
  console.log("✔ Schema public wiped and recreated.");
} catch (e) {
  console.log("⚠️ Schema wipe error:", e.message);
} finally {
  await adminSequelize.close();
}

import localSequelize from './src/config/database.js';
import * as models from './src/models/index.js';

console.log("Connecting to Neon DB...");
const neonSequelize = new Sequelize(neonUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const tables = [
  'users',
  'user_friends',
  'friend_requests',
  'groups',
  'group_members',
  'posts',
  'post_reactions',
  'post_comments',
  'post_comment_reactions',
  'post_shares',
  'stories',
  'story_viewers',
  'messages',
  'group_messages'
];

const run = async () => {
  try {
    await neonSequelize.authenticate();
    console.log("✔ Connected to Neon PostgreSQL successfully.");

    await localSequelize.authenticate();
    console.log("✔ Connected to Local PostgreSQL successfully.");

    console.log("Syncing Local Database schema...");
    await localSequelize.sync();
    console.log("✔ Local database schema synced.");

    // Loop through tables in order and copy data using raw SQL queries
    for (const table of tables) {
      console.log(`Copying table: ${table}...`);
      const rows = await neonSequelize.query(`SELECT * FROM "${table}"`, {
        type: neonSequelize.QueryTypes.SELECT
      });

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
        const placeholders = Object.keys(rows[0]).map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`;

        await localSequelize.transaction(async (t) => {
          for (const row of rows) {
            const values = Object.values(row);
            await localSequelize.query(insertQuery, {
              bind: values,
              transaction: t,
              type: localSequelize.QueryTypes.INSERT
            });
          }
        });

        console.log(`✔ Copied ${rows.length} records into local table "${table}".`);
      } else {
        console.log(`ℹ No records to copy for table "${table}".`);
      }
    }

    console.log("🎉 Database synchronization completed successfully!");
  } catch (err) {
    console.error("❌ Sync Error:", err);
  } finally {
    await neonSequelize.close();
    await localSequelize.close();
  }
};

run();
