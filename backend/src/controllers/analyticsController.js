import { prisma } from '../utils/database.js';
import { calculatePercentage, formatCurrency } from '../utils/helpers.js';

/**
 * Get dashboard analytics
 */
export const getDashboardAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { dateRange = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  const [campaignStats, leadStats, performanceStats, recentActivity] = await Promise.all([
    // Campaign statistics
    getCampaignStats(userId, startDate),
    
    // Lead statistics
    getLeadStats(userId, startDate),
    
    // Performance statistics
    getPerformanceStats(userId),
    
    // Recent activity
    getRecentActivity(userId),
  ]);

  res.json({
    success: true,
    data: {
      campaigns: campaignStats,
      leads: leadStats,
      performance: performanceStats,
      recentActivity,
      dateRange: parseInt(dateRange),
    },
  });
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { campaignId, dateRange = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  const where = {
    userId,
    ...(campaignId && { id: campaignId }),
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      _count: {
        select: {
          campaignLeads: true,
          creatives: true,
        },
      },
    },
  });

  const analytics = campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    status: campaign.status,
    metrics: {
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      cost: campaign.cost,
      leads: campaign.leads,
      ctr: calculatePercentage(campaign.clicks, campaign.impressions),
      cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
      cpl: campaign.leads > 0 ? campaign.cost / campaign.leads : 0,
      conversionRate: calculatePercentage(campaign.conversions, campaign.clicks),
    },
    creatives: campaign._count.creatives,
    totalLeads: campaign._count.campaignLeads,
  }));

  res.json({
    success: true,
    data: {
      campaigns: analytics,
      dateRange: parseInt(dateRange),
    },
  });
};

/**
 * Get lead analytics
 */
export const getLeadAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { dateRange = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  const [leadsByStatus, leadsByCampaign, leadsBySource, leadTrend] = await Promise.all([
    // Leads by status
    prisma.lead.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
      _sum: { value: true },
    }),
    
    // Leads by campaign
    prisma.lead.groupBy({
      by: ['campaignId'],
      where: {
        userId,
        campaignId: { not: null },
      },
      _count: { campaignId: true },
      _sum: { value: true },
    }),
    
    // Leads by source
    prisma.lead.groupBy({
      by: ['source'],
      where: { userId },
      _count: { source: true },
      _sum: { value: true },
    }),
    
    // Lead trend (last 7 days)
    getLeadTrend(userId, 7),
  ]);

  // Get campaign names for lead by campaign data
  const campaignIds = leadsByCampaign.map(item => item.campaignId);
  const campaigns = await prisma.campaign.findMany({
    where: {
      id: { in: campaignIds },
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const campaignMap = campaigns.reduce((acc, campaign) => {
    acc[campaign.id] = campaign.name;
    return acc;
  }, {});

  const analytics = {
    byStatus: leadsByStatus.map(item => ({
      status: item.status,
      count: item._count.status,
      value: item._sum.value || 0,
    })),
    byCampaign: leadsByCampaign.map(item => ({
      campaignId: item.campaignId,
      campaignName: campaignMap[item.campaignId] || 'Unknown',
      count: item._count.campaignId,
      value: item._sum.value || 0,
    })),
    bySource: leadsBySource.map(item => ({
      source: item.source,
      count: item._count.source,
      value: item._sum.value || 0,
    })),
    trend: leadTrend,
  };

  res.json({
    success: true,
    data: {
      leads: analytics,
      dateRange: parseInt(dateRange),
    },
  });
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = async (req, res) => {
  const userId = req.user.id;
  const { compareWith = 'previous_period' } = req.query;
  
  const currentPeriod = await getPerformanceStats(userId);
  
  let comparison = null;
  if (compareWith === 'previous_period') {
    // Get previous 30 days for comparison
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - 60);
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - 30);
    
    comparison = await getPerformanceStats(userId, previousStartDate, previousEndDate);
  }

  const metrics = {
    current: currentPeriod,
    ...(comparison && {
      comparison,
      changes: calculateChanges(currentPeriod, comparison),
    }),
  };

  res.json({
    success: true,
    data: { metrics },
  });
};

// Helper functions
const getCampaignStats = async (userId, startDate) => {
  const [total, active, recent, byPlatform, byStatus] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { userId, createdAt: { gte: startDate } } }),
    prisma.campaign.groupBy({
      by: ['platform'],
      where: { userId },
      _count: { platform: true },
    }),
    prisma.campaign.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),
  ]);

  return {
    total,
    active,
    recent,
    byPlatform: byPlatform.reduce((acc, item) => {
      acc[item.platform] = item._count.platform;
      return acc;
    }, {}),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {}),
  };
};

const getLeadStats = async (userId, startDate) => {
  const [total, recent, byStatus] = await Promise.all([
    prisma.lead.count({ where: { userId } }),
    prisma.lead.count({ where: { userId, createdAt: { gte: startDate } } }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),
  ]);

  return {
    total,
    recent,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {}),
  };
};

const getPerformanceStats = async (userId, startDate, endDate) => {
  const where = {
    userId,
    ...(startDate && endDate && {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }),
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    select: {
      impressions: true,
      clicks: true,
      conversions: true,
      cost: true,
      leads: true,
      budget: true,
    },
  });

  const totals = campaigns.reduce(
    (acc, campaign) => ({
      impressions: acc.impressions + campaign.impressions,
      clicks: acc.clicks + campaign.clicks,
      conversions: acc.conversions + campaign.conversions,
      cost: acc.cost + campaign.cost,
      leads: acc.leads + campaign.leads,
      budget: acc.budget + campaign.budget,
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, leads: 0, budget: 0 }
  );

  return {
    ...totals,
    ctr: calculatePercentage(totals.clicks, totals.impressions),
    cpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
    cpl: totals.leads > 0 ? totals.cost / totals.leads : 0,
    conversionRate: calculatePercentage(totals.conversions, totals.clicks),
    budgetUtilization: calculatePercentage(totals.cost, totals.budget),
  };
};

const getRecentActivity = async (userId) => {
  const [recentCampaigns, recentLeads] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        campaign: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    campaigns: recentCampaigns,
    leads: recentLeads,
  };
};

const getLeadTrend = async (userId, days) => {
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = await prisma.lead.count({
      where: {
        userId,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });
    
    trends.push({
      date: date.toISOString().split('T')[0],
      count,
    });
  }
  
  return trends;
};

const calculateChanges = (current, previous) => {
  const changes = {};
  
  for (const key in current) {
    if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
      const change = previous[key] > 0 
        ? ((current[key] - previous[key]) / previous[key]) * 100
        : current[key] > 0 ? 100 : 0;
      
      changes[key] = {
        value: change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    }
  }
  
  return changes;
};