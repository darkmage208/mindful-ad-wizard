import { logger } from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Prisma errors
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this data already exists';
        details = error.meta?.target ? `Duplicate field: ${error.meta.target.join(', ')}` : null;
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'The change would violate a required relation';
        break;
      default:
        logger.error('Unhandled Prisma error:', error);
    }
  }
  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = Array.isArray(error.details) 
      ? error.details.map(detail => detail.message).join(', ')
      : error.details;
  }
  // Multer errors (file upload)
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size too large';
  }
  else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files';
  }
  // Custom errors
  else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  }
  // Syntax errors
  else if (error instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid JSON format';
  }
  // Default to error message if it's a known error type
  else if (error.message && statusCode === 500) {
    // Only use error message for 500 errors if it's safe to expose
    const safeToExpose = [
      'User not found',
      'Invalid credentials',
      'Access denied',
      'Resource not found',
      'Validation failed',
    ];
    
    if (safeToExpose.some(safe => error.message.includes(safe))) {
      message = error.message;
    }
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      originalError: error.message,
    }),
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Internal server error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}