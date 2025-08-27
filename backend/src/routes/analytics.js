import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  getDashboardAnalytics,
  getCampaignAnalytics,
  getLeadAnalytics,
  getPerformanceMetrics,
} from '../controllers/analyticsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', asyncHandler(getDashboardAnalytics));
router.get('/campaigns', asyncHandler(getCampaignAnalytics));
router.get('/leads', asyncHandler(getLeadAnalytics));
router.get('/performance', asyncHandler(getPerformanceMetrics));

export default router;