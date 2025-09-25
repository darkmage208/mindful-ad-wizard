import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  submitForApproval,
  approveCampaign,
  rejectCampaign,
  getApprovalHistory,
  APPROVAL_STATES
} from '../services/approvalService.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../middleware/errorHandler.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';

/**
 * Submit campaign for approval
 */
export const submitCampaignForApproval = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  try {
    const result = await submitForApproval(campaignId, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Campaign validation failed',
        errors: result.errors,
        warnings: result.warnings
      });
    }

    res.json({
      success: true,
      message: 'Campaign submitted for approval successfully',
      data: {
        campaign: result.campaign,
        approvalId: result.approvalId,
        estimatedReviewTime: result.estimatedReviewTime
      }
    });
  } catch (error) {
    logger.error('Campaign submission failed:', error);
    throw new AppError(`Failed to submit campaign for approval: ${error.message}`);
  }
});

/**
 * Approve campaign (Admin only)
 */
export const approveCampaignEndpoint = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const adminId = req.user.id;
  const approvalData = req.body;

  // Check admin permissions
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ForbiddenError('Admin access required');
  }

  try {
    const result = await approveCampaign(campaignId, adminId, approvalData);

    res.json({
      success: true,
      message: result.message,
      data: {
        campaign: result.campaign,
        platformResults: result.platformResults
      }
    });
  } catch (error) {
    logger.error('Campaign approval failed:', error);
    throw new AppError(`Failed to approve campaign: ${error.message}`);
  }
});

/**
 * Reject campaign (Admin only)
 */
export const rejectCampaignEndpoint = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const adminId = req.user.id;
  const {
    feedback,
    reasons = [],
    needsChanges = true
  } = req.body;

  // Check admin permissions
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ForbiddenError('Admin access required');
  }

  if (!feedback || feedback.trim().length < 10) {
    throw new ValidationError('Detailed feedback is required (minimum 10 characters)');
  }

  try {
    const result = await rejectCampaign(campaignId, adminId, {
      feedback,
      reasons,
      needsChanges
    });

    res.json({
      success: true,
      message: result.needsChanges
        ? 'Campaign marked as needing changes'
        : 'Campaign rejected',
      data: {
        campaign: result.campaign,
        feedback: result.feedback,
        needsChanges: result.needsChanges
      }
    });
  } catch (error) {
    logger.error('Campaign rejection failed:', error);
    throw new AppError(`Failed to reject campaign: ${error.message}`);
  }
});

/**
 * Get pending campaigns for approval (Admin only)
 */
export const getPendingApprovals = asyncControllerHandler(async (req, res) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ForbiddenError('Admin access required');
  }

  const { page = 1, limit = 10, priority } = req.query;
  const skip = (page - 1) * limit;

  try {
    // Build filter conditions
    const where = {
      status: 'PENDING',
    };

    // Priority filtering based on budget or urgency
    let orderBy = { createdAt: 'desc' };
    if (priority === 'high-budget') {
      orderBy = { budget: 'desc' };
    } else if (priority === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true
            }
          },
          creatives: {
            select: {
              id: true,
              type: true,
              headline: true,
              description: true,
              imageUrl: true
            }
          },
          approvals: {
            where: {
              status: 'PENDING_REVIEW'
            },
            orderBy: {
              submittedAt: 'desc'
            },
            take: 1
          }
        }
      }),
      prisma.campaign.count({ where })
    ]);

    // Calculate urgency scores
    const campaignsWithUrgency = campaigns.map(campaign => {
      const daysSinceSubmission = campaign.approvals[0]
        ? Math.floor((new Date() - new Date(campaign.approvals[0].submittedAt)) / (1000 * 60 * 60 * 24))
        : 0;

      let urgencyScore = 0;
      if (daysSinceSubmission > 2) urgencyScore += 3;
      else if (daysSinceSubmission > 1) urgencyScore += 2;
      else urgencyScore += 1;

      if (campaign.budget > 5000) urgencyScore += 2;
      if (campaign.platform === 'BOTH') urgencyScore += 1;

      return {
        ...campaign,
        urgencyScore,
        daysSinceSubmission,
        submittedAt: campaign.approvals[0]?.submittedAt
      };
    });

    res.json({
      success: true,
      data: {
        campaigns: campaignsWithUrgency,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalPending: total,
          averageWaitTime: calculateAverageWaitTime(campaignsWithUrgency),
          highPriority: campaignsWithUrgency.filter(c => c.urgencyScore >= 4).length
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get pending approvals:', error);
    throw new AppError('Failed to retrieve pending approvals');
  }
});

