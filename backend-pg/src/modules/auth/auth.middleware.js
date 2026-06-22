import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError.js';
import pool from '../../config/pgDatabase.js';

// In-memory set of revoked token jti/ids for fast lookups.
// In a multi-server deployment, swap this for a Redis SET.
const _revoked = new Set();

/**
 * Middleware factory that restricts access to specified roles.
 * Must be used after `protect` middleware.
 *
 * Usage:
 *   router.delete('/:id', protect, restrictTo('admin', 'super_admin'), deleteSomething);
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

export const revokeToken = (tokenId, ttlMs = 30 * 24 * 60 * 60 * 1000) => {
  _revoked.add(tokenId);
  setTimeout(() => _revoked.delete(tokenId), ttlMs);
};

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) {
    return next(AppError.unauthorized('Missing authorization token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fast-path: reject if token was explicitly revoked (e.g. after password change).
    if (_revoked.has(decoded.id || decoded.jti)) {
      return next(AppError.unauthorized('Token has been revoked'));
    }

    // Verify user still exists AND check the token-version watermark.
    // Only hits the DB when the JWT payload includes an `iat` claim, which is
    // always the case for tokens minted by our `signToken` helper.
    const { rows } = await pool.query(
      'SELECT id, name, role, banned_at, suspended_until, password_changed_at as "passwordChangedAt" FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = rows[0];
    if (!user) {
      return next(AppError.unauthorized('User no longer exists'));
    }

    // If the user changed their password AFTER this token was issued, reject it.
    if (user.passwordChangedAt && decoded.iat) {
      // JWT iat is in seconds, so we give a 1-second tolerance to account for the truncation of milliseconds.
      const issuedAt = new Date(decoded.iat * 1000);
      const tolerance = 1000; // 1 second
      if (user.passwordChangedAt.getTime() - tolerance > issuedAt.getTime()) {
        return next(AppError.unauthorized('Password changed — please log in again'));
      }
    }

    // Check if user is banned
    if (user.banned_at) {
      return next(AppError.forbidden('Your account has been banned'));
    }

    // Check if user is suspended
    if (user.suspended_at && (!user.suspended_until || new Date(user.suspended_until) > new Date())) {
      return next(AppError.forbidden('Your account has been temporarily suspended'));
    }

    req.user = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Invalid token'));
    }
    next(err);
  }
};
