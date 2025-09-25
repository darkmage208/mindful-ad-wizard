import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';
import {
  submitCampaignForApproval,
  approveCampaignEndpoint,
  rejectCampaignEndpoint,
  getPendingApprovals,
  getCampaignApprovalHistory,
  getApprovalStatistics,
  bulkApproveCampaigns
} from '../controllers/approvalController.js';

const router = express.Router();

// Validation schemas
const approvalSchemas = {
  approve: z.object({
    body: z.object({
      notes: z.string().optional(),
      useLeadGen: z.boolean().optional(),
      usePsychologyTargeting: z.boolean().optional(),
      platformSpecificSettings: z.object({
        meta: z.object({
          specialAdCategories: z.array(z.string()).optional(),
          optimizationGoal: z.string().optional()
        }).optional(),
        google: z.object({
          biddingStrategy: z.string().optional(),
          targetCpa: z.number().optional()
        }).optional()
      }).optional()
    })
  }),
  reject: z.object({
    body: z.object({
      feedback: z.string().min(10, 'Feedback must be at least 10 characters'),
      reasons: z.array(z.string()).default([]),
      needsChanges: z.boolean().default(true),
      suggestedChanges: z.array(z.string()).optional()
    })
  }),
  bulkApprove: z.object({
    body: z.object({
      campaignIds: z.array(z.string()).min(1).max(10),
      approvalData: z.object({
        notes: z.string().optional(),
        useLeadGen: z.boolean().optional(),
        usePsychologyTargeting: z.boolean().optional()
      }).optional()
    })
  })
};

// All routes require authentication
router.use(authenticate);

// Campaign approval submission (Client)
router.post('/campaigns/:campaignId/submit', asyncHandler(submitCampaignForApproval));

// Get campaign approval history
router.get('/campaigns/:campaignId/history', asyncHandler(getCampaignApprovalHistory));

// Admin routes for managing approvals
router.get('/pending', asyncHandler(getPendingApprovals));

router.post('/campaigns/:campaignId/approve',
  validate(approvalSchemas.approve),
  asyncHandler(approveCampaignEndpoint)
);

router.post('/campaigns/:campaignId/reject',
  validate(approvalSchemas.reject),
  asyncHandler(rejectCampaignEndpoint)
);

// Bulk operations (Super Admin only)
router.post('/bulk/approve',
  validate(approvalSchemas.bulkApprove),
  asyncHandler(bulkApproveCampaigns)
);

// Statistics and reporting
router.get('/statistics', asyncHandler(getApprovalStatistics));

export default router;