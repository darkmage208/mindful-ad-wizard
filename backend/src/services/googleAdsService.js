import { GoogleAdsApi } from 'google-ads-api';
import { logger } from '../utils/logger.js';

// Initialize Google Ads API client
let googleAds = null;
let isInitialized = false;

const initializeGoogleAds = () => {
  if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    logger.warn('Google Ads API credentials not configured');
    return false;
  }

  try {
    googleAds = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
    
    isInitialized = true;
    logger.info('Google Ads API initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Google Ads API:', error);
    return false;
  }
};

// Initialize on module load
initializeGoogleAds();

/**
 * Create campaign on Google Ads platform
 * @param {object} campaignData - Campaign data from database
 * @returns {Promise<string>} Google Ads campaign ID
 */
export const createGoogleCampaign = async (campaignData) => {
  if (!isInitialized) {
    throw new Error('Google Ads API not initialized');
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID; // Would be dynamic per user
    if (!customerId) {
      throw new Error('Google Ads Customer ID not configured');
    }

    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN, // Would be stored per user
    });

    // Create campaign
    const campaign = {
      name: campaignData.name,
      advertising_channel_type: 'SEARCH',
      status: 'PAUSED', // Start paused for review
      campaign_budget: {
        amount_micros: campaignData.budget * 1000000 / 30, // Convert to micros per day
        delivery_method: 'STANDARD',
      },
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
        target_partner_search_network: false,
      },
      bidding_strategy: {
        target_cpa: {
          target_cpa_micros: 50 * 1000000, // $50 CPA target
        },
      },
    };

    const campaignOperation = {
      create: campaign,
    };

    const response = await customer.campaigns.mutate([campaignOperation]);
    const createdCampaignId = response.results[0].resource_name.split('/')[3];

    // Create ad group
    const adGroup = {
      name: `${campaignData.name} - Ad Group`,
      campaign: `customers/${customerId}/campaigns/${createdCampaignId}`,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      cpc_bid_micros: 2 * 1000000, // $2 max CPC
    };

    const adGroupOperation = {
      create: adGroup,
    };

    const adGroupResponse = await customer.adGroups.mutate([adGroupOperation]);
    const createdAdGroupId = adGroupResponse.results[0].resource_name.split('/')[5];

    // Add keywords
    if (campaignData.keywords) {
      const keywordOperations = campaignData.keywords.slice(0, 10).map(keyword => ({
        create: {
          ad_group: `customers/${customerId}/adGroups/${createdAdGroupId}`,
          keyword: {
            text: keyword,
            match_type: 'BROAD',
          },
          cpc_bid_micros: 2 * 1000000,
        },
      }));

      await customer.adGroupCriteria.mutate(keywordOperations);
    }

    // Create responsive search ad
    if (campaignData.headlines && campaignData.descriptions) {
      const headlines = campaignData.headlines.slice(0, 3).map(headline => ({
        text: headline.substring(0, 30), // Max 30 characters
      }));

      const descriptions = campaignData.descriptions.slice(0, 2).map(description => ({
        text: description.substring(0, 90), // Max 90 characters
      }));

      const responsiveSearchAd = {
        final_urls: [process.env.FRONTEND_URL], // Would be user's landing page
        headlines,
        descriptions,
      };

      const adOperation = {
        create: {
          ad_group: `customers/${customerId}/adGroups/${createdAdGroupId}`,
          status: 'ENABLED',
          ad: {
            responsive_search_ad: responsiveSearchAd,
          },
        },
      };

      await customer.adGroupAds.mutate([adOperation]);
    }

    logger.info(`Google Ads campaign created: ${createdCampaignId}`, {
      campaignId: campaignData.id,
      googleCampaignId: createdCampaignId,
    });

    return createdCampaignId;
  } catch (error) {
    logger.error('Failed to create Google Ads campaign:', error);
    throw new Error(`Google Ads campaign creation failed: ${error.message}`);
  }
};

