import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import OpenAI from 'openai';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError
} from '../middleware/errorHandler.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Lead Management Service with AI-powered features
 * Provides intelligent lead nurturing, message suggestions, and automated follow-ups
 */

/**
 * Get comprehensive lead dashboard with AI insights
 */
export const getLeadManagement = async (userId, filters = {}) => {
  const {
    status,
    source,
    priority,
    date_range = '30d',
    page = 1,
    limit = 20,
    sort_by = 'createdAt',
    sort_order = 'desc',
    search
  } = filters;

  // Calculate date range
  const dateRanges = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': null
  };

  const daysBack = dateRanges[date_range];
  const startDate = daysBack ? new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) : null;

  // Build where conditions
  const whereConditions = {
    userId,
    ...(status && { status }),
    ...(source && { source }),
    ...(priority && { priority }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const offset = (page - 1) * limit;

  // Get leads with comprehensive data
  const [leads, totalCount, leadStats, nurturingCampaigns] = await Promise.all([
    prisma.lead.findMany({
      where: whereConditions,
      skip: offset,
      take: limit,
      orderBy: { [sort_by]: sort_order },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            platform: true,
            status: true
          }
        },
        leadInteractions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            channel: true,
            content: true,
            createdAt: true,
            successful: true
          }
        },
        leadNotes: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            category: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.lead.count({ where: whereConditions }),
    getLeadStatistics(userId, startDate),
    getNurturingCampaignSuggestions(userId)
  ]);

  // Generate AI insights for high-priority leads
  const leadsWithInsights = await Promise.all(
    leads.map(async (lead) => {
      const insights = await generateLeadInsights(lead);
      const followUpSuggestions = await generateFollowUpSuggestions(lead);

      return {
        ...lead,
        ai_insights: insights,
        follow_up_suggestions: followUpSuggestions,
        next_best_action: await determineNextBestAction(lead),
        engagement_score: calculateEngagementScore(lead),
        conversion_probability: await predictConversionProbability(lead)
      };
    })
  );

  return {
    leads: leadsWithInsights,
    statistics: leadStats,
    nurturing_campaigns: nurturingCampaigns,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      has_next: offset + limit < totalCount,
      has_previous: page > 1
    },
    filters_applied: {
      status,
      source,
      priority,
      date_range,
      search
    },
    ai_recommendations: await getLeadManagementRecommendations(userId, leads)
  };
};

/**
 * Generate AI-powered message suggestions for lead outreach
 */
