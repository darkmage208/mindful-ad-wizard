import { logger } from './logger.js';

/**
 * Create standardized paginated response
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Standardized pagination response
 */
export const createPaginatedResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: parseInt(page) < Math.ceil(total / limit),
      hasPrev: parseInt(page) > 1,
    },
  };
};

/**
 * Calculate campaign performance metrics
 * @param {Object} campaign - Campaign object with performance data
 * @returns {Object} Calculated metrics
 */
export const calculateCampaignMetrics = (campaign) => {
  const { impressions = 0, clicks = 0, conversions = 0, cost = 0, leads = 0 } = campaign;
  
  return {
    ctr: calculatePercentage(clicks, impressions),
    cpc: clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0,
    cpl: leads > 0 ? Number((cost / leads).toFixed(2)) : 0,
    cpm: impressions > 0 ? Number((cost / impressions * 1000).toFixed(2)) : 0,
    conversionRate: calculatePercentage(conversions, clicks),
    costPerConversion: conversions > 0 ? Number((cost / conversions).toFixed(2)) : 0,
  };
};

/**
 * Calculate percentage with proper rounding
 * @param {number} numerator - Numerator value
 * @param {number} denominator - Denominator value
 * @returns {number} Percentage rounded to 2 decimal places
 */
export const calculatePercentage = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
};

/**
 * Build pagination parameters from request
 * @param {Object} query - Request query parameters
 * @returns {Object} Pagination parameters
 */
export const buildPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Build date range filter from query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} Date range filter
 */
export const buildDateRangeFilter = (query) => {
  const { startDate, endDate } = query;
  const dateFilter = {};
  
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }
  
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
};

/**
 * Sanitize user data for public response (remove sensitive fields)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
export const sanitizeUserForResponse = (user) => {
  const { password, verifyToken, resetToken, resetExpires, ...safeUser } = user;
  return safeUser;
};

/**
 * Log controller operation with standardized format
 * @param {string} operation - Operation name
 * @param {string} userId - User ID performing the operation
 * @param {Object} metadata - Additional metadata to log
 * @param {string} level - Log level (info, warn, error)
 */
export const logControllerOperation = (operation, userId, metadata = {}, level = 'info') => {
  const logData = {
    operation,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  logger[level](`Controller operation: ${operation}`, logData);
};

/**
 * Build search filter for text fields
 * @param {string} searchTerm - Search term
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} Prisma OR filter
 */
export const buildSearchFilter = (searchTerm, searchFields) => {
  if (!searchTerm || !searchFields.length) return {};
  
  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }))
  };
};

/**
 * Handle async controller functions with proper error handling
 * @param {Function} fn - Async controller function
 * @returns {Function} Wrapped controller function
 */
export const asyncControllerHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error('Controller error:', {
        operation: fn.name,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  };
};

/**
 * Validate and sanitize numeric input
 * @param {any} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Validated numeric value
 */
export const validateNumericInput = (value, defaultValue = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return defaultValue;
  }
  return num;
};