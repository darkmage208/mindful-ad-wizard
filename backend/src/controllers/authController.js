import { prisma } from '../utils/database.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  generateResetToken,
  sanitizeUserForToken,
} from '../utils/auth.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';
import {
  generateOAuthUrl,
  handleOAuthCallback,
  createSecureSession,
  validateSession,
  generateMFASecret,
  verifyMFAToken,
  logSecurityEvent,
  checkAccountLockout
} from '../services/securityService.js';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from '../middleware/errorHandler.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';

/**
 * Register new user
 */
export const register = asyncControllerHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User already exists with this email');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate verification token
  const verifyToken = generateVerificationToken();

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      verifyToken,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Mindful Ad Wizard - Verify Your Email',
      template: 'welcome',
      data: {
        name,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`,
      },
    });
  } catch (emailError) {
    logger.warn('Failed to send verification email:', emailError);
  }

  // Generate tokens
  const userPayload = sanitizeUserForToken(user);
  const accessToken = generateAccessToken(userPayload);
  const refreshTokenValue = generateRefreshToken({ userId: user.id });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      accessToken,
      refreshToken: refreshTokenValue,
    },
  });
});

/**
 * Login user
 */
export const login = asyncControllerHandler(async (req, res) => {
  const { email, password, mfaCode } = req.body;
  const clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  try {
    // Check account lockout
    await checkAccountLockout(email, clientInfo);

    // Find user with MFA data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userMFA: true,
        accountLockout: true,
      },
    });

    if (!user) {
      await logSecurityEvent('failed_login', null, {
        reason: 'user_not_found',
        email,
        ...clientInfo,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await logSecurityEvent('failed_login', user.id, {
        reason: 'invalid_password',
        ...clientInfo,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      await logSecurityEvent('failed_login', user.id, {
        reason: 'account_inactive',
        ...clientInfo,
      });
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check MFA if enabled
    if (user.userMFA?.enabled) {
      if (!mfaCode) {
        return res.json({
          success: false,
          requireMFA: true,
          message: 'Multi-factor authentication required',
        });
      }

      const mfaValid = await verifyMFAToken(user.id, mfaCode);
      if (!mfaValid) {
        await logSecurityEvent('failed_mfa', user.id, {
          ...clientInfo,
        });
        throw new UnauthorizedError('Invalid MFA code');
      }
    }

    // Create secure session
    const sessionToken = await createSecureSession(user.id, clientInfo);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const userPayload = sanitizeUserForToken(user);
    const accessToken = generateAccessToken(userPayload);
    const refreshTokenValue = generateRefreshToken({ userId: user.id });

    // Log successful login
    await logSecurityEvent('login', user.id, {
      sessionToken,
      ...clientInfo,
    });

    // Remove sensitive data
    const { password: _, verifyToken, resetToken, resetExpires, userMFA, accountLockout, ...safeUser } = user;

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        accessToken,
        refreshToken: refreshTokenValue,
        sessionToken,
      },
    });
  } catch (error) {
    // Handle account lockout on repeated failures
    if (error instanceof UnauthorizedError && email) {
      await checkAccountLockout(email, clientInfo, true);
    }
    throw error;
  }
});

/**
 * Logout user
 */
export const logout = async (req, res) => {
  const { sessionToken } = req.body;
  const clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  if (sessionToken) {
    try {
      // Invalidate session
      await prisma.userSession.delete({
        where: { sessionToken },
      });
    } catch (error) {
      logger.warn('Session cleanup failed during logout:', error);
    }
  }

  // Log logout event
  await logSecurityEvent('logout', req.user.id, {
    sessionToken,
    ...clientInfo,
  });

  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout successful',
  });
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Generate new access token
  const userPayload = sanitizeUserForToken(user);
  const newAccessToken = generateAccessToken(userPayload);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken,
    },
  });
};

/**
 * Forgot password
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  }

  // Generate reset token
  const { token, expires } = generateResetToken();

  // Save reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetExpires: expires,
    },
  });

  // Send reset email
  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset - Mindful Ad Wizard',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
        expiresIn: '10 minutes',
      },
    });
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError);
    throw new AppError('Failed to send password reset email');
  }

  logger.info(`Password reset requested for: ${email}`);

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
  });
};

/**
 * Reset password
 */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  // Hash new password
  const hashedPassword = await hashPassword(password);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetExpires: null,
    },
  });

  logger.info(`Password reset completed for: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successfully',
  });
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
};

