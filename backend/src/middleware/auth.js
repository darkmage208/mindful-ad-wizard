import { verifyAccessToken } from '../utils/auth.js';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { validateSession, logSecurityEvent } from '../services/securityService.js';

/**
 * Enhanced authentication middleware with session verification
 * Verifies JWT token and session, attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token
    const decoded = verifyAccessToken(token);

    // Use JWT claims for user info to avoid DB lookup on every request
    // Only validate critical info is in token
    if (!decoded.id || !decoded.email || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure',
      });
    }

    // Verify session if provided (additional security layer)
    if (sessionToken) {
      try {
        const sessionData = await validateSession(sessionToken, sessionToken);
        if (!sessionData || sessionData.userId !== decoded.id) {
          await logSecurityEvent('invalid_session_token', decoded.id, {
            sessionToken,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          });
          return res.status(401).json({
            success: false,
            message: 'Invalid session',
            code: 'INVALID_SESSION',
          });
        }
      } catch (sessionError) {
        logger.warn('Session verification failed:', sessionError);
        // Continue with just JWT verification for backwards compatibility
      }
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
    req.sessionToken = sessionToken;

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

/**
 * Session validation middleware
 * Requires both JWT token and valid session token
 */
export const requireSession = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Session token required',
        code: 'SESSION_REQUIRED',
      });
    }

    // First run standard authentication
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Then verify session matches authenticated user
    const sessionData = await validateSession(sessionToken, sessionToken);
    if (!sessionData || sessionData.userId !== req.user.id) {
      await logSecurityEvent('session_mismatch', req.user?.id, {
        sessionToken,
        expectedUserId: req.user?.id,
        actualUserId: sessionData?.userId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        message: 'Session validation failed',
        code: 'SESSION_INVALID',
      });
    }

    // Attach session data to request
    req.session = sessionData;

    next();
  } catch (error) {
    logger.error('Session validation error:', error);

    return res.status(401).json({
      success: false,
      message: 'Session validation failed',
    });
  }
};

/**
 * Rate limiting middleware for sensitive operations
 */
export const rateLimitSensitive = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}-${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Clean old attempts
    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      // Log security event for rate limiting
      if (req.user?.id) {
        logSecurityEvent('rate_limit_exceeded', req.user.id, {
          endpoint: req.path,
          attempts: recentAttempts.length,
          windowMinutes,
          ipAddress: req.ip,
        }).catch(error => logger.error('Failed to log rate limit event:', error));
      }

      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Record this attempt
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

/**
 * MFA verification middleware
 * Requires MFA verification for sensitive operations
 */
export const requireMFA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user has MFA enabled
    const userMFA = await prisma.userMFA.findUnique({
      where: { userId: req.user.id },
    });

    if (!userMFA?.enabled) {
      // MFA not enabled, skip requirement
      return next();
    }

    // Check for MFA verification in session or headers
    const mfaVerified = req.headers['x-mfa-verified'] === 'true' ||
                       req.session?.mfaVerified;

    if (!mfaVerified) {
      return res.status(403).json({
        success: false,
        message: 'MFA verification required',
        code: 'MFA_REQUIRED',
      });
    }

    next();
  } catch (error) {
    logger.error('MFA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'MFA verification failed',
    });
  }
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server signature
  res.removeHeader('X-Powered-By');

  next();
};