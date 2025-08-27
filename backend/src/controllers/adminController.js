import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { testOpenAIConnection } from '../services/openaiService.js';
import { testMetaConnection } from '../services/metaAdsService.js';
import { testGoogleConnection } from '../services/googleAdsService.js';
import { testEmailConfig } from '../services/emailService.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../middleware/errorHandler.js';

/**
 * Get system statistics
 */
export const getSystemStats = async (req, res) => {
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
};

/**
 * Get all users (admin only)
 */
export const getUsers = async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;
  const skip = (page - 1) * limit;
  
  const where = {
    ...(role && { role }),
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
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
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * Get user by ID (admin only)
 */
export const getUserById = async (req, res) => {
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
};

/**
 * Update user (admin only)
 */
export const updateUser = async (req, res) => {
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
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (req, res) => {
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
};

/**
 * Get all campaigns (admin only)
 */
export const getAllCampaigns = async (req, res) => {
  const { page = 1, limit = 20, status, platform, userId } = req.query;
  const skip = (page - 1) * limit;
  
  const where = {
    ...(status && { status }),
    ...(platform && { platform }),
    ...(userId && { userId }),
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: parseInt(limit),
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
    data: {
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req, res) => {
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
};