export const generateMessageSuggestions = async (leadId, messageType, context = {}) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        campaign: {
          select: {
            name: true,
            description: true,
            targetAudience: true,
            objectives: true
          }
        },
        leadInteractions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        leadNotes: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            name: true,
            company: true,
            practiceType: true
          }
        }
      }
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    const messageTypes = {
      'initial_outreach': {
        prompt: `Generate a warm, professional initial outreach message for a therapy/psychology practice.`,
        tone: 'warm and professional'
      },
      'follow_up': {
        prompt: `Generate a gentle follow-up message that doesn't feel pushy.`,
        tone: 'caring and supportive'
      },
      'appointment_reminder': {
        prompt: `Generate an appointment reminder message that reduces anxiety.`,
        tone: 'reassuring and organized'
      },
      'check_in': {
        prompt: `Generate a check-in message that shows genuine care for the client's wellbeing.`,
        tone: 'empathetic and supportive'
      },
      'crisis_response': {
        prompt: `Generate a crisis response message that prioritizes safety and immediate support.`,
        tone: 'urgent yet calm, prioritizing safety'
      },
      'nurturing': {
        prompt: `Generate a nurturing message that provides value without being salesy.`,
        tone: 'educational and supportive'
      }
    };

    const messageConfig = messageTypes[messageType] || messageTypes['follow_up'];

    // Build context for AI
    const practiceContext = `
Practice Information:
- Therapist: ${lead.user.name}
- Company: ${lead.user.company || 'Private Practice'}
- Practice Type: ${lead.user.practiceType || 'General Therapy'}

Lead Information:
- Name: ${lead.name}
- Source: ${lead.source}
- Current Status: ${lead.status}
- Campaign: ${lead.campaign?.name || 'Direct Inquiry'}

Recent Interaction History:
${lead.leadInteractions.map(interaction =>
  `- ${interaction.type} via ${interaction.channel}: ${interaction.successful ? 'Successful' : 'Failed'} (${interaction.createdAt.toDateString()})`
).join('\n')}

Recent Notes:
${lead.leadNotes.map(note => `- ${note.content} (${note.createdAt.toDateString()})`).join('\n')}

Additional Context:
${Object.entries(context).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
    `;

    const systemPrompt = `You are an AI assistant for mental health professionals, specializing in ethical, HIPAA-compliant communication for therapy practices.

Your role is to help therapists communicate effectively with potential clients while maintaining professional boundaries and ethical standards.

Key Guidelines:
1. Always maintain professional boundaries appropriate for therapy practices
2. Be warm but not overly familiar
3. Respect privacy and confidentiality concerns
4. Use person-first, non-stigmatizing language
5. Avoid making promises about treatment outcomes
6. Include appropriate disclaimers when necessary
7. Focus on the person's wellbeing and comfort
8. Be sensitive to mental health concerns and potential triggers

${messageConfig.prompt}

The tone should be ${messageConfig.tone}.

Please generate 3 different message variations (short, medium, and detailed) that the therapist can choose from or customize further.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please generate message suggestions for this scenario:\n\n${practiceContext}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;

    // Parse the response into structured suggestions
    const messageSuggestions = parseMessageSuggestions(aiResponse);

    // Store the suggestion request for learning
    await prisma.leadInteraction.create({
      data: {
        leadId,
        type: 'AI_MESSAGE_GENERATION',
        channel: 'SYSTEM',
        content: JSON.stringify({
          message_type: messageType,
          context,
          suggestions_count: messageSuggestions.length
        }),
        successful: true,
        metadata: {
          ai_model: 'gpt-4',
          timestamp: new Date()
        }
      }
    });

    logger.info(`AI message suggestions generated for lead ${leadId}, type: ${messageType}`);

    return {
      message_type: messageType,
      suggestions: messageSuggestions,
      context: {
        lead_name: lead.name,
        lead_status: lead.status,
        campaign_name: lead.campaign?.name,
        last_interaction: lead.leadInteractions[0]?.createdAt
      },
      best_practices: getBestPracticesForMessageType(messageType),
      compliance_notes: getComplianceNotesForMessageType(messageType)
    };

  } catch (error) {
    logger.error('Error generating message suggestions:', error);
    throw new InternalServerError('Failed to generate message suggestions');
  }
};

/**
 * Execute automated follow-up sequences
 */
export const executeAutomatedFollowUp = async (leadId, sequenceType, userId) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        leadInteractions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Check if lead is eligible for automated follow-up
    const eligibility = await checkFollowUpEligibility(lead, sequenceType);

    if (!eligibility.eligible) {
      return {
        success: false,
        message: eligibility.reason,
        lead_id: leadId
      };
    }

    // Generate personalized follow-up content
    const followUpContent = await generateFollowUpContent(lead, sequenceType);

    // Create follow-up interaction record
    const interaction = await prisma.leadInteraction.create({
      data: {
        leadId,
        type: 'AUTOMATED_FOLLOW_UP',
        channel: determineOptimalChannel(lead),
        content: followUpContent.message,
        scheduledFor: followUpContent.scheduledFor,
        successful: false, // Will be updated when actually sent
        metadata: {
          sequence_type: sequenceType,
          ai_generated: true,
          personalization_score: followUpContent.personalizationScore
        }
      }
    });

    // Update lead status if appropriate
    if (sequenceType === 'nurturing_sequence') {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'NURTURING',
          lastContactedAt: new Date()
        }
      });
    }

    logger.info(`Automated follow-up scheduled for lead ${leadId}, sequence: ${sequenceType}`);

    return {
      success: true,
      interaction_id: interaction.id,
      scheduled_for: followUpContent.scheduledFor,
      content_preview: followUpContent.message.substring(0, 100) + '...',
      channel: interaction.channel,
      next_action: followUpContent.nextAction
    };

  } catch (error) {
    logger.error('Error executing automated follow-up:', error);
    throw new InternalServerError('Failed to execute automated follow-up');
  }
};

/**
 * Bulk lead operations with AI optimization
 */
export const executeBulkLeadOperation = async (userId, operation, leadIds, parameters = {}) => {
  try {
    // Validate lead ownership
    const validLeads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId
      },
      include: {
        leadInteractions: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (validLeads.length !== leadIds.length) {
      throw new BadRequestError('Some leads not found or not owned by user');
    }

    const results = {
      operation,
      total_leads: leadIds.length,
      successful: 0,
      failed: 0,
      results: [],
      ai_recommendations: []
    };

    switch (operation) {
      case 'bulk_status_update':
        const { new_status, reason } = parameters;

        for (const lead of validLeads) {
          try {
            // AI-powered status change validation
            const statusChange = await validateStatusChange(lead, new_status, reason);

            if (statusChange.recommended) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  status: new_status,
                  updatedAt: new Date()
                }
              });

              await prisma.leadNote.create({
                data: {
                  leadId: lead.id,
                  content: `Status changed to ${new_status}. ${reason || 'Bulk operation'}`,
                  category: 'STATUS_CHANGE',
                  aiGenerated: false
                }
              });

              results.successful++;
              results.results.push({
                lead_id: lead.id,
                success: true,
                message: 'Status updated successfully'
              });
            } else {
              results.failed++;
              results.results.push({
                lead_id: lead.id,
                success: false,
                message: statusChange.reason
              });
            }
          } catch (error) {
            results.failed++;
            results.results.push({
              lead_id: lead.id,
              success: false,
              message: error.message
            });
          }
        }
        break;

      case 'bulk_follow_up':
        const { message_type, custom_message, schedule_delay_hours } = parameters;

        for (const lead of validLeads) {
          try {
            const followUpResult = await schedulePersonalizedFollowUp(
              lead,
              message_type,
              custom_message,
              schedule_delay_hours
            );

            results.successful++;
            results.results.push({
              lead_id: lead.id,
              success: true,
              scheduled_for: followUpResult.scheduledFor,
              message: 'Follow-up scheduled successfully'
            });
          } catch (error) {
            results.failed++;
            results.results.push({
              lead_id: lead.id,
              success: false,
              message: error.message
            });
          }
        }
        break;

      case 'bulk_priority_update':
        const { priority_level } = parameters;

        for (const lead of validLeads) {
          try {
            // AI-powered priority assessment
            const priorityRecommendation = await assessLeadPriority(lead);

            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                priority: priority_level,
                updatedAt: new Date()
              }
            });

            results.successful++;
            results.results.push({
              lead_id: lead.id,
              success: true,
              ai_recommended_priority: priorityRecommendation.recommended_priority,
              message: 'Priority updated successfully'
            });
          } catch (error) {
            results.failed++;
            results.results.push({
              lead_id: lead.id,
              success: false,
              message: error.message
            });
          }
        }
        break;

      case 'bulk_nurturing_campaign':
        const { campaign_type, duration_weeks } = parameters;

        for (const lead of validLeads) {
          try {
            const nurturingResult = await enrollInNurturingCampaign(
              lead,
              campaign_type,
              duration_weeks,
              userId
            );

            results.successful++;
            results.results.push({
              lead_id: lead.id,
              success: true,
              campaign_id: nurturingResult.campaignId,
              message: 'Enrolled in nurturing campaign successfully'
            });
          } catch (error) {
            results.failed++;
            results.results.push({
              lead_id: lead.id,
              success: false,
              message: error.message
            });
          }
        }
        break;

      default:
        throw new BadRequestError('Unknown bulk operation');
    }

    // Generate AI recommendations for future operations
    results.ai_recommendations = await generateBulkOperationRecommendations(validLeads, operation, results);

    logger.info(`Bulk operation completed: ${operation}, ${results.successful} successful, ${results.failed} failed`);

    return results;

  } catch (error) {
    logger.error('Error executing bulk lead operation:', error);
    throw error;
  }
};

// Helper Functions

const getLeadStatistics = async (userId, startDate) => {
  const baseWhere = { userId };
  const dateWhere = startDate ? { userId, createdAt: { gte: startDate } } : baseWhere;

  const [
    totalLeads,
    newLeads,
    statusDistribution,
    sourceDistribution,
    priorityDistribution,
    conversionRates
  ] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.count({ where: dateWhere }),
    prisma.lead.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { status: true }
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: baseWhere,
      _count: { source: true }
    }),
    prisma.lead.groupBy({
      by: ['priority'],
      where: baseWhere,
      _count: { priority: true }
    }),
    calculateConversionRates(userId, startDate)
  ]);

  return {
    total_leads: totalLeads,
    new_leads: newLeads,
    status_distribution: statusDistribution.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {}),
    source_distribution: sourceDistribution.reduce((acc, item) => {
      acc[item.source] = item._count.source;
      return acc;
    }, {}),
    priority_distribution: priorityDistribution.reduce((acc, item) => {
      acc[item.priority || 'NORMAL'] = item._count.priority;
      return acc;
    }, {}),
    conversion_rates: conversionRates
  };
};

const generateLeadInsights = async (lead) => {
  try {
    const insights = {
      engagement_level: calculateEngagementScore(lead),
      communication_preferences: analyzeCommunciationPreferences(lead),
      optimal_contact_time: await predictOptimalContactTime(lead),
      risk_factors: identifyRiskFactors(lead),
      opportunities: identifyOpportunities(lead)
    };

    return insights;
  } catch (error) {
    logger.warn('Error generating lead insights:', error);
    return {
      engagement_level: 'unknown',
      communication_preferences: 'email',
      optimal_contact_time: '10:00 AM',
      risk_factors: [],
      opportunities: []
    };
  }
};

const generateFollowUpSuggestions = async (lead) => {
  const suggestions = [];

  // Analyze lead behavior and generate suggestions
  if (lead.leadInteractions.length === 0) {
    suggestions.push({
      type: 'initial_contact',
      priority: 'high',
      message: 'Send initial welcome message',
      timing: 'within 24 hours'
    });
  } else {
    const lastInteraction = lead.leadInteractions[0];
    const daysSinceLastContact = Math.floor((Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastContact > 7) {
      suggestions.push({
        type: 'follow_up',
        priority: 'medium',
        message: 'Send gentle follow-up message',
        timing: 'today'
      });
    }
  }

  return suggestions;
};

const determineNextBestAction = async (lead) => {
  // AI-powered decision making for next best action
  const actions = [];

  if (lead.status === 'NEW') {
    actions.push({
      action: 'initial_outreach',
      priority: 'high',
      description: 'Send personalized welcome message'
    });
  }

  if (lead.leadInteractions.length > 0) {
    const lastInteraction = lead.leadInteractions[0];
    if (!lastInteraction.successful) {
      actions.push({
        action: 'retry_contact',
        priority: 'medium',
        description: 'Retry contact via different channel'
      });
    }
  }

  return actions[0] || {
    action: 'monitor',
    priority: 'low',
    description: 'Continue monitoring lead activity'
  };
};

const calculateEngagementScore = (lead) => {
  let score = 0;

  // Base score
  score += 20;

  // Interaction frequency
  score += Math.min(lead.leadInteractions.length * 10, 50);

  // Successful interactions
  const successfulInteractions = lead.leadInteractions.filter(i => i.successful).length;
  score += successfulInteractions * 15;

  // Recent activity
  const recentInteractions = lead.leadInteractions.filter(i => {
    const days = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;
  score += recentInteractions * 10;

  return Math.min(score, 100);
};

const predictConversionProbability = async (lead) => {
  // Simplified conversion probability model
  let probability = 0.1; // Base probability

  // Status impact
  if (lead.status === 'INTERESTED') probability += 0.3;
  if (lead.status === 'CONTACTED') probability += 0.2;
  if (lead.status === 'QUALIFIED') probability += 0.4;

  // Engagement impact
  const engagementScore = calculateEngagementScore(lead);
  probability += (engagementScore / 100) * 0.3;

  // Source impact
  if (lead.source === 'REFERRAL') probability += 0.2;
  if (lead.source === 'ORGANIC') probability += 0.1;

  return Math.min(probability, 0.9);
};

const parseMessageSuggestions = (aiResponse) => {
  // Parse AI response into structured suggestions
  const suggestions = [];

  try {
    // Split by common delimiters and clean up
    const parts = aiResponse.split(/(?:Short|Medium|Detailed|Option|Variation)\s*\d*:?\s*/i);

    parts.forEach((part, index) => {
      if (part.trim() && part.length > 50) {
        suggestions.push({
          id: index,
          type: index === 1 ? 'short' : index === 2 ? 'medium' : 'detailed',
          message: part.trim(),
          word_count: part.trim().split(' ').length,
          estimated_reading_time: Math.ceil(part.trim().split(' ').length / 200) // words per minute
        });
      }
    });

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  } catch (error) {
    // Fallback: return entire response as one suggestion
    return [{
      id: 1,
      type: 'standard',
      message: aiResponse,
      word_count: aiResponse.split(' ').length,
      estimated_reading_time: Math.ceil(aiResponse.split(' ').length / 200)
    }];
  }
};

const getBestPracticesForMessageType = (messageType) => {
  const practices = {
    'initial_outreach': [
      'Personalize with their name and specific reason for contact',
      'Be clear about your professional credentials',
      'Mention any mutual connections or referral sources',
      'Include a clear but gentle call-to-action'
    ],
    'follow_up': [
      'Reference previous conversations or interactions',
      'Provide additional value or resources',
      'Respect their decision-making timeline',
      'Offer multiple ways to connect'
    ],
    'appointment_reminder': [
      'Include date, time, and location clearly',
      'Provide preparation instructions if needed',
      'Include contact information for changes',
      'Use calming, reassuring language'
    ],
    'crisis_response': [
      'Prioritize immediate safety',
      'Provide crisis hotline numbers',
      'Use calm, direct language',
      'Follow up promptly'
    ]
  };

  return practices[messageType] || practices['follow_up'];
};

const getComplianceNotesForMessageType = (messageType) => {
  return [
    'Ensure HIPAA compliance in all communications',
    'Maintain professional boundaries',
    'Document all client communications appropriately',
    'Follow state licensing board guidelines',
    'Respect client privacy and confidentiality'
  ];
};

// Additional helper functions implementation

const getNurturingCampaignSuggestions = async (userId) => {
  // Get user's current campaigns and suggest nurturing strategies
  const activeCampaigns = await prisma.campaign.count({
    where: { userId, status: 'ACTIVE' }
  });

  const suggestions = [
    {
      id: 'educational_series',
      title: 'Educational Email Series',
      description: 'Weekly mental health tips and insights',
      duration: 8,
      type: 'email_series'
    },
    {
      id: 'check_in_sequence',
      title: 'Gentle Check-in Sequence',
      description: 'Supportive follow-up messages over 30 days',
      duration: 4,
      type: 'follow_up_sequence'
    }
  ];

  return suggestions;
};

const getLeadManagementRecommendations = async (userId, leads) => {
  const recommendations = [];

  // Analyze lead distribution
  const highPriorityLeads = leads.filter(lead => lead.priority === 'HIGH' || lead.priority === 'URGENT');
  const staleLeads = leads.filter(lead => {
    const daysSinceLastContact = lead.lastContactedAt ?
      Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)) :
      999;
    return daysSinceLastContact > 14;
  });

  if (highPriorityLeads.length > 5) {
    recommendations.push({
      type: 'action_required',
      priority: 'high',
      message: `You have ${highPriorityLeads.length} high-priority leads that need attention`,
      action: 'review_high_priority_leads'
    });
  }

  if (staleLeads.length > 0) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: `${staleLeads.length} leads haven't been contacted in over 2 weeks`,
      action: 'bulk_follow_up_stale_leads'
    });
  }

  return recommendations;
};

