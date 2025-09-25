import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { testMetaConnection } from './metaAdsService.js';
import { testGoogleConnection } from './googleAdsService.js';

/**
 * Comprehensive Metrics Service
 * Aggregates analytics from all system components for dashboard display
 */

/**
 * Get comprehensive dashboard metrics
 */
export const getDashboardMetrics = async (userId, timeframe = '30d', includeSystemMetrics = false) => {
  try {
    const dateRange = getDateRange(timeframe);
    const isAdmin = includeSystemMetrics;

    // Run all metric queries in parallel for better performance
    const [
      campaignMetrics,
      leadMetrics,
      landingPageMetrics,
      chatMetrics,
      creativesMetrics,
      approvalMetrics,
      userGrowthMetrics,
      systemHealthMetrics
    ] = await Promise.all([
      getCampaignMetrics(userId, dateRange, isAdmin),
      getLeadMetrics(userId, dateRange, isAdmin),
      getLandingPageMetrics(userId, dateRange, isAdmin),
      getChatMetrics(userId, dateRange, isAdmin),
      getCreativesMetrics(userId, dateRange, isAdmin),
      getApprovalMetrics(userId, dateRange, isAdmin),
      isAdmin ? getUserGrowthMetrics(dateRange) : null,
      isAdmin ? getSystemHealthMetrics() : null
    ]);

    // Calculate derived metrics
    const derivedMetrics = calculateDerivedMetrics({
      campaigns: campaignMetrics,
      leads: leadMetrics,
      landingPages: landingPageMetrics,
      chats: chatMetrics
    });

    const dashboardData = {
      timeframe,
      generated_at: new Date(),
      user_scope: isAdmin ? 'system_wide' : 'user_specific',

      // Core business metrics
      overview: {
        total_campaigns: campaignMetrics.total_count,
        active_campaigns: campaignMetrics.active_count,
        total_leads: leadMetrics.total_count,
        new_leads: leadMetrics.new_leads,
        conversion_rate: derivedMetrics.lead_conversion_rate,
        total_spend: campaignMetrics.total_spend,
        total_impressions: campaignMetrics.total_impressions,
        total_clicks: campaignMetrics.total_clicks,
        avg_cpc: derivedMetrics.avg_cpc,
        roas: derivedMetrics.roas
      },

      // Detailed section metrics
      campaigns: campaignMetrics,
      leads: leadMetrics,
      landing_pages: landingPageMetrics,
      chat_system: chatMetrics,
      creatives: creativesMetrics,
      approvals: approvalMetrics,

      // Performance insights
      insights: generatePerformanceInsights({
        campaigns: campaignMetrics,
        leads: leadMetrics,
        landingPages: landingPageMetrics,
        chats: chatMetrics,
        timeframe
      }),

      // Trends and comparisons
      trends: await getTrendData(userId, timeframe, isAdmin),

      // System metrics (admin only)
      ...(isAdmin && {
        user_growth: userGrowthMetrics,
        system_health: systemHealthMetrics
      })
    };

    logger.info(`Dashboard metrics generated for ${isAdmin ? 'admin' : 'user'}: ${userId || 'system'}`);
    return dashboardData;

  } catch (error) {
    logger.error('Failed to generate dashboard metrics:', error);
    throw error;
  }
};

/**
 * Get campaign performance metrics
 */
const getCampaignMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    ...(!isAdmin && userId && { userId }),
    createdAt: { gte: dateRange.start, lte: dateRange.end }
  };

  const [
    totalCampaigns,
    activeCampaigns,
    campaignStats,
    platformBreakdown,
    statusBreakdown,
    topPerformers
  ] = await Promise.all([
    prisma.campaign.count({ where: whereClause }),
    prisma.campaign.count({ where: { ...whereClause, status: 'ACTIVE' } }),
    prisma.campaign.aggregate({
      where: whereClause,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        leads: true
      },
      _avg: {
        budget: true
      }
    }),
    prisma.campaign.groupBy({
      by: ['platform'],
      where: whereClause,
      _count: true,
      _sum: {
        impressions: true,
        clicks: true,
        cost: true
      }
    }),
    prisma.campaign.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    }),
    prisma.campaign.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        platform: true,
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        leads: true
      },
      orderBy: { conversions: 'desc' },
      take: 5
    })
  ]);

  return {
    total_count: totalCampaigns,
    active_count: activeCampaigns,
    total_impressions: campaignStats._sum.impressions || 0,
    total_clicks: campaignStats._sum.clicks || 0,
    total_conversions: campaignStats._sum.conversions || 0,
    total_spend: campaignStats._sum.cost || 0,
    total_leads: campaignStats._sum.leads || 0,
    avg_budget: campaignStats._avg.budget || 0,

    platform_breakdown: platformBreakdown.reduce((acc, item) => {
      acc[item.platform] = {
        count: item._count,
        impressions: item._sum.impressions || 0,
        clicks: item._sum.clicks || 0,
        spend: item._sum.cost || 0
      };
      return acc;
    }, {}),

    status_breakdown: statusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),

    top_performers: topPerformers.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      metrics: {
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        cost: campaign.cost,
        leads: campaign.leads,
        ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100).toFixed(2) : 0,
        conversion_rate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks * 100).toFixed(2) : 0
      }
    }))
  };
};

