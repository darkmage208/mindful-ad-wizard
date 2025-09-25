import {
  createChatSession,
  sendChatMessage,
  getChatSession,
  endChatSession,
  getUserChatHistory,
  getChatAnalytics,
  CHAT_TYPES
} from '../services/aiChatService.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Start a new chat session
 */
export const startChatSession = asyncControllerHandler(async (req, res) => {
  const { chat_type, metadata = {} } = req.body;
  const userId = req.user?.id; // Optional for anonymous leads

  if (!chat_type || !Object.values(CHAT_TYPES).includes(chat_type)) {
    throw new BadRequestError(`Invalid chat type. Must be one of: ${Object.values(CHAT_TYPES).join(', ')}`);
  }

  // Add user context to metadata if authenticated
  const sessionMetadata = {
    ...metadata,
    user_type: userId ? 'authenticated' : 'anonymous',
    started_via: metadata.started_via || 'api',
    initial_context: metadata.initial_context || 'general'
  };

  const session = await createChatSession(userId, chat_type, sessionMetadata);

  logger.info(`Chat session started: ${session.id} by ${userId || 'anonymous'}`);

  res.status(201).json({
    success: true,
    message: 'Chat session started successfully',
    data: {
      session: {
        id: session.id,
        chat_type: session.chatType,
        status: session.status,
        created_at: session.createdAt,
        metadata: session.metadata
      }
    }
  });
});

/**
 * Send a message in a chat session
 */
export const sendMessage = asyncControllerHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;
  const userId = req.user?.id;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new BadRequestError('Message is required and must be a non-empty string');
  }

  if (message.length > 2000) {
    throw new BadRequestError('Message too long. Maximum 2000 characters allowed');
  }

  // Verify session access (allow anonymous for lead engagement)
  const session = await getChatSession(sessionId);
  if (!session) {
    throw new NotFoundError('Chat session not found');
  }

  if (session.status !== 'ACTIVE') {
    throw new BadRequestError('Chat session is not active');
  }

  // If session has userId, verify it matches current user
  if (session.userId && session.userId !== userId) {
    throw new ForbiddenError('Access denied to this chat session');
  }

  const result = await sendChatMessage(sessionId, message.trim(), 'USER');

  const response = {
    success: true,
    data: {
      user_message: {
        id: result.message.id,
        content: message.trim(),
        sender: 'USER',
        timestamp: new Date()
      },
      ai_response: {
        id: result.message.id,
        content: result.message.content,
        sender: 'AI',
        timestamp: result.message.createdAt,
        metadata: {
          model: result.message.metadata?.model,
          confidence: result.message.metadata?.confidence
        }
      }
    }
  };

  // Add crisis information if detected
  if (result.crisis_detected) {
    response.data.crisis_alert = {
      detected: true,
      requires_immediate_attention: result.requires_immediate_attention,
      message: 'Crisis language detected. Providing appropriate resources and support.',
      recommended_actions: ['contact_crisis_hotline', 'contact_emergency_services']
    };
    response.data.priority = 'high';

    // Log crisis detection for follow-up
    logger.warn(`Crisis language detected in chat session: ${sessionId}`, {
      userId: userId || 'anonymous',
      sessionId,
      crisis_level: result.requires_immediate_attention ? 'high' : 'moderate'
    });
  }

  // Add suggested actions
  if (result.suggested_actions && result.suggested_actions.length > 0) {
    response.data.suggested_actions = result.suggested_actions;
  }

  res.json(response);
});

/**
 * Get chat session with message history
 */
export const getChatSessionMessages = asyncControllerHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  const session = await getChatSession(sessionId, userId);
  if (!session) {
    throw new NotFoundError('Chat session not found');
  }

  // If session has userId, verify it matches current user (for authenticated sessions)
  if (session.userId && session.userId !== userId) {
    throw new ForbiddenError('Access denied to this chat session');
  }

  const sessionData = {
    id: session.id,
    chat_type: session.chatType,
    status: session.status,
    created_at: session.createdAt,
    last_activity: session.lastActivity,
    message_count: session.messageCount,
    metadata: session.metadata,
    messages: session.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.createdAt,
      metadata: msg.metadata
    }))
  };

  res.json({
    success: true,
    data: {
      session: sessionData
    }
  });
});

/**
 * End a chat session
 */
export const endChatSessionHandler = asyncControllerHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { reason = 'user_ended' } = req.body;
  const userId = req.user?.id;

  const session = await endChatSession(sessionId, userId, reason);

  logger.info(`Chat session ended: ${sessionId} by ${userId || 'anonymous'}`);

  res.json({
    success: true,
    message: 'Chat session ended successfully',
    data: {
      session: {
        id: session.id,
        status: session.status,
        ended_at: session.endedAt,
        reason: reason
      }
    }
  });
});

/**
 * Get user's chat history
 */
export const getChatHistory = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10 } = req.query;

  const sessions = await getUserChatHistory(userId, parseInt(limit));

  const historyData = sessions.map(session => ({
    id: session.id,
    chat_type: session.chatType,
    status: session.status,
    created_at: session.createdAt,
    last_activity: session.lastActivity,
    message_count: session.messageCount,
    preview_messages: session.messages.map(msg => ({
      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
      sender: msg.sender,
      timestamp: msg.createdAt
    })),
    metadata: session.metadata
  }));

  res.json({
    success: true,
    data: {
      chat_history: historyData,
      total_sessions: sessions.length
    }
  });
});

