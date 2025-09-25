import OpenAI from 'openai';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * AI Chat Service for Psychology Practice Support
 * Provides intelligent chat responses for client support and lead engagement
 */

let openai;
let isInitialized = false;

/**
 * Initialize OpenAI for chat
 */
export const initializeAIChat = () => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not found - AI Chat will be disabled');
      return false;
    }

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    isInitialized = true;
    logger.info('AI Chat service initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize AI Chat service:', error);
    return false;
  }
};

/**
 * Chat session types and configurations
 */
export const CHAT_TYPES = {
  LEAD_ENGAGEMENT: 'lead_engagement',
  CLIENT_SUPPORT: 'client_support',
  APPOINTMENT_BOOKING: 'appointment_booking',
  GENERAL_INQUIRY: 'general_inquiry',
  CRISIS_SUPPORT: 'crisis_support'
};

/**
 * Psychology-specific chat personalities and system prompts
 */
const CHAT_PERSONALITIES = {
  [CHAT_TYPES.LEAD_ENGAGEMENT]: {
    name: 'Lead Engagement Assistant',
    system_prompt: `You are a compassionate and professional mental health practice assistant helping potential clients learn about therapy services.

Your role:
- Provide warm, welcoming responses about therapy services
- Explain different therapy approaches in simple terms
- Address common concerns about starting therapy
- Guide users toward scheduling a consultation
- Be empathetic but maintain professional boundaries
- Never provide medical advice or diagnoses
- Always recommend professional consultation for specific mental health concerns

Key principles:
- Use person-first language
- Be non-judgmental and supportive
- Normalize seeking mental health care
- Emphasize confidentiality and safety
- Avoid clinical jargon unless explaining it
- Stay within scope of general information

If someone expresses crisis thoughts, immediately provide crisis resources and encourage immediate professional help.`,

    tone: 'warm, professional, encouraging',
    max_tokens: 300
  },

  [CHAT_TYPES.CLIENT_SUPPORT]: {
    name: 'Client Support Assistant',
    system_prompt: `You are a supportive assistant for existing therapy clients, helping with administrative questions and providing general support between sessions.

Your role:
- Answer questions about appointments, policies, and procedures
- Provide general emotional support and validation
- Share coping strategies and self-care reminders
- Help with session preparation or follow-up
- Guide clients to appropriate resources
- Maintain therapeutic boundaries

Important limitations:
- You are NOT a therapist and cannot provide therapy
- You cannot make clinical decisions or interpretations
- Always refer clinical questions to their therapist
- Respect confidentiality - don't store or reference specific client details
- For urgent matters, direct to appropriate resources

Be supportive but clear about your role as an administrative assistant.`,

    tone: 'supportive, professional, clear about boundaries',
    max_tokens: 250
  },

  [CHAT_TYPES.APPOINTMENT_BOOKING]: {
    name: 'Appointment Assistant',
    system_prompt: `You are a helpful assistant for scheduling therapy appointments and answering logistical questions.

Your role:
- Guide users through the appointment booking process
- Explain scheduling policies and procedures
- Answer questions about session formats (in-person, telehealth)
- Provide information about insurance and payment
- Help with forms and intake processes
- Address accessibility needs

Keep responses:
- Clear and organized
- Professional but friendly
- Focused on practical information
- Respectful of privacy
- Encouraging about taking the step to book

Always direct complex scheduling issues to staff for human assistance.`,

    tone: 'helpful, organized, encouraging',
    max_tokens: 200
  },

  [CHAT_TYPES.GENERAL_INQUIRY]: {
    name: 'Practice Information Assistant',
    system_prompt: `You are a knowledgeable assistant providing information about a psychology practice, services, and mental health in general.

Your role:
- Explain different therapy modalities and approaches
- Provide information about practice specialties
- Answer questions about what to expect in therapy
- Share general mental health education
- Address stigma and misconceptions about therapy
- Guide users to appropriate next steps

Guidelines:
- Provide accurate, evidence-based information
- Use accessible language, avoiding jargon
- Be inclusive and culturally sensitive
- Emphasize the importance of finding the right fit
- Never provide diagnoses or specific medical advice
- Encourage professional consultation for personal situations`,

    tone: 'informative, welcoming, educational',
    max_tokens: 350
  },

  [CHAT_TYPES.CRISIS_SUPPORT]: {
    name: 'Crisis Support Assistant',
    system_prompt: `You are a crisis-aware assistant trained to recognize and respond to mental health emergencies with immediate safety resources.

CRITICAL RESPONSIBILITIES:
- Immediately recognize signs of suicidal ideation, self-harm, or crisis
- Provide crisis hotline numbers and emergency resources
- Encourage immediate professional help or emergency services
- Never attempt to provide therapy or crisis counseling yourself
- Express care and concern while directing to appropriate help
- Document crisis interactions for follow-up

Crisis Resources to Always Provide:
- 988 Suicide & Crisis Lifeline (24/7)
- Emergency services (911) for immediate danger
- Crisis Text Line (Text HOME to 741741)
- Local emergency room information

Your tone should be calm, caring, direct, and action-oriented. Safety is the absolute priority.`,

    tone: 'calm, caring, direct, safety-focused',
    max_tokens: 200
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (userId, chatType, metadata = {}) => {
  try {
    if (!Object.values(CHAT_TYPES).includes(chatType)) {
      throw new Error(`Invalid chat type: ${chatType}`);
    }

    const session = await prisma.chatSession.create({
      data: {
        userId: userId || null, // Allow anonymous sessions for leads
        chatType,
        status: 'active',
        metadata: {
          ...metadata,
          started_at: new Date(),
          personality: CHAT_PERSONALITIES[chatType].name
        }
      }
    });

    logger.info(`Chat session created: ${session.id} (type: ${chatType})`);
    return session;

  } catch (error) {
    logger.error('Failed to create chat session:', error);
    throw error;
  }
};

/**
 * Send message and get AI response
 */
export const sendChatMessage = async (sessionId, message, userType = 'user') => {
  try {
    if (!isInitialized) {
      throw new Error('AI Chat service not initialized');
    }

    // Get chat session with message history
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20 // Limit context to last 20 messages
        }
      }
    });

    if (!session) {
      throw new Error('Chat session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Chat session is not active');
    }

    // Store user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        content: message,
        sender: userType,
        metadata: {
          timestamp: new Date(),
          message_length: message.length
        }
      }
    });

    // Check for crisis indicators
    const crisisDetected = await detectCrisisLanguage(message);
    if (crisisDetected) {
      // Switch to crisis support mode
      const crisisResponse = await generateCrisisResponse(message);

      const aiMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          content: crisisResponse.content,
          sender: 'ai',
          metadata: {
            crisis_detected: true,
            crisis_level: crisisResponse.crisis_level,
            resources_provided: crisisResponse.resources,
            model: 'gpt-4',
            tokens: crisisResponse.tokens
          }
        }
      });

      // Update session to crisis mode
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          metadata: {
            ...session.metadata,
            crisis_detected: true,
            crisis_timestamp: new Date()
          }
        }
      });

      return {
        message: aiMessage,
        crisis_detected: true,
        requires_immediate_attention: crisisResponse.crisis_level === 'high'
      };
    }

    // Generate normal AI response
    const personality = CHAT_PERSONALITIES[session.chatType];
    const conversationContext = buildConversationContext(session.messages, message);

    const aiResponse = await generateAIResponse(
      conversationContext,
      personality,
      session.metadata
    );

    // Store AI response
    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        content: aiResponse.content,
        sender: 'ai',
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          personality: personality.name,
          confidence: aiResponse.confidence
        }
      }
    });

    // Update session activity
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
        messageCount: session.messageCount + 2 // user + ai message
      }
    });

    logger.info(`Chat message processed: session ${sessionId}`);

    return {
      message: aiMessage,
      crisis_detected: false,
      suggested_actions: aiResponse.suggested_actions
    };

  } catch (error) {
    logger.error('Failed to process chat message:', error);
    throw error;
  }
};

