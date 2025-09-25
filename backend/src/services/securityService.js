import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  sanitizeUserForToken
} from '../utils/auth.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError
} from '../middleware/errorHandler.js';

/**
 * Enhanced Security Service for Psychology Practice Platform
 * Provides OAuth integration, session management, security monitoring, and HIPAA compliance features
 */

// OAuth configurations
const OAUTH_PROVIDERS = {
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    scope: 'profile email',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  microsoft: {
    clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_OAUTH_REDIRECT_URI,
    scope: 'https://graph.microsoft.com/user.read',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
  }
};

/**
 * Generate OAuth authorization URL
 */
export const generateOAuthUrl = (provider, state = null) => {
  const config = OAUTH_PROVIDERS[provider];
  if (!config || !config.clientId) {
    throw new BadRequestError(`OAuth provider '${provider}' not configured`);
  }

  const stateToken = state || crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    response_type: 'code',
    state: stateToken,
    access_type: 'offline', // For Google to get refresh tokens
    prompt: 'consent' // Force consent screen for Google
  });

  return {
    authUrl: `${config.authUrl}?${params.toString()}`,
    state: stateToken
  };
};

/**
 * Handle OAuth callback and create/login user
 */
export const handleOAuthCallback = async (provider, code, state, expectedState) => {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) {
    throw new BadRequestError(`Invalid OAuth provider: ${provider}`);
  }

  // Verify state parameter for CSRF protection
  if (state !== expectedState) {
    throw new BadRequestError('Invalid state parameter - possible CSRF attack');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('OAuth token exchange failed:', errorText);
      throw new UnauthorizedError('OAuth authentication failed');
    }

    const tokens = await tokenResponse.json();

    // Get user info from OAuth provider
    const userResponse = await fetch(config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new UnauthorizedError('Failed to retrieve user information');
    }

    const oauthUserInfo = await userResponse.json();

    // Normalize user data based on provider
    const normalizedUser = normalizeOAuthUser(provider, oauthUserInfo);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedUser.email },
      include: {
        oauthConnections: true
      }
    });

    if (user) {
      // Update existing OAuth connection or create new one
      await upsertOAuthConnection(user.id, provider, tokens, normalizedUser.providerId);

      // Update user info if needed
      if (!user.isVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            lastLogin: new Date()
          }
        });
        user.isVerified = true;
      }
    } else {
      // Create new user with OAuth connection
      user = await createUserWithOAuth(normalizedUser, provider, tokens);
    }

    // Generate JWT tokens
    const userPayload = sanitizeUserForToken(user);
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Create session record
    const session = await createSecureSession(user.id, {
      provider: 'oauth',
      oauthProvider: provider,
      ipAddress: null, // Will be set by middleware
      userAgent: null  // Will be set by middleware
    });

    // Log successful OAuth login
    await logSecurityEvent('oauth_login_success', user.id, {
      provider,
      email: user.email,
      sessionId: session.id
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatar: user.avatar
      },
      accessToken,
      refreshToken,
      sessionId: session.id,
      oauthProvider: provider
    };

  } catch (error) {
    logger.error('OAuth callback error:', error);

    if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
      throw error;
    }

    throw new InternalServerError('OAuth authentication failed');
  }
};

/**
 * Create secure session with enhanced tracking
 */
export const createSecureSession = async (userId, metadata = {}) => {
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      sessionToken,
      expiresAt,
      metadata: {
        ...metadata,
        createdAt: new Date(),
        lastActivity: new Date()
      }
    }
  });

  return session;
};

/**
 * Validate and refresh session
 */
export const validateSession = async (sessionId, sessionToken) => {
  const session = await prisma.userSession.findUnique({
    where: {
      id: sessionId,
      sessionToken,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          isVerified: true
        }
      }
    }
  });

  if (!session || !session.user.isActive) {
    return null;
  }

  // Update last activity
  await prisma.userSession.update({
    where: { id: sessionId },
    data: {
      metadata: {
        ...session.metadata,
        lastActivity: new Date()
      }
    }
  });

  return session;
};

/**
 * Revoke session
 */
export const revokeSession = async (sessionId) => {
  await prisma.userSession.delete({
    where: { id: sessionId }
  });
};

/**
 * Multi-factor authentication setup
 */
export const generateMFASecret = async (userId) => {
  // Generate TOTP secret
  const secret = crypto.randomBytes(20).toString('base32');

  // Store MFA secret (encrypted in production)
  await prisma.userMFA.upsert({
    where: { userId },
    create: {
      userId,
      secret: secret, // In production, encrypt this
      enabled: false,
      backupCodes: generateBackupCodes()
    },
    update: {
      secret: secret,
      backupCodes: generateBackupCodes()
    }
  });

  // Generate QR code URL for authenticator apps
  const issuer = 'Mindful Ad Wizard';
  const accountName = `${issuer}:${userId}`;
  const otpAuthUrl = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

  return {
    secret,
    qrCodeUrl: otpAuthUrl,
    manualEntryKey: secret
  };
};

