import pool from '../../config/pgDatabase.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT id, name, email, avatar, bio, cover_photo as "coverPhoto", public_key as "publicKey", created_at as "createdAt"
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('❌ Get Profile Error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, bio } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;

    // Handle avatar upload
    if (req.files && req.files.avatar) {
      console.log('📤 Uploading avatar to Cloudinary...');
      try {
        const imageUrl = await uploadToCloudinary(req.files.avatar[0].buffer);
        updateData.avatar = imageUrl;
        console.log('✅ Avatar uploaded:', imageUrl);
      } catch (uploadError) {
        return res.status(500).json({ message: 'Avatar upload failed' });
      }
    }

    // Handle cover photo upload
    if (req.files && req.files.coverPhoto) {
      console.log('📤 Uploading cover photo to Cloudinary...');
      try {
        const imageUrl = await uploadToCloudinary(req.files.coverPhoto[0].buffer);
        updateData.coverPhoto = imageUrl;
        console.log('✅ Cover photo uploaded:', imageUrl);
      } catch (uploadError) {
        return res.status(500).json({ message: 'Cover photo upload failed' });
      }
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach((key) => {
      // Map JS camelCase to DB snake_case where necessary
      const dbCol = key === 'coverPhoto' ? 'cover_photo' : key;
      setClauses.push(`${dbCol} = $${paramIndex}`);
      values.push(updateData[key]);
      paramIndex++;
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No valid data provided for update' });
    }

    values.push(userId); // Last parameter for the WHERE clause
    const sql = `
      UPDATE users 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, name, email, avatar, bio, cover_photo as "coverPhoto"
    `;

    const { rows, rowCount } = await pool.query(sql, values);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    console.error('❌ Profile Update Error:', err.message);
    if (err.code === '23505') { // Postgres unique violation code
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const registerPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required' });
    }

    const { rowCount } = await pool.query(
      'UPDATE users SET public_key = $1 WHERE id = $2',
      [publicKey, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { publicKey },
    });
  } catch (err) {
    console.error('❌ Register Public Key Error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, email, avatar, bio, cover_photo as "coverPhoto", public_key as "publicKey", created_at as "createdAt"
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('❌ Get User By ID Error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
