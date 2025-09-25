import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { testOpenAIConnection } from '../services/openaiService.js';
import { testMetaConnection } from '../services/metaAdsService.js';
import { testGoogleConnection } from '../services/googleAdsService.js';
import { testEmailConfig } from '../services/emailService.js';
import {
  getSystemAnalytics as getSystemAnalyticsService,
  getUserManagement as getUserManagementService,
  getContentModerationQueue,
  executeModerationAction,
  getSystemConfiguration,
  updateSystemConfiguration,
  getAuditLog as getAuditLogService
} from '../services/adminService.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from '../middleware/errorHandler.js';
import {
  createPaginatedResponse,
  buildPaginationParams,
  buildSearchFilter,
  asyncControllerHandler,
} from '../utils/controllerHelpers.js';

/**
 * Get system statistics
 */
export const getSystemStats = asyncControllerHandler(async (req, res) => {
  const [userStats, campaignStats, leadStats, revenueStats] = await Promise.all([
    // User statistics
    prisma.user.groupBy({
      by: ['role', 'isActive'],
      _count: { id: true },
    }),
    
    // Campaign statistics
    prisma.campaign.groupBy({
      by: ['status', 'platform'],
      _count: { id: true },
      _sum: { budget: true, cost: true },
    }),
    
    // Lead statistics
    prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { value: true },
    }),
    
    // Revenue calculation (simplified)
    prisma.campaign.aggregate({
      _sum: { cost: true },
      _count: { id: true },
    }),
  ]);

  // Process statistics
  const totalUsers = userStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const activeUsers = userStats
    .filter(stat => stat.isActive)
    .reduce((sum, stat) => sum + stat._count.id, 0);
  
  const totalCampaigns = campaignStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const activeCampaigns = campaignStats
    .filter(stat => stat.status === 'ACTIVE')
    .reduce((sum, stat) => sum + stat._count.id, 0);
  
  const totalLeads = leadStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const totalRevenue = revenueStats._sum.cost || 0;

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: userStats.reduce((acc, stat) => {
          acc[stat.role] = (acc[stat.role] || 0) + stat._count.id;
          return acc;
        }, {}),
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        byStatus: campaignStats.reduce((acc, stat) => {
          acc[stat.status] = (acc[stat.status] || 0) + stat._count.id;
          return acc;
        }, {}),
        byPlatform: campaignStats.reduce((acc, stat) => {
          acc[stat.platform] = (acc[stat.platform] || 0) + stat._count.id;
          return acc;
        }, {}),
      },
      leads: {
        total: totalLeads,
        byStatus: leadStats.reduce((acc, stat) => {
          acc[stat.status] = (acc[stat.status] || 0) + stat._count.id;
          return acc;
        }, {}),
        totalValue: leadStats.reduce((sum, stat) => sum + (stat._sum.value || 0), 0),
      },
      revenue: {
        totalSpend: totalRevenue,
        averagePerCampaign: totalCampaigns > 0 ? totalRevenue / totalCampaigns : 0,
      },
    },
  });
});

/**
 * Get all users (admin only)
 */
export const getUsers = asyncControllerHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const { page, limit, skip } = buildPaginationParams(req.query);
  
  const where = {
    ...(role && { role }),
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...buildSearchFilter(search, ['name', 'email', 'company']),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        company: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            campaigns: true,
            leads: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: createPaginatedResponse(users, page, limit, total),
  });
});

/**
 * Get user by ID (admin only)
 */