/**
 * Verify MFA token
 */
export const verifyMFAToken = async (userId, token) => {
  const mfa = await prisma.userMFA.findUnique({
    where: { userId }
  });

  if (!mfa || !mfa.enabled) {
    throw new BadRequestError('MFA not enabled for this user');
  }

  // Simple TOTP verification (in production, use proper TOTP library)
  const isValidTOTP = verifyTOTP(mfa.secret, token);
  const isBackupCode = mfa.backupCodes.includes(token);

  if (!isValidTOTP && !isBackupCode) {
    // Log failed MFA attempt
    await logSecurityEvent('mfa_verification_failed', userId, { token: token.substring(0, 2) + '***' });
    throw new UnauthorizedError('Invalid MFA token');
  }

  // If backup code was used, remove it
  if (isBackupCode) {
    await prisma.userMFA.update({
      where: { userId },
      data: {
        backupCodes: mfa.backupCodes.filter(code => code !== token)
      }
    });
  }

  await logSecurityEvent('mfa_verification_success', userId, { method: isBackupCode ? 'backup_code' : 'totp' });
  return true;
};

/**
 * Enhanced JWT with additional claims and security
 */
export const generateSecureJWT = (user, sessionId, additionalClaims = {}) => {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    ...sanitizeUserForToken(user),
    sessionId,
    iat: now,
    nbf: now, // Not before
    jti: crypto.randomUUID(), // JWT ID for tracking
    ...additionalClaims
  };

  // Add HIPAA compliance claims for healthcare users
  if (user.role === 'CLIENT' && user.practiceType) {
    payload.hipaa_compliant = true;
    payload.data_classification = 'PHI'; // Protected Health Information
    payload.audit_required = true;
  }

  return generateAccessToken(payload);
};

/**
 * Password policy validation for healthcare compliance
 */
export const validatePasswordPolicy = (password) => {
  const minLength = 12; // HIPAA recommends stronger passwords
  const requirements = {
    length: password.length >= minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommon: !isCommonPassword(password),
    noSequential: !hasSequentialChars(password),
    noPrevious: true // Would check against password history in production
  };

  const passed = Object.values(requirements).every(req => req);

  const errors = [];
  if (!requirements.length) errors.push(`Password must be at least ${minLength} characters long`);
  if (!requirements.uppercase) errors.push('Password must contain uppercase letters');
  if (!requirements.lowercase) errors.push('Password must contain lowercase letters');
  if (!requirements.number) errors.push('Password must contain numbers');
  if (!requirements.special) errors.push('Password must contain special characters');
  if (!requirements.noCommon) errors.push('Password is too common');
  if (!requirements.noSequential) errors.push('Password contains sequential characters');

  return {
    valid: passed,
    score: calculatePasswordStrength(password),
    requirements,
    errors
  };
};

/**
 * Account lockout management
 */
export const checkAccountLockout = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accountLockout: true }
  });

  if (!user || !user.accountLockout) {
    return { locked: false };
  }

  const lockout = user.accountLockout;
  const now = new Date();

  // Check if lockout has expired
  if (lockout.lockedUntil && lockout.lockedUntil < now) {
    // Reset lockout
    await prisma.accountLockout.update({
      where: { userId: user.id },
      data: {
        attempts: 0,
        lockedUntil: null
      }
    });
    return { locked: false };
  }

  if (lockout.lockedUntil && lockout.lockedUntil > now) {
    return {
      locked: true,
      lockedUntil: lockout.lockedUntil,
      attempts: lockout.attempts
    };
  }

  return { locked: false, attempts: lockout.attempts || 0 };
};

/**
 * Handle failed login attempt
 */
export const handleFailedLogin = async (email, ipAddress = null) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (!user) return; // Don't reveal if email exists

  const maxAttempts = 5;
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes

  await prisma.accountLockout.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      attempts: 1,
      lastAttemptAt: new Date(),
      lastAttemptIp: ipAddress
    },
    update: {
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      lastAttemptIp: ipAddress
    }
  });

  const lockout = await prisma.accountLockout.findUnique({
    where: { userId: user.id }
  });

  // Lock account if max attempts reached
  if (lockout.attempts >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + lockoutDuration);

    await prisma.accountLockout.update({
      where: { userId: user.id },
      data: { lockedUntil }
    });

    await logSecurityEvent('account_locked', user.id, {
      attempts: lockout.attempts,
      lockedUntil,
      ipAddress
    });
  }

  await logSecurityEvent('failed_login_attempt', user.id, {
    attempts: lockout.attempts,
    ipAddress,
    email
  });
};

/**
 * Security event logging for compliance
 */
