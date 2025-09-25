import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { getDashboardMetrics } from './metricsService.js';

/**
 * Client Dashboard Service
 * Provides comprehensive dashboard functionality for therapy practice owners
 */

/**
 * Get complete client dashboard data
 */
export const getClientDashboard = async (userId, timeframe = '30d') => {
  try {
    logger.info(`Generating client dashboard for user: ${userId}`);

    // Get comprehensive metrics
    const metricsData = await getDashboardMetrics(userId, timeframe, false);

    // Get additional dashboard-specific data
    const [
      quickActions,
      recentActivity,
      upcomingTasks,
      systemNotifications,
      performanceAlerts
    ] = await Promise.all([
      getQuickActions(userId),
      getRecentActivity(userId),
      getUpcomingTasks(userId),
      getSystemNotifications(userId),
      getPerformanceAlerts(userId, metricsData)
    ]);

    const dashboardData = {
      user_id: userId,
      timeframe,
      generated_at: new Date(),

      // Core metrics overview
      overview: metricsData.overview,

      // Quick action items
      quick_actions: quickActions,

      // Recent activity feed
      recent_activity: recentActivity,

      // Upcoming tasks and reminders
      upcoming_tasks: upcomingTasks,

      // System notifications
      notifications: systemNotifications,

      // Performance alerts and insights
      alerts: performanceAlerts,

      // Detailed metrics sections
      metrics: {
        campaigns: metricsData.campaigns,
        leads: metricsData.leads,
        landing_pages: metricsData.landing_pages,
        chat_system: metricsData.chat_system,
        insights: metricsData.insights,
        trends: metricsData.trends
      },

      // Dashboard widgets configuration
      widgets: await getDashboardWidgets(userId),

      // User preferences and settings
      preferences: await getUserDashboardPreferences(userId)
    };

    return dashboardData;

  } catch (error) {
    logger.error('Failed to generate client dashboard:', error);
    throw error;
  }
};

/**
 * Get campaign management data
 */
export const getCampaignManagementData = async (userId, filters = {}) => {
  try {
    const {
      status,
      platform,
      sort_by = 'updatedAt',
      sort_order = 'desc',
      page = 1,
      limit = 10
    } = filters;

    const whereClause = {
      userId,
      ...(status && { status }),
      ...(platform && { platform })
    };

    const offset = (page - 1) * limit;

    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          creatives: {
            select: {
              id: true,
              type: true,
              headline: true,
              isActive: true,
              impressions: true,
              clicks: true,
              conversions: true
            }
          },
          campaignLeads: {
            select: {
              id: true,
              status: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          approvals: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewedAt: true
            },
            orderBy: { submittedAt: 'desc' },
            take: 1
          }
        },
        orderBy: { [sort_by]: sort_order },
        skip: offset,
        take: limit
      }),
      prisma.campaign.count({ where: whereClause })
    ]);

    // Enhance campaigns with calculated metrics
    const enhancedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      metrics: {
        ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100).toFixed(2) : 0,
        conversion_rate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks * 100).toFixed(2) : 0,
        cost_per_click: campaign.clicks > 0 ? (campaign.cost / campaign.clicks).toFixed(2) : 0,
        cost_per_lead: campaign.leads > 0 ? (campaign.cost / campaign.leads).toFixed(2) : 0,
        roas: campaign.cost > 0 ? (campaign.conversions * 150 / campaign.cost).toFixed(2) : 0 // Assume $150 avg value
      },
      recent_leads: campaign.campaignLeads,
      creative_count: campaign.creatives.length,
      active_creatives: campaign.creatives.filter(c => c.isActive).length,
      approval_status: campaign.approvals[0]?.status || 'DRAFT'
    }));

    // Get campaign management actions
    const availableActions = await getCampaignActions(userId);

    return {
      campaigns: enhancedCampaigns,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        has_next: page * limit < totalCount,
        has_prev: page > 1
      },
      filters_applied: filters,
      available_actions: availableActions,
      summary: {
        total_campaigns: totalCount,
        active_campaigns: enhancedCampaigns.filter(c => c.status === 'ACTIVE').length,
        pending_approval: enhancedCampaigns.filter(c => c.approval_status === 'PENDING_REVIEW').length,
        draft_campaigns: enhancedCampaigns.filter(c => c.status === 'DRAFT').length
      }
    };

  } catch (error) {
    logger.error('Failed to get campaign management data:', error);
    throw error;
  }
};

