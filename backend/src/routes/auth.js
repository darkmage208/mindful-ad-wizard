import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, authSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
  getProfile,
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', validate(authSchemas.register), asyncHandler(register));
router.post('/login', validate(authSchemas.login), asyncHandler(login));
router.post('/forgot-password', validate(authSchemas.forgotPassword), asyncHandler(forgotPassword));
router.post('/reset-password', validate(authSchemas.resetPassword), asyncHandler(resetPassword));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', asyncHandler(resendVerification));
router.post('/refresh-token', asyncHandler(refreshToken));

// Protected routes
router.use(authenticate);
router.post('/logout', asyncHandler(logout));
router.get('/me', asyncHandler(getProfile));
router.post('/change-password', validate(authSchemas.changePassword), asyncHandler(changePassword));

export default router;