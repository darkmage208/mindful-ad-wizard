import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, landingPageSchemas } from '../middleware/validation.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import {
  createLandingPage,
  getLandingPages,
  getLandingPageById,
  updateLandingPage,
  deleteLandingPage,
  generateLandingPageWithAI,
  generateLandingPageFromCampaignEndpoint,
  getPublicLandingPage,
} from '../controllers/landingPageController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public/:slug', asyncHandler(getPublicLandingPage));

// Protected routes (require authentication)
router.use(authenticate);

router.post('/', validate(landingPageSchemas.create), asyncHandler(createLandingPage));
router.post('/generate-ai', validate(landingPageSchemas.generateAI), asyncHandler(generateLandingPageWithAI));
router.post('/generate-from-campaign/:campaignId', asyncHandler(generateLandingPageFromCampaignEndpoint));
router.get('/', asyncHandler(getLandingPages));
router.get('/:id', requireOwnership('landingPage'), asyncHandler(getLandingPageById));
router.put('/:id', validate(landingPageSchemas.update), requireOwnership('landingPage'), asyncHandler(updateLandingPage));
router.delete('/:id', requireOwnership('landingPage'), asyncHandler(deleteLandingPage));

export default router;