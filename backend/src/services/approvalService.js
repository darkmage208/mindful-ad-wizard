import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { createMetaCampaign, createLeadGenCampaign } from './metaAdsService.js';
import { createGoogleCampaign, createPsychologyCampaign } from './googleAdsService.js';
import { sendEmail } from './emailService.js';

/**
 * Campaign approval workflow states
 */
export const APPROVAL_STATES = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_CHANGES: 'NEEDS_CHANGES',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED'
};

/**
 * Submit campaign for approval
 * @param {string} campaignId - Campaign ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Approval submission result
 */
export const submitForApproval = async (campaignId, userId) => {
  try {
    // Get campaign with related data
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        creatives: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'DRAFT') {
      throw new Error('Campaign must be in draft status to submit for approval');
    }

    // Validate campaign for submission
    const validation = await validateCampaignForApproval(campaign);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Update campaign status to pending review
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'PENDING',
        updatedAt: new Date()
      }
    });

    // Create approval record
    const approvalRecord = await prisma.campaignApproval.create({
      data: {
        campaignId,
        userId,
        status: APPROVAL_STATES.PENDING_REVIEW,
        submittedAt: new Date(),
        reviewData: {
          budget: campaign.budget,
          platform: campaign.platform,
          creativesCount: campaign.creatives.length,
          targetAudience: campaign.targetAudience,
          objectives: campaign.objectives
        }
      }
    });

    // Send notification emails
    await sendApprovalNotifications(campaign, 'submitted');

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: 'CAMPAIGN_ALERT',
        title: 'Campaign Submitted for Review',
        message: `Your campaign "${campaign.name}" has been submitted for review. We'll notify you once it's approved.`,
        data: {
          campaignId,
          approvalId: approvalRecord.id
        }
      }
    });

    logger.info(`Campaign submitted for approval: ${campaignId}`);

    return {
      success: true,
      campaign: updatedCampaign,
      approvalId: approvalRecord.id,
      estimatedReviewTime: '2-4 business hours'
    };

  } catch (error) {
    logger.error('Campaign approval submission failed:', error);
    throw new Error(`Failed to submit campaign for approval: ${error.message}`);
  }
};

/**
 * Approve campaign and launch on advertising platforms
 * @param {string} campaignId - Campaign ID
 * @param {string} adminId - Admin user ID
 * @param {Object} approvalData - Approval data
 * @returns {Promise<Object>} Approval result
 */