const calculateConversionRates = async (userId, startDate) => {
  const whereClause = startDate ?
    { userId, createdAt: { gte: startDate } } :
    { userId };

  const [totalLeads, convertedLeads] = await Promise.all([
    prisma.lead.count({ where: whereClause }),
    prisma.lead.count({
      where: { ...whereClause, status: 'CONVERTED' }
    })
  ]);

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return {
    total_leads: totalLeads,
    converted_leads: convertedLeads,
    conversion_rate: parseFloat(conversionRate.toFixed(2))
  };
};

const analyzeCommunciationPreferences = (lead) => {
  // Analyze successful interaction channels
  const channelSuccessRates = lead.leadInteractions.reduce((acc, interaction) => {
    const channel = interaction.channel;
    if (!acc[channel]) acc[channel] = { total: 0, successful: 0 };
    acc[channel].total++;
    if (interaction.successful) acc[channel].successful++;
    return acc;
  }, {});

  // Find the most successful channel
  let bestChannel = 'EMAIL'; // default
  let bestRate = 0;

  Object.entries(channelSuccessRates).forEach(([channel, stats]) => {
    const rate = stats.total > 0 ? stats.successful / stats.total : 0;
    if (rate > bestRate) {
      bestChannel = channel;
      bestRate = rate;
    }
  });

  return bestChannel;
};

