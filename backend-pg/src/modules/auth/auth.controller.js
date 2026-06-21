import pool from '../../config/pgDatabase.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler, sendSuccess } from '../../utils/response.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const { rows: existingUsers } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUsers.length > 0) {
    throw AppError.conflict('Email already in use', 'EMAIL_IN_USE');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  const { rows } = await pool.query(
    `INSERT INTO users (id, name, email, password, password_changed_at, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW()) 
     RETURNING id, name, email, avatar, public_key`,
    [userId, name, email.toLowerCase(), hashedPassword]
  );
  
  const user = rows[0];
  const token = signToken(user.id);

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      publicKey: user.public_key,
    },
  }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, name, email, password, avatar, public_key FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const token = signToken(user.id);

  sendSuccess(res, {
    token,
    userId: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    publicKey: user.public_key,
  });
});
