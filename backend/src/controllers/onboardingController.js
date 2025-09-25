import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  BadRequestError,
} from '../middleware/errorHandler.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';

/**
 * Submit onboarding data
 */
export const submitOnboarding = async (req, res) => {
  const {
    city,
    targetAudience,
    averageTicket,
    serviceType,
    businessGoals,
    budget,
    experience,
  } = req.body;
  const userId = req.user.id;

  // Check if onboarding already exists
  const existingOnboarding = await prisma.onboardingData.findUnique({
    where: { userId },
  });

  if (existingOnboarding && existingOnboarding.completed) {
    throw new ConflictError('Onboarding already completed');
  }

  // Create or update onboarding data
  const onboardingData = await prisma.onboardingData.upsert({
    where: { userId },
    update: {
      city,
      targetAudience,
      averageTicket,
      serviceType,
      businessGoals,
      budget,
      experience,
      completed: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      city,
      targetAudience,
      averageTicket,
      serviceType,
      businessGoals,
      budget,
      experience,
      completed: true,
    },
  });

  // Generate initial campaigns based on onboarding data
  const campaignSuggestions = generateCampaignSuggestions(onboardingData);

  const createdCampaigns = [];
  for (const suggestion of campaignSuggestions) {
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: suggestion.name,
        platform: suggestion.platform,
        budget: suggestion.budget,
        targetAudience: suggestion.targetAudience,
        objectives: suggestion.objectives,
        headlines: suggestion.headlines,
        descriptions: suggestion.descriptions,
        keywords: suggestion.keywords,
        aiGenerated: true,
        status: 'DRAFT',
      },
    });
    createdCampaigns.push(campaign);
  }

  logger.info(`Onboarding completed for user ${userId}`, {
    serviceType,
    budget,
    experience,
    campaignCount: createdCampaigns.length,
  });

  res.json({
    success: true,
    message: 'Onboarding completed successfully',
    data: {
      onboarding: onboardingData,
      campaigns: createdCampaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        budget: campaign.budget,
        status: campaign.status,
      })),
      campaignCount: createdCampaigns.length,
    },
  });
};

/**
 * Get onboarding data
 */
export const getOnboardingData = async (req, res) => {
  const userId = req.user.id;

  const onboardingData = await prisma.onboardingData.findUnique({
    where: { userId },
  });

  if (!onboardingData) {
    return res.json({
      success: true,
      data: {
        onboarding: null,
        completed: false,
      },
    });
  }

  res.json({
    success: true,
    data: {
      onboarding: onboardingData,
      completed: onboardingData.completed,
    },
  });
};

/**
 * Update onboarding data
 */
export const updateOnboardingData = async (req, res) => {
  const {
    city,
    targetAudience,
    averageTicket,
    serviceType,
    businessGoals,
    budget,
    experience,
  } = req.body;
  const userId = req.user.id;

  // Check if onboarding exists
  const existingOnboarding = await prisma.onboardingData.findUnique({
    where: { userId },
  });

  if (!existingOnboarding) {
    throw new NotFoundError('Onboarding data');
  }

  // Update onboarding data
  const onboardingData = await prisma.onboardingData.update({
    where: { userId },
    data: {
      city,
      targetAudience,
      averageTicket,
      serviceType,
      businessGoals,
      budget,
      experience,
      updatedAt: new Date(),
    },
  });

  logger.info(`Onboarding updated for user ${userId}`);

  res.json({
    success: true,
    message: 'Onboarding data updated successfully',
    data: { onboarding: onboardingData },
  });
};

/**
 * Generate additional campaigns based on updated onboarding data
 */