const predictOptimalContactTime = async (lead) => {
  // Simple heuristic - in a real system, this would use ML
  const interactions = lead.leadInteractions;

  if (interactions.length === 0) {
    return '10:00 AM'; // Default professional hours
  }

  // Analyze successful interaction times
  const successfulTimes = interactions
    .filter(i => i.successful)
    .map(i => new Date(i.createdAt).getHours());

  if (successfulTimes.length === 0) {
    return '2:00 PM'; // Afternoon fallback
  }

  const avgHour = Math.round(
    successfulTimes.reduce((sum, hour) => sum + hour, 0) / successfulTimes.length
  );

  return `${avgHour > 12 ? avgHour - 12 : avgHour}:00 ${avgHour >= 12 ? 'PM' : 'AM'}`;
};

const identifyRiskFactors = (lead) => {
  const risks = [];

  // Long time without contact
  const daysSinceLastContact = lead.lastContactedAt ?
    Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)) :
    999;

  if (daysSinceLastContact > 14) {
    risks.push({
      type: 'communication_gap',
      severity: 'medium',
      message: 'No contact in over 2 weeks'
    });
  }

  // Failed interactions
  const failedInteractions = lead.leadInteractions.filter(i => !i.successful).length;
  if (failedInteractions > 2) {
    risks.push({
      type: 'engagement_decline',
      severity: 'high',
      message: 'Multiple failed contact attempts'
    });
  }

  return risks;
};

