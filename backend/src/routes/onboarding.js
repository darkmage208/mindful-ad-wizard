import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, onboardingSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  submitOnboarding,
  getOnboardingData,
  updateOnboardingData,
} from '../controllers/onboardingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(onboardingSchemas.submit), asyncHandler(submitOnboarding));
router.get('/', asyncHandler(getOnboardingData));
router.put('/', validate(onboardingSchemas.submit), asyncHandler(updateOnboardingData));

export default router;