/**
 * Get chat analytics
 */
export const getChatAnalyticsHandler = asyncControllerHandler(async (req, res) => {
  const userId = req.user?.id;
  const { period = '30d', admin_view = false } = req.query;

  // Only admins can see all analytics
  const analyticsUserId = (admin_view === 'true' && req.user?.role === 'ADMIN') ? null : userId;

  if (admin_view === 'true' && req.user?.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required for system-wide analytics');
  }

  const analytics = await getChatAnalytics(analyticsUserId, period);

  res.json({
    success: true,
    data: {
      analytics: {
        ...analytics,
        scope: admin_view === 'true' ? 'system_wide' : 'user_specific'
      }
    }
  });
});

/**
 * Get available chat types and their descriptions
 */
export const getChatTypes = asyncControllerHandler(async (req, res) => {
  const chatTypes = {
    [CHAT_TYPES.LEAD_ENGAGEMENT]: {
      name: 'Lead Engagement',
      description: 'For potential clients inquiring about therapy services',
      suitable_for: ['website_visitors', 'prospective_clients', 'general_inquiries'],
      anonymous_allowed: true
    },
    [CHAT_TYPES.CLIENT_SUPPORT]: {
      name: 'Client Support',
      description: 'Support for existing therapy clients',
      suitable_for: ['existing_clients', 'appointment_questions', 'administrative_support'],
      anonymous_allowed: false
    },
    [CHAT_TYPES.APPOINTMENT_BOOKING]: {
      name: 'Appointment Booking',
      description: 'Assistance with scheduling and booking appointments',
      suitable_for: ['scheduling', 'calendar_inquiries', 'booking_assistance'],
      anonymous_allowed: true
    },
    [CHAT_TYPES.GENERAL_INQUIRY]: {
      name: 'General Inquiry',
      description: 'General questions about mental health and therapy',
      suitable_for: ['information_seeking', 'education', 'general_questions'],
      anonymous_allowed: true
    },
    [CHAT_TYPES.CRISIS_SUPPORT]: {
      name: 'Crisis Support',
      description: 'Immediate support for mental health emergencies',
      suitable_for: ['crisis_situations', 'emergency_support', 'immediate_help'],
      anonymous_allowed: true,
      priority: 'high'
    }
  };

  res.json({
    success: true,
    data: {
      chat_types: chatTypes
    }
  });
});

/**
 * Health check for AI Chat service
 */
export const chatHealthCheck = asyncControllerHandler(async (req, res) => {
  // Simple health check - verify service can create a test response
  try {
    // This would test OpenAI connectivity without creating actual sessions
    const healthStatus = {
      service: 'ai_chat',
      status: 'healthy',
      timestamp: new Date(),
      features: {
        openai_integration: process.env.OPENAI_API_KEY ? 'enabled' : 'disabled',
        crisis_detection: 'enabled',
        analytics: 'enabled',
        anonymous_sessions: 'enabled'
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    logger.error('AI Chat health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'AI Chat service unhealthy',
      error: error.message
    });
  }
});

/**
 * Get chat suggestions based on context
 */
export const getChatSuggestions = asyncControllerHandler(async (req, res) => {
  const { chat_type, context, user_input } = req.body;

  if (!chat_type || !Object.values(CHAT_TYPES).includes(chat_type)) {
    throw new BadRequestError('Valid chat_type is required');
  }

  // Generate contextual suggestions based on chat type
  const suggestions = generateChatSuggestions(chat_type, context, user_input);

  res.json({
    success: true,
    data: {
      suggestions,
      chat_type,
      context_used: context || 'default'
    }
  });
});

/**
 * Generate contextual chat suggestions
 */
const generateChatSuggestions = (chatType, context, userInput) => {
  const baseSuggestions = {
    [CHAT_TYPES.LEAD_ENGAGEMENT]: [
      "What types of therapy do you offer?",
      "How do I know if therapy is right for me?",
      "What can I expect in my first session?",
      "Do you accept insurance?",
      "How do I schedule a consultation?"
    ],
    [CHAT_TYPES.CLIENT_SUPPORT]: [
      "How do I reschedule my appointment?",
      "I need help with session preparation",
      "Can I change my session format?",
      "I have billing questions",
      "I need crisis resources"
    ],
    [CHAT_TYPES.APPOINTMENT_BOOKING]: [
      "I'd like to schedule my first appointment",
      "What times are available this week?",
      "Can I book a telehealth session?",
      "What do I need for my first visit?",
      "How do I cancel an appointment?"
    ],
    [CHAT_TYPES.GENERAL_INQUIRY]: [
      "What is cognitive behavioral therapy?",
      "How long does therapy typically take?",
      "What's the difference between counseling and therapy?",
      "How do I find the right therapist?",
      "What should I know about confidentiality?"
    ],
    [CHAT_TYPES.CRISIS_SUPPORT]: [
      "I need immediate help",
      "I'm having thoughts of self-harm",
      "I need crisis resources",
      "This is an emergency",
      "I need someone to talk to right now"
    ]
  };

  return baseSuggestions[chatType] || baseSuggestions[CHAT_TYPES.GENERAL_INQUIRY];
};