const identifyOpportunities = (lead) => {
  const opportunities = [];

  // High engagement score
  if (lead.engagementScore > 70) {
    opportunities.push({
      type: 'high_engagement',
      potential: 'high',
      message: 'Strong engagement - consider consultation offer'
    });
  }

  // Referral source
  if (lead.source === 'REFERRAL') {
    opportunities.push({
      type: 'referral_lead',
      potential: 'high',
      message: 'Referral leads have higher conversion rates'
    });
  }

  return opportunities;
};

const checkFollowUpEligibility = async (lead, sequenceType) => {
  // Check if lead is in appropriate status
  if (lead.status === 'UNSUBSCRIBED') {
    return {
      eligible: false,
      reason: 'Lead has unsubscribed from communications'
    };
  }

  if (lead.status === 'CONVERTED') {
    return {
      eligible: false,
      reason: 'Lead has already converted'
    };
  }

  // Check recent interactions
  const recentInteractions = lead.leadInteractions.filter(i => {
    const daysSince = Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 1;
  });

  if (recentInteractions.length > 3) {
    return {
      eligible: false,
      reason: 'Too many recent interactions - avoid overwhelming the lead'
    };
  }

  return { eligible: true };
};

const generateFollowUpContent = async (lead, sequenceType) => {
  // Generate AI-powered follow-up content
  const contentTemplates = {
    'standard_follow_up': {
      delay: 24, // hours
      message: `Hi ${lead.name}, I wanted to follow up on our previous conversation. I'm here if you have any questions about our services.`,
      nextAction: 'schedule_consultation'
    },
    'nurturing_sequence': {
      delay: 72, // hours
      message: `Hi ${lead.name}, I hope you're doing well. Here's a helpful resource about managing stress that I thought you might find valuable.`,
      nextAction: 'send_resource'
    }
  };

  const template = contentTemplates[sequenceType] || contentTemplates['standard_follow_up'];
  const scheduledFor = new Date(Date.now() + template.delay * 60 * 60 * 1000);

  return {
    message: template.message,
    scheduledFor,
    nextAction: template.nextAction,
    personalizationScore: 75 // Placeholder score
  };
};