/**
 * Update Google Ads campaign
 * @param {string} googleCampaignId - Google Ads campaign ID
 * @param {object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateGoogleCampaign = async (googleCampaignId, updateData) => {
  if (!isInitialized) {
    throw new Error('Google Ads API not initialized');
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const updates = {};
    
    if (updateData.name) {
      updates.name = updateData.name;
    }
    
    if (updateData.status) {
      updates.status = updateData.status === 'ACTIVE' ? 'ENABLED' : 'PAUSED';
    }
    
    if (updateData.budget) {
      updates.campaign_budget = {
        amount_micros: updateData.budget * 1000000 / 30,
        delivery_method: 'STANDARD',
      };
    }

    if (Object.keys(updates).length > 0) {
      const campaignOperation = {
        update: {
          resource_name: `customers/${customerId}/campaigns/${googleCampaignId}`,
          ...updates,
        },
        update_mask: {
          paths: Object.keys(updates),
        },
      };

      await customer.campaigns.mutate([campaignOperation]);
      logger.info(`Google Ads campaign updated: ${googleCampaignId}`);
    }
  } catch (error) {
    logger.error('Failed to update Google Ads campaign:', error);
    throw new Error(`Google Ads campaign update failed: ${error.message}`);
  }
};

/**
 * Pause Google Ads campaign
 * @param {string} googleCampaignId - Google Ads campaign ID
 * @returns {Promise<void>}
 */
export const pauseGoogleCampaign = async (googleCampaignId) => {
  return updateGoogleCampaign(googleCampaignId, { status: 'PAUSED' });
};

/**
 * Get Google Ads campaign metrics
 * @param {string} googleCampaignId - Google Ads campaign ID
 * @returns {Promise<object>} Campaign metrics
 */
