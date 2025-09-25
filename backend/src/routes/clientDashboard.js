import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  getDashboard,
  getCampaignManagement,
  getLeadManagement,
  updateWidgetConfig,
  updatePreferences,
  getQuickActions,
  executeQuickAction,
  getActivityFeed
} from '../controllers/clientDashboardController.js';

const router = express.Router();

// All client dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/client-dashboard
 * Get comprehensive client dashboard with all widgets and metrics
 *
 * Query parameters:
 * - timeframe: '7d', '30d', '90d' (default: '30d')
 * - refresh: 'true'/'false' to bypass cache (default: 'false')
 */
router.get('/', asyncHandler(getDashboard));

/**
 * GET /api/client-dashboard/campaigns
 * Get campaign management view with filtering and pagination
 *
 * Query parameters:
 * - status: Campaign status filter
 * - platform: 'META', 'GOOGLE', 'BOTH'
 * - sort_by: Field to sort by (default: 'updatedAt')
 * - sort_order: 'asc' or 'desc' (default: 'desc')
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
router.get('/campaigns', asyncHandler(getCampaignManagement));

/**
 * GET /api/client-dashboard/leads
 * Get lead management view with filtering and AI suggestions
 *
 * Query parameters:
 * - status: Lead status filter
 * - source: Lead source filter
 * - date_range: '7d', '30d', '90d', 'all' (default: '30d')
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
router.get('/leads', asyncHandler(getLeadManagement));

/**
 * GET /api/client-dashboard/quick-actions
 * Get available quick actions based on current user data
 */
router.get('/quick-actions', asyncHandler(getQuickActions));

/**
 * POST /api/client-dashboard/quick-actions/execute
 * Execute a quick action with parameters
 *
 * Request body:
 * {
 *   "action_id": "mark_leads_contacted",
 *   "parameters": {
 *     "lead_ids": ["id1", "id2"]
 *   }
 * }
 */
router.post('/quick-actions/execute', asyncHandler(executeQuickAction));

/**
 * GET /api/client-dashboard/activity
 * Get recent activity feed
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - type: Filter by activity type ('leads', 'campaigns', 'chats')
 */
router.get('/activity', asyncHandler(getActivityFeed));

/**
 * PUT /api/client-dashboard/widgets/:widget_id
 * Update dashboard widget configuration
 *
 * Request body:
 * {
 *   "config": {
 *     "timeframe": "30d",
 *     "metrics": ["total_leads", "conversion_rate"],
 *     "visible": true
 *   }
 * }
 */
router.put('/widgets/:widget_id', (req, res, next) => {
  req.body.widget_id = req.params.widget_id;
  next();
}, asyncHandler(updateWidgetConfig));

/**
 * PUT /api/client-dashboard/preferences
 * Update user dashboard preferences
 *
 * Request body:
 * {
 *   "theme": "light",
 *   "timezone": "America/New_York",
 *   "default_timeframe": "30d",
 *   "notifications": {
 *     "email_alerts": true,
 *     "push_notifications": true,
 *     "crisis_alerts": true
 *   },
 *   "auto_refresh": true,
 *   "refresh_interval": 300000
 * }
 */
router.put('/preferences', asyncHandler(updatePreferences));

export default router;