/**
 * Get lead generation and management metrics
 */
const getLeadMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    ...(!isAdmin && userId && { userId }),
    createdAt: { gte: dateRange.start, lte: dateRange.end }
  };

  const [
    totalLeads,
    newLeads,
    leadsByStatus,
    leadsBySource,
    leadsByValue,
    conversionFunnel,
    avgLeadValue
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        ...(!isAdmin && userId && { userId }),
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      }
    }),
    prisma.lead.count({
      where: {
        ...whereClause,
        status: 'NEW'
      }
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
      _avg: { value: true }
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: whereClause,
      _count: true,
      _avg: { value: true }
    }),
    prisma.lead.aggregate({
      where: whereClause,
      _sum: { value: true },
      _avg: { value: true },
      _count: true
    }),
    // Get conversion funnel data
    Promise.all([
      prisma.lead.count({ where: { ...whereClause, status: 'NEW' } }),
      prisma.lead.count({ where: { ...whereClause, status: 'CONTACTED' } }),
      prisma.lead.count({ where: { ...whereClause, status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { ...whereClause, status: 'CONVERTED' } })
    ]),
    prisma.lead.aggregate({
      where: { ...whereClause, value: { not: null } },
      _avg: { value: true }
    })
  ]);

  const [newCount, contactedCount, qualifiedCount, convertedCount] = conversionFunnel;

  return {
    total_count: totalLeads,
    new_leads: newLeads,
    total_value: leadsByValue._sum.value || 0,
    avg_value: avgLeadValue._avg.value || 0,

    status_breakdown: leadsByStatus.reduce((acc, item) => {
      acc[item.status] = {
        count: item._count,
        avg_value: item._avg.value || 0
      };
      return acc;
    }, {}),

    source_breakdown: leadsBySource.reduce((acc, item) => {
      acc[item.source] = {
        count: item._count,
        avg_value: item._avg.value || 0
      };
      return acc;
    }, {}),

    conversion_funnel: {
      new: newCount,
      contacted: contactedCount,
      qualified: qualifiedCount,
      converted: convertedCount,
      conversion_rates: {
        contact_rate: newCount > 0 ? (contactedCount / newCount * 100).toFixed(2) : 0,
        qualification_rate: contactedCount > 0 ? (qualifiedCount / contactedCount * 100).toFixed(2) : 0,
        conversion_rate: qualifiedCount > 0 ? (convertedCount / qualifiedCount * 100).toFixed(2) : 0,
        overall_conversion: newCount > 0 ? (convertedCount / newCount * 100).toFixed(2) : 0
      }
    }
  };
};

/**
 * Get landing page performance metrics
 */
const getLandingPageMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    ...(!isAdmin && userId && { userId }),
    createdAt: { gte: dateRange.start, lte: dateRange.end }
  };

  const [
    totalPages,
    activePages,
    pageStats,
    templateBreakdown,
    topPerformers
  ] = await Promise.all([
    prisma.landingPage.count({ where: whereClause }),
    prisma.landingPage.count({ where: { ...whereClause, isActive: true } }),
    prisma.landingPage.aggregate({
      where: whereClause,
      _sum: {
        visits: true,
        conversions: true
      },
      _avg: {
        visits: true,
        conversions: true
      }
    }),
    prisma.landingPage.groupBy({
      by: ['template'],
      where: whereClause,
      _count: true,
      _sum: {
        visits: true,
        conversions: true
      }
    }),
    prisma.landingPage.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        template: true,
        visits: true,
        conversions: true
      },
      orderBy: { conversions: 'desc' },
      take: 5
    })
  ]);

  return {
    total_count: totalPages,
    active_count: activePages,
    total_visits: pageStats._sum.visits || 0,
    total_conversions: pageStats._sum.conversions || 0,
    avg_visits: pageStats._avg.visits || 0,
    avg_conversions: pageStats._avg.conversions || 0,
    overall_conversion_rate: pageStats._sum.visits > 0 ?
      (pageStats._sum.conversions / pageStats._sum.visits * 100).toFixed(2) : 0,

    template_breakdown: templateBreakdown.reduce((acc, item) => {
      acc[item.template] = {
        count: item._count,
        visits: item._sum.visits || 0,
        conversions: item._sum.conversions || 0,
        conversion_rate: item._sum.visits > 0 ?
          (item._sum.conversions / item._sum.visits * 100).toFixed(2) : 0
      };
      return acc;
    }, {}),

    top_performers: topPerformers.map(page => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      template: page.template,
      metrics: {
        visits: page.visits,
        conversions: page.conversions,
        conversion_rate: page.visits > 0 ? (page.conversions / page.visits * 100).toFixed(2) : 0
      }
    }))
  };
};