/**
 * Detect crisis language patterns
 */
const detectCrisisLanguage = async (message) => {
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'not worth living',
    'hurt myself', 'self harm', 'cutting', 'overdose',
    'want to die', 'better off dead', 'no point in living',
    'thinking of ending', 'suicidal thoughts'
  ];

  const messageText = message.toLowerCase();
  return crisisKeywords.some(keyword => messageText.includes(keyword));
};

/**
 * Generate crisis-specific response
 */
const generateCrisisResponse = async (message) => {
  const crisisPrompt = `
CRISIS SITUATION DETECTED

User message: "${message}"

Provide an immediate, compassionate crisis response that:
1. Acknowledges their pain without minimizing it
2. Provides immediate crisis resources
3. Encourages immediate professional help
4. Expresses care and hope
5. Does NOT attempt therapy or detailed discussion

Include these resources:
- 988 Suicide & Crisis Lifeline (call or text)
- Crisis Text Line: Text HOME to 741741
- If in immediate danger: Call 911

Keep response under 200 words. Be direct but caring.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: CHAT_PERSONALITIES[CHAT_TYPES.CRISIS_SUPPORT].system_prompt
        },
        {
          role: 'user',
          content: crisisPrompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3 // Low temperature for consistent crisis responses
    });

    return {
      content: response.choices[0].message.content,
      crisis_level: 'high',
      resources: ['988', 'Crisis Text Line', '911'],
      tokens: response.usage.total_tokens
    };

  } catch (error) {
    // Fallback crisis response if AI fails
    logger.error('AI crisis response failed, using fallback:', error);
    return {
      content: `I'm concerned about what you're going through. Please reach out for immediate help:

🆘 **Crisis Resources:**
• **988 Suicide & Crisis Lifeline** - Call or text 988 (24/7)
• **Crisis Text Line** - Text HOME to 741741
• **Emergency** - Call 911 if in immediate danger

Your life has value, and there are people who want to help. Please reach out to one of these resources right now.`,
      crisis_level: 'high',
      resources: ['988', 'Crisis Text Line', '911'],
      tokens: 0
    };
  }
};

/**
 * Build conversation context for AI
 */
const buildConversationContext = (messageHistory, currentMessage) => {
  const context = messageHistory.map(msg => ({
    role: msg.sender === 'ai' ? 'assistant' : 'user',
    content: msg.content
  }));

  // Add current message
  context.push({
    role: 'user',
    content: currentMessage
  });

  return context;
};

/**
 * Generate AI response using OpenAI
 */
const generateAIResponse = async (conversationContext, personality, sessionMetadata) => {
  try {
    const systemMessage = {
      role: 'system',
      content: personality.system_prompt
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...conversationContext],
      max_tokens: personality.max_tokens,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiMessage = response.choices[0].message.content;

    // Analyze response for suggested actions
    const suggestedActions = await analyzeSuggestedActions(aiMessage, personality);

    return {
      content: aiMessage,
      model: 'gpt-4',
      tokens: response.usage.total_tokens,
      confidence: response.choices[0].finish_reason === 'stop' ? 0.9 : 0.7,
      suggested_actions: suggestedActions
    };

  } catch (error) {
    logger.error('OpenAI API call failed:', error);

    // Fallback response
    return {
      content: "I apologize, but I'm having trouble responding right now. Please try again in a moment, or feel free to contact our office directly for immediate assistance.",
      model: 'fallback',
      tokens: 0,
      confidence: 0.0,
      suggested_actions: ['contact_office']
    };
  }
};

/**
 * Analyze AI response for suggested actions
 */
const analyzeSuggestedActions = async (aiMessage, personality) => {
  const actions = [];

  if (aiMessage.includes('schedule') || aiMessage.includes('appointment')) {
    actions.push('schedule_appointment');
  }

  if (aiMessage.includes('contact') || aiMessage.includes('call')) {
    actions.push('contact_office');
  }

  if (aiMessage.includes('learn more') || aiMessage.includes('information')) {
    actions.push('view_services');
  }

  if (personality.name.includes('Lead') && aiMessage.includes('consultation')) {
    actions.push('book_consultation');
  }

  return actions;
};

/**
 * Get chat session with messages
 */
export const getChatSession = async (sessionId, userId = null) => {
  try {
    const whereClause = userId
      ? { id: sessionId, userId }
      : { id: sessionId };

    const session = await prisma.chatSession.findUnique({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: userId ? {
          select: {
            id: true,
            name: true,
            email: true
          }
        } : false
      }
    });

    return session;
  } catch (error) {
    logger.error('Failed to get chat session:', error);
    throw error;
  }
};

/**
 * End chat session
 */
export const endChatSession = async (sessionId, userId = null, reason = 'user_ended') => {
  try {
    const whereClause = userId
      ? { id: sessionId, userId }
      : { id: sessionId };

    const session = await prisma.chatSession.update({
      where: whereClause,
      data: {
        status: 'ended',
        endedAt: new Date(),
        metadata: {
          ...session.metadata,
          end_reason: reason,
          ended_at: new Date()
        }
      }
    });

    logger.info(`Chat session ended: ${sessionId} (reason: ${reason})`);
    return session;

  } catch (error) {
    logger.error('Failed to end chat session:', error);
    throw error;
  }
};

/**
 * Get user's chat history
 */
export const getUserChatHistory = async (userId, limit = 10) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3 // Show last 3 messages as preview
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return sessions;
  } catch (error) {
    logger.error('Failed to get user chat history:', error);
    throw error;
  }
};

/**
 * Generate chat analytics
 */
export const getChatAnalytics = async (userId, dateRange = '30d') => {
  try {
    const startDate = new Date();
    if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

    const whereClause = {
      ...(userId && { userId }),
      createdAt: { gte: startDate }
    };

    const [
      totalSessions,
      activeSessions,
      messageCount,
      crisisSessions,
      chatTypeBreakdown
    ] = await Promise.all([
      prisma.chatSession.count({ where: whereClause }),
      prisma.chatSession.count({ where: { ...whereClause, status: 'active' } }),
      prisma.chatMessage.count({
        where: {
          session: whereClause,
          createdAt: { gte: startDate }
        }
      }),
      prisma.chatSession.count({
        where: {
          ...whereClause,
          metadata: {
            path: ['crisis_detected'],
            equals: true
          }
        }
      }),
      prisma.chatSession.groupBy({
        by: ['chatType'],
        where: whereClause,
        _count: true
      })
    ]);

    const avgMessagesPerSession = totalSessions > 0 ? messageCount / totalSessions : 0;

    return {
      period: dateRange,
      total_sessions: totalSessions,
      active_sessions: activeSessions,
      total_messages: messageCount,
      avg_messages_per_session: Math.round(avgMessagesPerSession * 10) / 10,
      crisis_sessions: crisisSessions,
      chat_type_breakdown: chatTypeBreakdown.reduce((acc, item) => {
        acc[item.chatType] = item._count;
        return acc;
      }, {}),
      crisis_rate: totalSessions > 0 ? (crisisSessions / totalSessions * 100).toFixed(2) + '%' : '0%'
    };

  } catch (error) {
    logger.error('Failed to get chat analytics:', error);
    throw error;
  }
};

// Initialize on module load
initializeAIChat();