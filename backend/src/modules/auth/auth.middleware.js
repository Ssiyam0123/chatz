import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;
    req.user = { ...decoded, id: userId, _id: userId };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid Token' });
  }
};