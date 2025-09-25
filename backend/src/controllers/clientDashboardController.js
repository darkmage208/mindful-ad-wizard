import {
  getClientDashboard,
  getCampaignManagementData,
  getLeadManagementData
} from '../services/clientDashboardService.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';

/**
 * Get comprehensive client dashboard
 */
export const getDashboard = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { timeframe = '30d', refresh = 'false' } = req.query;

  // Validate timeframe
  if (!['7d', '30d', '90d'].includes(timeframe)) {
    throw new BadRequestError('Invalid timeframe. Must be 7d, 30d, or 90d');
  }

  const dashboardData = await getClientDashboard(userId, timeframe);

  // Add dashboard metadata
  dashboardData.metadata = {
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      company: req.user.company
    },
    dashboard_version: '1.0',
    last_refreshed: new Date(),
    refresh_requested: refresh === 'true'
  };

  logger.info(`Client dashboard served for user: ${userId}, timeframe: ${timeframe}`);

  res.json({
    success: true,
    data: {
      dashboard: dashboardData
    }
  });
});

/**
 * Get campaign management view
 */
export const getCampaignManagement = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const filters = {
    status: req.query.status,
    platform: req.query.platform,
    sort_by: req.query.sort_by || 'updatedAt',
    sort_order: req.query.sort_order || 'desc',
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10
  };

  // Validate sort options
  const validSortFields = ['name', 'status', 'platform', 'createdAt', 'updatedAt', 'impressions', 'clicks', 'cost'];
  if (!validSortFields.includes(filters.sort_by)) {
    throw new BadRequestError(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
  }

  if (!['asc', 'desc'].includes(filters.sort_order)) {
    throw new BadRequestError('Invalid sort order. Must be asc or desc');
  }

  const campaignData = await getCampaignManagementData(userId, filters);

  res.json({
    success: true,
    data: {
      campaign_management: campaignData
    }
  });
});

/**
 * Get lead management view
 */
export const getLeadManagement = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const filters = {
    status: req.query.status,
    source: req.query.source,
    date_range: req.query.date_range || '30d',
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20
  };

  // Validate date range
  if (!['7d', '30d', '90d', 'all'].includes(filters.date_range)) {
    throw new BadRequestError('Invalid date range. Must be 7d, 30d, 90d, or all');
  }

  const leadData = await getLeadManagementData(userId, filters);

  res.json({
    success: true,
    data: {
      lead_management: leadData
    }
  });
});

/**
 * Update dashboard widget configuration
 */
export const updateWidgetConfig = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { widget_id, config } = req.body;

  if (!widget_id) {
    throw new BadRequestError('Widget ID is required');
  }

  if (!config || typeof config !== 'object') {
    throw new BadRequestError('Valid widget configuration is required');
  }

  // In a production system, this would be stored in a user_preferences table
  // For now, we'll just validate and return the updated config
  const validWidgets = [
    'performance_overview',
    'recent_leads',
    'campaign_status',
    'chat_activity',
    'performance_trends'
  ];

  if (!validWidgets.includes(widget_id)) {
    throw new BadRequestError(`Invalid widget ID. Must be one of: ${validWidgets.join(', ')}`);
  }

  // Validate widget configuration based on widget type
  const validatedConfig = validateWidgetConfig(widget_id, config);

  logger.info(`Widget configuration updated: ${widget_id} for user ${userId}`);

  res.json({
    success: true,
    message: 'Widget configuration updated successfully',
    data: {
      widget_id,
      config: validatedConfig,
      updated_at: new Date()
    }
  });
});

/**
 * Update dashboard preferences
 */
export const updatePreferences = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const preferences = req.body;

  // Validate preferences structure
  const validPreferences = validateDashboardPreferences(preferences);

  // In a production system, this would be stored in the database
  // For now, we'll just validate and return the preferences

  logger.info(`Dashboard preferences updated for user ${userId}`);

  res.json({
    success: true,
    message: 'Dashboard preferences updated successfully',
    data: {
      preferences: validPreferences,
      updated_at: new Date()
    }
  });
});

/**
 * Get dashboard quick actions
 */
