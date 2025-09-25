import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  getDashboardData,
  getCategoryMetrics,
  getRealTimeMetrics,
  exportMetrics,
  getPerformanceComparison
} from '../controllers/metricsController.js';

const router = express.Router();

// All metrics routes require authentication
router.use(authenticate);

/**
 * GET /api/metrics/dashboard
 * Get comprehensive dashboard metrics
 *
 * Query parameters:
 * - timeframe: '7d', '30d', '90d' (default: '30d')
 * - include_system: 'true'/'false' (admin only, default: 'false')
 * - refresh_cache: 'true'/'false' (default: 'false')
 */
router.get('/dashboard', asyncHandler(getDashboardData));

/**
 * GET /api/metrics/category/:category
 * Get specific metric category data
 *
 * Categories: campaigns, leads, landing_pages, chat, creatives, approvals
 * Query parameters:
 * - timeframe: '7d', '30d', '90d' (default: '30d')
 * - detailed: 'true'/'false' (default: 'false')
 */
router.get('/category/:category', asyncHandler(getCategoryMetrics));

/**
 * GET /api/metrics/realtime
 * Get real-time metrics and recent activity
 *
 * Returns:
 * - Recent leads (last 24h)
 * - Active chat sessions
 * - Recent campaign activity
 * - Pending approvals
 * - System alerts (admin only)
 */
router.get('/realtime', asyncHandler(getRealTimeMetrics));

/**
 * GET /api/metrics/comparison
 * Get performance comparison between time periods
 *
 * Query parameters:
 * - current_period: '7d', '30d', '90d' (default: '30d')
 * - comparison_period: '7d', '30d', '90d' (default: '30d')
 * - offset_days: number of days to offset comparison (default: '30')
 */
router.get('/comparison', asyncHandler(getPerformanceComparison));

/**
 * GET /api/metrics/export
 * Export metrics data
 *
 * Query parameters:
 * - timeframe: '7d', '30d', '90d' (default: '30d')
 * - format: 'json', 'csv' (default: 'json')
 * - categories: comma-separated list or 'all' (default: 'all')
 * - include_system: 'true'/'false' (admin only, default: 'false')
 *
 * Returns file download
 */
router.get('/export', asyncHandler(exportMetrics));

export default router;