/**
 * Get lead management dashboard
 */
export const getLeadManagementData = async (userId, filters = {}) => {
  try {
    const {
      status,
      source,
      date_range = '30d',
      page = 1,
      limit = 20
    } = filters;

    const dateFilter = getDateRangeFilter(date_range);
    const whereClause = {
      userId,
      ...(status && { status }),
      ...(source && { source }),
      ...(dateFilter && { createdAt: dateFilter })
    };

    const offset = (page - 1) * limit;

    const [leads, totalCount, leadStats] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              platform: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.lead.count({ where: whereClause }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { userId, ...dateFilter && { createdAt: dateFilter } },
        _count: true,
        _avg: { value: true }
      })
    ]);

    // Enhance leads with additional data
    const enhancedLeads = leads.map(lead => ({
      ...lead,
      time_since_created: getTimeSinceCreated(lead.createdAt),
      follow_up_needed: determineFollowUpStatus(lead),
      lead_score: calculateLeadScore(lead),
      next_action: suggestNextAction(lead)
    }));

    // Get suggested follow-up messages for each lead
    const leadActions = await getLeadActions(enhancedLeads);

    return {
      leads: enhancedLeads,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      lead_statistics: {
        by_status: leadStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat._count,
            avg_value: stat._avg.value || 0
          };
          return acc;
        }, {}),
        conversion_funnel: await getLeadConversionFunnel(userId, dateFilter)
      },
      suggested_actions: leadActions,
      bulk_actions: ['update_status', 'send_follow_up', 'assign_campaign', 'export_leads']
    };

  } catch (error) {
    logger.error('Failed to get lead management data:', error);
    throw error;
  }
};

/**
 * Get dashboard widgets configuration
 */
const getDashboardWidgets = async (userId) => {
  // Get user's widget preferences or default configuration
  const defaultWidgets = [
    {
      id: 'performance_overview',
      title: 'Performance Overview',
      type: 'metrics',
      size: 'large',
      position: { x: 0, y: 0 },
      visible: true,
      config: {
        metrics: ['total_leads', 'conversion_rate', 'total_spend', 'roas'],
        timeframe: '30d'
      }
    },
    {
      id: 'recent_leads',
      title: 'Recent Leads',
      type: 'list',
      size: 'medium',
      position: { x: 1, y: 0 },
      visible: true,
      config: {
        limit: 5,
        show_follow_up: true
      }
    },
    {
      id: 'campaign_status',
      title: 'Campaign Status',
      type: 'chart',
      size: 'medium',
      position: { x: 0, y: 1 },
      visible: true,
      config: {
        chart_type: 'donut',
        show_platform_breakdown: true
      }
    },
    {
      id: 'chat_activity',
      title: 'Chat Activity',
      type: 'activity',
      size: 'small',
      position: { x: 1, y: 1 },
      visible: true,
      config: {
        show_crisis_alerts: true,
        timeframe: '24h'
      }
    },
    {
      id: 'performance_trends',
      title: 'Performance Trends',
      type: 'chart',
      size: 'large',
      position: { x: 0, y: 2 },
      visible: true,
      config: {
        chart_type: 'line',
        metrics: ['impressions', 'clicks', 'leads'],
        timeframe: '30d'
      }
    }
  ];

  return defaultWidgets;
};

/**
 * Get user dashboard preferences
 */
const getUserDashboardPreferences = async (userId) => {
  // In a production system, this would be stored in the database
  return {
    theme: 'light',
    timezone: 'America/New_York',
    default_timeframe: '30d',
    notifications: {
      email_alerts: true,
      push_notifications: true,
      crisis_alerts: true,
      performance_alerts: true
    },
    dashboard_layout: 'grid',
    auto_refresh: true,
    refresh_interval: 300000 // 5 minutes
  };
};

/**
 * Get quick actions for dashboard
 */
