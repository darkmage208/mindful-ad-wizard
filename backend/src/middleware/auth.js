import { verifyAccessToken } from '../utils/auth.js';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Use JWT claims for user info to avoid DB lookup on every request
    // Only validate critical info is in token
    if (!decoded.id || !decoded.email || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure',
      });
    }

    // Create user object from token claims
    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      isActive: true, // JWT wouldn't exist if user was inactive
      isVerified: decoded.isVerified || false,
    };

    // Attach user to request
    req.user = user;
    
    // Update last login periodically (every 5 minutes) instead of every request
    const lastLoginUpdate = req.headers['x-last-login-update'];
    const shouldUpdateLogin = !lastLoginUpdate || 
      (Date.now() - parseInt(lastLoginUpdate)) > 5 * 60 * 1000;
    
    if (shouldUpdateLogin) {
      // Update in background without blocking request
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }).catch(error => {
        logger.warn('Failed to update lastLogin:', error);
      });
    }

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    // Use token claims for optional auth too - no DB lookup needed
    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      isActive: true,
      isVerified: decoded.isVerified || false,
    };

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    logger.debug('Optional auth failed:', error.message);
    next();
  }
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize('ADMIN', 'SUPER_ADMIN');

/**
 * Super admin only middleware
 */
export const superAdminOnly = authorize('SUPER_ADMIN');

/**
 * Resource ownership middleware factory
 * Creates middleware that checks if user owns the resource or is admin
 */
export const requireOwnership = (model, resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Admins can access any resource
      if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required',
        });
      }

      // Check ownership in database
      const resource = await prisma[model].findUnique({
        where: { id: resourceId },
        select: { [userIdField]: true },
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      if (resource[userIdField] !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
      
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
};

/**
 * Legacy requireOwnership for backward compatibility
 * @deprecated Use requireOwnership with model parameter instead
 */
export const legacyRequireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    logger.warn('Using legacy requireOwnership - consider updating to new version');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admins can access any resource
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID required',
      });
    }

    req.resourceId = resourceId;
    req.userIdField = userIdField;
    
    next();
  };
};