const determineOptimalChannel = (lead) => {
  // Analyze past successful interactions to determine best channel
  const channelPreference = analyzeCommunciationPreferences(lead);
  return channelPreference;
};

const validateStatusChange = async (lead, newStatus, reason) => {
  // Business logic for status transitions
  const validTransitions = {
    'NEW': ['CONTACTED', 'INTERESTED', 'LOST'],
    'CONTACTED': ['INTERESTED', 'QUALIFIED', 'LOST'],
    'INTERESTED': ['QUALIFIED', 'NURTURING', 'LOST'],
    'QUALIFIED': ['CONVERTED', 'NURTURING', 'LOST'],
    'NURTURING': ['INTERESTED', 'QUALIFIED', 'CONVERTED', 'LOST'],
    'CONVERTED': [], // Final state
    'LOST': [], // Final state
    'UNSUBSCRIBED': [] // Final state
  };

  const allowedTransitions = validTransitions[lead.status] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      recommended: false,
      reason: `Invalid status transition from ${lead.status} to ${newStatus}`
    };
  }

  return { recommended: true };
};

const schedulePersonalizedFollowUp = async (lead, messageType, customMessage, delayHours) => {
  const scheduledFor = new Date(Date.now() + (delayHours || 24) * 60 * 60 * 1000);

  // Generate or use custom message
  let message = customMessage;
  if (!message) {
    const suggestions = await generateMessageSuggestions(lead.id, messageType);
    message = suggestions.suggestions[0]?.message || 'Follow-up message';
  }

  // Create the interaction record
  const interaction = await prisma.leadInteraction.create({
    data: {
      leadId: lead.id,
      type: 'AUTOMATED_FOLLOW_UP',
      channel: determineOptimalChannel(lead),
      content: message,
      scheduledFor,
      successful: false, // Will be updated when sent
      metadata: {
        message_type: messageType,
        personalized: true,
        ai_generated: !customMessage
      }
    }
  });

  return {
    interactionId: interaction.id,
    scheduledFor
  };
};

