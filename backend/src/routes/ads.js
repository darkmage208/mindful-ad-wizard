import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createMetaCampaign,
  updateMetaCampaign,
  pauseMetaCampaign,
  getMetaCampaignMetrics,
  createLeadGenCampaign,
  testMetaConnection
} from '../services/metaAdsService.js';
import {
  createGoogleCampaign,
  updateGoogleCampaign,
  pauseGoogleCampaign,
  getGoogleCampaignMetrics,
  createPsychologyCampaign,
  getKeywordSuggestions,
  testGoogleConnection
} from '../services/googleAdsService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Test API connections
 */
router.get('/test/meta', authenticate, async (req, res) => {
  try {
    const result = await testMetaConnection();

    if (result.success) {
      logger.info('Meta Ads API connection test successful', { userId: req.user.id });
      res.json({
        success: true,
        message: 'Meta Ads API connection successful',
        data: result
      });
    } else {
      logger.warn('Meta Ads API connection test failed', {
        userId: req.user.id,
        error: result.error
      });
      res.status(400).json({
        success: false,
        message: 'Meta Ads API connection failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Meta Ads API test error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error testing Meta Ads API',
      error: error.message
    });
  }
});

router.get('/test/google', authenticate, async (req, res) => {
  try {
    const result = await testGoogleConnection();

    if (result.success) {
      logger.info('Google Ads API connection test successful', { userId: req.user.id });
      res.json({
        success: true,
        message: 'Google Ads API connection successful',
        data: result
      });
    } else {
      logger.warn('Google Ads API connection test failed', {
        userId: req.user.id,
        error: result.error
      });
      res.status(400).json({
        success: false,
        message: 'Google Ads API connection failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Google Ads API test error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error testing Google Ads API',
      error: error.message
    });
  }
});

/**
 * Create Meta campaign
 */
router.post('/meta/campaigns', authenticate, async (req, res) => {
  try {
    const campaignData = req.body;

    // Add user context
    campaignData.userId = req.user.id;

    const result = await createMetaCampaign(campaignData);

    logger.info('Meta campaign created successfully', {
      userId: req.user.id,
      campaignId: result.campaignId
    });

    res.status(201).json({
      success: true,
      message: 'Meta campaign created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create Meta campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Meta campaign',
      error: error.message
    });
  }
});

/**
 * Create Meta lead generation campaign
 */
router.post('/meta/campaigns/leadgen', authenticate, async (req, res) => {
  try {
    const campaignData = req.body;
    campaignData.userId = req.user.id;

    const result = await createLeadGenCampaign(campaignData);

    logger.info('Meta lead generation campaign created successfully', {
      userId: req.user.id,
      campaignId: result.campaignId
    });

    res.status(201).json({
      success: true,
      message: 'Meta lead generation campaign created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create Meta lead gen campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Meta lead generation campaign',
      error: error.message
    });
  }
});

/**
 * Update Meta campaign
 */
router.put('/meta/campaigns/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updateData = req.body;

    await updateMetaCampaign(campaignId, updateData);

    logger.info('Meta campaign updated successfully', {
      userId: req.user.id,
      campaignId
    });

    res.json({
      success: true,
      message: 'Meta campaign updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update Meta campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Meta campaign',
      error: error.message
    });
  }
});

/**
 * Pause Meta campaign
 */
router.post('/meta/campaigns/:campaignId/pause', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    await pauseMetaCampaign(campaignId);

    logger.info('Meta campaign paused successfully', {
      userId: req.user.id,
      campaignId
    });

    res.json({
      success: true,
      message: 'Meta campaign paused successfully'
    });
  } catch (error) {
    logger.error('Failed to pause Meta campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause Meta campaign',
      error: error.message
    });
  }
});

/**
 * Get Meta campaign metrics
 */
router.get('/meta/campaigns/:campaignId/metrics', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const metrics = await getMetaCampaignMetrics(campaignId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get Meta campaign metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Meta campaign metrics',
      error: error.message
    });
  }
});

/**
 * Create Google Ads campaign
 */
router.post('/google/campaigns', authenticate, async (req, res) => {
  try {
    const campaignData = req.body;
    campaignData.userId = req.user.id;

    const result = await createGoogleCampaign(campaignData);

    logger.info('Google Ads campaign created successfully', {
      userId: req.user.id,
      campaignId: result.campaignId
    });

    res.status(201).json({
      success: true,
      message: 'Google Ads campaign created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create Google Ads campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Google Ads campaign',
      error: error.message
    });
  }
});

/**
 * Create psychology-specific Google Ads campaign
 */
router.post('/google/campaigns/psychology', authenticate, async (req, res) => {
  try {
    const campaignData = req.body;
    campaignData.userId = req.user.id;

    const result = await createPsychologyCampaign(campaignData);

    logger.info('Psychology Google Ads campaign created successfully', {
      userId: req.user.id,
      campaignId: result.campaignId
    });

    res.status(201).json({
      success: true,
      message: 'Psychology-specific Google Ads campaign created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create psychology Google Ads campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create psychology Google Ads campaign',
      error: error.message
    });
  }
});

/**
 * Update Google Ads campaign
 */
router.put('/google/campaigns/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updateData = req.body;

    await updateGoogleCampaign(campaignId, updateData);

    logger.info('Google Ads campaign updated successfully', {
      userId: req.user.id,
      campaignId
    });

    res.json({
      success: true,
      message: 'Google Ads campaign updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update Google Ads campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Google Ads campaign',
      error: error.message
    });
  }
});

/**
 * Pause Google Ads campaign
 */
router.post('/google/campaigns/:campaignId/pause', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    await pauseGoogleCampaign(campaignId);

    logger.info('Google Ads campaign paused successfully', {
      userId: req.user.id,
      campaignId
    });

    res.json({
      success: true,
      message: 'Google Ads campaign paused successfully'
    });
  } catch (error) {
    logger.error('Failed to pause Google Ads campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause Google Ads campaign',
      error: error.message
    });
  }
});

/**
 * Get Google Ads campaign metrics
 */
router.get('/google/campaigns/:campaignId/metrics', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const metrics = await getGoogleCampaignMetrics(campaignId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get Google Ads campaign metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Google Ads campaign metrics',
      error: error.message
    });
  }
});

/**
 * Get keyword suggestions for Google Ads
 */
router.post('/google/keywords/suggestions', authenticate, async (req, res) => {
  try {
    const { targetAudience } = req.body;

    if (!targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Target audience description is required'
      });
    }

    const keywords = await getKeywordSuggestions(targetAudience);

    res.json({
      success: true,
      data: keywords
    });
  } catch (error) {
    logger.error('Failed to get keyword suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get keyword suggestions',
      error: error.message
    });
  }
});

export default router;