const getQuickActions = async (userId) => {
  const [
    draftCampaigns,
    pendingApprovals,
    newLeads,
    activeChatSessions
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId, status: 'DRAFT' } }),
    prisma.campaignApproval.count({ where: { userId, status: 'PENDING_REVIEW' } }),
    prisma.lead.count({ where: { userId, status: 'NEW' } }),
    prisma.chatSession.count({ where: { userId, status: 'ACTIVE' } })
  ]);

  const actions = [];

  if (draftCampaigns > 0) {
    actions.push({
      id: 'complete_campaigns',
      title: 'Complete Draft Campaigns',
      description: `You have ${draftCampaigns} draft campaign${draftCampaigns > 1 ? 's' : ''} waiting to be completed`,
      action: 'navigate',
      target: '/campaigns?status=draft',
      priority: 'high',
      count: draftCampaigns
    });
  }

  if (pendingApprovals > 0) {
    actions.push({
      id: 'check_approvals',
      title: 'Check Campaign Approvals',
      description: `${pendingApprovals} campaign${pendingApprovals > 1 ? 's' : ''} pending approval`,
      action: 'navigate',
      target: '/campaigns/approvals',
      priority: 'medium',
      count: pendingApprovals
    });
  }

  if (newLeads > 0) {
    actions.push({
      id: 'follow_up_leads',
      title: 'Follow Up with New Leads',
      description: `${newLeads} new lead${newLeads > 1 ? 's' : ''} need${newLeads > 1 ? '' : 's'} follow-up`,
      action: 'navigate',
      target: '/leads?status=new',
      priority: 'high',
      count: newLeads
    });
  }

  actions.push({
    id: 'create_campaign',
    title: 'Create New Campaign',
    description: 'Start a new advertising campaign with AI assistance',
    action: 'navigate',
    target: '/campaigns/create',
    priority: 'low',
    icon: 'plus'
  });

  actions.push({
    id: 'generate_landing_page',
    title: 'Generate Landing Page',
    description: 'Create a new landing page with AI content generation',
    action: 'navigate',
    target: '/landing-pages/create',
    priority: 'low',
    icon: 'page'
  });

  return actions;
};

/**
 * Get recent activity feed
 */
const getRecentActivity = async (userId) => {
  const activities = [];
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent leads
  const recentLeads = await prisma.lead.findMany({
    where: {
      userId,
      createdAt: { gte: last24Hours }
    },
    select: {
      id: true,
      name: true,
      email: true,
      source: true,
      createdAt: true,
      campaign: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  recentLeads.forEach(lead => {
    activities.push({
      id: `lead_${lead.id}`,
      type: 'lead',
      title: 'New Lead Generated',
      description: `${lead.name} (${lead.email}) from ${lead.source}`,
      timestamp: lead.createdAt,
      data: {
        lead_id: lead.id,
        campaign: lead.campaign?.name
      }
    });
  });

  // Get recent campaign updates
  const recentCampaigns = await prisma.campaign.findMany({
    where: {
      userId,
      updatedAt: { gte: last24Hours }
    },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 3
  });

  recentCampaigns.forEach(campaign => {
    activities.push({
      id: `campaign_${campaign.id}`,
      type: 'campaign',
      title: 'Campaign Updated',
      description: `"${campaign.name}" status changed to ${campaign.status}`,
      timestamp: campaign.updatedAt,
      data: {
        campaign_id: campaign.id,
        status: campaign.status
      }
    });
  });

  // Get recent chat sessions
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
    take: 3
  });

  recentChats.forEach(chat => {
    activities.push({
      id: `chat_${chat.id}`,
      type: 'chat',
      title: 'New Chat Session',
      description: `${chat.chatType.replace('_', ' ').toLowerCase()} session with ${chat.messageCount} messages`,
      timestamp: chat.createdAt,
      data: {
        session_id: chat.id,
        type: chat.chatType,
        crisis_detected: chat.metadata?.crisis_detected || false
      }
    });
  });

  // Sort all activities by timestamp
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

/**
 * Get upcoming tasks and reminders
 */
const getUpcomingTasks = async (userId) => {
  const tasks = [];

  // Check for campaigns that need attention
  const inactiveCampaigns = await prisma.campaign.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      updatedAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
    },
    select: {
      id: true,
      name: true,
      updatedAt: true
    },
    take: 3
  });

  inactiveCampaigns.forEach(campaign => {
    tasks.push({
      id: `review_campaign_${campaign.id}`,
      type: 'campaign_review',
      title: 'Review Campaign Performance',
      description: `"${campaign.name}" hasn't been updated in 7+ days`,
      due_date: null,
      priority: 'medium',
      action: {
        type: 'navigate',
        target: `/campaigns/${campaign.id}`
      }
    });
  });

  // Check for leads that need follow-up
  const stalLeads = await prisma.lead.findMany({
    where: {
      userId,
      status: { in: ['NEW', 'CONTACTED'] },
      createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 days old
    },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true
    },
    take: 5
  });

  if (stalLeads.length > 0) {
    tasks.push({
      id: 'follow_up_leads',
      type: 'lead_follow_up',
      title: 'Follow Up with Leads',
      description: `${stalLeads.length} leads need follow-up (3+ days old)`,
      due_date: null,
      priority: 'high',
      action: {
        type: 'navigate',
        target: '/leads?filter=stale'
      }
    });
  }

  return tasks;
};

