import { User } from '../../models/index.js';
import jwt from 'jsonwebtoken';

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user.id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          publicKey: user.publicKey,
        },
      },
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly include password for comparison
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        publicKey: user.publicKey,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
