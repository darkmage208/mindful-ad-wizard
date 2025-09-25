import { getDashboardMetrics } from '../services/metricsService.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';
import { BadRequestError, ForbiddenError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';

/**
 * Get comprehensive dashboard metrics
 */
export const getDashboardData = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    timeframe = '30d',
    include_system = 'false',
    refresh_cache = 'false'
  } = req.query;

  // Validate timeframe
  if (!['7d', '30d', '90d'].includes(timeframe)) {
    throw new BadRequestError('Invalid timeframe. Must be 7d, 30d, or 90d');
  }

  // Only admins can view system-wide metrics
  const includeSystemMetrics = include_system === 'true' && userRole === 'ADMIN';
  if (include_system === 'true' && userRole !== 'ADMIN') {
    throw new ForbiddenError('Admin access required for system-wide metrics');
  }

  // Generate cache key for user/system metrics
  const cacheKey = `dashboard_${includeSystemMetrics ? 'system' : userId}_${timeframe}`;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Check for cached data (unless refresh requested)
  if (refresh_cache !== 'true') {
    // In a production system, you'd use Redis here
    // For now, we'll just generate fresh data each time
  }

  const dashboardData = await getDashboardMetrics(
    includeSystemMetrics ? null : userId,
    timeframe,
    includeSystemMetrics
  );

  // Add user context
  dashboardData.user_info = {
    user_id: userId,
    role: userRole,
    viewing_scope: includeSystemMetrics ? 'system_wide' : 'user_specific',
    permissions: {
      can_view_system_metrics: userRole === 'ADMIN',
      can_manage_campaigns: ['ADMIN', 'CLIENT'].includes(userRole),
      can_export_data: true
    }
  };

  // Add refresh info
  dashboardData.cache_info = {
    generated_fresh: true,
    expires_at: new Date(Date.now() + cacheExpiry),
    refresh_available: true
  };

  logger.info(`Dashboard metrics served: ${includeSystemMetrics ? 'system' : 'user'} view for ${userId}`);

  res.json({
    success: true,
    data: {
      dashboard: dashboardData
    }
  });
});

/**
 * Get specific metric category data
 */
export const getCategoryMetrics = asyncControllerHandler(async (req, res) => {
  const { category } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { timeframe = '30d', detailed = 'false' } = req.query;

  const validCategories = ['campaigns', 'leads', 'landing_pages', 'chat', 'creatives', 'approvals'];
  if (!validCategories.includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  // Get full dashboard data and extract the requested category
  const isAdmin = userRole === 'ADMIN';
  const dashboardData = await getDashboardMetrics(isAdmin ? null : userId, timeframe, isAdmin);

  let categoryData = dashboardData[category === 'chat' ? 'chat_system' : category];

  // Add detailed information if requested
  if (detailed === 'true') {
    categoryData = await addDetailedCategoryData(category, userId, timeframe, isAdmin);
  }

  res.json({
    success: true,
    data: {
      category,
      timeframe,
      metrics: categoryData,
      last_updated: new Date()
    }
  });
});

/**
 * Get real-time metrics (recent activity)
 */
export const getRealTimeMetrics = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const isAdmin = userRole === 'ADMIN';

  // Get activity from the last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    recentLeads,
    activeChatSessions,
    recentCampaignActivity,
    pendingApprovals,
    systemAlerts
  ] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...(!isAdmin && { userId }),
        createdAt: { gte: last24h }
      },
      select: {
        id: true,
        name: true,
        email: true,
        source: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.chatSession.count({
      where: {
        ...(!isAdmin && { userId }),
        status: 'ACTIVE'
      }
    }),
    prisma.campaign.findMany({
      where: {
        ...(!isAdmin && { userId }),
        updatedAt: { gte: last24h }
      },
      select: {
        id: true,
        name: true,
        status: true,
        platform: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.campaignApproval.count({
      where: {
        ...(!isAdmin && { userId }),
        status: 'PENDING_REVIEW'
      }
    }),
    // System alerts for admins
    isAdmin ? getSystemAlerts() : []
  ]);

  const realTimeData = {
    timestamp: new Date(),
    recent_leads: recentLeads.map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      source: lead.source,
      status: lead.status,
      time_ago: getTimeAgo(lead.createdAt)
    })),
    active_chat_sessions: activeChatSessions,
    recent_campaign_activity: recentCampaignActivity.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      platform: campaign.platform,
      time_ago: getTimeAgo(campaign.updatedAt)
    })),
    pending_approvals: pendingApprovals,
    ...(isAdmin && { system_alerts: systemAlerts })
  };

  res.json({
    success: true,
    data: {
      real_time: realTimeData
    }
  });
});

/**
 * Export metrics data
 */
