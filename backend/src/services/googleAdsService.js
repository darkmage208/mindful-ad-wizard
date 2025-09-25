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

    // Create ads from database creatives or fallback to campaign data
    const createdAds = [];
    if (campaignData.creatives && campaignData.creatives.length > 0) {
      // Create responsive search ads from database creatives
      for (const dbCreative of campaignData.creatives) {
        const headlines = [
          { text: dbCreative.headline.substring(0, 30) },
          { text: `${dbCreative.headline.substring(0, 25)} Now` },
          { text: `Get ${dbCreative.headline.substring(0, 24)}` }
        ];

        const descriptions = [
          { text: dbCreative.description.substring(0, 90) },
          { text: `${dbCreative.description.substring(0, 85)} Call today.` }
        ];

        const responsiveSearchAd = {
          final_urls: [`${process.env.FRONTEND_URL}/lp/${campaignData.landingPageSlug || 'default'}`],
          headlines,
          descriptions,
          path1: 'therapy',
          path2: 'help',
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

        const adResponse = await customer.adGroupAds.mutate([adOperation]);
        const createdAdId = adResponse.results[0].resource_name.split('/')[7];

        createdAds.push({
          adId: createdAdId,
          dbCreativeId: dbCreative.id
        });
      }
    } else if (campaignData.headlines && campaignData.descriptions) {
      // Fallback to legacy ad creation
      const headlines = campaignData.headlines.slice(0, 3).map(headline => ({
        text: headline.substring(0, 30),
      }));

      const descriptions = campaignData.descriptions.slice(0, 2).map(description => ({
        text: description.substring(0, 90),
      }));

      const responsiveSearchAd = {
        final_urls: [`${process.env.FRONTEND_URL}/lp/${campaignData.landingPageSlug || 'default'}`],
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

      const adResponse = await customer.adGroupAds.mutate([adOperation]);
      const createdAdId = adResponse.results[0].resource_name.split('/')[7];

      createdAds.push({
        adId: createdAdId
      });
    }

    logger.info(`Google Ads campaign created: ${createdCampaignId}`, {
      campaignId: campaignData.id,
      googleCampaignId: createdCampaignId,
      adsCreated: createdAds.length,
    });

    return {
      campaignId: createdCampaignId,
      adGroupId: createdAdGroupId,
      ads: createdAds
    };
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
 * Create psychology-specific campaign with enhanced targeting
 * @param {object} campaignData - Campaign data
 * @returns {Promise<object>} Campaign creation result
 */
export const createPsychologyCampaign = async (campaignData) => {
  if (!isInitialized) {
    throw new Error('Google Ads API not initialized');
  }

  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!customerId) {
      throw new Error('Google Ads Customer ID not configured');
    }

    const customer = googleAds.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    // Create campaign with psychology-specific settings
    const campaign = {
      name: `${campaignData.name} - Psychology`,
      advertising_channel_type: 'SEARCH',
      status: 'PAUSED',
      campaign_budget: {
        amount_micros: campaignData.budget * 1000000 / 30,
        delivery_method: 'STANDARD',
      },
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
        target_partner_search_network: false,
      },
      bidding_strategy: {
        maximize_conversions: {
          target_cpa_micros: (campaignData.averageTicket || 150) * 1000000 * 0.3, // 30% of session cost
        },
      },
      geo_target_type_setting: {
        positive_geo_target_type: 'PRESENCE_OR_INTEREST',
        negative_geo_target_type: 'PRESENCE',
      },
    };

    const campaignOperation = {
      create: campaign,
    };

    const response = await customer.campaigns.mutate([campaignOperation]);
    const createdCampaignId = response.results[0].resource_name.split('/')[3];

    // Create ad group with psychology-specific keywords
    const adGroup = {
      name: `${campaignData.serviceType || 'Therapy'} - Ad Group`,
      campaign: `customers/${customerId}/campaigns/${createdCampaignId}`,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      cpc_bid_micros: 3 * 1000000, // $3 max CPC for competitive psychology keywords
    };

    const adGroupOperation = {
      create: adGroup,
    };

    const adGroupResponse = await customer.adGroups.mutate([adGroupOperation]);
    const createdAdGroupId = adGroupResponse.results[0].resource_name.split('/')[5];

    // Add psychology-specific keywords
    const psychologyKeywords = generatePsychologyKeywords(campaignData);
    const keywordOperations = psychologyKeywords.map(keyword => ({
      create: {
        ad_group: `customers/${customerId}/adGroups/${createdAdGroupId}`,
        keyword: {
          text: keyword.text,
          match_type: keyword.matchType,
        },
        cpc_bid_micros: keyword.bidMicros,
      },
    }));

    if (keywordOperations.length > 0) {
      await customer.adGroupCriteria.mutate(keywordOperations);
    }

    // Add location targeting if city provided
    if (campaignData.city) {
      const locationCriteria = await buildLocationTargeting(customer, campaignData.city);
      if (locationCriteria.length > 0) {
        await customer.campaignCriteria.mutate(locationCriteria.map(location => ({
          create: {
            campaign: `customers/${customerId}/campaigns/${createdCampaignId}`,
            location: {
              geo_target_constant: location.geoTargetConstant,
            },
          },
        })));
      }
    }

    // Add sitelink extensions
    const sitelinkExtensions = createPsychologySitelinks(campaignData);
    if (sitelinkExtensions.length > 0) {
      const extensionOperation = {
        create: {
          customer: `customers/${customerId}`,
          sitelink_feed_item: {
            sitelink_text: sitelinkExtensions[0].text,
            sitelink_final_urls: sitelinkExtensions[0].urls,
            sitelink_description1: sitelinkExtensions[0].description1,
            sitelink_description2: sitelinkExtensions[0].description2,
          },
        },
      };

      // Note: Extension creation would need proper implementation for production
      logger.info('Psychology sitelinks would be created:', sitelinkExtensions);
    }

    logger.info(`Psychology-specific Google Ads campaign created: ${createdCampaignId}`);

    return {
      campaignId: createdCampaignId,
      adGroupId: createdAdGroupId,
      keywordsAdded: psychologyKeywords.length
    };

  } catch (error) {
    logger.error('Failed to create psychology Google Ads campaign:', error);
    throw new Error(`Psychology campaign creation failed: ${error.message}`);
  }
};