/**
 * Get AI chat system metrics
 */
const getChatMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    ...(!isAdmin && userId && { userId }),
    createdAt: { gte: dateRange.start, lte: dateRange.end }
  };

  const [
    totalSessions,
    activeSessions,
    sessionsByType,
    crisisSessions,
    messageStats,
    avgSessionDuration
  ] = await Promise.all([
    prisma.chatSession.count({ where: whereClause }),
    prisma.chatSession.count({ where: { ...whereClause, status: 'ACTIVE' } }),
    prisma.chatSession.groupBy({
      by: ['chatType'],
      where: whereClause,
      _count: true,
      _avg: { messageCount: true }
    }),
    prisma.chatSession.count({
      where: {
        ...whereClause,
        metadata: {
          path: ['crisis_detected'],
          equals: true
        }
      }
    }),
    prisma.chatMessage.aggregate({
      where: {
        session: whereClause
      },
      _count: true
    }),
    // Calculate average session duration (simplified)
    prisma.chatSession.findMany({
      where: { ...whereClause, endedAt: { not: null } },
      select: {
        createdAt: true,
        endedAt: true
      }
    })
  ]);

  const avgDuration = avgSessionDuration.length > 0 ?
    avgSessionDuration.reduce((sum, session) => {
      const duration = new Date(session.endedAt) - new Date(session.createdAt);
      return sum + duration;
    }, 0) / avgSessionDuration.length / 1000 / 60 : 0; // Convert to minutes

  return {
    total_sessions: totalSessions,
    active_sessions: activeSessions,
    total_messages: messageStats._count,
    crisis_sessions: crisisSessions,
    crisis_rate: totalSessions > 0 ? (crisisSessions / totalSessions * 100).toFixed(2) : 0,
    avg_session_duration_minutes: Math.round(avgDuration),

    type_breakdown: sessionsByType.reduce((acc, item) => {
      acc[item.chatType] = {
        count: item._count,
        avg_messages: item._avg.messageCount || 0
      };
      return acc;
    }, {}),

    engagement_metrics: {
      avg_messages_per_session: totalSessions > 0 ?
        (messageStats._count / totalSessions).toFixed(1) : 0,
      session_completion_rate: totalSessions > 0 ?
        (avgSessionDuration.length / totalSessions * 100).toFixed(2) : 0
    }
  };
};

/**
 * Get creatives performance metrics
 */
const getCreativesMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    campaign: {
      ...(!isAdmin && userId && { userId }),
      createdAt: { gte: dateRange.start, lte: dateRange.end }
    }
  };

  const [
    totalCreatives,
    activeCreatives,
    creativeStats,
    typeBreakdown,
    topPerformers
  ] = await Promise.all([
    prisma.creative.count({ where: whereClause }),
    prisma.creative.count({ where: { ...whereClause, isActive: true } }),
    prisma.creative.aggregate({
      where: whereClause,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true
      }
    }),
    prisma.creative.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true
      }
    }),
    prisma.creative.findMany({
      where: whereClause,
      select: {
        id: true,
        headline: true,
        type: true,
        impressions: true,
        clicks: true,
        conversions: true
      },
      orderBy: { conversions: 'desc' },
      take: 5
    })
  ]);

  return {
    total_count: totalCreatives,
    active_count: activeCreatives,
    total_impressions: creativeStats._sum.impressions || 0,
    total_clicks: creativeStats._sum.clicks || 0,
    total_conversions: creativeStats._sum.conversions || 0,

    type_breakdown: typeBreakdown.reduce((acc, item) => {
      acc[item.type] = {
        count: item._count,
        impressions: item._sum.impressions || 0,
        clicks: item._sum.clicks || 0,
        conversions: item._sum.conversions || 0,
        ctr: item._sum.impressions > 0 ?
          (item._sum.clicks / item._sum.impressions * 100).toFixed(2) : 0
      };
      return acc;
    }, {}),

    top_performers: topPerformers.map(creative => ({
      id: creative.id,
      headline: creative.headline.substring(0, 50),
      type: creative.type,
      metrics: {
        impressions: creative.impressions,
        clicks: creative.clicks,
        conversions: creative.conversions,
        ctr: creative.impressions > 0 ? (creative.clicks / creative.impressions * 100).toFixed(2) : 0
      }
    }))
  };
};