export const exportMetrics = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    timeframe = '30d',
    format = 'json',
    categories = 'all',
    include_system = 'false'
  } = req.query;

  // Validate format
  if (!['json', 'csv'].includes(format)) {
    throw new BadRequestError('Invalid format. Must be json or csv');
  }

  const includeSystemMetrics = include_system === 'true' && userRole === 'ADMIN';
  if (include_system === 'true' && userRole !== 'ADMIN') {
    throw new ForbiddenError('Admin access required for system-wide export');
  }

  const dashboardData = await getDashboardMetrics(
    includeSystemMetrics ? null : userId,
    timeframe,
    includeSystemMetrics
  );

  // Filter categories if specified
  let exportData = dashboardData;
  if (categories !== 'all') {
    const requestedCategories = categories.split(',');
    exportData = {};
    requestedCategories.forEach(cat => {
      if (dashboardData[cat]) {
        exportData[cat] = dashboardData[cat];
      }
    });
  }

  // Add export metadata
  exportData.export_info = {
    exported_by: userId,
    export_date: new Date(),
    timeframe,
    format,
    scope: includeSystemMetrics ? 'system_wide' : 'user_specific'
  };

  if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(exportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="metrics_${timeframe}_${Date.now()}.csv"`);
    res.send(csvData);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="metrics_${timeframe}_${Date.now()}.json"`);
    res.json({
      success: true,
      data: exportData
    });
  }

  logger.info(`Metrics exported: ${format} format, ${timeframe} timeframe by ${userId}`);
});

/**
 * Get performance comparison data
 */
export const getPerformanceComparison = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    current_period = '30d',
    comparison_period = '30d',
    offset_days = '30'
  } = req.query;

  const isAdmin = userRole === 'ADMIN';

  // Get current period data
  const currentData = await getDashboardMetrics(
    isAdmin ? null : userId,
    current_period,
    isAdmin
  );

  // Get comparison period data (offset by specified days)
  const offsetStart = new Date();
  offsetStart.setDate(offsetStart.getDate() - parseInt(offset_days));

  // For comparison, we need to modify the date ranges
  // This is a simplified version - in production you'd want more sophisticated date handling
  const comparisonData = await getDashboardMetrics(
    isAdmin ? null : userId,
    comparison_period,
    isAdmin
  );

  // Calculate percentage changes
  const comparison = calculatePerformanceChanges(currentData.overview, comparisonData.overview);

  res.json({
    success: true,
    data: {
      current_period: {
        timeframe: current_period,
        metrics: currentData.overview
      },
      comparison_period: {
        timeframe: comparison_period,
        offset_days: parseInt(offset_days),
        metrics: comparisonData.overview
      },
      changes: comparison,
      generated_at: new Date()
    }
  });
});

/**
 * Helper functions
 */

const addDetailedCategoryData = async (category, userId, timeframe, isAdmin) => {
  // This would add more detailed breakdowns for each category
  // Implementation depends on specific requirements
  return {};
};

const getSystemAlerts = async () => {
  // Check for system-wide issues that admins should be aware of
  const alerts = [];

  try {
    // Check for high error rates, failed integrations, etc.
    const recentErrors = await prisma.systemLog.count({
      where: {
        level: 'ERROR',
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      }
    });

    if (recentErrors > 10) {
      alerts.push({
        type: 'error',
        message: `High error rate: ${recentErrors} errors in the last hour`,
        action: 'Check system logs'
      });
    }

    // Check for pending approvals
    const pendingCount = await prisma.campaignApproval.count({
      where: { status: 'PENDING_REVIEW' }
    });

    if (pendingCount > 5) {
      alerts.push({
        type: 'warning',
        message: `${pendingCount} campaigns pending approval`,
        action: 'Review pending approvals'
      });
    }

  } catch (error) {
    logger.error('Failed to get system alerts:', error);
  }

  return alerts;
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const calculatePerformanceChanges = (current, previous) => {
  const changes = {};

  Object.keys(current).forEach(key => {
    const currentValue = parseFloat(current[key]) || 0;
    const previousValue = parseFloat(previous[key]) || 0;

    if (previousValue === 0) {
      changes[key] = currentValue > 0 ? 100 : 0;
    } else {
      changes[key] = ((currentValue - previousValue) / previousValue * 100).toFixed(2);
    }
  });

  return changes;
};

const convertToCSV = (data) => {
  // Simple CSV conversion - in production you'd want a more robust solution
  let csv = 'Category,Metric,Value\n';

  Object.keys(data).forEach(category => {
    if (typeof data[category] === 'object' && data[category] !== null) {
      Object.keys(data[category]).forEach(metric => {
        const value = data[category][metric];
        csv += `${category},${metric},${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
      });
    }
  });

  return csv;
};