/**
 * Generate psychology-specific keywords
 */
const generatePsychologyKeywords = (campaignData) => {
  const baseKeywords = [
    { text: 'therapist near me', matchType: 'PHRASE', bidMicros: 4000000 },
    { text: 'counseling services', matchType: 'PHRASE', bidMicros: 3500000 },
    { text: 'mental health help', matchType: 'PHRASE', bidMicros: 3000000 },
    { text: 'anxiety therapy', matchType: 'PHRASE', bidMicros: 4500000 },
    { text: 'depression counseling', matchType: 'PHRASE', bidMicros: 4000000 },
    { text: 'couples therapy', matchType: 'PHRASE', bidMicros: 3500000 },
    { text: 'psychologist', matchType: 'BROAD', bidMicros: 3000000 },
  ];

  // Add city-specific keywords
  if (campaignData.city) {
    const cityKeywords = [
      { text: `therapist ${campaignData.city}`, matchType: 'PHRASE', bidMicros: 5000000 },
      { text: `counseling ${campaignData.city}`, matchType: 'PHRASE', bidMicros: 4500000 },
      { text: `psychologist ${campaignData.city}`, matchType: 'PHRASE', bidMicros: 4000000 },
    ];
    baseKeywords.push(...cityKeywords);
  }

  // Add service-specific keywords
  if (campaignData.serviceType) {
    const serviceType = campaignData.serviceType.toLowerCase();
    if (serviceType.includes('couples')) {
      baseKeywords.push(
        { text: 'marriage counseling', matchType: 'PHRASE', bidMicros: 4000000 },
        { text: 'relationship therapy', matchType: 'PHRASE', bidMicros: 3500000 }
      );
    }
    if (serviceType.includes('family')) {
      baseKeywords.push(
        { text: 'family therapy', matchType: 'PHRASE', bidMicros: 3500000 },
        { text: 'child counseling', matchType: 'PHRASE', bidMicros: 4000000 }
      );
    }
    if (serviceType.includes('group')) {
      baseKeywords.push(
        { text: 'group therapy', matchType: 'PHRASE', bidMicros: 3000000 }
      );
    }
  }

  return baseKeywords.slice(0, 20); // Limit to 20 keywords
};

/**
 * Create psychology-specific sitelinks
 */
const createPsychologySitelinks = (campaignData) => {
  return [
    {
      text: 'Book Consultation',
      urls: [`${process.env.FRONTEND_URL}/book`],
      description1: 'Schedule your first session',
      description2: 'Available appointments'
    },
    {
      text: 'Our Services',
      urls: [`${process.env.FRONTEND_URL}/services`],
      description1: 'Therapy & counseling',
      description2: 'Professional help'
    },
    {
      text: 'About Us',
      urls: [`${process.env.FRONTEND_URL}/about`],
      description1: 'Licensed therapists',
      description2: 'Years of experience'
    },
    {
      text: 'Contact',
      urls: [`${process.env.FRONTEND_URL}/contact`],
      description1: 'Get in touch today',
      description2: 'Call or message us'
    }
  ];
};

/**
 * Build location targeting for city
 */
const buildLocationTargeting = async (customer, city) => {
  try {
    // This is a simplified example. In production, you would:
    // 1. Use Google Ads API to search for geo target constants
    // 2. Return proper location targeting criteria

    // For now, return empty array - would need proper geo targeting implementation
    logger.info(`Location targeting would be added for: ${city}`);
    return [];
  } catch (error) {
    logger.warn('Failed to build location targeting:', error);
    return [];
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
      return {
        success: true,
        customer: customers[0].descriptive_name,
        customerId: customerId,
        apiVersion: 'v14' // Google Ads API version
      };
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