/**
 * Get approval workflow metrics
 */
const getApprovalMetrics = async (userId, dateRange, isAdmin = false) => {
  const whereClause = {
    ...(!isAdmin && userId && { userId }),
    createdAt: { gte: dateRange.start, lte: dateRange.end }
  };

  const [
    totalApprovals,
    pendingApprovals,
    approvalsByStatus,
    avgReviewTime
  ] = await Promise.all([
    prisma.campaignApproval.count({ where: whereClause }),
    prisma.campaignApproval.count({ where: { ...whereClause, status: 'PENDING_REVIEW' } }),
    prisma.campaignApproval.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    }),
    prisma.campaignApproval.findMany({
      where: {
        ...whereClause,
        reviewedAt: { not: null }
      },
      select: {
        submittedAt: true,
        reviewedAt: true
      }
    })
  ]);

  const avgReviewTimeHours = avgReviewTime.length > 0 ?
    avgReviewTime.reduce((sum, approval) => {
      const reviewTime = new Date(approval.reviewedAt) - new Date(approval.submittedAt);
      return sum + reviewTime;
    }, 0) / avgReviewTime.length / 1000 / 60 / 60 : 0; // Convert to hours

  return {
    total_approvals: totalApprovals,
    pending_approvals: pendingApprovals,
    avg_review_time_hours: Math.round(avgReviewTimeHours * 10) / 10,

    status_breakdown: approvalsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),

    approval_rate: totalApprovals > 0 ?
      ((approvalsByStatus.find(s => s.status === 'APPROVED')?._count || 0) / totalApprovals * 100).toFixed(2) : 0
  };
};

/**
 * Get user growth metrics (admin only)
 */
const getUserGrowthMetrics = async (dateRange) => {
  const [
    totalUsers,
    newUsers,
    activeUsers,
    usersByRole,
    verifiedUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      }
    }),
    prisma.user.count({
      where: {
        lastLogin: { gte: dateRange.start }
      }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: true
    }),
    prisma.user.count({
      where: { isVerified: true }
    })
  ]);

  return {
    total_users: totalUsers,
    new_users: newUsers,
    active_users: activeUsers,
    verified_users: verifiedUsers,
    verification_rate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,

    role_breakdown: usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {})
  };
};

/**
 * Get system health metrics (admin only)
 */
const getSystemHealthMetrics = async () => {
  try {
    const [metaHealth, googleHealth] = await Promise.all([
      testMetaConnection().catch(() => ({ success: false })),
      testGoogleConnection().catch(() => ({ success: false }))
    ]);

    return {
      database: 'healthy', // If we got this far, DB is working
      external_apis: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        meta_ads: metaHealth.success ? 'healthy' : 'error',
        google_ads: googleHealth.success ? 'healthy' : 'error'
      },
      last_checked: new Date()
    };
  } catch (error) {
    return {
      database: 'error',
      external_apis: {
        openai: 'unknown',
        meta_ads: 'unknown',
        google_ads: 'unknown'
      },
      last_checked: new Date(),
      error: error.message
    };
  }
};

/**
 * Calculate derived metrics and KPIs
 */
const calculateDerivedMetrics = (metrics) => {
  const { campaigns, leads, landingPages } = metrics;

  return {
    // Campaign effectiveness
    avg_cpc: campaigns.total_clicks > 0 ?
      (campaigns.total_spend / campaigns.total_clicks).toFixed(2) : 0,

    ctr: campaigns.total_impressions > 0 ?
      (campaigns.total_clicks / campaigns.total_impressions * 100).toFixed(2) : 0,

    // Lead conversion
    lead_conversion_rate: campaigns.total_clicks > 0 ?
      (leads.total_count / campaigns.total_clicks * 100).toFixed(2) : 0,

    cost_per_lead: leads.total_count > 0 ?
      (campaigns.total_spend / leads.total_count).toFixed(2) : 0,

    // ROI calculations
    roas: campaigns.total_spend > 0 ?
      (leads.total_value / campaigns.total_spend).toFixed(2) : 0,

    // Landing page effectiveness
    lp_contribution_to_conversions: landingPages.total_conversions > 0 ?
      (landingPages.total_conversions / campaigns.total_conversions * 100).toFixed(2) : 0
  };
};

