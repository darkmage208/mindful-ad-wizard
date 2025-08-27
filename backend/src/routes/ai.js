import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, aiSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  chat,
  generateContent,
  analyzeCampaign,
} from '../controllers/aiController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/chat', validate(aiSchemas.chat), asyncHandler(chat));
router.post('/generate-content', validate(aiSchemas.generateContent), asyncHandler(generateContent));
router.post('/analyze/:campaignId', asyncHandler(analyzeCampaign));

export default router;