import jwt from 'jsonwebtoken';
import { User } from '../../models/index.js';

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists in database
    const userExists = await User.findByPk(decoded.id, { attributes: ['id'] });
    if (!userExists) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = { ...decoded, id: decoded.id };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid Token' });
  }
};
