import { prisma } from '../utils/database.js';
import { generateAIContent, generateAudienceSegmentation, generateCampaignStrategy } from './openaiService.js';
import { generateLandingPageImages } from './openaiService.js';
import { logger } from '../utils/logger.js';

/**
 * Generate comprehensive creatives for a campaign
 * @param {Object} campaign - Campaign object
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated creatives
 */
export const generateCampaignCreatives = async (campaign, options = {}) => {
  try {
    const {
      includeImages = true,
      includeVideo = false,
      creativesCount = 3,
      imageStyle = 'professional medical photography'
    } = options;

    // Get user's onboarding data for better context
    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId: campaign.userId }
    });

    // Build enhanced context for AI generation
    const context = {
      targetAudience: campaign.targetAudience,
      objectives: campaign.objectives,
      platform: campaign.platform,
      budget: campaign.budget,
      serviceType: onboardingData?.serviceType || 'Psychology Practice',
      city: onboardingData?.city,
      businessGoals: onboardingData?.businessGoals || [],
      averageTicket: onboardingData?.averageTicket,
      experience: onboardingData?.experience
    };

    const creatives = [];

    // Generate multiple creative variations
    for (let i = 0; i < creativesCount; i++) {
      const creative = {
        campaignId: campaign.id,
        type: 'IMAGE',
        isActive: true
      };

      // Generate AI text content
      const [headlines, descriptions, ctas] = await Promise.all([
        generateAIContent('headline', context),
        generateAIContent('description', context),
        generateAIContent('cta', context)
      ]);

      // Parse generated content
      const headlineOptions = headlines.split('\n').filter(h => h.trim()).slice(0, 5);
      const descriptionOptions = descriptions.split('\n').filter(d => d.trim()).slice(0, 5);
      const ctaOptions = ctas.split('\n').filter(c => c.trim()).slice(0, 5);

      // Select content for this creative (rotate through options)
      creative.headline = headlineOptions[i % headlineOptions.length] || 'Professional Care You Can Trust';
      creative.description = descriptionOptions[i % descriptionOptions.length] || 'Get expert help from licensed professionals';
      creative.cta = ctaOptions[i % ctaOptions.length] || 'Schedule Consultation';

      // Generate images if requested
      if (includeImages) {
        try {
          const imageResult = await generateCreativeImage(context, imageStyle, i);
          if (imageResult.success) {
            creative.imageUrl = imageResult.imageUrl;
          } else {
            logger.warn(`Image generation failed for creative ${i}:`, imageResult.error);
          }
        } catch (imageError) {
          logger.warn(`Image generation error for creative ${i}:`, imageError);
        }
      }

      creatives.push(creative);
    }

    // Save creatives to database
    const savedCreatives = await Promise.all(
      creatives.map(creative =>
        prisma.creative.create({ data: creative })
      )
    );

    // Update campaign with AI generated flag
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        aiGenerated: true,
        headlines: creatives.map(c => c.headline),
        descriptions: creatives.map(c => c.description)
      }
    });

    logger.info(`Generated ${savedCreatives.length} creatives for campaign ${campaign.id}`);

    return {
      success: true,
      creatives: savedCreatives,
      count: savedCreatives.length
    };

  } catch (error) {
    logger.error('Creative generation failed:', error);
    throw new Error(`Creative generation failed: ${error.message}`);
  }
};

/**
 * Generate creative image using DALL-E
 * @param {Object} context - Campaign context
 * @param {string} style - Image style
 * @param {number} variation - Variation number
 * @returns {Promise<Object>} Image generation result
 */
