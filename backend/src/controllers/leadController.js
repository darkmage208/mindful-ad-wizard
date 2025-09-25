import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { sendLeadNotification } from '../services/emailService.js';
import {
  getLeadManagement,
  generateMessageSuggestions,
  executeAutomatedFollowUp,
  executeBulkLeadOperation
} from '../services/leadManagementService.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';
import {
  AppError,
  NotFoundError,
  BadRequestError
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
 * Get comprehensive lead management dashboard with AI insights
 */
export const getLeadManagementDashboard = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const filters = {
    status: req.query.status,
    source: req.query.source,
    priority: req.query.priority,
    date_range: req.query.date_range || '30d',
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    sort_by: req.query.sort_by || 'createdAt',
    sort_order: req.query.sort_order || 'desc',
    search: req.query.search
  };

  const managementData = await getLeadManagement(userId, filters);

  res.json({
    success: true,
    data: {
      lead_management: managementData
    }
  });
});

/**
 * Generate AI-powered message suggestions for lead outreach
 */
export const getMessageSuggestions = asyncControllerHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { message_type = 'follow_up', context = {} } = req.body;
  const userId = req.user.id;

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId }
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const suggestions = await generateMessageSuggestions(leadId, message_type, context);

  res.json({
    success: true,
    data: {
      message_suggestions: suggestions
    }
  });
});

/**
 * Execute automated follow-up sequence
 */
export const executeFollowUpSequence = asyncControllerHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { sequence_type = 'standard_follow_up' } = req.body;
  const userId = req.user.id;

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId }
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const result = await executeAutomatedFollowUp(leadId, sequence_type, userId);

  res.json({
    success: true,
    message: 'Follow-up sequence executed successfully',
    data: {
      follow_up_result: result
    }
  });
});

/**
 * Execute bulk lead operations
 */
export const executeBulkOperation = asyncControllerHandler(async (req, res) => {
  const { operation, lead_ids, parameters = {} } = req.body;
  const userId = req.user.id;

  if (!operation || !lead_ids || !Array.isArray(lead_ids)) {
    throw new BadRequestError('Operation and lead_ids array are required');
  }

  if (lead_ids.length === 0) {
    throw new BadRequestError('At least one lead ID is required');
  }

  if (lead_ids.length > 100) {
    throw new BadRequestError('Maximum 100 leads can be processed in one bulk operation');
  }

  const results = await executeBulkLeadOperation(userId, operation, lead_ids, parameters);

  res.json({
    success: true,
    message: 'Bulk operation completed',
    data: {
      bulk_operation_results: results
    }
  });
});

/**
 * Add interaction to lead
 */
export const addLeadInteraction = asyncControllerHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { type, channel, content, successful = true, metadata = {} } = req.body;
  const userId = req.user.id;

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId }
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const interaction = await prisma.leadInteraction.create({
    data: {
      leadId,
      type,
      channel,
      content,
      successful,
      metadata,
      createdAt: new Date()
    }
  });

  // Update lead's last contacted timestamp
  await prisma.lead.update({
    where: { id: leadId },
    data: { lastContactedAt: new Date() }
  });

  logger.info(`Lead interaction added: ${interaction.id} for lead ${leadId}`);

  res.status(201).json({
    success: true,
    message: 'Lead interaction added successfully',
    data: { interaction }
  });
});

/**
 * Add note to lead
 */
export const addLeadNote = asyncControllerHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { content, category = 'GENERAL' } = req.body;
  const userId = req.user.id;

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId }
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const note = await prisma.leadNote.create({
    data: {
      leadId,
      content,
      category,
      aiGenerated: false,
      createdAt: new Date()
    }
  });

  logger.info(`Lead note added: ${note.id} for lead ${leadId}`);

  res.status(201).json({
    success: true,
    message: 'Lead note added successfully',
    data: { note }
  });
});

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