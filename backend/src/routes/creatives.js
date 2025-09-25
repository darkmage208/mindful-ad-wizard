import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { z } from 'zod';
import {
  generateCreatives,
  getCampaignCreatives,
  getCreativeById,
  updateCreative,
  deleteCreative,
  updateCreativeMetricsEndpoint,
  getCreativeAnalytics,
  testCreatives,
  duplicateCreative,
  toggleCreativeStatus,
} from '../controllers/creativeController.js';

const router = express.Router();

// Validation schemas
const creativeSchemas = {
  generate: z.object({
    body: z.object({
      includeImages: z.boolean().optional(),
      creativesCount: z.number().min(1).max(5).optional(),
      imageStyle: z.string().optional(),
      includeVideo: z.boolean().optional(),
    }),
  }),
  update: z.object({
    body: z.object({
      headline: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(300).optional(),
      cta: z.string().min(1).max(50).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  metrics: z.object({
    body: z.object({
      impressions: z.number().min(0).optional(),
      clicks: z.number().min(0).optional(),
      conversions: z.number().min(0).optional(),
    }),
  }),
  duplicate: z.object({
    body: z.object({
      variations: z.number().min(1).max(5).optional(),
    }),
  }),
};

// All routes require authentication
router.use(authenticate);

// Campaign creatives routes
router.post('/campaign/:campaignId/generate',
  validate(creativeSchemas.generate),
  asyncHandler(generateCreatives)
);

router.get('/campaign/:campaignId',
  asyncHandler(getCampaignCreatives)
);

// Individual creative routes
router.get('/:id', asyncHandler(getCreativeById));

router.put('/:id',
  validate(creativeSchemas.update),
  asyncHandler(updateCreative)
);

router.delete('/:id', asyncHandler(deleteCreative));

// Creative analytics
router.get('/:id/analytics', asyncHandler(getCreativeAnalytics));

router.put('/:id/metrics',
  validate(creativeSchemas.metrics),
  asyncHandler(updateCreativeMetricsEndpoint)
);

// Creative management
router.post('/:id/duplicate',
  validate(creativeSchemas.duplicate),
  asyncHandler(duplicateCreative)
);

router.post('/:id/toggle-status', asyncHandler(toggleCreativeStatus));

// Admin/testing routes
router.get('/admin/test', asyncHandler(testCreatives));

export default router;