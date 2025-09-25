import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  oauthLogin,
  oauthCallback,
  setupMFAController,
  verifyMFAController,
  disableMFA,
  verifySession
} from '../controllers/authController.js';

const router = express.Router();

// OAuth routes (no auth required for initiation and callback)
router.get('/oauth/:provider', asyncHandler(oauthLogin));
router.get('/oauth/:provider/callback', asyncHandler(oauthCallback));

// Session verification (no auth required as it's verifying the session)
router.post('/verify-session', asyncHandler(verifySession));

// MFA routes (require authentication)
router.use('/mfa', authenticate);
router.post('/mfa/setup', asyncHandler(setupMFAController));
router.post('/mfa/verify', asyncHandler(verifyMFAController));
router.post('/mfa/disable', asyncHandler(disableMFA));

export default router;