export const getQuickActions = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    draftCampaigns,
    newLeads,
    pendingApprovals,
    activeChatSessions
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId, status: 'DRAFT' } }),
    prisma.lead.count({ where: { userId, status: 'NEW' } }),
    prisma.campaignApproval.count({ where: { userId, status: 'PENDING_REVIEW' } }),
    prisma.chatSession.count({ where: { userId, status: 'ACTIVE' } })
  ]);

  const quickActions = [
    {
      id: 'create_campaign',
      title: 'Create Campaign',
      description: 'Start a new AI-powered campaign',
      icon: 'plus-circle',
      action: 'navigate',
      target: '/campaigns/create',
      primary: true
    },
    {
      id: 'review_leads',
      title: `Review Leads${newLeads > 0 ? ` (${newLeads})` : ''}`,
      description: 'Follow up with potential clients',
      icon: 'users',
      action: 'navigate',
      target: '/leads',
      badge: newLeads > 0 ? newLeads : null
    },
    {
      id: 'generate_content',
      title: 'Generate Content',
      description: 'Create landing pages and ads with AI',
      icon: 'wand',
      action: 'navigate',
      target: '/ai/generate'
    },
    {
      id: 'view_analytics',
      title: 'View Analytics',
      description: 'Analyze campaign performance',
      icon: 'bar-chart',
      action: 'navigate',
      target: '/analytics'
    }
  ];

  // Add conditional actions based on data
  if (draftCampaigns > 0) {
    quickActions.unshift({
      id: 'complete_drafts',
      title: `Complete Drafts (${draftCampaigns})`,
      description: 'Finish your draft campaigns',
      icon: 'edit',
      action: 'navigate',
      target: '/campaigns?status=draft',
      urgent: true,
      badge: draftCampaigns
    });
  }

  if (pendingApprovals > 0) {
    quickActions.splice(1, 0, {
      id: 'check_approvals',
      title: `Check Approvals (${pendingApprovals})`,
      description: 'Review campaign approval status',
      icon: 'clock',
      action: 'navigate',
      target: '/campaigns/approvals',
      badge: pendingApprovals
    });
  }

  res.json({
    success: true,
    data: {
      quick_actions: quickActions.slice(0, 6), // Limit to 6 actions
      counts: {
        draft_campaigns: draftCampaigns,
        new_leads: newLeads,
        pending_approvals: pendingApprovals,
        active_chats: activeChatSessions
      }
    }
  });
});

/**
 * Execute quick action
 */
