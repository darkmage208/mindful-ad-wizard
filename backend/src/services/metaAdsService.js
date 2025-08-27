import { FacebookAdsApi, Campaign, AdSet, Ad, AdCreative } from 'facebook-nodejs-business-sdk';
import { logger } from '../utils/logger.js';

// Initialize Facebook Ads API
let isInitialized = false;

const initializeFacebookAPI = () => {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    logger.warn('Meta Ads API credentials not configured');
    return false;
  }

  try {
    FacebookAdsApi.init({
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      version: 'v18.0',
    });
    
    isInitialized = true;
    logger.info('Meta Ads API initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Meta Ads API:', error);
    return false;
  }
};

// Initialize on module load
initializeFacebookAPI();

/**
 * Create campaign on Meta platform
 * @param {object} campaignData - Campaign data from database
 * @returns {Promise<string>} Meta campaign ID
 */
export const createMetaCampaign = async (campaignData) => {
  if (!isInitialized) {
    throw new Error('Meta Ads API not initialized');
  }

  try {
    // Note: This is a simplified example. In production, you would need:
    // 1. Valid access token from user's Meta account
    // 2. Ad account ID
    // 3. Proper campaign structure with ad sets and ads
    
    const adAccountId = process.env.META_AD_ACCOUNT_ID; // Would be dynamic per user
    if (!adAccountId) {
      throw new Error('Meta Ad Account ID not configured');
    }

    // Create campaign
    const campaign = new Campaign(null, adAccountId);
    
    const campaignData_fb = {
      name: campaignData.name,
      objective: mapObjectiveToMeta(campaignData.objectives[0]),
      status: 'PAUSED', // Start paused for review
      special_ad_categories: ['CREDIT', 'EMPLOYMENT', 'HOUSING'], // Required for some industries
    };

    const createdCampaign = await campaign.create(campaignData_fb);
    
    // Create ad set
    const adSet = new AdSet(null, adAccountId);
    const adSetData = {
      name: `${campaignData.name} - Ad Set`,
      campaign_id: createdCampaign.id,
      daily_budget: Math.round(campaignData.budget * 100 / 30), // Convert to cents per day
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'REACH',
      targeting: buildTargeting(campaignData.targetAudience),
      status: 'PAUSED',
    };

    const createdAdSet = await adSet.create(adSetData);
    
    // Create ad creative
    if (campaignData.headlines && campaignData.descriptions) {
      const creative = new AdCreative(null, adAccountId);
      const creativeData = {
        name: `${campaignData.name} - Creative`,
        object_story_spec: {
          page_id: process.env.META_PAGE_ID, // Would be dynamic per user
          link_data: {
            call_to_action: {
              type: 'LEARN_MORE',
            },
            description: campaignData.descriptions[0],
            link: process.env.FRONTEND_URL, // Would be user's landing page
            message: campaignData.headlines[0],
            name: campaignData.name,
          },
        },
      };

      const createdCreative = await creative.create(creativeData);
      
      // Create ad
      const ad = new Ad(null, adAccountId);
      const adData = {
        name: `${campaignData.name} - Ad`,
        adset_id: createdAdSet.id,
        creative: { creative_id: createdCreative.id },
        status: 'PAUSED',
      };

      await ad.create(adData);
    }

    logger.info(`Meta campaign created: ${createdCampaign.id}`, {
      campaignId: campaignData.id,
      metaCampaignId: createdCampaign.id,
    });

    return createdCampaign.id;
  } catch (error) {
    logger.error('Failed to create Meta campaign:', error);
    throw new Error(`Meta campaign creation failed: ${error.message}`);
  }
};

/**
 * Update Meta campaign
 * @param {string} metaCampaignId - Meta campaign ID
 * @param {object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateMetaCampaign = async (metaCampaignId, updateData) => {
  if (!isInitialized) {
    throw new Error('Meta Ads API not initialized');
  }

  try {
    const campaign = new Campaign(metaCampaignId);
    
    const updateFields = {};
    
    if (updateData.name) {
      updateFields.name = updateData.name;
    }
    
    if (updateData.status) {
      updateFields.status = updateData.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    }
    
    if (updateData.budget) {
      // Note: Budget is typically updated at ad set level
      logger.info('Budget update requested - would update ad sets');
    }

    if (Object.keys(updateFields).length > 0) {
      await campaign.update(updateFields);
      logger.info(`Meta campaign updated: ${metaCampaignId}`);
    }
  } catch (error) {
    logger.error('Failed to update Meta campaign:', error);
    throw new Error(`Meta campaign update failed: ${error.message}`);
  }
};

/**
 * Pause Meta campaign
 * @param {string} metaCampaignId - Meta campaign ID
 * @returns {Promise<void>}
 */
export const pauseMetaCampaign = async (metaCampaignId) => {
  return updateMetaCampaign(metaCampaignId, { status: 'PAUSED' });
};

/**
 * Get Meta campaign metrics
 * @param {string} metaCampaignId - Meta campaign ID
 * @returns {Promise<object>} Campaign metrics
 */