export const getUserById = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      avatar: true,
      phone: true,
      company: true,
      bio: true,
      createdAt: true,
      lastLogin: true,
      onboardingData: true,
      campaigns: {
        select: {
          id: true,
          name: true,
          platform: true,
          status: true,
          budget: true,
          cost: true,
          leads: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      leads: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          value: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * Update user (admin only)
 */
export const updateUser = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, isVerified } = req.body;
  const adminUserId = req.user.id;

  // Prevent admin from deactivating themselves
  if (id === adminUserId && isActive === false) {
    throw new ForbiddenError('Cannot deactivate your own account');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(isVerified !== undefined && { isVerified }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  logger.info(`User updated by admin: ${id}`, {
    adminUserId,
    changes: { role, isActive, isVerified },
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
});

/**
 * Delete user (admin only)
 */
export const deleteUser = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.user.id;

  // Prevent admin from deleting themselves
  if (id === adminUserId) {
    throw new ForbiddenError('Cannot delete your own account');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent deletion of other super admins
  if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Cannot delete super admin account');
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id },
  });

  logger.warn(`User deleted by admin: ${user.email}`, {
    adminUserId,
    deletedUserId: id,
  });

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * Get all campaigns (admin only)
 */
export const getAllCampaigns = asyncControllerHandler(async (req, res) => {
  const { status, platform, userId } = req.query;
  const { page, limit, skip } = buildPaginationParams(req.query);
  
  const where = {
    ...(status && { status }),
    ...(platform && { platform }),
    ...(userId && { userId }),
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            campaignLeads: true,
            creatives: true,
          },
        },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  res.json({
    success: true,
    data: createPaginatedResponse(campaigns, page, limit, total),
  });
});

/**
 * Get comprehensive system analytics
 */
export const getSystemAnalytics = asyncControllerHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query;

  if (!['7d', '30d', '90d', '1y'].includes(timeframe)) {
    throw new BadRequestError('Invalid timeframe. Must be 7d, 30d, 90d, or 1y');
  }

  const analytics = await getSystemAnalyticsService(timeframe);

  res.json({
    success: true,
    data: {
      system_analytics: analytics
    }
  });
});

/**
 * Get enhanced user management data
 */
export const getUserManagement = asyncControllerHandler(async (req, res) => {
  const filters = {
    role: req.query.role,
    status: req.query.status,
    practice_type: req.query.practice_type,
    city: req.query.city,
    registration_source: req.query.registration_source,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    search: req.query.search,
    sort_by: req.query.sort_by || 'createdAt',
    sort_order: req.query.sort_order || 'desc'
  };

  const userManagement = await getUserManagementService(filters);

  res.json({
    success: true,
    data: {
      user_management: userManagement
    }
  });
});

/**
 * Get content moderation queue
 */
export const getContentModeration = asyncControllerHandler(async (req, res) => {
  const filters = {
    content_type: req.query.content_type || 'all',
    status: req.query.status || 'pending',
    priority: req.query.priority || 'all',
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20
  };

  const moderationQueue = await getContentModerationQueue(filters);

  res.json({
    success: true,
    data: {
      content_moderation: moderationQueue
    }
  });
});

/**
 * Execute moderation action
 */
export const moderateContent = asyncControllerHandler(async (req, res) => {
  const { item_id, action, reason = '' } = req.body;
  const moderatorId = req.user.id;

  if (!item_id || !action) {
    throw new BadRequestError('Item ID and action are required');
  }

  if (!['approve', 'reject', 'flag', 'escalate'].includes(action)) {
    throw new BadRequestError('Invalid action. Must be approve, reject, flag, or escalate');
  }

  const result = await executeModerationAction(item_id, action, moderatorId, reason);

  logger.info(`Moderation action executed: ${action} on ${item_id} by admin ${moderatorId}`);

  res.json({
    success: true,
    message: 'Moderation action executed successfully',
    data: {
      moderation_result: result
    }
  });
});

/**
 * Get system configuration
 */
export const getSystemConfig = asyncControllerHandler(async (req, res) => {
  const config = await getSystemConfiguration();

  res.json({
    success: true,
    data: {
      system_configuration: config
    }
  });
});

/**
 * Update system configuration
 */
export const updateSystemConfig = asyncControllerHandler(async (req, res) => {
  const updates = req.body;
  const adminId = req.user.id;

  if (!updates || Object.keys(updates).length === 0) {
    throw new BadRequestError('No configuration updates provided');
  }

  const result = await updateSystemConfiguration(updates, adminId);

  res.json({
    success: true,
    message: 'System configuration updated successfully',
    data: {
      configuration_update: result
    }
  });
});

/**
 * Get audit log
 */