const generateCreativeImage = async (context, style, variation = 0) => {
  try {
    // Create diverse prompts for different creative variations
    const prompts = [
      `Professional ${context.serviceType} office environment, ${style}, welcoming and calming, natural lighting, modern design`,
      `Person feeling peaceful and confident after therapy, ${style}, positive emotions, professional setting, soft colors`,
      `Supportive therapeutic relationship, ${style}, professional consultation, safe space, trust and comfort`,
      `Mental wellness and growth concept, ${style}, professional healthcare, positive transformation, calming atmosphere`,
      `Professional counseling session, ${style}, supportive environment, confidentiality and trust, modern office`
    ];

    const selectedPrompt = prompts[variation % prompts.length];

    const imageResult = await generateLandingPageImages({
      businessType: context.serviceType,
      services: [context.serviceType],
      style: style
    });

    if (imageResult.success && imageResult.images.length > 0) {
      return {
        success: true,
        imageUrl: imageResult.images[0].url
      };
    } else {
      return {
        success: false,
        error: imageResult.warnings.join('; ')
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate CTA variations using AI
 * @param {Object} context - Campaign context
 * @returns {Promise<string>} Generated CTAs
 */
const generateCTAs = async (context) => {
  const ctaPrompt = `
Generate 5 compelling call-to-action phrases for ${context.serviceType} advertising. Each CTA should:
- Be 15-25 characters long
- Create urgency or motivation
- Be professional and appropriate for mental health services
- Avoid medical claims
- Include action verbs

Context:
- Service: ${context.serviceType}
- Target Audience: ${context.targetAudience}
- Business Goals: ${context.businessGoals?.join(', ') || 'Professional growth'}

Return only the CTAs, one per line, without quotes or numbers.
  `;

  return await generateAIContent('cta', { ...context, customPrompt: ctaPrompt });
};

/**
 * Test creative generation capabilities
 * @returns {Promise<Object>} Test results
 */
export const testCreativeGeneration = async () => {
  try {
    // Create a test context
    const testContext = {
      targetAudience: 'Adults seeking therapy for anxiety and depression',
      objectives: ['Generate leads', 'Increase awareness'],
      platform: 'META',
      budget: 1000,
      serviceType: 'Individual Therapy',
      city: 'New York'
    };

    // Test text generation
    const headlines = await generateAIContent('headline', testContext);
    const descriptions = await generateAIContent('description', testContext);

    // Test image generation (without saving)
    const imageTest = await generateCreativeImage(testContext, 'professional medical photography', 0);

    return {
      success: true,
      textGeneration: {
        headlines: headlines.split('\n').length,
        descriptions: descriptions.split('\n').length
      },
      imageGeneration: imageTest.success,
      errors: imageTest.success ? [] : [imageTest.error]
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get creative performance analytics
 * @param {string} creativeId - Creative ID
 * @returns {Promise<Object>} Performance data
 */
export const getCreativePerformance = async (creativeId) => {
  try {
    const creative = await prisma.creative.findUnique({
      where: { id: creativeId },
      include: {
        campaign: {
          select: {
            name: true,
            platform: true,
            budget: true
          }
        }
      }
    });

    if (!creative) {
      throw new Error('Creative not found');
    }

    // Calculate performance metrics
    const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0;
    const conversionRate = creative.clicks > 0 ? (creative.conversions / creative.clicks) * 100 : 0;

    return {
      creative: {
        id: creative.id,
        headline: creative.headline,
        description: creative.description,
        type: creative.type
      },
      performance: {
        impressions: creative.impressions,
        clicks: creative.clicks,
        conversions: creative.conversions,
        ctr: Math.round(ctr * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      campaign: creative.campaign
    };

  } catch (error) {
    logger.error('Creative performance retrieval failed:', error);
    throw new Error(`Failed to get creative performance: ${error.message}`);
  }
};

/**
 * Update creative performance data
 * @param {string} creativeId - Creative ID
 * @param {Object} metrics - Performance metrics
 * @returns {Promise<Object>} Updated creative
 */
export const updateCreativeMetrics = async (creativeId, metrics) => {
  try {
    const { impressions, clicks, conversions } = metrics;

    const updatedCreative = await prisma.creative.update({
      where: { id: creativeId },
      data: {
        impressions: impressions || 0,
        clicks: clicks || 0,
        conversions: conversions || 0,
        updatedAt: new Date()
      }
    });

    logger.info(`Creative metrics updated for ${creativeId}`, metrics);

    return updatedCreative;

  } catch (error) {
    logger.error('Creative metrics update failed:', error);
    throw new Error(`Failed to update creative metrics: ${error.message}`);
  }
};