export const generateAdditionalCampaigns = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;

  // Get onboarding data
  const onboardingData = await prisma.onboardingData.findUnique({
    where: { userId },
  });

  if (!onboardingData) {
    throw new NotFoundError('Please complete onboarding first');
  }

  // Generate campaign suggestions
  const campaignSuggestions = generateCampaignSuggestions(onboardingData);

  // Create campaigns
  const createdCampaigns = [];
  for (const suggestion of campaignSuggestions) {
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: suggestion.name,
        platform: suggestion.platform,
        budget: suggestion.budget,
        targetAudience: suggestion.targetAudience,
        objectives: suggestion.objectives,
        headlines: suggestion.headlines,
        descriptions: suggestion.descriptions,
        keywords: suggestion.keywords,
        aiGenerated: true,
        status: 'DRAFT',
      },
    });
    createdCampaigns.push(campaign);
  }

  logger.info(`Generated ${createdCampaigns.length} additional campaigns for user: ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Additional campaigns generated successfully',
    data: {
      campaigns: createdCampaigns,
      count: createdCampaigns.length,
    },
  });
});

/**
 * Get onboarding completion status
 */
export const getOnboardingStatus = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;

  const onboardingData = await prisma.onboardingData.findUnique({
    where: { userId },
    select: {
      id: true,
      completed: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: {
      completed: !!onboardingData?.completed,
      onboardingId: onboardingData?.id || null,
      completedAt: onboardingData?.createdAt || null,
    },
  });
});

/**
 * Helper function to generate campaign suggestions based on onboarding data
 */
function generateCampaignSuggestions(onboardingData) {
  const { serviceType, targetAudience, budget, businessGoals, city, averageTicket } = onboardingData;
  const suggestions = [];

  // Calculate budget allocation
  const totalBudget = budget;
  const metaBudget = Math.round(totalBudget * 0.6); // 60% for Meta
  const googleBudget = Math.round(totalBudget * 0.4); // 40% for Google

  // Generate service-specific campaigns
  const serviceTemplates = {
    'healthcare': {
      metaCampaign: {
        name: `${serviceType} Services in ${city}`,
        headlines: [
          `Professional ${serviceType} in ${city}`,
          `Expert ${serviceType} Near You`,
          `Trusted ${serviceType} Services`
        ],
        descriptions: [
          `Get professional ${serviceType.toLowerCase()} services in ${city}. Book your consultation today.`,
          `Experienced ${serviceType.toLowerCase()} professionals serving ${city} and surrounding areas.`
        ],
        keywords: [`${serviceType.toLowerCase()}`, `${serviceType.toLowerCase()} ${city.toLowerCase()}`, 'healthcare', 'medical services'],
        objectives: ['CONVERSIONS', 'TRAFFIC']
      },
      googleCampaign: {
        name: `${serviceType} - Search Campaign`,
        headlines: [
          `${serviceType} in ${city}`,
          `Book ${serviceType} Today`,
          `Professional ${serviceType}`
        ],
        descriptions: [
          `Professional ${serviceType.toLowerCase()} services. Call now to schedule your appointment.`,
          `Trusted ${serviceType.toLowerCase()} in ${city}. Same-day appointments available.`
        ],
        keywords: [
          `${serviceType.toLowerCase()} near me`,
          `${serviceType.toLowerCase()} ${city.toLowerCase()}`,
          `best ${serviceType.toLowerCase()}`,
          `${serviceType.toLowerCase()} appointment`
        ],
        objectives: ['SEARCH', 'CONVERSIONS']
      }
    },
    'fitness': {
      metaCampaign: {
        name: `${serviceType} Programs in ${city}`,
        headlines: [
          `Transform Your Fitness in ${city}`,
          `Professional ${serviceType} Training`,
          `Achieve Your Fitness Goals`
        ],
        descriptions: [
          `Join our ${serviceType.toLowerCase()} programs in ${city}. Start your transformation today.`,
          `Professional fitness coaching tailored to your goals. Get results with our proven methods.`
        ],
        keywords: [`${serviceType.toLowerCase()}`, 'fitness', `gym ${city.toLowerCase()}`, 'personal training'],
        objectives: ['CONVERSIONS', 'BRAND_AWARENESS']
      },
      googleCampaign: {
        name: `${serviceType} - Local Search`,
        headlines: [
          `${serviceType} in ${city}`,
          `Personal Training`,
          `Fitness Programs`
        ],
        descriptions: [
          `Professional ${serviceType.toLowerCase()} in ${city}. Free consultation available.`,
          `Achieve your fitness goals with expert coaching and personalized programs.`
        ],
        keywords: [
          `${serviceType.toLowerCase()} near me`,
          `personal trainer ${city.toLowerCase()}`,
          'fitness programs',
          `gym ${city.toLowerCase()}`
        ],
        objectives: ['SEARCH', 'CONVERSIONS']
      }
    },
    'business_services': {
      metaCampaign: {
        name: `${serviceType} for Businesses`,
        headlines: [
          `Professional ${serviceType}`,
          `Grow Your Business`,
          `Expert Business Solutions`
        ],
        descriptions: [
          `Professional ${serviceType.toLowerCase()} services to help your business grow and succeed.`,
          `Expert business solutions tailored to your needs. Get a free consultation today.`
        ],
        keywords: [`${serviceType.toLowerCase()}`, 'business services', 'consulting', 'professional services'],
        objectives: ['LEAD_GENERATION', 'CONVERSIONS']
      },
      googleCampaign: {
        name: `${serviceType} - Business Solutions`,
        headlines: [
          `${serviceType} Services`,
          `Business Solutions`,
          `Professional Consulting`
        ],
        descriptions: [
          `Expert ${serviceType.toLowerCase()} services for businesses. Improve efficiency and growth.`,
          `Professional business solutions with proven results. Contact us for a consultation.`
        ],
        keywords: [
          `${serviceType.toLowerCase()} services`,
          'business consulting',
          'professional services',
          `${serviceType.toLowerCase()} consultant`
        ],
        objectives: ['SEARCH', 'LEAD_GENERATION']
      }
    }
  };

  // Determine service category
  let serviceCategory = 'business_services';
  const lowerServiceType = serviceType.toLowerCase();

  if (lowerServiceType.includes('health') || lowerServiceType.includes('medical') ||
      lowerServiceType.includes('therapy') || lowerServiceType.includes('clinic')) {
    serviceCategory = 'healthcare';
  } else if (lowerServiceType.includes('fitness') || lowerServiceType.includes('gym') ||
             lowerServiceType.includes('training') || lowerServiceType.includes('wellness')) {
    serviceCategory = 'fitness';
  }

  const templates = serviceTemplates[serviceCategory];

  // Meta Campaign
  suggestions.push({
    name: templates.metaCampaign.name,
    platform: 'META',
    budget: metaBudget,
    targetAudience: `${targetAudience} in ${city}`,
    objectives: templates.metaCampaign.objectives,
    headlines: templates.metaCampaign.headlines,
    descriptions: templates.metaCampaign.descriptions,
    keywords: templates.metaCampaign.keywords,
  });

  // Google Campaign
  suggestions.push({
    name: templates.googleCampaign.name,
    platform: 'GOOGLE',
    budget: googleBudget,
    targetAudience: `${targetAudience} searching for ${serviceType.toLowerCase()}`,
    objectives: templates.googleCampaign.objectives,
    headlines: templates.googleCampaign.headlines,
    descriptions: templates.googleCampaign.descriptions,
    keywords: templates.googleCampaign.keywords,
  });

  // If budget allows, create a retargeting campaign
  if (totalBudget > 1000) {
    suggestions.push({
      name: `${serviceType} - Retargeting Campaign`,
      platform: 'META',
      budget: Math.min(300, Math.round(totalBudget * 0.15)),
      targetAudience: `People who visited your website but didn't convert`,
      objectives: ['CONVERSIONS'],
      headlines: [
        `Still Interested in ${serviceType}?`,
        `Complete Your Booking Today`,
        `Don't Miss Out - Special Offer`
      ],
      descriptions: [
        `You showed interest in our ${serviceType.toLowerCase()} services. Book now and get a special discount.`,
        `Complete your booking for ${serviceType.toLowerCase()} services. Limited time offer available.`
      ],
      keywords: ['retargeting', serviceType.toLowerCase(), 'conversion'],
    });
  }

  return suggestions;
}