export const executeQuickAction = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { action_id, parameters = {} } = req.body;

  if (!action_id) {
    throw new BadRequestError('Action ID is required');
  }

  let result = {};

  switch (action_id) {
    case 'mark_leads_contacted':
      if (!parameters.lead_ids || !Array.isArray(parameters.lead_ids)) {
        throw new BadRequestError('Lead IDs array is required');
      }

      await prisma.lead.updateMany({
        where: {
          id: { in: parameters.lead_ids },
          userId
        },
        data: {
          status: 'CONTACTED',
          updatedAt: new Date()
        }
      });

      result = {
        updated_leads: parameters.lead_ids.length,
        new_status: 'CONTACTED'
      };
      break;

    case 'pause_campaigns':
      if (!parameters.campaign_ids || !Array.isArray(parameters.campaign_ids)) {
        throw new BadRequestError('Campaign IDs array is required');
      }

      await prisma.campaign.updateMany({
        where: {
          id: { in: parameters.campaign_ids },
          userId
        },
        data: {
          status: 'PAUSED',
          updatedAt: new Date()
        }
      });

      result = {
        paused_campaigns: parameters.campaign_ids.length
      };
      break;

    case 'create_notification_reminder':
      const { message, due_date } = parameters;
      if (!message) {
        throw new BadRequestError('Message is required for reminder');
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM_UPDATE',
          title: 'Reminder',
          message,
          data: {
            reminder: true,
            due_date,
            created_from: 'quick_action'
          }
        }
      });

      result = {
        notification_id: notification.id,
        scheduled_for: due_date
      };
      break;

    default:
      throw new BadRequestError(`Unknown action: ${action_id}`);
  }

  logger.info(`Quick action executed: ${action_id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Quick action executed successfully',
    data: {
      action_id,
      result,
      executed_at: new Date()
    }
  });
});

/**
 * Get dashboard activity feed
 */
export const getActivityFeed = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, type } = req.query;

  const offset = (page - 1) * limit;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent activities from different sources
  const activities = [];

  // Recent leads
  const recentLeads = await prisma.lead.findMany({
    where: {
      userId,
      createdAt: { gte: last24Hours },
      ...(type === 'leads' && {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      source: true,
      createdAt: true,
      campaign: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: type === 'leads' ? limit : 10
  });

  recentLeads.forEach(lead => {
    activities.push({
      id: `lead_${lead.id}`,
      type: 'lead',
      icon: 'user-plus',
      title: 'New Lead Generated',
      description: `${lead.name} (${lead.email})`,
      timestamp: lead.createdAt,
      metadata: {
        source: lead.source,
        campaign: lead.campaign?.name,
        lead_id: lead.id
      }
    });
  });

  // Recent campaign changes
  if (!type || type === 'campaigns') {
    const recentCampaigns = await prisma.campaign.findMany({
      where: {
        userId,
        updatedAt: { gte: last24Hours }
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
    });

    recentCampaigns.forEach(campaign => {
      activities.push({
        id: `campaign_${campaign.id}`,
        type: 'campaign',
        icon: 'trending-up',
        title: 'Campaign Updated',
        description: `"${campaign.name}" status: ${campaign.status}`,
        timestamp: campaign.updatedAt,
        metadata: {
          campaign_id: campaign.id,
          platform: campaign.platform,
          status: campaign.status
        }
      });
    });
  }

  // Recent chat sessions
  if (!type || type === 'chats') {
    const recentChats = await prisma.chatSession.findMany({
      where: {
        userId,
        createdAt: { gte: last24Hours }
      },
      select: {
        id: true,
        chatType: true,
        messageCount: true,
        createdAt: true,
        metadata: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    recentChats.forEach(chat => {
      const isCrisis = chat.metadata?.crisis_detected || false;
      activities.push({
        id: `chat_${chat.id}`,
        type: 'chat',
        icon: isCrisis ? 'alert-triangle' : 'message-circle',
        title: isCrisis ? 'Crisis Support Session' : 'Chat Session Started',
        description: `${chat.chatType.replace('_', ' ').toLowerCase()} - ${chat.messageCount} messages`,
        timestamp: chat.createdAt,
        metadata: {
          session_id: chat.id,
          chat_type: chat.chatType,
          crisis: isCrisis,
          message_count: chat.messageCount
        },
        priority: isCrisis ? 'high' : 'normal'
      });
    });
  }

  // Sort all activities by timestamp and paginate
  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      activities: sortedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.length,
        has_more: offset + limit < activities.length
      },
      filter_applied: type || 'all',
      last_updated: new Date()
    }
  });
});

// Helper functions

const validateWidgetConfig = (widgetId, config) => {
  // Validate configuration based on widget type
  const validConfigs = {
    performance_overview: {
      metrics: Array.isArray(config.metrics) ? config.metrics : ['total_leads', 'conversion_rate'],
      timeframe: ['7d', '30d', '90d'].includes(config.timeframe) ? config.timeframe : '30d'
    },
    recent_leads: {
      limit: typeof config.limit === 'number' && config.limit > 0 ? config.limit : 5,
      show_follow_up: typeof config.show_follow_up === 'boolean' ? config.show_follow_up : true
    },
    campaign_status: {
      chart_type: ['donut', 'bar'].includes(config.chart_type) ? config.chart_type : 'donut',
      show_platform_breakdown: typeof config.show_platform_breakdown === 'boolean' ? config.show_platform_breakdown : true
    },
    chat_activity: {
      show_crisis_alerts: typeof config.show_crisis_alerts === 'boolean' ? config.show_crisis_alerts : true,
      timeframe: ['1h', '24h', '7d'].includes(config.timeframe) ? config.timeframe : '24h'
    },
    performance_trends: {
      chart_type: ['line', 'area'].includes(config.chart_type) ? config.chart_type : 'line',
      metrics: Array.isArray(config.metrics) ? config.metrics : ['impressions', 'clicks'],
      timeframe: ['7d', '30d', '90d'].includes(config.timeframe) ? config.timeframe : '30d'
    }
  };

  return validConfigs[widgetId] || config;
};

const validateDashboardPreferences = (preferences) => {
  return {
    theme: ['light', 'dark'].includes(preferences.theme) ? preferences.theme : 'light',
    timezone: typeof preferences.timezone === 'string' ? preferences.timezone : 'America/New_York',
    default_timeframe: ['7d', '30d', '90d'].includes(preferences.default_timeframe) ? preferences.default_timeframe : '30d',
    notifications: {
      email_alerts: typeof preferences.notifications?.email_alerts === 'boolean' ? preferences.notifications.email_alerts : true,
      push_notifications: typeof preferences.notifications?.push_notifications === 'boolean' ? preferences.notifications.push_notifications : true,
      crisis_alerts: typeof preferences.notifications?.crisis_alerts === 'boolean' ? preferences.notifications.crisis_alerts : true,
      performance_alerts: typeof preferences.notifications?.performance_alerts === 'boolean' ? preferences.notifications.performance_alerts : true
    },
    dashboard_layout: ['grid', 'list'].includes(preferences.dashboard_layout) ? preferences.dashboard_layout : 'grid',
    auto_refresh: typeof preferences.auto_refresh === 'boolean' ? preferences.auto_refresh : true,
    refresh_interval: typeof preferences.refresh_interval === 'number' && preferences.refresh_interval >= 60000 ? preferences.refresh_interval : 300000
  };
};