import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { sendLeadNotification } from '../services/emailService.js';
import {
  AppError,
  NotFoundError,
} from '../middleware/errorHandler.js';

/**
 * Create new lead
 */
export const createLead = async (req, res) => {
  const { campaignId, name, email, phone, source, notes, value } = req.body;
  const userId = req.user.id;
  
  // Validate campaign ownership if campaignId provided
  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId,
      },
    });
    
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }
  }

  // Create lead
  const lead = await prisma.lead.create({
    data: {
      userId,
      campaignId,
      name,
      email,
      phone,
      source,
      notes,
      value,
      status: 'NEW',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Update campaign lead count
  if (campaignId) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { leads: { increment: 1 } },
    });
  }

  // Send lead notification email
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    
    if (user && lead.campaign) {
      await sendLeadNotification(user, lead, lead.campaign);
    }
  } catch (emailError) {
    logger.warn('Failed to send lead notification email:', emailError);
  }

  logger.info(`Lead created: ${lead.id} for user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: { lead },
  });
};

/**
 * Get user's leads
 */
export const getLeads = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status, campaignId, search } = req.query;
  
  const skip = (page - 1) * limit;
  
  // Build filter conditions
  const where = {
    userId,
    ...(status && { status }),
    ...(campaignId && { campaignId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Get leads with pagination
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      leads,
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
 * Get lead by ID
 */
export const getLeadById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true,
        },
      },
    },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  res.json({
    success: true,
    data: { lead },
  });
};

/**
 * Update lead
 */
export const updateLead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { status, notes, value } = req.body;

  // Check if lead exists and belongs to user
  const existingLead = await prisma.lead.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead');
  }

  // Update lead
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(value !== undefined && { value }),
      updatedAt: new Date(),
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true,
        },
      },
    },
  });

  logger.info(`Lead updated: ${lead.id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: { lead },
  });
};

/**
 * Delete lead
 */
export const deleteLead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if lead exists and belongs to user
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Delete lead
  await prisma.lead.delete({
    where: { id },
  });

  // Update campaign lead count
  if (lead.campaignId) {
    await prisma.campaign.update({
      where: { id: lead.campaignId },
      data: { leads: { decrement: 1 } },
    });
  }

  logger.info(`Lead deleted: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Lead deleted successfully',
  });
};

/**
 * Export leads to CSV
 */
export const exportLeads = async (req, res) => {
  const userId = req.user.id;
  const { campaignId, status, startDate, endDate } = req.query;
  
  // Build filter conditions
  const where = {
    userId,
    ...(status && { status }),
    ...(campaignId && { campaignId }),
    ...(startDate && endDate && {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
  };

  // Get leads for export
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: {
        select: {
          name: true,
          platform: true,
        },
      },
    },
  });

  // Convert to CSV format
  const csvHeaders = [
    'Name',
    'Email',
    'Phone',
    'Status',
    'Source',
    'Campaign',
    'Platform',
    'Value',
    'Notes',
    'Created Date',
  ].join(',');

  const csvRows = leads.map(lead => [
    `\"${lead.name}\"`,
    `\"${lead.email}\"`,
    `\"${lead.phone || ''}\"`,
    `\"${lead.status}\"`,
    `\"${lead.source}\"`,
    `\"${lead.campaign?.name || ''}\"`,
    `\"${lead.campaign?.platform || ''}\"`,
    `\"${lead.value || ''}\"`,
    `\"${lead.notes || ''}\"`,
    `\"${lead.createdAt.toISOString().split('T')[0]}\"`,
  ].join(','));

  const csv = [csvHeaders, ...csvRows].join('\
');

  logger.info(`Leads exported: ${leads.length} leads for user ${userId}`);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=\"leads-export.csv\"');
  res.send(csv);
};

/**
 * Get lead statistics
 */
export const getLeadStats = async (userId, dateRange = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const [totalLeads, newLeads, leadsByStatus, leadsByCampaign] = await Promise.all([
    // Total leads
    prisma.lead.count({
      where: { userId },
    }),
    
    // New leads in date range
    prisma.lead.count({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
    }),
    
    // Leads by status
    prisma.lead.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),
    
    // Leads by campaign
    prisma.lead.groupBy({
      by: ['campaignId'],
      where: {
        userId,
        campaignId: { not: null },
      },
      _count: { campaignId: true },
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    totalLeads,
    newLeads,
    leadsByStatus: leadsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {}),
    leadsByCampaign: leadsByCampaign.map(item => ({
      campaignId: item.campaignId,
      count: item._count.campaignId,
    })),
  };
};