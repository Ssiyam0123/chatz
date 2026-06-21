/**
 * Operational error with an attached HTTP status code and optional machine code.
 * Thrown from controllers/services; the global error handler turns it into the
 * standard `{ status:'error', error:{ code, message } }` envelope.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', code = null) {
    return new AppError(msg, 400, code);
  }
  static unauthorized(msg = 'Unauthorized', code = null) {
    return new AppError(msg, 401, code);
  }
  static forbidden(msg = 'Forbidden', code = null) {
    return new AppError(msg, 403, code);
  }
  static notFound(msg = 'Not found', code = null) {
    return new AppError(msg, 404, code);
  }
  static conflict(msg = 'Conflict', code = null) {
    return new AppError(msg, 409, code);
  }
}

export default AppError;
