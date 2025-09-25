import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { generateAIContent, generateAudienceSegmentation, generateCampaignStrategy } from '../services/openaiService.js';
import { generateCampaignCreatives } from '../services/creativeService.js';
import { createMetaCampaign, updateMetaCampaign, pauseMetaCampaign } from '../services/metaAdsService.js';
import { createGoogleCampaign, updateGoogleCampaign, pauseGoogleCampaign } from '../services/googleAdsService.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../middleware/errorHandler.js';

/**
 * Create new campaign
 */
export const createCampaign = async (req, res) => {
  const { name, platform, budget, targetAudience, objectives } = req.body;
  const userId = req.user.id;

  // Create campaign in database
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name,
      platform,
      budget,
      targetAudience,
      objectives,
      status: 'DRAFT',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  logger.info(`Campaign created: ${campaign.id} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    data: { campaign },
  });
};

/**
 * Get user's campaigns
 */
export const getCampaigns = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status, platform, search } = req.query;
  
  const skip = (page - 1) * limit;
  
  // Build filter conditions
  const where = {
    userId,
    ...(status && { status }),
    ...(platform && { platform }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { targetAudience: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Get campaigns with pagination
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            creatives: true,
            campaignLeads: true,
          },
        },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  // Calculate metrics for each campaign
  const campaignsWithMetrics = campaigns.map(campaign => ({
    ...campaign,
    metrics: {
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      cost: campaign.cost,
      leads: campaign.leads,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
      cpl: campaign.leads > 0 ? campaign.cost / campaign.leads : 0,
    },
  }));

  res.json({
    success: true,
    data: {
      campaigns: campaignsWithMetrics,
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
 * Get campaign by ID
 */
export const getCampaignById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      creatives: true,
      _count: {
        select: {
          campaignLeads: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Add calculated metrics
  const campaignWithMetrics = {
    ...campaign,
    metrics: {
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      cost: campaign.cost,
      leads: campaign.leads,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
      cpl: campaign.leads > 0 ? campaign.cost / campaign.leads : 0,
    },
  };

  res.json({
    success: true,
    data: { campaign: campaignWithMetrics },
  });
};

/**
 * Update campaign
 */
export const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  // Check if campaign exists and belongs to user
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existingCampaign) {
    throw new NotFoundError('Campaign');
  }

  // Don't allow updating certain fields for active campaigns
  if (existingCampaign.status === 'ACTIVE') {
    const restrictedFields = ['platform', 'targetAudience'];
    const hasRestrictedUpdates = restrictedFields.some(field => updateData.hasOwnProperty(field));
    
    if (hasRestrictedUpdates) {
      throw new ValidationError('Cannot update platform or target audience for active campaigns');
    }
  }

  // Update campaign
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Update external campaigns if needed
  try {
    if (campaign.status === 'ACTIVE') {
      if (campaign.platform === 'META' || campaign.platform === 'BOTH') {
        await updateMetaCampaign(campaign.metaCampaignId, updateData);
      }
      
      if (campaign.platform === 'GOOGLE' || campaign.platform === 'BOTH') {
        await updateGoogleCampaign(campaign.googleCampaignId, updateData);
      }
    }
  } catch (error) {
    logger.warn('Failed to update external campaign:', error);
  }

  logger.info(`Campaign updated: ${campaign.id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Campaign updated successfully',
    data: { campaign },
  });
};

/**
 * Delete campaign
 */
