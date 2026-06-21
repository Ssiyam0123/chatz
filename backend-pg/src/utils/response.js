/**
 * Standard API response helpers + asyncHandler wrapper.
 *
 * Success envelope: { status: 'success', data }
 * Error   envelope: { status: 'error', error: { code, message } }
 *   (errors are produced by the global handler in server.js from AppError)
 */

// Success: 200 by default. `data` defaults to null.
export const sendSuccess = (res, data = null, statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', data });
};

// Success with pagination metadata merged at the top level.
export const sendPaginated = (res, { data, pagination }, statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', data, pagination });
};

// Operational error response for cases that bypass the global handler
// (e.g. inside socket handlers that don't go through Express middleware).
export const sendError = (res, message, statusCode = 500, code = null) => {
  return res.status(statusCode).json({
    status: 'error',
    error: { code: code || null, message: message || 'Internal Server Error' },
  });
};

// Wrap an async controller so rejected promises flow to the global error
// handler instead of needing a try/catch in every handler.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default sendSuccess;
