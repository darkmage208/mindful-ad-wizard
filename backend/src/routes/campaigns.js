import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, campaignSchemas } from '../middleware/validation.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  generateCreatives,
  approveCampaign,
  pauseCampaign,
  activateCampaign,
  getCampaignMetrics,
  getCampaignLeads,
} from '../controllers/campaignController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Campaign CRUD operations
router.post('/', validate(campaignSchemas.create), asyncHandler(createCampaign));
router.get('/', validate(campaignSchemas.list), asyncHandler(getCampaigns));
router.get('/:id', requireOwnership(), asyncHandler(getCampaignById));
router.put('/:id', requireOwnership(), asyncHandler(updateCampaign));
router.delete('/:id', requireOwnership(), asyncHandler(deleteCampaign));

// Campaign actions
router.post('/:id/generate-creatives', requireOwnership(), asyncHandler(generateCreatives));
router.post('/:id/approve', requireOwnership(), asyncHandler(approveCampaign));
router.post('/:id/pause', requireOwnership(), asyncHandler(pauseCampaign));
router.post('/:id/activate', requireOwnership(), asyncHandler(activateCampaign));

// Campaign analytics
router.get('/:id/metrics', requireOwnership(), asyncHandler(getCampaignMetrics));
router.get('/:id/leads', requireOwnership(), asyncHandler(getCampaignLeads));

export default router;