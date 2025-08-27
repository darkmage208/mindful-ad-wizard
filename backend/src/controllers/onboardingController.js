import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler.js';

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

  // Create initial campaign based on onboarding data
  const initialCampaign = await prisma.campaign.create({
    data: {
      userId,
      name: `${serviceType} - Lead Generation`,
      platform: budget >= 2000 ? 'BOTH' : 'META', // Use both platforms for higher budgets
      budget,
      targetAudience,
      objectives: businessGoals.slice(0, 3), // Take first 3 goals
      status: 'DRAFT',
    },
  });

  logger.info(`Onboarding completed for user ${userId}`, {
    serviceType,
    budget,
    experience,
    campaignId: initialCampaign.id,
  });

  res.json({
    success: true,
    message: 'Onboarding completed successfully',
    data: {
      onboarding: onboardingData,
      initialCampaign: {
        id: initialCampaign.id,
        name: initialCampaign.name,
        platform: initialCampaign.platform,
      },
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