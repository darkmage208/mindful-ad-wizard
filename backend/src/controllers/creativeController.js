import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  generateCampaignCreatives,
  getCreativePerformance,
  updateCreativeMetrics,
  testCreativeGeneration
} from '../services/creativeService.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../middleware/errorHandler.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';

/**
 * Generate comprehensive AI creatives for a campaign
 */
export const generateCreatives = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;
  const {
    includeImages = true,
    creativesCount = 3,
    imageStyle = 'professional medical photography',
    includeVideo = false
  } = req.body;

  // Get campaign with user ownership check
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
    include: {
      creatives: true
    }
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Limit number of creatives per campaign
  if (campaign.creatives.length + creativesCount > 10) {
    throw new ValidationError('Cannot generate more than 10 creatives per campaign');
  }

  try {
    // Generate comprehensive creatives using the enhanced creative service
    const result = await generateCampaignCreatives(campaign, {
      includeImages,
      creativesCount,
      imageStyle,
      includeVideo
    });

    if (!result.success) {
      throw new AppError('Creative generation failed');
    }

    logger.info(`${result.count} AI creatives generated for campaign: ${campaignId}`);

    res.json({
      success: true,
      message: `Successfully generated ${result.count} AI-powered creatives`,
      data: {
        creatives: result.creatives,
        count: result.count,
        imagesGenerated: result.creatives.filter(c => c.imageUrl).length,
        totalCreatives: campaign.creatives.length + result.count
      },
    });
  } catch (error) {
    logger.error('Creative generation failed:', error);
    throw new AppError(`Failed to generate creatives: ${error.message}`);
  }
});

/**
 * Get all creatives for a campaign
 */
export const getCampaignCreatives = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  // Verify campaign ownership
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  // Get creatives with performance data
  const creatives = await prisma.creative.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate performance metrics for each creative
  const creativesWithMetrics = creatives.map(creative => ({
    ...creative,
    metrics: {
      impressions: creative.impressions,
      clicks: creative.clicks,
      conversions: creative.conversions,
      ctr: creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0,
      conversionRate: creative.clicks > 0 ? (creative.conversions / creative.clicks) * 100 : 0,
    },
  }));

  res.json({
    success: true,
    data: {
      creatives: creativesWithMetrics,
      count: creatives.length,
      campaignName: campaign.name
    },
  });
});

/**
 * Get individual creative details
 */
export const getCreativeById = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get creative with campaign ownership check
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true,
          status: true,
        },
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  const performance = await getCreativePerformance(id);

  res.json({
    success: true,
    data: {
      creative,
      performance,
    },
  });
});

/**
 * Update creative content
 */
export const updateCreative = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { headline, description, cta, isActive } = req.body;

  // Verify creative ownership through campaign
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  // Update creative
  const updatedCreative = await prisma.creative.update({
    where: { id },
    data: {
      ...(headline && { headline }),
      ...(description && { description }),
      ...(cta && { cta }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    },
  });

  logger.info(`Creative updated: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Creative updated successfully',
    data: { creative: updatedCreative },
  });
});

/**
 * Delete creative
 */
export const deleteCreative = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify creative ownership through campaign
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
    include: {
      campaign: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  // Don't allow deleting creatives from active campaigns
  if (creative.campaign.status === 'ACTIVE') {
    throw new ValidationError('Cannot delete creatives from active campaigns. Pause campaign first.');
  }

  // Delete creative
  await prisma.creative.delete({
    where: { id },
  });

  logger.info(`Creative deleted: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Creative deleted successfully',
  });
});

/**
 * Update creative performance metrics (for API integrations)
 */
export const updateCreativeMetricsEndpoint = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { impressions, clicks, conversions } = req.body;

  // Verify creative ownership through campaign
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  // Update metrics
  const updatedCreative = await updateCreativeMetrics(id, {
    impressions,
    clicks,
    conversions,
  });

  res.json({
    success: true,
    message: 'Creative metrics updated successfully',
    data: { creative: updatedCreative },
  });
});

/**
 * Get creative performance analytics
 */
export const getCreativeAnalytics = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify creative ownership through campaign
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  const analytics = await getCreativePerformance(id);

  res.json({
    success: true,
    data: analytics,
  });
});

/**
 * Test creative generation capabilities
 */
export const testCreatives = asyncControllerHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Admin access required');
  }

  const testResult = await testCreativeGeneration();

  res.json({
    success: true,
    message: 'Creative generation test completed',
    data: testResult,
  });
});

/**
 * Duplicate creative with variations
 */
export const duplicateCreative = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { variations = 2 } = req.body;

  // Verify creative ownership
  const originalCreative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
    include: {
      campaign: true,
    },
  });

  if (!originalCreative) {
    throw new NotFoundError('Creative');
  }

  const duplicatedCreatives = [];

  // Create variations
  for (let i = 0; i < Math.min(variations, 5); i++) {
    const duplicated = await prisma.creative.create({
      data: {
        campaignId: originalCreative.campaignId,
        type: originalCreative.type,
        headline: `${originalCreative.headline} (v${i + 2})`,
        description: originalCreative.description,
        cta: originalCreative.cta,
        imageUrl: originalCreative.imageUrl,
        isActive: false, // Start inactive
      },
    });

    duplicatedCreatives.push(duplicated);
  }

  logger.info(`Created ${duplicatedCreatives.length} creative variations for ${id}`);

  res.json({
    success: true,
    message: `Created ${duplicatedCreatives.length} creative variations`,
    data: {
      original: originalCreative,
      variations: duplicatedCreatives,
    },
  });
});

/**
 * Toggle creative active status
 */
export const toggleCreativeStatus = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify creative ownership
  const creative = await prisma.creative.findFirst({
    where: {
      id,
      campaign: {
        userId,
      },
    },
  });

  if (!creative) {
    throw new NotFoundError('Creative');
  }

  // Toggle status
  const updatedCreative = await prisma.creative.update({
    where: { id },
    data: {
      isActive: !creative.isActive,
      updatedAt: new Date(),
    },
  });

  res.json({
    success: true,
    message: `Creative ${updatedCreative.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { creative: updatedCreative },
  });
});