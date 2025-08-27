import { generateChatResponse, generateAIContent, analyzeCampaignPerformance } from '../services/openaiService.js';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  AppError,
  NotFoundError,
} from '../middleware/errorHandler.js';

/**
 * AI Chat endpoint
 */
export const chat = async (req, res) => {
  const { message, context } = req.body;
  const userId = req.user.id;

  try {
    // Get user's campaigns for context
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        platform: true,
        status: true,
        budget: true,
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        leads: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5, // Limit context to avoid token limits
    });

    // Build enhanced context
    const enhancedContext = {
      ...context,
      campaigns,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
    };

    const response = await generateChatResponse(message, enhancedContext);

    logger.info(`AI chat response generated for user ${userId}`, {
      messageLength: message.length,
      responseLength: response.length,
    });

    res.json({
      success: true,
      data: {
        response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('AI chat failed:', error);
    throw new AppError('AI chat service temporarily unavailable');
  }
};

/**
 * Generate AI content
 */
export const generateContent = async (req, res) => {
  const { type, context } = req.body;
  const userId = req.user.id;

  try {
    const content = await generateAIContent(type, context);

    logger.info(`AI content generated for user ${userId}`, {
      type,
      contentLength: content.length,
    });

    res.json({
      success: true,
      data: {
        content,
        type,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('AI content generation failed:', error);
    throw new AppError('AI content generation service temporarily unavailable');
  }
};

/**
 * Analyze campaign performance
 */
export const analyzeCampaign = async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  // Get campaign with ownership check
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
    include: {
      _count: {
        select: {
          campaignLeads: true,
          creatives: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  try {
    const analysis = await analyzeCampaignPerformance(campaign);

    logger.info(`Campaign analysis generated for user ${userId}`, {
      campaignId,
      recommendationsCount: analysis.recommendations.length,
    });

    res.json({
      success: true,
      data: {
        analysis,
        campaignName: campaign.name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Campaign analysis failed:', error);
    throw new AppError('Campaign analysis service temporarily unavailable');
  }
};