export const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if campaign exists and belongs to user
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Don't allow deleting active campaigns
  if (campaign.status === 'ACTIVE') {
    throw new ValidationError('Cannot delete active campaign. Please pause it first.');
  }

  // Delete campaign
  await prisma.campaign.delete({
    where: { id },
  });

  logger.info(`Campaign deleted: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Campaign deleted successfully',
  });
};

/**
 * Generate AI creatives for campaign
 */
export const generateCreatives = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  try {
    // Generate AI content
    const context = {
      targetAudience: campaign.targetAudience,
      objectives: campaign.objectives,
      platform: campaign.platform,
      budget: campaign.budget,
      serviceType: 'psychology practice', // Could be dynamic based on user data
    };

    const [headlines, descriptions, keywords] = await Promise.all([
      generateAIContent('headline', context),
      generateAIContent('description', context),
      generateAIContent('keywords', context),
    ]);

    // Update campaign with generated content
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        aiGenerated: true,
        headlines: headlines.split('\
').filter(h => h.trim()),
        descriptions: descriptions.split('\
').filter(d => d.trim()),
        keywords: keywords.split('\
').filter(k => k.trim()),
      },
    });

    logger.info(`AI content generated for campaign: ${id}`);

    res.json({
      success: true,
      message: 'AI content generated successfully',
      data: {
        headlines: updatedCampaign.headlines,
        descriptions: updatedCampaign.descriptions,
        keywords: updatedCampaign.keywords,
      },
    });
  } catch (error) {
    logger.error('AI content generation failed:', error);
    throw new AppError('Failed to generate AI content');
  }
};

/**
 * Approve and launch campaign
 */
export const approveCampaign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING') {
    throw new ValidationError('Campaign must be in draft or pending status to approve');
  }

  try {
    let metaCampaignId = null;
    let googleCampaignId = null;

    // Create external campaigns
    if (campaign.platform === 'META' || campaign.platform === 'BOTH') {
      metaCampaignId = await createMetaCampaign(campaign);
    }
    
    if (campaign.platform === 'GOOGLE' || campaign.platform === 'BOTH') {
      googleCampaignId = await createGoogleCampaign(campaign);
    }

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        metaCampaignId,
        googleCampaignId,
      },
    });

    logger.info(`Campaign approved and launched: ${id}`);

    res.json({
      success: true,
      message: 'Campaign approved and launched successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    logger.error('Campaign approval failed:', error);
    
    // Update campaign status to reflect failure
    await prisma.campaign.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    
    throw new AppError('Failed to launch campaign on advertising platforms');
  }
};

/**
 * Pause campaign
 */
export const pauseCampaign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  if (campaign.status !== 'ACTIVE') {
    throw new ValidationError('Campaign must be active to pause');
  }

  try {
    // Pause external campaigns
    if (campaign.metaCampaignId) {
      await pauseMetaCampaign(campaign.metaCampaignId);
    }
    
    if (campaign.googleCampaignId) {
      await pauseGoogleCampaign(campaign.googleCampaignId);
    }

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    logger.info(`Campaign paused: ${id}`);

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    logger.error('Campaign pause failed:', error);
    throw new AppError('Failed to pause campaign');
  }
};

/**
 * Activate campaign
 */
export const activateCampaign = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  if (campaign.status !== 'PAUSED') {
    throw new ValidationError('Campaign must be paused to activate');
  }

  try {
    // Reactivate external campaigns
    if (campaign.metaCampaignId) {
      await updateMetaCampaign(campaign.metaCampaignId, { status: 'ACTIVE' });
    }
    
    if (campaign.googleCampaignId) {
      await updateGoogleCampaign(campaign.googleCampaignId, { status: 'ENABLED' });
    }

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    logger.info(`Campaign activated: ${id}`);

    res.json({
      success: true,
      message: 'Campaign activated successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    logger.error('Campaign activation failed:', error);
    throw new AppError('Failed to activate campaign');
  }
};

/**
 * Get campaign metrics
 */
export const getCampaignMetrics = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Get metrics from database (would be updated by scheduled jobs)
  const metrics = {
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    cost: campaign.cost,
    leads: campaign.leads,
    ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
    cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
    cpl: campaign.leads > 0 ? campaign.cost / campaign.leads : 0,
    conversionRate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0,
  };

  res.json({
    success: true,
    data: { metrics },
  });
};

/**
 * Get campaign leads
 */
export const getCampaignLeads = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  // Verify campaign ownership
  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const skip = (page - 1) * limit;

  // Get leads for this campaign
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { campaignId: id },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where: { campaignId: id } }),
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
 * Generate comprehensive AI-powered campaign with segmentation, creatives, and strategy
 */
export const generateAICampaign = async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;
  const {
    includeImages = true,
    creativesCount = 3,
    imageStyle = 'professional medical photography',
    autoSegment = true,
    generateStrategy = true
  } = req.body;

  // Get campaign with user ownership check
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  try {
    const result = {
      campaignId,
      segments: null,
      strategy: null,
      creatives: [],
      success: true,
      messages: []
    };

    // Get user's onboarding data for context
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId }
    });

    if (!onboardingData) {
      result.messages.push('No onboarding data found - using basic targeting');
    }

    // 1. Generate audience segmentation if requested
    if (autoSegment && onboardingData) {
      try {
        result.segments = await generateAudienceSegmentation(onboardingData);
        result.messages.push(`Generated ${result.segments.segments.length} audience segments`);
        logger.info(`AI segmentation generated for campaign ${campaignId}`);
      } catch (segmentError) {
        logger.warn('Segmentation generation failed:', segmentError);
        result.messages.push('Segmentation generation failed - using default targeting');
      }
    }

    // 2. Generate campaign strategy if requested
    if (generateStrategy) {
      try {
        const segments = result.segments || { segments: [] };
        result.strategy = await generateCampaignStrategy(campaign, segments);
        result.messages.push('Campaign strategy generated successfully');
        logger.info(`AI strategy generated for campaign ${campaignId}`);
      } catch (strategyError) {
        logger.warn('Strategy generation failed:', strategyError);
        result.messages.push('Strategy generation failed - using basic recommendations');
      }
    }

    // 3. Generate AI creatives
    try {
      const creativesResult = await generateCampaignCreatives(campaign, {
        includeImages,
        creativesCount,
        imageStyle,
        includeVideo: false
      });

      if (creativesResult.success) {
        result.creatives = creativesResult.creatives;
        result.messages.push(`Generated ${creativesResult.count} AI creatives with ${creativesResult.creatives.filter(c => c.imageUrl).length} images`);
      } else {
        result.messages.push('Creative generation partially failed');
      }
    } catch (creativeError) {
      logger.error('Creative generation failed:', creativeError);
      result.messages.push('Creative generation failed');
      result.success = false;
    }

    // 4. Update campaign with AI metadata
    if (result.segments || result.strategy) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          aiGenerated: true,
          aiSegments: result.segments ? JSON.stringify(result.segments) : null,
          aiStrategy: result.strategy ? JSON.stringify(result.strategy) : null,
          updatedAt: new Date(),
        }
      });
    }

    logger.info(`Comprehensive AI campaign generation completed for ${campaignId}`);

    res.json({
      success: result.success,
      message: 'AI campaign generation completed',
      data: result
    });

  } catch (error) {
    logger.error('AI campaign generation failed:', error);
    throw new AppError(`AI campaign generation failed: ${error.message}`);
  }
};