export const logSecurityEvent = async (eventType, userId = null, metadata = {}) => {
  try {
    await prisma.securityEvent.create({
      data: {
        eventType,
        userId,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          userAgent: metadata.userAgent || 'Unknown',
          ipAddress: metadata.ipAddress || 'Unknown'
        }
      }
    });

    // Log to application logs as well
    logger.info('Security event logged', {
      eventType,
      userId,
      metadata: {
        ...metadata,
        // Redact sensitive information
        ...(metadata.password && { password: '[REDACTED]' }),
        ...(metadata.token && { token: '[REDACTED]' })
      }
    });
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

/**
 * Get security audit trail for user
 */
export const getSecurityAuditTrail = async (userId, options = {}) => {
  const { limit = 50, offset = 0, eventTypes = null, startDate = null, endDate = null } = options;

  const where = {
    userId,
    ...(eventTypes && { eventType: { in: eventTypes } }),
    ...(startDate && endDate && {
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    })
  };

  const [events, totalCount] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.securityEvent.count({ where })
  ]);

  return {
    events,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    }
  };
};

/**
 * Device fingerprinting for session security
 */
export const generateDeviceFingerprint = (userAgent, ipAddress, additionalHeaders = {}) => {
  const fingerprint = crypto
    .createHash('sha256')
    .update([
      userAgent || 'unknown',
      ipAddress || 'unknown',
      additionalHeaders['accept-language'] || '',
      additionalHeaders['accept-encoding'] || ''
    ].join('|'))
    .digest('hex');

  return fingerprint;
};

/**
 * Rate limiting for API endpoints
 */
export const checkRateLimit = async (identifier, windowMs = 900000, maxRequests = 100) => {
  const window = Math.floor(Date.now() / windowMs);
  const key = `rate_limit:${identifier}:${window}`;

  const current = await redis.incr(key); // Would use Redis in production
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }

  const remaining = Math.max(0, maxRequests - current);
  const resetTime = (window + 1) * windowMs;

  return {
    allowed: current <= maxRequests,
    remaining,
    resetTime,
    total: maxRequests
  };
};

// Helper functions

const normalizeOAuthUser = (provider, oauthUserInfo) => {
  switch (provider) {
    case 'google':
      return {
        providerId: oauthUserInfo.id,
        email: oauthUserInfo.email,
        name: oauthUserInfo.name,
        avatar: oauthUserInfo.picture,
        isVerified: oauthUserInfo.verified_email || false
      };
    case 'microsoft':
      return {
        providerId: oauthUserInfo.id,
        email: oauthUserInfo.mail || oauthUserInfo.userPrincipalName,
        name: oauthUserInfo.displayName,
        avatar: null,
        isVerified: true // Microsoft accounts are considered verified
      };
    default:
      throw new BadRequestError(`Unsupported OAuth provider: ${provider}`);
  }
};

const upsertOAuthConnection = async (userId, provider, tokens, providerId) => {
  await prisma.oauthConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider
      }
    },
    create: {
      userId,
      provider,
      providerId: providerId.toString(),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ?
        new Date(Date.now() + tokens.expires_in * 1000) : null
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ?
        new Date(Date.now() + tokens.expires_in * 1000) : null,
      lastUsedAt: new Date()
    }
  });
};

const createUserWithOAuth = async (normalizedUser, provider, tokens) => {
  return await prisma.user.create({
    data: {
      name: normalizedUser.name,
      email: normalizedUser.email,
      avatar: normalizedUser.avatar,
      isVerified: normalizedUser.isVerified,
      role: 'CLIENT', // Default role for OAuth users
      oauthConnections: {
        create: {
          provider,
          providerId: normalizedUser.providerId.toString(),
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ?
            new Date(Date.now() + tokens.expires_in * 1000) : null
        }
      }
    },
    include: {
      oauthConnections: true
    }
  });
};

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

const verifyTOTP = (secret, token) => {
  // Simplified TOTP verification - use proper library like 'speakeasy' in production
  const timeWindow = Math.floor(Date.now() / 30000);
  const expectedToken = crypto
    .createHmac('sha1', Buffer.from(secret, 'base32'))
    .update(Buffer.from(timeWindow.toString()))
    .digest('hex')
    .slice(-6);

  return token === expectedToken;
};

const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', 'password123', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'Password1', 'password1'
  ];
  return commonPasswords.includes(password.toLowerCase());
};

const hasSequentialChars = (password) => {
  const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc'];
  const lowerPassword = password.toLowerCase();

  return sequences.some(seq => lowerPassword.includes(seq));
};

const calculatePasswordStrength = (password) => {
  let score = 0;

  // Length bonus
  score += Math.min(password.length * 2, 30);

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  // Complexity bonus
  if (password.length >= 12 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)) {
    score += 15;
  }

  // Deduct for common patterns
  if (isCommonPassword(password)) score -= 20;
  if (hasSequentialChars(password)) score -= 10;

  return Math.max(0, Math.min(100, score));
};