export const approveCampaign = async (campaignId, adminId, approvalData = {}) => {
  try {
    // Get campaign with all related data
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creatives: true,
        user: {
          select: { id: true, name: true, email: true },
          include: {
            onboardingData: true
          }
        },
        landingPages: {
          select: { slug: true },
          take: 1
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'PENDING') {
      throw new Error('Campaign must be pending approval');
    }

    const launchResults = {
      meta: null,
      google: null,
      errors: []
    };

    // Enhanced campaign data for platform creation
    const enhancedCampaignData = {
      ...campaign,
      landingPageSlug: campaign.landingPages[0]?.slug,
      serviceType: campaign.user.onboardingData?.serviceType,
      city: campaign.user.onboardingData?.city,
      averageTicket: campaign.user.onboardingData?.averageTicket
    };

    // Create campaigns on external platforms
    try {
      if (campaign.platform === 'META' || campaign.platform === 'BOTH') {
        if (approvalData.useLeadGen) {
          launchResults.meta = await createLeadGenCampaign(enhancedCampaignData);
        } else {
          launchResults.meta = await createMetaCampaign(enhancedCampaignData);
        }
      }
    } catch (metaError) {
      logger.error('Meta campaign creation failed:', metaError);
      launchResults.errors.push(`Meta Ads: ${metaError.message}`);
    }

    try {
      if (campaign.platform === 'GOOGLE' || campaign.platform === 'BOTH') {
        if (approvalData.usePsychologyTargeting) {
          launchResults.google = await createPsychologyCampaign(enhancedCampaignData);
        } else {
          launchResults.google = await createGoogleCampaign(enhancedCampaignData);
        }
      }
    } catch (googleError) {
      logger.error('Google campaign creation failed:', googleError);
      launchResults.errors.push(`Google Ads: ${googleError.message}`);
    }

    // Update campaign with external IDs and status
    const updateData = {
      status: launchResults.errors.length === 0 ? 'ACTIVE' : 'DRAFT',
      updatedAt: new Date()
    };

    if (launchResults.meta) {
      updateData.metaCampaignId = typeof launchResults.meta === 'string'
        ? launchResults.meta
        : launchResults.meta.campaignId;
    }

    if (launchResults.google) {
      updateData.googleCampaignId = typeof launchResults.google === 'string'
        ? launchResults.google
        : launchResults.google.campaignId;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData
    });

    // Update approval record
    await prisma.campaignApproval.updateMany({
      where: {
        campaignId,
        status: APPROVAL_STATES.PENDING_REVIEW
      },
      data: {
        status: APPROVAL_STATES.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: approvalData.notes || 'Campaign approved and launched successfully',
        platformResults: launchResults
      }
    });

    // Send success notifications
    await sendApprovalNotifications(campaign, 'approved');

    // Create success notification
    await prisma.notification.create({
      data: {
        userId: campaign.userId,
        type: 'CAMPAIGN_ALERT',
        title: 'Campaign Approved & Launched!',
        message: launchResults.errors.length === 0
          ? `Your campaign "${campaign.name}" is now live and generating leads!`
          : `Your campaign "${campaign.name}" was approved but had some platform issues. Please contact support.`,
        data: {
          campaignId,
          platformResults: launchResults
        }
      }
    });

    logger.info(`Campaign approved and launched: ${campaignId}`, {
      metaSuccess: !!launchResults.meta,
      googleSuccess: !!launchResults.google,
      errors: launchResults.errors.length
    });

    return {
      success: true,
      campaign: updatedCampaign,
      platformResults: launchResults,
      message: launchResults.errors.length === 0
        ? 'Campaign approved and launched successfully'
        : 'Campaign approved with some platform errors'
    };

  } catch (error) {
    logger.error('Campaign approval failed:', error);
    throw new Error(`Failed to approve campaign: ${error.message}`);
  }
};

/**
 * Reject campaign with feedback
 * @param {string} campaignId - Campaign ID
 * @param {string} adminId - Admin user ID
 * @param {Object} rejectionData - Rejection reasons and feedback
 * @returns {Promise<Object>} Rejection result
 */
export const rejectCampaign = async (campaignId, adminId, rejectionData) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'PENDING') {
      throw new Error('Campaign must be pending approval');
    }

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: rejectionData.needsChanges ? 'DRAFT' : 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Update approval record
    await prisma.campaignApproval.updateMany({
      where: {
        campaignId,
        status: APPROVAL_STATES.PENDING_REVIEW
      },
      data: {
        status: rejectionData.needsChanges ? APPROVAL_STATES.NEEDS_CHANGES : APPROVAL_STATES.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: rejectionData.feedback,
        rejectionReasons: rejectionData.reasons
      }
    });

    // Send rejection notification
    await sendApprovalNotifications(campaign, 'rejected', rejectionData);

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: campaign.userId,
        type: 'CAMPAIGN_ALERT',
        title: rejectionData.needsChanges ? 'Campaign Needs Changes' : 'Campaign Rejected',
        message: rejectionData.needsChanges
          ? `Your campaign "${campaign.name}" needs some changes before approval. Please review our feedback and resubmit.`
          : `Your campaign "${campaign.name}" was not approved. Please review our feedback and create a new campaign.`,
        data: {
          campaignId,
          feedback: rejectionData.feedback,
          reasons: rejectionData.reasons
        }
      }
    });

    logger.info(`Campaign ${rejectionData.needsChanges ? 'needs changes' : 'rejected'}: ${campaignId}`);

    return {
      success: true,
      campaign: updatedCampaign,
      feedback: rejectionData.feedback,
      needsChanges: rejectionData.needsChanges
    };

  } catch (error) {
    logger.error('Campaign rejection failed:', error);
    throw new Error(`Failed to reject campaign: ${error.message}`);
  }
};