export const getAuditLog = asyncControllerHandler(async (req, res) => {
  const filters = {
    admin_id: req.query.admin_id,
    action_type: req.query.action_type,
    resource_type: req.query.resource_type,
    start_date: req.query.start_date,
    end_date: req.query.end_date,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  };

  const auditLog = await getAuditLogService(filters);

  res.json({
    success: true,
    data: {
      audit_log: auditLog
    }
  });
});

/**
 * Emergency system actions
 */
export const executeEmergencyAction = asyncControllerHandler(async (req, res) => {
  const { action, target, reason } = req.body;
  const adminId = req.user.id;

  if (!action || !reason) {
    throw new BadRequestError('Action and reason are required for emergency actions');
  }

  const validActions = [
    'disable_user_account',
    'pause_all_campaigns',
    'escalate_crisis_intervention',
    'emergency_system_notification'
  ];

  if (!validActions.includes(action)) {
    throw new BadRequestError('Invalid emergency action');
  }

  let result = {};

  switch (action) {
    case 'disable_user_account':
      if (!target) {
        throw new BadRequestError('Target user ID required');
      }

      const user = await prisma.user.findUnique({ where: { id: target } });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await prisma.user.update({
        where: { id: target },
        data: { isActive: false }
      });

      result = { action: 'user_disabled', user_id: target };
      break;

    case 'pause_all_campaigns':
      const pausedCampaigns = await prisma.campaign.updateMany({
        where: {
          userId: target,
          status: 'ACTIVE'
        },
        data: { status: 'PAUSED' }
      });

      result = { action: 'campaigns_paused', count: pausedCampaigns.count };
      break;

    case 'escalate_crisis_intervention':
      // In a real system, this would trigger external crisis services
      logger.error('CRISIS ESCALATION', {
        admin_id: adminId,
        target,
        reason,
        timestamp: new Date()
      });

      result = { action: 'crisis_escalated', escalation_id: `crisis_${Date.now()}` };
      break;

    case 'emergency_system_notification':
      // Send system-wide notification to all admins
      result = { action: 'notification_sent', message: reason };
      break;
  }

  logger.warn('Emergency action executed', {
    admin_id: adminId,
    action,
    target,
    reason,
    result,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Emergency action executed successfully',
    data: {
      emergency_action_result: result
    }
  });
});

/**
 * Get system health status
 */
export const getSystemHealth = asyncControllerHandler(async (req, res) => {
  const healthChecks = await Promise.allSettled([
    // Database check
    prisma.$queryRaw`SELECT 1`,

    // External service checks
    testOpenAIConnection(),
    testMetaConnection(),
    testGoogleConnection(),
    testEmailConfig(),
  ]);

  const [dbCheck, openaiCheck, metaCheck, googleCheck, emailCheck] = healthChecks;

  const systemHealth = {
    database: {
      status: dbCheck.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: dbCheck.status === 'rejected' ? dbCheck.reason?.message : null,
    },
    openai: {
      status: openaiCheck.status === 'fulfilled' && openaiCheck.value?.success ? 'healthy' : 'unhealthy',
      error: openaiCheck.status === 'rejected' ? openaiCheck.reason?.message :
             (openaiCheck.value?.error || null),
    },
    metaAds: {
      status: metaCheck.status === 'fulfilled' && metaCheck.value?.success ? 'healthy' : 'unhealthy',
      error: metaCheck.status === 'rejected' ? metaCheck.reason?.message :
             (metaCheck.value?.error || null),
    },
    googleAds: {
      status: googleCheck.status === 'fulfilled' && googleCheck.value?.success ? 'healthy' : 'unhealthy',
      error: googleCheck.status === 'rejected' ? googleCheck.reason?.message :
             (googleCheck.value?.error || null),
    },
    email: {
      status: emailCheck.status === 'fulfilled' && emailCheck.value ? 'healthy' : 'unhealthy',
      error: emailCheck.status === 'rejected' ? emailCheck.reason?.message : null,
    },
  };

  const overallHealth = Object.values(systemHealth).every(service => service.status === 'healthy');

  res.json({
    success: true,
    data: {
      overall: overallHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: systemHealth,
    },
  });
});