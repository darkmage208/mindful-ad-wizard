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
} from '../controllers/landingPageController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(landingPageSchemas.create), asyncHandler(createLandingPage));
router.get('/', asyncHandler(getLandingPages));
router.get('/:id', requireOwnership(), asyncHandler(getLandingPageById));
router.put('/:id', requireOwnership(), asyncHandler(updateLandingPage));
router.delete('/:id', requireOwnership(), asyncHandler(deleteLandingPage));

export default router;