/**
 * Verify email
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token required');
  }

  // Find user with verification token
  const user = await prisma.user.findFirst({
    where: { verifyToken: token },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid verification token');
  }

  if (user.isVerified) {
    return res.json({
      success: true,
      message: 'Email already verified',
    });
  }

  // Verify email
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verifyToken: null,
    },
  });

  logger.info(`Email verified for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Email verified successfully',
  });
};

/**
 * Resend verification email
 */
export const resendVerification = async (req, res) => {
  const { email } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account with that email exists and is unverified, a verification email has been sent',
    });
  }

  if (user.isVerified) {
    return res.json({
      success: true,
      message: 'Email is already verified',
    });
  }

  // Generate new verification token
  const verifyToken = generateVerificationToken();

  // Update user with new token
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken },
  });

  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Mindful Ad Wizard',
      template: 'email-verification',
      data: {
        name: user.name,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`,
      },
    });
  } catch (emailError) {
    logger.error('Failed to send verification email:', emailError);
    throw new AppError('Failed to send verification email');
  }

  logger.info(`Verification email resent for: ${email}`);

  res.json({
    success: true,
    message: 'If an account with that email exists and is unverified, a verification email has been sent',
  });
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      company: true,
      bio: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * OAuth login initiation
 */
export const oauthLogin = asyncControllerHandler(async (req, res) => {
  const { provider } = req.params;
  const { redirectUrl } = req.query;

  try {
    const oauthUrl = generateOAuthUrl(provider, redirectUrl);

    res.json({
      success: true,
      data: {
        oauthUrl,
        provider,
      },
    });
  } catch (error) {
    throw new BadRequestError(`OAuth provider '${provider}' not supported or configured`);
  }
});

/**
 * OAuth callback handler
 */
export const oauthCallback = asyncControllerHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  const clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  try {
    const result = await handleOAuthCallback(provider, code, state, null);

    // Create secure session
    const sessionToken = await createSecureSession(result.user.id, clientInfo);

    // Generate tokens
    const userPayload = sanitizeUserForToken(result.user);
    const accessToken = generateAccessToken(userPayload);
    const refreshTokenValue = generateRefreshToken({ userId: result.user.id });

    // Log OAuth login
    await logSecurityEvent('oauth_login', result.user.id, {
      provider,
      sessionToken,
      isNewUser: result.isNewUser,
      ...clientInfo,
    });

    logger.info(`OAuth login successful: ${result.user.email} via ${provider}`);

    res.json({
      success: true,
      message: result.isNewUser ? 'Account created and logged in successfully' : 'Login successful',
      data: {
        user: result.user,
        accessToken,
        refreshToken: refreshTokenValue,
        sessionToken,
        isNewUser: result.isNewUser,
      },
    });
  } catch (error) {
    await logSecurityEvent('failed_oauth_login', null, {
      provider,
      error: error.message,
      ...clientInfo,
    });
    throw error;
  }
});

/**
 * Setup MFA
 */
export const setupMFAController = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;

  const mfaSetup = await generateMFASecret(userId);

  await logSecurityEvent('mfa_setup_initiated', userId, {
    ipAddress: req.ip || req.connection.remoteAddress,
  });

  res.json({
    success: true,
    message: 'MFA setup initiated',
    data: {
      qrCode: mfaSetup.qrCode,
      secret: mfaSetup.secret,
      backupCodes: mfaSetup.backupCodes,
    },
  });
});

/**
 * Verify and enable MFA
 */
export const verifyMFAController = asyncControllerHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  const isValid = await verifyMFAToken(userId, token);

  if (!isValid) {
    throw new UnauthorizedError('Invalid MFA token');
  }

  await logSecurityEvent('mfa_enabled', userId, {
    ipAddress: req.ip || req.connection.remoteAddress,
  });

  res.json({
    success: true,
    message: 'MFA enabled successfully',
  });
});

/**
 * Disable MFA
 */
export const disableMFA = asyncControllerHandler(async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  // Get user to verify password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid password');
  }

  // Disable MFA
  await prisma.userMFA.update({
    where: { userId },
    data: {
      enabled: false,
      secret: null,
      backupCodes: [],
    },
  });

  await logSecurityEvent('mfa_disabled', userId, {
    ipAddress: req.ip || req.connection.remoteAddress,
  });

  logger.info(`MFA disabled for user: ${user.email}`);

  res.json({
    success: true,
    message: 'MFA disabled successfully',
  });
});

/**
 * Verify session token
 */
export const verifySession = asyncControllerHandler(async (req, res) => {
  const { sessionToken } = req.body;

  const sessionData = await validateSession(sessionToken, sessionToken);

  if (!sessionData) {
    throw new UnauthorizedError('Invalid or expired session');
  }

  res.json({
    success: true,
    data: {
      session: sessionData,
      valid: true,
    },
  });
});