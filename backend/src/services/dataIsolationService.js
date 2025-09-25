import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Data isolation service for multi-tenant architecture
 * Ensures users can only access their own data and proper data segregation
 */

/**
 * User data isolation middleware factory
 * Creates middleware that automatically filters queries by user ID
 */
export const createDataIsolationMiddleware = (model, userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for data access',
        });
      }

      // Skip isolation for admins
      if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        return next();
      }

      // Add user ID filter to query parameters
      const originalQuery = req.query || {};
      req.isolatedQuery = {
        ...originalQuery,
        [userIdField]: req.user.id,
      };

      // Add isolation context to request
      req.isolation = {
        model,
        userIdField,
        userId: req.user.id,
        isAdmin: false,
      };

      next();
    } catch (error) {
      logger.error('Data isolation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Data isolation check failed',
      });
    }
  };
};

/**
 * Get isolated query conditions for Prisma
 */
export const getIsolatedWhere = (req, additionalWhere = {}) => {
  const baseWhere = { ...additionalWhere };

  // Skip isolation for admins
  if (req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return baseWhere;
  }

  // Add user isolation
  if (req.user && req.isolation?.userIdField) {
    baseWhere[req.isolation.userIdField] = req.user.id;
  }

  return baseWhere;
};

/**
 * Isolated Prisma query wrapper
 * Automatically adds user isolation to queries
 */
export const isolatedPrismaQuery = async (req, model, operation, args = {}) => {
  try {
    const isAdmin = req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    // For admin users, don't apply isolation
    if (isAdmin) {
      return await prisma[model][operation](args);
    }

    // Apply user isolation to where clauses
    let isolatedArgs = { ...args };

    if (isolatedArgs.where) {
      isolatedArgs.where = getIsolatedWhere(req, isolatedArgs.where);
    } else if (req.user) {
      // Determine user field based on model
      const userIdField = getUserIdFieldForModel(model);
      if (userIdField) {
        isolatedArgs.where = { [userIdField]: req.user.id };
      }
    }

    // For create operations, ensure userId is set
    if (operation === 'create' && isolatedArgs.data && req.user) {
      const userIdField = getUserIdFieldForModel(model);
      if (userIdField && !isolatedArgs.data[userIdField]) {
        isolatedArgs.data[userIdField] = req.user.id;
      }
    }

    // For createMany operations, ensure all records have userId
    if (operation === 'createMany' && isolatedArgs.data && req.user) {
      const userIdField = getUserIdFieldForModel(model);
      if (userIdField) {
        isolatedArgs.data = isolatedArgs.data.map(record => ({
          ...record,
          [userIdField]: record[userIdField] || req.user.id,
        }));
      }
    }

    const result = await prisma[model][operation](isolatedArgs);

    // Log data access for audit
    logger.debug('Isolated data access:', {
      userId: req.user?.id,
      model,
      operation,
      recordCount: Array.isArray(result) ? result.length : result ? 1 : 0,
    });

    return result;
  } catch (error) {
    logger.error('Isolated Prisma query error:', {
      userId: req.user?.id,
      model,
      operation,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get the user ID field name for a given model
 */
const getUserIdFieldForModel = (model) => {
  const modelFieldMap = {
    campaign: 'userId',
    creative: 'userId',
    lead: 'userId',
    landingPage: 'userId',
    notification: 'userId',
    apiKey: 'userId',
    chatSession: 'userId',
    leadInteraction: 'leadId', // Special case - needs to be resolved through lead
    leadNote: 'leadId', // Special case - needs to be resolved through lead
    onboardingData: 'userId',
  };

  return modelFieldMap[model] || 'userId';
};

/**
 * Validate user ownership of a resource
 */
export const validateOwnership = async (req, model, resourceId, userIdField = 'userId') => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    // Admins can access any resource
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return true;
    }

    // Check if resource exists and belongs to user
    const resource = await prisma[model].findUnique({
      where: { id: resourceId },
      select: { [userIdField]: true },
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    if (resource[userIdField] !== req.user.id) {
      throw new Error('Access denied - resource belongs to different user');
    }

    return true;
  } catch (error) {
    logger.warn('Ownership validation failed:', {
      userId: req.user?.id,
      model,
      resourceId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Bulk ownership validation for multiple resources
 */
export const validateBulkOwnership = async (req, model, resourceIds, userIdField = 'userId') => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    // Admins can access any resources
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return true;
    }

    const resources = await prisma[model].findMany({
      where: {
        id: { in: resourceIds },
      },
      select: {
        id: true,
        [userIdField]: true,
      },
    });

    if (resources.length !== resourceIds.length) {
      throw new Error('Some resources not found');
    }

    const unauthorizedResources = resources.filter(
      resource => resource[userIdField] !== req.user.id
    );

    if (unauthorizedResources.length > 0) {
      throw new Error(`Access denied to ${unauthorizedResources.length} resources`);
    }

    return true;
  } catch (error) {
    logger.warn('Bulk ownership validation failed:', {
      userId: req.user?.id,
      model,
      resourceCount: resourceIds.length,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get user's resource count with caching
 */
const resourceCountCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getUserResourceCount = async (userId, model, useCache = true) => {
  const cacheKey = `${userId}-${model}`;

  if (useCache && resourceCountCache.has(cacheKey)) {
    const cached = resourceCountCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.count;
    }
    resourceCountCache.delete(cacheKey);
  }

  try {
    const userIdField = getUserIdFieldForModel(model);
    const count = await prisma[model].count({
      where: { [userIdField]: userId },
    });

    if (useCache) {
      resourceCountCache.set(cacheKey, {
        count,
        timestamp: Date.now(),
      });
    }

    return count;
  } catch (error) {
    logger.error('Resource count query failed:', {
      userId,
      model,
      error: error.message,
    });
    return 0;
  }
};

/**
 * Clear resource count cache for user
 */
export const clearUserCache = (userId) => {
  for (const key of resourceCountCache.keys()) {
    if (key.startsWith(`${userId}-`)) {
      resourceCountCache.delete(key);
    }
  }
};

/**
 * Database connection pool optimization
 */
export const optimizeDbConnections = () => {
  // Clean up old cache entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of resourceCountCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        resourceCountCache.delete(key);
      }
    }
  }, CACHE_TTL);

  logger.info('Database connection optimization initialized');
};

/**
 * Efficient pagination with user isolation
 */
export const getIsolatedPagination = async (req, model, options = {}) => {
  const {
    page = 1,
    limit = 10,
    orderBy = 'createdAt',
    orderDirection = 'desc',
    search = '',
    searchFields = [],
    filters = {},
  } = options;

  const skip = (page - 1) * limit;
  const userIdField = getUserIdFieldForModel(model);

  // Build where clause with isolation
  let where = getIsolatedWhere(req, filters);

  // Add search if provided
  if (search && searchFields.length > 0) {
    where.OR = searchFields.map(field => ({
      [field]: {
        contains: search,
        mode: 'insensitive',
      },
    }));
  }

  try {
    // Execute count and data queries in parallel
    const [total, data] = await Promise.all([
      prisma[model].count({ where }),
      prisma[model].findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
        ...options.include && { include: options.include },
        ...options.select && { select: options.select },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error('Isolated pagination query failed:', {
      userId: req.user?.id,
      model,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Initialize data isolation service
 */
export const initializeDataIsolation = () => {
  optimizeDbConnections();
  logger.info('Data isolation service initialized');
};