export const getMetaCampaignMetrics = async (metaCampaignId) => {
  if (!isInitialized) {
    throw new Error('Meta Ads API not initialized');
  }

  try {
    const campaign = new Campaign(metaCampaignId);
    
    const insights = await campaign.getInsights({
      fields: [
        'impressions',
        'clicks',
        'conversions',
        'spend',
        'ctr',
        'cpc',
        'cpl',
      ],
      time_range: {
        since: '2024-01-01', // Would be dynamic
        until: new Date().toISOString().split('T')[0],
      },
    });

    if (insights.length > 0) {
      const data = insights[0];
      return {
        impressions: parseInt(data.impressions || 0),
        clicks: parseInt(data.clicks || 0),
        conversions: parseInt(data.conversions || 0),
        cost: parseFloat(data.spend || 0),
        ctr: parseFloat(data.ctr || 0),
        cpc: parseFloat(data.cpc || 0),
        cpl: parseFloat(data.cpl || 0),
      };
    }

    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      ctr: 0,
      cpc: 0,
      cpl: 0,
    };
  } catch (error) {
    logger.error('Failed to get Meta campaign metrics:', error);
    throw new Error(`Meta metrics retrieval failed: ${error.message}`);
  }
};

/**
 * Map campaign objectives to Meta objectives
 */
const mapObjectiveToMeta = (objective) => {
  const objectiveMap = {
    'awareness': 'REACH',
    'traffic': 'LINK_CLICKS',
    'leads': 'LEAD_GENERATION',
    'conversions': 'CONVERSIONS',
    'engagement': 'ENGAGEMENT',
    'video-views': 'VIDEO_VIEWS',
  };

  return objectiveMap[objective] || 'REACH';
};

/**
 * Build targeting object from audience description
 */
const buildTargeting = (targetAudience) => {
  // This is a simplified example. In production, you would:
  // 1. Parse the target audience description
  // 2. Use NLP or predefined rules to extract demographics
  // 3. Map to Meta's targeting options
  
  const baseTargeting = {
    age_min: 25,
    age_max: 65,
    genders: [1, 2], // All genders
    geo_locations: {
      countries: ['US'], // Would be dynamic based on user location
    },
    interests: [
      {
        id: '6003277229502', // Mental health interest
        name: 'Mental health',
      },
      {
        id: '6003348617349', // Therapy interest
        name: 'Therapy',
      },
    ],
  };

  // Parse audience description for additional targeting
  const audienceLower = targetAudience.toLowerCase();
  
  if (audienceLower.includes('women') || audienceLower.includes('female')) {
    baseTargeting.genders = [2]; // Female
  } else if (audienceLower.includes('men') || audienceLower.includes('male')) {
    baseTargeting.genders = [1]; // Male
  }
  
  if (audienceLower.includes('young') || audienceLower.includes('college')) {
    baseTargeting.age_min = 18;
    baseTargeting.age_max = 35;
  } else if (audienceLower.includes('senior') || audienceLower.includes('elderly')) {
    baseTargeting.age_min = 55;
    baseTargeting.age_max = 65;
  }
  
  // Add behavior targeting for mental health
  baseTargeting.behaviors = [
    {
      id: '6017253486583', // Likely to engage with mental health content
      name: 'Interested in mental health and wellness',
    },
  ];

  return baseTargeting;
};

/**
 * Test Meta Ads API connection
 */
export const testMetaConnection = async () => {
  if (!isInitialized) {
    return { success: false, error: 'Meta Ads API not initialized' };
  }

  try {
    const adAccountId = process.env.META_AD_ACCOUNT_ID;
    if (!adAccountId) {
      return { success: false, error: 'Ad Account ID not configured' };
    }

    // Test by fetching account info
    const response = await FacebookAdsApi.call(
      'GET',
      [`/${adAccountId}`],
      { fields: ['name', 'account_status'] }
    );

    return { success: true, account: response.name };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sync campaign metrics from Meta
 * This would typically be called by a scheduled job
 */
export const syncMetaCampaignMetrics = async (campaigns) => {
  if (!isInitialized) {
    logger.warn('Meta Ads API not initialized, skipping sync');
    return;
  }

  const results = [];
  
  for (const campaign of campaigns) {
    if (!campaign.metaCampaignId) continue;
    
    try {
      const metrics = await getMetaCampaignMetrics(campaign.metaCampaignId);
      
      // Update campaign in database
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          cost: metrics.cost,
        },
      });
      
      results.push({
        campaignId: campaign.id,
        metaCampaignId: campaign.metaCampaignId,
        success: true,
        metrics,
      });
      
      logger.info(`Synced Meta metrics for campaign ${campaign.id}`);
    } catch (error) {
      logger.error(`Failed to sync Meta metrics for campaign ${campaign.id}:`, error);
      results.push({
        campaignId: campaign.id,
        metaCampaignId: campaign.metaCampaignId,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
};