/**
 * Get approval history for a campaign
 */
export const getCampaignApprovalHistory = asyncControllerHandler(async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  // Verify campaign ownership or admin access
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      ...(req.user.role === 'CLIENT' ? { userId } : {})
    }
  });

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  try {
    const result = await getApprovalHistory(campaignId);

    res.json({
      success: true,
      data: {
        campaignName: campaign.name,
        currentStatus: result.currentStatus,
        approvals: result.approvals
      }
    });
  } catch (error) {
    logger.error('Failed to get approval history:', error);
    throw new AppError('Failed to retrieve approval history');
  }
});

/**
 * Get approval statistics (Admin only)
 */
export const getApprovalStatistics = asyncControllerHandler(async (req, res) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ForbiddenError('Admin access required');
  }

  const { timeframe = '30d' } = req.query;

  try {
    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalSubmissions,
      totalApproved,
      totalRejected,
      totalNeedsChanges,
      avgApprovalTime
    ] = await Promise.all([
      prisma.campaignApproval.count({
        where: {
          submittedAt: { gte: startDate }
        }
      }),
      prisma.campaignApproval.count({
        where: {
          status: 'APPROVED',
          submittedAt: { gte: startDate }
        }
      }),
      prisma.campaignApproval.count({
        where: {
          status: 'REJECTED',
          submittedAt: { gte: startDate }
        }
      }),
      prisma.campaignApproval.count({
        where: {
          status: 'NEEDS_CHANGES',
          submittedAt: { gte: startDate }
        }
      }),
      calculateAverageApprovalTime(startDate)
    ]);

    const approvalRate = totalSubmissions > 0
      ? ((totalApproved / totalSubmissions) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        timeframe: `${days} days`,
        stats: {
          totalSubmissions,
          totalApproved,
          totalRejected,
          totalNeedsChanges,
          pending: await prisma.campaign.count({ where: { status: 'PENDING' } }),
          approvalRate: `${approvalRate}%`,
          avgApprovalTime: `${avgApprovalTime} hours`
        },
        trends: await getApprovalTrends(startDate)
      }
    });
  } catch (error) {
    logger.error('Failed to get approval statistics:', error);
    throw new AppError('Failed to retrieve approval statistics');
  }
});

/**
 * Bulk approve campaigns (Super Admin only)
 */
export const bulkApproveCampaigns = asyncControllerHandler(async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Super Admin access required');
  }

  const { campaignIds, approvalData = {} } = req.body;

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    throw new ValidationError('Campaign IDs array is required');
  }

  if (campaignIds.length > 10) {
    throw new ValidationError('Maximum 10 campaigns can be bulk approved at once');
  }

  const results = [];
  const adminId = req.user.id;

  try {
    for (const campaignId of campaignIds) {
      try {
        const result = await approveCampaign(campaignId, adminId, approvalData);
        results.push({
          campaignId,
          success: true,
          message: result.message
        });
      } catch (error) {
        results.push({
          campaignId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Bulk approval completed: ${successCount}/${results.length} campaigns approved`,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount
        }
      }
    });
  } catch (error) {
    logger.error('Bulk approval failed:', error);
    throw new AppError('Bulk approval process failed');
  }
});

// Helper functions
const calculateAverageWaitTime = (campaigns) => {
  if (campaigns.length === 0) return 0;

  const totalWaitTime = campaigns.reduce((sum, campaign) => {
    return sum + (campaign.daysSinceSubmission || 0);
  }, 0);

  return Math.round(totalWaitTime / campaigns.length * 24); // Convert to hours
};

const calculateAverageApprovalTime = async (startDate) => {
  const approvedCampaigns = await prisma.campaignApproval.findMany({
    where: {
      status: 'APPROVED',
      submittedAt: { gte: startDate },
      reviewedAt: { not: null }
    },
    select: {
      submittedAt: true,
      reviewedAt: true
    }
  });

  if (approvedCampaigns.length === 0) return 0;

  const totalHours = approvedCampaigns.reduce((sum, approval) => {
    const hours = (new Date(approval.reviewedAt) - new Date(approval.submittedAt)) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return Math.round(totalHours / approvedCampaigns.length);
};

const getApprovalTrends = async (startDate) => {
  // This would implement trend analysis
  // For now, return placeholder data
  return {
    dailyApprovals: [],
    topRejectionReasons: [],
    platformPreference: {}
  };
};