/**
 * Get system notifications
 */
const getSystemNotifications = async (userId) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      isRead: false
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return notifications.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: notification.createdAt,
    data: notification.data,
    priority: determinePriority(notification.type)
  }));
};

/**
 * Get performance alerts
 */
const getPerformanceAlerts = async (userId, metricsData) => {
  const alerts = [];

  // Check for low conversion rates
  const conversionRate = parseFloat(metricsData.overview.conversion_rate) || 0;
  if (conversionRate < 5 && metricsData.overview.total_clicks > 100) {
    alerts.push({
      id: 'low_conversion_rate',
      type: 'warning',
      category: 'performance',
      title: 'Low Conversion Rate',
      message: `Your conversion rate is ${conversionRate}%. Industry average is 5-15%.`,
      suggestion: 'Consider optimizing your landing pages or adjusting your targeting.',
      action: {
        type: 'navigate',
        target: '/landing-pages',
        label: 'Optimize Landing Pages'
      }
    });
  }

  // Check for high cost per lead
  const avgCPC = parseFloat(metricsData.overview.avg_cpc) || 0;
  if (avgCPC > 2.0 && metricsData.overview.total_clicks > 50) {
    alerts.push({
      id: 'high_cpc',
      type: 'alert',
      category: 'cost',
      title: 'High Cost Per Click',
      message: `Your average CPC is $${avgCPC}. Consider refining your targeting.`,
      suggestion: 'Review keyword targeting and audience settings to reduce costs.',
      action: {
        type: 'navigate',
        target: '/campaigns',
        label: 'Review Campaigns'
      }
    });
  }

  // Check for inactive campaigns
  const inactiveCampaigns = metricsData.campaigns.total_count - metricsData.campaigns.active_count;
  if (inactiveCampaigns > 0) {
    alerts.push({
      id: 'inactive_campaigns',
      type: 'info',
      category: 'campaigns',
      title: 'Inactive Campaigns',
      message: `You have ${inactiveCampaigns} inactive campaign${inactiveCampaigns > 1 ? 's' : ''}.`,
      suggestion: 'Review paused campaigns and consider reactivating high-performers.',
      action: {
        type: 'navigate',
        target: '/campaigns?status=paused',
        label: 'Review Inactive Campaigns'
      }
    });
  }

  return alerts;
};

// Helper functions

