import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, campaignSchemas } from '../middleware/validation.js';
import { authenticate, requireOwnership, legacyRequireOwnership } from '../middleware/auth.js';
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
router.get('/:id', requireOwnership('campaign'), asyncHandler(getCampaignById));
router.put('/:id', validate(campaignSchemas.update), requireOwnership('campaign'), asyncHandler(updateCampaign));
router.delete('/:id', requireOwnership('campaign'), asyncHandler(deleteCampaign));

// Campaign actions
router.post('/:id/generate-creatives', requireOwnership('campaign'), asyncHandler(generateCreatives));
router.post('/:id/approve', requireOwnership('campaign'), asyncHandler(approveCampaign));
router.post('/:id/pause', requireOwnership('campaign'), asyncHandler(pauseCampaign));
router.post('/:id/activate', requireOwnership('campaign'), asyncHandler(activateCampaign));

// Campaign analytics
router.get('/:id/metrics', requireOwnership('campaign'), asyncHandler(getCampaignMetrics));
router.get('/:id/leads', requireOwnership('campaign'), asyncHandler(getCampaignLeads));

export default router;