/**
 * Generate performance insights and recommendations
 */
const generatePerformanceInsights = (data) => {
  const insights = [];
  const { campaigns, leads, landingPages, chats, timeframe } = data;

  // Campaign insights
  if (campaigns.total_count === 0) {
    insights.push({
      type: 'warning',
      category: 'campaigns',
      title: 'No Active Campaigns',
      message: 'You haven\'t created any campaigns yet. Start by creating your first campaign to begin generating leads.',
      action: 'Create Campaign'
    });
  } else if (campaigns.active_count < campaigns.total_count * 0.5) {
    insights.push({
      type: 'opportunity',
      category: 'campaigns',
      title: 'Low Campaign Activity',
      message: `Only ${campaigns.active_count} of ${campaigns.total_count} campaigns are active. Consider activating more campaigns to increase reach.`,
      action: 'Review Campaigns'
    });
  }

  // Lead conversion insights
  const overallConversion = leads.conversion_funnel?.conversion_rates?.overall_conversion || 0;
  if (overallConversion < 5 && leads.total_count > 10) {
    insights.push({
      type: 'alert',
      category: 'leads',
      title: 'Low Conversion Rate',
      message: `Your overall lead conversion rate is ${overallConversion}%. Industry average is 5-15%. Consider optimizing your follow-up process.`,
      action: 'Improve Lead Process'
    });
  }

  // Landing page insights
  if (landingPages.overall_conversion_rate < 2 && landingPages.total_visits > 100) {
    insights.push({
      type: 'opportunity',
      category: 'landing_pages',
      title: 'Landing Page Optimization Needed',
      message: `Your landing pages have a ${landingPages.overall_conversion_rate}% conversion rate. Consider A/B testing headlines, CTAs, or layout.`,
      action: 'Optimize Pages'
    });
  }

  // Chat system insights
  if (chats.crisis_sessions > 0) {
    insights.push({
      type: 'info',
      category: 'chat',
      title: 'Crisis Support Provided',
      message: `${chats.crisis_sessions} crisis support sessions were handled. Ensure follow-up protocols are in place.`,
      action: 'Review Crisis Protocols'
    });
  }

  // Performance trends
  if (campaigns.total_impressions > 1000 && campaigns.total_clicks < campaigns.total_impressions * 0.01) {
    insights.push({
      type: 'opportunity',
      category: 'campaigns',
      title: 'Low Click-Through Rate',
      message: 'Your CTR is below 1%. Consider refreshing ad copy or targeting to improve engagement.',
      action: 'Improve Ad Copy'
    });
  }

  return insights;
};

/**
 * Get trend data for time series charts
 */
const getTrendData = async (userId, timeframe, isAdmin = false) => {
  const periods = getTimePeriods(timeframe);
  const trendData = {};

  for (const period of periods) {
    const periodStart = period.start;
    const periodEnd = period.end;

    const [campaignData, leadData, chatData] = await Promise.all([
      prisma.campaign.aggregate({
        where: {
          ...(!isAdmin && userId && { userId }),
          createdAt: { gte: periodStart, lte: periodEnd }
        },
        _sum: { impressions: true, clicks: true, cost: true }
      }),
      prisma.lead.count({
        where: {
          ...(!isAdmin && userId && { userId }),
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      }),
      prisma.chatSession.count({
        where: {
          ...(!isAdmin && userId && { userId }),
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      })
    ]);

    trendData[period.label] = {
      impressions: campaignData._sum.impressions || 0,
      clicks: campaignData._sum.clicks || 0,
      spend: campaignData._sum.cost || 0,
      leads: leadData,
      chat_sessions: chatData
    };
  }

  return trendData;
};

/**
 * Helper functions
 */
const getDateRange = (timeframe) => {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
};

const getTimePeriods = (timeframe) => {
  const periods = [];
  const end = new Date();
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const interval = timeframe === '7d' ? 1 : timeframe === '30d' ? 1 : 3;

  for (let i = days; i >= 0; i -= interval) {
    const periodEnd = new Date();
    periodEnd.setDate(end.getDate() - i);

    const periodStart = new Date();
    periodStart.setDate(end.getDate() - i - interval + 1);

    periods.push({
      start: periodStart,
      end: periodEnd,
      label: periodEnd.toISOString().split('T')[0]
    });
  }

  return periods;
};