export const getGoogleCampaignMetrics = async (googleCampaignId) => {
  if (!isInitialized) {
    throw new Error('Google Ads API not initialized');
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const report = await customer.report({
      entity: 'campaign',
      attributes: [
        'campaign.id',
        'campaign.name',
      ],
      metrics: [
        'metrics.impressions',
        'metrics.clicks',
        'metrics.conversions',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.cost_per_conversion',
      ],
      constraints: [
        {
          key: 'campaign.id',
          op: '=',
          val: googleCampaignId,
        },
      ],
      date_constant: 'LAST_30_DAYS',
    });

    if (report.length > 0) {
      const data = report[0];
      return {
        impressions: parseInt(data.metrics.impressions || 0),
        clicks: parseInt(data.metrics.clicks || 0),
        conversions: parseFloat(data.metrics.conversions || 0),
        cost: parseFloat(data.metrics.cost_micros || 0) / 1000000,
        ctr: parseFloat(data.metrics.ctr || 0),
        cpc: parseFloat(data.metrics.average_cpc || 0) / 1000000,
        cpl: parseFloat(data.metrics.cost_per_conversion || 0) / 1000000,
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
    logger.error('Failed to get Google Ads campaign metrics:', error);
    throw new Error(`Google Ads metrics retrieval failed: ${error.message}`);
  }
};

/**
 * Test Google Ads API connection
 */
export const testGoogleConnection = async () => {
  if (!isInitialized) {
    return { success: false, error: 'Google Ads API not initialized' };
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!customerId) {
      return { success: false, error: 'Customer ID not configured' };
    }

    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    // Test by fetching customer info
    const customers = await customer.customers.list();
    
    if (customers.length > 0) {
      return { success: true, customer: customers[0].descriptive_name };
    }
    
    return { success: true, customer: 'Connected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sync campaign metrics from Google Ads
 * This would typically be called by a scheduled job
 */
export const syncGoogleCampaignMetrics = async (campaigns) => {
  if (!isInitialized) {
    logger.warn('Google Ads API not initialized, skipping sync');
    return;
  }

  const results = [];
  
  for (const campaign of campaigns) {
    if (!campaign.googleCampaignId) continue;
    
    try {
      const metrics = await getGoogleCampaignMetrics(campaign.googleCampaignId);
      
      // Update campaign in database
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          impressions: { increment: metrics.impressions },
          clicks: { increment: metrics.clicks },
          conversions: { increment: metrics.conversions },
          cost: { increment: metrics.cost },
        },
      });
      
      results.push({
        campaignId: campaign.id,
        googleCampaignId: campaign.googleCampaignId,
        success: true,
        metrics,
      });
      
      logger.info(`Synced Google Ads metrics for campaign ${campaign.id}`);
    } catch (error) {
      logger.error(`Failed to sync Google Ads metrics for campaign ${campaign.id}:`, error);
      results.push({
        campaignId: campaign.id,
        googleCampaignId: campaign.googleCampaignId,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
};

/**
 * Get keyword suggestions for psychology practice
 * @param {string} targetAudience - Target audience description
 * @returns {Promise<Array>} Keyword suggestions
 */
export const getKeywordSuggestions = async (targetAudience) => {
  if (!isInitialized) {
    throw new Error('Google Ads API not initialized');
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    // Base psychology-related keywords
    const seedKeywords = [
      'therapy',
      'counseling',
      'psychologist',
      'mental health',
      'anxiety treatment',
      'depression help',
    ];

    // Extract additional keywords from target audience
    const audienceKeywords = extractKeywordsFromAudience(targetAudience);
    
    const allKeywords = [...seedKeywords, ...audienceKeywords];

    const keywordPlanIdeaService = customer.keywordPlanIdeas;
    
    const request = {
      customer_id: customerId,
      language: { language_code: 'en' },
      geo_target_constants: [{ geo_target_constant: 'geoTargetConstants/2840' }], // US
      keyword_seed: {
        keywords: allKeywords.map(keyword => ({ text: keyword })),
      },
    };

    const response = await keywordPlanIdeaService.generateKeywordIdeas(request);
    
    return response.results.slice(0, 50).map(idea => ({
      text: idea.text,
      competition: idea.keyword_idea_metrics.competition,
      avgMonthlySearches: idea.keyword_idea_metrics.avg_monthly_searches,
      competitionIndex: idea.keyword_idea_metrics.competition_index,
    }));
  } catch (error) {
    logger.error('Failed to get keyword suggestions:', error);
    throw new Error(`Keyword suggestions failed: ${error.message}`);
  }
};

/**
 * Extract keywords from target audience description
 */
const extractKeywordsFromAudience = (targetAudience) => {
  const keywords = [];
  const audienceLower = targetAudience.toLowerCase();
  
  // Demographics
  if (audienceLower.includes('women') || audienceLower.includes('female')) {
    keywords.push('women therapy', 'female counseling');
  }
  if (audienceLower.includes('men') || audienceLower.includes('male')) {
    keywords.push('men therapy', 'male counseling');
  }
  if (audienceLower.includes('couples')) {
    keywords.push('couples therapy', 'marriage counseling');
  }
  if (audienceLower.includes('family')) {
    keywords.push('family therapy', 'family counseling');
  }
  if (audienceLower.includes('teen') || audienceLower.includes('adolescent')) {
    keywords.push('teen therapy', 'adolescent counseling');
  }
  
  // Issues
  if (audienceLower.includes('anxiety')) {
    keywords.push('anxiety therapy', 'anxiety treatment', 'panic disorder help');
  }
  if (audienceLower.includes('depression')) {
    keywords.push('depression therapy', 'depression treatment', 'mood disorders');
  }
  if (audienceLower.includes('trauma')) {
    keywords.push('trauma therapy', 'PTSD treatment', 'trauma counseling');
  }
  if (audienceLower.includes('addiction')) {
    keywords.push('addiction therapy', 'substance abuse counseling');
  }
  
  return keywords;
};