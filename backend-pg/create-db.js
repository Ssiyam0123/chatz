import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // connect to default db first
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL default server');
    
    // Check if chatz exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='chatz'");
    if (res.rowCount === 0) {
      console.log('➕ Creating database "chatz"...');
      await client.query('CREATE DATABASE chatz');
      console.log('✅ Database "chatz" created successfully!');
    } else {
      console.log('ℹ️ Database "chatz" already exists.');
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
  } finally {
    await client.end();
  }
}

run();
