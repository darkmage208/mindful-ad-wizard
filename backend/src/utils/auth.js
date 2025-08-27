import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { logger } from './logger.js';

const { hash, compare } = bcryptjs;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.error('JWT secrets are not configured');
  logger.error('JWT_SECRET exists:', !!JWT_SECRET);
  logger.error('JWT_REFRESH_SECRET exists:', !!JWT_REFRESH_SECRET);
  logger.error('Process env keys:', Object.keys(process.env).filter(k => k.includes('JWT')));
  process.exit(1);
}

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    return await hash(password, saltRounds);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * Verify a password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} Password match result
 */
export const verifyPassword = async (password, hashedPassword) => {
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error verifying password:', error);
    throw new Error('Password verification failed');
  }
};

/**
 * Generate JWT access token
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'mindful-ad-wizard',
      audience: 'mindful-ad-wizard-users',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Token generation failed');
  }
};

/**
 * Generate JWT refresh token
 * @param {object} payload - Token payload
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'mindful-ad-wizard',
      audience: 'mindful-ad-wizard-users',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'mindful-ad-wizard',
      audience: 'mindful-ad-wizard-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    logger.error('Error verifying access token:', error);
    throw new Error('Token verification failed');
  }
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mindful-ad-wizard',
      audience: 'mindful-ad-wizard-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    logger.error('Error verifying refresh token:', error);
    throw new Error('Refresh token verification failed');
  }
};

/**
 * Generate random token
 * @param {number} bytes - Number of bytes for token
 * @returns {string} Random token
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate email verification token
 * @returns {string} Verification token
 */
export const generateVerificationToken = () => {
  return generateRandomToken(32);
};

/**
 * Generate password reset token
 * @returns {object} Reset token and expiry
 */
export const generateResetToken = () => {
  const token = generateRandomToken(32);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return { token, expires };
};

/**
 * Sanitize user data for JWT payload
 * @param {object} user - User object
 * @returns {object} Sanitized user data
 */
export const sanitizeUserForToken = (user) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};