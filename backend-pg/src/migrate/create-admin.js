import pool from '../config/pgDatabase.js';
import bcrypt from 'bcryptjs';

const createAdmin = async () => {
  const email = 'ssiyam563@gmail.com';
  const password = '123456';
  const name = 'Siam Admin';
  const role = 'admin';

  console.log(`🚀 Setting up admin account for ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if user already exists
    const { rows: existing } = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      console.log(`ℹ️ User with email ${email} already exists. Updating role to 'admin' and resetting password...`);
      await pool.query(
        `UPDATE users 
         SET password = $1, role = $2, email_verified = true, password_changed_at = NOW(), updated_at = NOW() 
         WHERE email = $3`,
        [hashedPassword, role, email]
      );
      console.log('✅ Admin user updated successfully.');
    } else {
      console.log(`ℹ️ User does not exist. Creating a new admin user...`);
      const { rows: inserted } = await pool.query(
        `INSERT INTO users (name, email, password, role, email_verified, password_changed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW(), NOW())
         RETURNING id`,
        [name, email, hashedPassword, role]
      );
      console.log(`✅ Admin user created successfully with ID: ${inserted[0].id}`);
    }
  } catch (err) {
    console.error('❌ Error setting up admin user:', err);
  } finally {
    process.exit(0);
  }
};

createAdmin();