const assessLeadPriority = async (lead) => {
  let score = 0;

  // Source scoring
  if (lead.source === 'REFERRAL') score += 40;
  else if (lead.source === 'ORGANIC') score += 30;
  else if (lead.source === 'PAID') score += 20;

  // Engagement scoring
  score += lead.engagementScore || 0;

  // Status scoring
  if (lead.status === 'INTERESTED') score += 20;
  else if (lead.status === 'QUALIFIED') score += 30;

  // Interaction frequency
  const recentInteractions = lead.leadInteractions?.filter(i => {
    const daysSince = Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  }).length || 0;

  score += Math.min(recentInteractions * 5, 20);

  // Determine priority level
  let recommendedPriority = 'NORMAL';
  if (score >= 80) recommendedPriority = 'URGENT';
  else if (score >= 60) recommendedPriority = 'HIGH';
  else if (score <= 30) recommendedPriority = 'LOW';

  return {
    recommended_priority: recommendedPriority,
    priority_score: score,
    factors: {
      source_score: lead.source === 'REFERRAL' ? 40 : 20,
      engagement_score: lead.engagementScore || 0,
      recent_activity: recentInteractions
    }
  };
};

const enrollInNurturingCampaign = async (lead, campaignType, durationWeeks, userId) => {
  // Create a nurturing campaign entry - in a real system this would be more sophisticated
  const nurturingCampaign = {
    id: `nurturing_${Date.now()}`,
    type: campaignType,
    duration: durationWeeks,
    leadId: lead.id,
    userId
  };

  // Update lead status
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'NURTURING',
      nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    }
  });

  return {
    campaignId: nurturingCampaign.id,
    enrolled: true,
    nextAction: 'send_welcome_sequence'
  };
};

const generateBulkOperationRecommendations = async (leads, operation, results) => {
  const recommendations = [];

  if (operation === 'bulk_status_update' && results.failed > 0) {
    recommendations.push({
      type: 'process_improvement',
      message: 'Consider reviewing failed status updates for invalid transitions',
      action: 'review_status_transition_rules'
    });
  }

  if (operation === 'bulk_follow_up' && results.successful > 20) {
    recommendations.push({
      type: 'monitoring',
      message: 'Monitor response rates from this large follow-up batch',
      action: 'track_response_metrics'
    });
  }

  return recommendations;
};

export default {
  getLeadManagement,
  generateMessageSuggestions,
  executeAutomatedFollowUp,
  executeBulkLeadOperation
};