const getDateRangeFilter = (range) => {
  const now = new Date();
  switch (range) {
    case '7d':
      return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    case '30d':
      return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    case '90d':
      return { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    default:
      return null;
  }
};

const getTimeSinceCreated = (createdAt) => {
  const now = new Date();
  const diff = now - new Date(createdAt);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const determineFollowUpStatus = (lead) => {
  const hoursOld = (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60);

  if (lead.status === 'NEW' && hoursOld > 24) return 'urgent';
  if (lead.status === 'CONTACTED' && hoursOld > 72) return 'needed';
  if (lead.status === 'QUALIFIED' && hoursOld > 168) return 'needed'; // 1 week

  return 'none';
};

const calculateLeadScore = (lead) => {
  let score = 50; // Base score

  // Source scoring
  if (lead.source.includes('Meta')) score += 10;
  if (lead.source.includes('Google')) score += 8;

  // Value scoring
  if (lead.value && lead.value > 100) score += 15;
  if (lead.value && lead.value > 200) score += 10;

  // Contact info scoring
  if (lead.phone) score += 10;
  if (lead.email && lead.email.includes('.edu')) score += 5;

  // Recency scoring (newer leads score higher)
  const hoursOld = (new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60);
  if (hoursOld < 24) score += 20;
  else if (hoursOld < 72) score += 10;
  else if (hoursOld < 168) score += 5;

  return Math.min(100, Math.max(0, score));
};

const suggestNextAction = (lead) => {
  switch (lead.status) {
    case 'NEW':
      return 'Send initial contact email';
    case 'CONTACTED':
      return 'Schedule consultation call';
    case 'QUALIFIED':
      return 'Send intake forms';
    case 'CONVERTED':
      return 'Begin onboarding process';
    default:
      return 'Review lead status';
  }
};

const getCampaignActions = async (userId) => {
  return [
    {
      id: 'create_campaign',
      label: 'Create New Campaign',
      description: 'Start a new advertising campaign',
      icon: 'plus',
      primary: true
    },
    {
      id: 'bulk_edit',
      label: 'Bulk Edit',
      description: 'Edit multiple campaigns at once',
      icon: 'edit'
    },
    {
      id: 'export_data',
      label: 'Export Data',
      description: 'Download campaign performance data',
      icon: 'download'
    },
    {
      id: 'pause_all',
      label: 'Pause All Campaigns',
      description: 'Temporarily pause all active campaigns',
      icon: 'pause',
      confirmation: true
    }
  ];
};

const getLeadActions = async (leads) => {
  // Generate AI-suggested follow-up messages for leads
  return leads.slice(0, 5).map(lead => ({
    lead_id: lead.id,
    suggested_message: generateFollowUpMessage(lead),
    next_action: suggestNextAction(lead),
    priority: lead.follow_up_needed === 'urgent' ? 'high' : 'medium'
  }));
};

const generateFollowUpMessage = (lead) => {
  // Simple template-based message generation
  // In production, this could use OpenAI for personalized messages
  const templates = {
    'NEW': `Hi ${lead.name}, thank you for your interest in our therapy services. I'd love to schedule a brief consultation to discuss how we can support your mental health journey. When would be a good time to connect?`,
    'CONTACTED': `Hi ${lead.name}, I wanted to follow up on our previous conversation about therapy services. Do you have any questions I can help answer? I'm here to support you in taking the next step.`,
    'QUALIFIED': `Hi ${lead.name}, I'm excited to work with you! I've prepared your intake forms and some information about what to expect in your first session. Would you like me to send those over?`
  };

  return templates[lead.status] || `Hi ${lead.name}, I wanted to check in and see how you're doing. Please let me know if you have any questions about our services.`;
};

const getLeadConversionFunnel = async (userId, dateFilter) => {
  const whereClause = {
    userId,
    ...(dateFilter && { createdAt: dateFilter })
  };

  const [newLeads, contactedLeads, qualifiedLeads, convertedLeads] = await Promise.all([
    prisma.lead.count({ where: { ...whereClause, status: 'NEW' } }),
    prisma.lead.count({ where: { ...whereClause, status: 'CONTACTED' } }),
    prisma.lead.count({ where: { ...whereClause, status: 'QUALIFIED' } }),
    prisma.lead.count({ where: { ...whereClause, status: 'CONVERTED' } })
  ]);

  const totalLeads = newLeads + contactedLeads + qualifiedLeads + convertedLeads;

  return {
    stages: {
      new: { count: newLeads, percentage: totalLeads > 0 ? (newLeads / totalLeads * 100).toFixed(1) : 0 },
      contacted: { count: contactedLeads, percentage: totalLeads > 0 ? (contactedLeads / totalLeads * 100).toFixed(1) : 0 },
      qualified: { count: qualifiedLeads, percentage: totalLeads > 0 ? (qualifiedLeads / totalLeads * 100).toFixed(1) : 0 },
      converted: { count: convertedLeads, percentage: totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(1) : 0 }
    },
    conversion_rates: {
      contact_rate: newLeads > 0 ? (contactedLeads / newLeads * 100).toFixed(1) : 0,
      qualification_rate: contactedLeads > 0 ? (qualifiedLeads / contactedLeads * 100).toFixed(1) : 0,
      conversion_rate: qualifiedLeads > 0 ? (convertedLeads / qualifiedLeads * 100).toFixed(1) : 0
    }
  };
};

const determinePriority = (notificationType) => {
  const priorityMap = {
    'CAMPAIGN_ALERT': 'high',
    'LEAD_NOTIFICATION': 'high',
    'PERFORMANCE_REPORT': 'medium',
    'SYSTEM_UPDATE': 'low',
    'MARKETING_TIP': 'low'
  };

  return priorityMap[notificationType] || 'medium';
};