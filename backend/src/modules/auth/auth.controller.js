import User from '../user/user.model.js';
import jwt from 'jsonwebtoken';

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({
      status: 'success',
      token,
      data: { user: { id: user._id, name: user.name, email: user.email } }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.status(200).json({
      status: 'success',
      token,
      data: { userId: user._id, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};