/**
 * Validate campaign for approval submission
 */
const validateCampaignForApproval = async (campaign) => {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!campaign.name || campaign.name.trim().length < 3) {
    errors.push('Campaign name must be at least 3 characters long');
  }

  if (!campaign.targetAudience || campaign.targetAudience.trim().length < 10) {
    errors.push('Target audience description must be at least 10 characters');
  }

  if (!campaign.objectives || campaign.objectives.length === 0) {
    errors.push('At least one campaign objective is required');
  }

  if (!campaign.budget || campaign.budget < 100) {
    errors.push('Minimum budget is $100');
  }

  if (campaign.budget > 50000) {
    warnings.push('High budget campaigns require additional review time');
  }

  // Platform-specific validation
  if (!campaign.platform || !['META', 'GOOGLE', 'BOTH'].includes(campaign.platform)) {
    errors.push('Valid platform selection is required');
  }

  // Creative validation
  if (!campaign.creatives || campaign.creatives.length === 0) {
    warnings.push('No creatives found - campaign will use default text only');
  } else {
    // Check creative quality
    campaign.creatives.forEach((creative, index) => {
      if (!creative.headline || creative.headline.length < 5) {
        errors.push(`Creative ${index + 1}: Headline must be at least 5 characters`);
      }
      if (!creative.description || creative.description.length < 10) {
        errors.push(`Creative ${index + 1}: Description must be at least 10 characters`);
      }
    });
  }

  // Compliance checks
  if (containsProhibitedContent(campaign)) {
    errors.push('Campaign contains prohibited content for mental health advertising');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Check for prohibited content in mental health advertising
 */
const containsProhibitedContent = (campaign) => {
  const prohibitedTerms = [
    'guaranteed cure', 'miracle treatment', 'instant results',
    'diagnose', 'prescription', 'medical advice',
    'cheapest', 'best therapist', 'only solution'
  ];

  const textToCheck = [
    campaign.name,
    campaign.targetAudience,
    ...campaign.objectives,
    ...(campaign.creatives || []).flatMap(c => [c.headline, c.description, c.cta])
  ].join(' ').toLowerCase();

  return prohibitedTerms.some(term => textToCheck.includes(term));
};

/**
 * Send approval notification emails
 */
const sendApprovalNotifications = async (campaign, action, data = {}) => {
  try {
    const templates = {
      submitted: {
        subject: `Campaign Submitted for Review - ${campaign.name}`,
        template: 'campaign-submitted',
        data: {
          campaignName: campaign.name,
          userName: campaign.user.name,
          estimatedTime: '2-4 business hours'
        }
      },
      approved: {
        subject: `Campaign Approved & Live - ${campaign.name}`,
        template: 'campaign-approved',
        data: {
          campaignName: campaign.name,
          userName: campaign.user.name,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
      },
      rejected: {
        subject: `Campaign ${data.needsChanges ? 'Needs Changes' : 'Not Approved'} - ${campaign.name}`,
        template: 'campaign-rejected',
        data: {
          campaignName: campaign.name,
          userName: campaign.user.name,
          feedback: data.feedback,
          needsChanges: data.needsChanges,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
      }
    };

    const emailData = templates[action];
    if (emailData) {
      await sendEmail({
        to: campaign.user.email,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data
      });
    }
  } catch (error) {
    logger.warn('Failed to send approval notification email:', error);
  }
};

/**
 * Get campaign approval status and history
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Approval history
 */
export const getApprovalHistory = async (campaignId) => {
  try {
    const approvals = await prisma.campaignApproval.findMany({
      where: { campaignId },
      include: {
        reviewer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      approvals,
      currentStatus: approvals[0]?.status || APPROVAL_STATES.DRAFT
    };
  } catch (error) {
    logger.error('Failed to get approval history:', error);
    throw new Error(`Failed to get approval history: ${error.message}`);
  }
};