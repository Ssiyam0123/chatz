import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    max: parseInt(process.env.DB_POOL_MAX || '50'),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000,
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'chatz',
    max: parseInt(process.env.DB_POOL_MAX || '50'),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 30000,
  });
}

// Convert camelCase row keys to snake_case equivalent or just use standard pg response
// Node-postgres returns rows as objects matching column names (which are snake_case in DB).
// Since Sequelize gave camelCase, we might need to map them in the controllers.

export default pool;
