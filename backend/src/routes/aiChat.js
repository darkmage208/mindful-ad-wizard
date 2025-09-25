import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  startChatSession,
  sendMessage,
  getChatSessionMessages,
  endChatSessionHandler,
  getChatHistory,
  getChatAnalyticsHandler,
  getChatTypes,
  chatHealthCheck,
  getChatSuggestions
} from '../controllers/aiChatController.js';

const router = express.Router();

// Validation schemas
const startChatSchema = z.object({
  chat_type: z.enum(['LEAD_ENGAGEMENT', 'CLIENT_SUPPORT', 'APPOINTMENT_BOOKING', 'GENERAL_INQUIRY', 'CRISIS_SUPPORT']),
  metadata: z.object({
    started_via: z.string().optional(),
    initial_context: z.string().optional(),
    landing_page_id: z.string().optional(),
    campaign_id: z.string().optional(),
    user_agent: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
});

const sendMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long. Maximum 2000 characters allowed')
    .trim()
});

const endSessionSchema = z.object({
  reason: z.enum(['user_ended', 'timeout', 'system_ended', 'crisis_escalation']).optional()
});

const chatSuggestionsSchema = z.object({
  chat_type: z.enum(['LEAD_ENGAGEMENT', 'CLIENT_SUPPORT', 'APPOINTMENT_BOOKING', 'GENERAL_INQUIRY', 'CRISIS_SUPPORT']),
  context: z.string().optional(),
  user_input: z.string().optional()
});

// Zod validation wrapper
const validateZod = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: messages
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message
      });
    }
  };
};

// Public endpoints (no authentication required)

/**
 * GET /api/chat/health
 * Health check for AI Chat service
 */
router.get('/health', asyncHandler(chatHealthCheck));

/**
 * GET /api/chat/types
 * Get available chat types and descriptions
 */
router.get('/types', asyncHandler(getChatTypes));

/**
 * POST /api/chat/suggestions
 * Get chat suggestions based on context
 */
router.post('/suggestions', validateZod(chatSuggestionsSchema), asyncHandler(getChatSuggestions));

// Chat session endpoints (support both authenticated and anonymous)

/**
 * POST /api/chat/start
 * Start a new chat session
 * Supports both authenticated users and anonymous leads
 */
router.post('/start', optionalAuth, validateZod(startChatSchema), asyncHandler(startChatSession));

/**
 * POST /api/chat/:sessionId/message
 * Send a message in a chat session
 * Supports both authenticated users and anonymous leads
 */
router.post('/:sessionId/message', optionalAuth, validateZod(sendMessageSchema), asyncHandler(sendMessage));

/**
 * GET /api/chat/:sessionId
 * Get chat session with message history
 * Supports both authenticated users and anonymous leads
 */
router.get('/:sessionId', optionalAuth, asyncHandler(getChatSessionMessages));

/**
 * POST /api/chat/:sessionId/end
 * End a chat session
 * Supports both authenticated users and anonymous leads
 */
router.post('/:sessionId/end', optionalAuth, validateZod(endSessionSchema), asyncHandler(endChatSessionHandler));

// Authenticated user endpoints

/**
 * GET /api/chat/history
 * Get user's chat history (requires authentication)
 */
router.get('/history', authenticate, asyncHandler(getChatHistory));

/**
 * GET /api/chat/analytics
 * Get chat analytics (requires authentication)
 * Query params: period ('7d', '30d', '90d'), admin_view (boolean)
 */
router.get('/analytics', authenticate, asyncHandler(getChatAnalyticsHandler));

export default router;