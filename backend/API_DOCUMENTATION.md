# Mindful Ad Wizard API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "message": "Optional message",
  "data": {}, // Response data
  "error": "Error message if success is false"
}
```

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 429: Rate Limited
- 500: Internal Server Error

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "Dr. Sarah Johnson",
  "email": "sarah@example.com",
  "password": "password123!",
  "company": "Optional Company Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "email": "sarah@example.com",
      "role": "CLIENT",
      "isActive": true,
      "isVerified": false
    }
  }
}
```

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "sarah@example.com",
  "password": "password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "email": "sarah@example.com",
      "role": "CLIENT"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### POST /api/auth/logout
Logout and invalidate tokens.

### POST /api/auth/verify-email
Verify email address with verification token.

**Request Body:**
```json
{
  "token": "verification_token"
}
```

### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "sarah@example.com"
}
```

### POST /api/auth/reset-password
Reset password with reset token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "new_password123!"
}
```

---

## User Profile Endpoints

### GET /api/user/profile
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Dr. Sarah Johnson",
      "email": "sarah@example.com",
      "role": "CLIENT",
      "avatar": "url_or_null",
      "company": "Mindful Therapy Center",
      "bio": "Licensed clinical psychologist...",
      "phone": "+1-555-0123",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/user/profile
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Dr. Sarah Johnson",
  "company": "Updated Company",
  "bio": "Updated bio",
  "phone": "+1-555-0123"
}
```

### PUT /api/user/change-password
Change password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password123!"
}
```

### POST /api/user/upload-avatar
Upload profile avatar.

**Headers:** `Authorization: Bearer <token>`

**Request:** Multipart form data with `avatar` file field.

---

## Onboarding Endpoints

### GET /api/onboarding
Get user's onboarding data.

**Headers:** `Authorization: Bearer <token>`

### POST /api/onboarding
Save onboarding data.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "city": "Los Angeles, CA",
  "targetAudience": "Adults aged 25-45 experiencing anxiety",
  "averageTicket": 150,
  "serviceType": "Individual Therapy",
  "businessGoals": ["Generate more leads", "Increase online bookings"],
  "budget": 2500,
  "experience": "Some experience with online ads",
  "completed": true
}
```

---

## Campaign Endpoints

### GET /api/campaigns
Get user's campaigns with pagination and filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (DRAFT, ACTIVE, PAUSED, COMPLETED)
- `platform`: Filter by platform (GOOGLE, META, BOTH)
- `search`: Search by name

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "uuid",
        "name": "Anxiety Treatment Campaign",
        "platform": "BOTH",
        "status": "ACTIVE",
        "budget": 1500,
        "targetAudience": "Adults in LA area",
        "objectives": ["Generate more leads"],
        "impressions": 15420,
        "clicks": 892,
        "conversions": 45,
        "cost": 1247.50,
        "leads": 38,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### POST /api/campaigns
Create a new campaign.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Campaign",
  "platform": "BOTH",
  "budget": 2000,
  "targetAudience": "Target audience description",
  "objectives": ["Generate more leads", "Increase brand awareness"]
}
```

### GET /api/campaigns/:id
Get campaign by ID.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/campaigns/:id
Update campaign.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST with fields to update.

### DELETE /api/campaigns/:id
Delete campaign.

**Headers:** `Authorization: Bearer <token>`

### POST /api/campaigns/:id/launch
Launch campaign to advertising platforms.

**Headers:** `Authorization: Bearer <token>`

### POST /api/campaigns/:id/pause
Pause active campaign.

**Headers:** `Authorization: Bearer <token>`

### POST /api/campaigns/:id/resume
Resume paused campaign.

**Headers:** `Authorization: Bearer <token>`

---

## AI Chat Endpoints

### POST /api/ai/chat
Send message to AI assistant.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "Help me improve my campaign targeting",
  "context": {
    "campaignId": "optional_campaign_id",
    "type": "campaign_optimization"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "AI assistant response...",
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2"
    ]
  }
}
```

### POST /api/ai/analyze-campaign
Analyze campaign performance with AI.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "campaignId": "campaign_uuid"
}
```

---

## Landing Page Customization Endpoints

### GET /api/landing-pages/:id/customize
Get customization options for a landing page.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "customization_options": {
      "current_theme": "Professional Blue",
      "current_layout": "psychology-practice",
      "available_themes": {
        "professional-blue": {
          "name": "Professional Blue",
          "primary": "#1e40af",
          "secondary": "#64748b",
          "description": "Clean, trustworthy blue theme"
        }
      },
      "available_layouts": {
        "hero-centered": {
          "name": "Hero Centered",
          "description": "Large centered hero section",
          "suitable_for": ["Individual Therapy"]
        }
      },
      "content_sections": {
        "hero": {
          "name": "Hero Section",
          "customizable": true
        }
      }
    }
  }
}
```

### GET /api/landing-pages/customize/themes
Get all available color themes.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "themes": {
      "professional-blue": {
        "name": "Professional Blue",
        "primary": "#1e40af",
        "secondary": "#64748b",
        "accent": "#3b82f6",
        "background": "#f8fafc",
        "text": "#1e293b",
        "description": "Clean, trustworthy blue theme ideal for clinical practices"
      },
      "warm-green": {
        "name": "Warm Green",
        "primary": "#059669",
        "secondary": "#6b7280",
        "accent": "#10b981",
        "background": "#f0fdf4",
        "text": "#1f2937",
        "description": "Calming green theme perfect for wellness centers"
      }
    }
  }
}
```

### POST /api/landing-pages/:id/customize/theme
Apply a theme to landing page.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "theme_id": "professional-blue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Theme applied successfully",
  "data": {
    "landing_page": {
      "id": "uuid",
      "name": "Landing Page",
      "colors": {
        "primary": "#1e40af",
        "secondary": "#64748b",
        "theme_name": "Professional Blue"
      }
    }
  }
}
```

### POST /api/landing-pages/:id/customize/custom-theme
Create and apply custom color theme.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "colors": {
    "primary": "#1e40af",
    "secondary": "#64748b",
    "accent": "#3b82f6",
    "background": "#f8fafc",
    "text": "#1e293b"
  },
  "theme_name": "My Custom Theme"
}
```

### POST /api/landing-pages/:id/customize/layout
Change landing page layout template.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "layout_id": "hero-split"
}
```

### PUT /api/landing-pages/:id/customize/content/:sectionName
Update specific content section.

**Headers:** `Authorization: Bearer <token>`

**Request Body (Hero Section):**
```json
{
  "headline": "Professional Mental Health Services",
  "subheadline": "Compassionate care for your journey",
  "description": "Get the support you need",
  "cta": "Schedule Consultation"
}
```

**Request Body (Services Section):**
```json
{
  "title": "Our Services",
  "description": "Comprehensive mental health services",
  "services_list": [
    "Individual Therapy",
    "Couples Counseling",
    "Family Therapy"
  ]
}
```

### POST /api/landing-pages/:id/customize/content/:sectionName/regenerate
Regenerate content section with AI.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "custom_prompt": "Make it more welcoming and friendly for young adults dealing with anxiety"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content section regenerated successfully with AI",
  "data": {
    "landing_page": {
      "content": {
        "hero": {
          "headline": "Find Your Path to Peace",
          "subheadline": "Friendly support for young adults facing anxiety",
          "ai_generated": true
        }
      }
    }
  }
}
```

### POST /api/landing-pages/:id/customize/preview
Preview customization changes without saving.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "theme_id": "warm-green",
  "layout_id": "hero-split",
  "content_changes": {
    "hero": {
      "headline": "New Headline"
    }
  },
  "custom_colors": {
    "primary": "#059669"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customization preview generated",
  "data": {
    "preview": {
      "id": "uuid",
      "colors": {
        "primary": "#059669"
      },
      "template": "hero-split"
    },
    "is_preview": true
  }
}
```

### POST /api/landing-pages/:id/customize/reset
Reset landing page to default settings.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Landing page reset to default settings",
  "data": {
    "landing_page": {
      "template": "psychology-practice",
      "colors": {
        "theme_name": "Professional Blue"
      }
    }
  }
}
```

### GET /api/landing-pages/:id/customize/analytics
Get customization analytics and performance metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "current_theme": "Professional Blue",
      "current_layout": "psychology-practice",
      "performance": {
        "visits": 1250,
        "conversions": 45,
        "conversion_rate": 3.6
      },
      "last_modified": "2024-01-15T10:30:00.000Z",
      "customization_history": {
        "current_version": 1,
        "last_theme_change": "2024-01-15T10:30:00.000Z"
      }
    }
  }
}
```

---

## AI Chat System Endpoints

The AI Chat system provides intelligent conversational support for therapy practices with psychology-specific responses, crisis detection, and lead engagement capabilities.

### GET /api/chat/health
Health check for AI Chat service.

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "ai_chat",
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "features": {
      "openai_integration": "enabled",
      "crisis_detection": "enabled",
      "analytics": "enabled",
      "anonymous_sessions": "enabled"
    }
  }
}
```

### GET /api/chat/types
Get available chat types and their descriptions.

**Response:**
```json
{
  "success": true,
  "data": {
    "chat_types": {
      "LEAD_ENGAGEMENT": {
        "name": "Lead Engagement",
        "description": "For potential clients inquiring about therapy services",
        "suitable_for": ["website_visitors", "prospective_clients"],
        "anonymous_allowed": true
      },
      "CLIENT_SUPPORT": {
        "name": "Client Support",
        "description": "Support for existing therapy clients",
        "suitable_for": ["existing_clients", "appointment_questions"],
        "anonymous_allowed": false
      },
      "CRISIS_SUPPORT": {
        "name": "Crisis Support",
        "description": "Immediate support for mental health emergencies",
        "suitable_for": ["crisis_situations", "emergency_support"],
        "anonymous_allowed": true,
        "priority": "high"
      }
    }
  }
}
```

### POST /api/chat/start
Start a new chat session. Supports both authenticated users and anonymous leads.

**Headers:** `Authorization: Bearer <token>` *(Optional for anonymous sessions)*

**Request Body:**
```json
{
  "chat_type": "LEAD_ENGAGEMENT",
  "metadata": {
    "started_via": "landing_page",
    "initial_context": "anxiety_treatment",
    "landing_page_id": "uuid",
    "user_agent": "Mozilla/5.0...",
    "referrer": "https://google.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session started successfully",
  "data": {
    "session": {
      "id": "session_uuid",
      "chat_type": "LEAD_ENGAGEMENT",
      "status": "ACTIVE",
      "created_at": "2024-01-15T10:30:00.000Z",
      "metadata": {
        "user_type": "anonymous",
        "started_via": "landing_page",
        "personality": "Lead Engagement Assistant"
      }
    }
  }
}
```

### POST /api/chat/:sessionId/message
Send a message in a chat session.

**Headers:** `Authorization: Bearer <token>` *(Optional for anonymous sessions)*

**Request Body:**
```json
{
  "message": "I'm interested in anxiety therapy. What can you tell me about your approach?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg_uuid",
      "content": "I'm interested in anxiety therapy. What can you tell me about your approach?",
      "sender": "USER",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "ai_response": {
      "id": "msg_uuid",
      "content": "I'm glad you're reaching out about anxiety therapy. We use evidence-based approaches like Cognitive Behavioral Therapy (CBT) and mindfulness techniques that have shown great success in helping people manage anxiety. Our therapists create a safe, supportive environment where you can work through your concerns at your own pace. Would you like to know more about what to expect in your first session?",
      "sender": "AI",
      "timestamp": "2024-01-15T10:30:30.000Z",
      "metadata": {
        "model": "gpt-4",
        "confidence": 0.9
      }
    },
    "suggested_actions": [
      "schedule_appointment",
      "view_services"
    ]
  }
}
```

**Crisis Response Example:**
```json
{
  "success": true,
  "data": {
    "ai_response": {
      "content": "I'm very concerned about what you're going through. Please reach out for immediate help:\n\n🆘 Crisis Resources:\n• 988 Suicide & Crisis Lifeline - Call or text 988 (24/7)\n• Crisis Text Line - Text HOME to 741741\n• Emergency - Call 911 if in immediate danger\n\nYour life has value, and there are people who want to help."
    },
    "crisis_alert": {
      "detected": true,
      "requires_immediate_attention": true,
      "recommended_actions": ["contact_crisis_hotline", "contact_emergency_services"]
    },
    "priority": "high"
  }
}
```

### GET /api/chat/:sessionId
Get chat session with message history.

**Headers:** `Authorization: Bearer <token>` *(Optional for anonymous sessions)*

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session_uuid",
      "chat_type": "LEAD_ENGAGEMENT",
      "status": "ACTIVE",
      "created_at": "2024-01-15T10:30:00.000Z",
      "last_activity": "2024-01-15T10:35:00.000Z",
      "message_count": 4,
      "messages": [
        {
          "id": "msg1_uuid",
          "content": "Hello, I'm interested in therapy",
          "sender": "USER",
          "timestamp": "2024-01-15T10:30:00.000Z"
        },
        {
          "id": "msg2_uuid",
          "content": "Welcome! I'd be happy to help you learn about our therapy services...",
          "sender": "AI",
          "timestamp": "2024-01-15T10:30:15.000Z"
        }
      ]
    }
  }
}
```

### POST /api/chat/:sessionId/end
End a chat session.

**Headers:** `Authorization: Bearer <token>` *(Optional for anonymous sessions)*

**Request Body:**
```json
{
  "reason": "user_ended"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session ended successfully",
  "data": {
    "session": {
      "id": "session_uuid",
      "status": "ENDED",
      "ended_at": "2024-01-15T10:45:00.000Z",
      "reason": "user_ended"
    }
  }
}
```

### GET /api/chat/history
Get user's chat history (requires authentication).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of sessions to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "chat_history": [
      {
        "id": "session_uuid",
        "chat_type": "LEAD_ENGAGEMENT",
        "status": "ENDED",
        "created_at": "2024-01-15T10:30:00.000Z",
        "message_count": 8,
        "preview_messages": [
          {
            "content": "Hello, I'm interested in therapy services...",
            "sender": "USER",
            "timestamp": "2024-01-15T10:30:00.000Z"
          }
        ]
      }
    ],
    "total_sessions": 5
  }
}
```

### GET /api/chat/analytics
Get chat analytics (requires authentication).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` (optional): '7d', '30d', '90d' (default: '30d')
- `admin_view` (optional): 'true' for system-wide analytics (admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "period": "30d",
      "total_sessions": 145,
      "active_sessions": 12,
      "total_messages": 892,
      "avg_messages_per_session": 6.2,
      "crisis_sessions": 3,
      "crisis_rate": "2.07%",
      "chat_type_breakdown": {
        "LEAD_ENGAGEMENT": 85,
        "CLIENT_SUPPORT": 45,
        "APPOINTMENT_BOOKING": 12,
        "CRISIS_SUPPORT": 3
      },
      "scope": "user_specific"
    }
  }
}
```

### POST /api/chat/suggestions
Get contextual chat suggestions.

**Request Body:**
```json
{
  "chat_type": "LEAD_ENGAGEMENT",
  "context": "anxiety_treatment",
  "user_input": "therapy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "What types of therapy do you offer?",
      "How do I know if therapy is right for me?",
      "What can I expect in my first session?",
      "Do you accept insurance?",
      "How do I schedule a consultation?"
    ],
    "chat_type": "LEAD_ENGAGEMENT",
    "context_used": "anxiety_treatment"
  }
}
```

## Chat System Features

### Psychology-Specific Personalities
- **Lead Engagement**: Warm, welcoming responses for potential clients
- **Client Support**: Professional support for existing clients with clear boundaries
- **Crisis Support**: Immediate safety-focused responses with crisis resources
- **Appointment Booking**: Helpful scheduling assistance
- **General Inquiry**: Educational mental health information

### Crisis Detection & Response
- Automatic detection of crisis language (suicide, self-harm, emergency keywords)
- Immediate provision of crisis resources (988 Lifeline, Crisis Text Line, 911)
- Crisis session flagging and logging for follow-up
- Safety-first approach with professional boundaries

### Anonymous Support
- Lead engagement without requiring registration
- Privacy-focused conversations for website visitors
- Seamless transition from anonymous to authenticated sessions

### Analytics & Insights
- Session analytics and engagement metrics
- Crisis detection monitoring and reporting
- Chat type effectiveness tracking
- User satisfaction and conversion insights

---

## Metrics Dashboard Endpoints

The Metrics Dashboard provides comprehensive analytics and performance tracking across all system components.

### GET /api/metrics/dashboard
Get comprehensive dashboard metrics and KPIs.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeframe` (optional): '7d', '30d', '90d' (default: '30d')
- `include_system` (optional): 'true'/'false' - system-wide metrics (admin only, default: 'false')
- `refresh_cache` (optional): 'true'/'false' - bypass cache (default: 'false')

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "timeframe": "30d",
      "generated_at": "2024-01-15T10:30:00.000Z",
      "user_scope": "user_specific",

      "overview": {
        "total_campaigns": 12,
        "active_campaigns": 8,
        "total_leads": 145,
        "new_leads": 23,
        "conversion_rate": "15.8%",
        "total_spend": 2450.50,
        "total_impressions": 125000,
        "total_clicks": 3250,
        "avg_cpc": 0.75,
        "roas": 3.2
      },

      "campaigns": {
        "total_count": 12,
        "active_count": 8,
        "total_impressions": 125000,
        "total_clicks": 3250,
        "total_conversions": 85,
        "total_spend": 2450.50,
        "platform_breakdown": {
          "META": {
            "count": 7,
            "impressions": 80000,
            "clicks": 2100,
            "spend": 1600.25
          },
          "GOOGLE": {
            "count": 5,
            "impressions": 45000,
            "clicks": 1150,
            "spend": 850.25
          }
        },
        "top_performers": [
          {
            "id": "campaign_uuid",
            "name": "Anxiety Treatment - Meta",
            "platform": "META",
            "metrics": {
              "impressions": 25000,
              "clicks": 650,
              "conversions": 25,
              "cost": 487.50,
              "ctr": "2.60",
              "conversion_rate": "3.85"
            }
          }
        ]
      },

      "leads": {
        "total_count": 145,
        "new_leads": 23,
        "total_value": 18750.00,
        "avg_value": 129.31,
        "status_breakdown": {
          "NEW": {"count": 23, "avg_value": 125.00},
          "CONTACTED": {"count": 45, "avg_value": 135.50},
          "QUALIFIED": {"count": 52, "avg_value": 145.75},
          "CONVERTED": {"count": 25, "avg_value": 180.00}
        },
        "conversion_funnel": {
          "new": 145,
          "contacted": 122,
          "qualified": 77,
          "converted": 25,
          "conversion_rates": {
            "contact_rate": "84.14",
            "qualification_rate": "63.11",
            "conversion_rate": "32.47",
            "overall_conversion": "17.24"
          }
        }
      },

      "landing_pages": {
        "total_count": 8,
        "active_count": 6,
        "total_visits": 8750,
        "total_conversions": 145,
        "overall_conversion_rate": "1.66",
        "template_breakdown": {
          "psychology-practice": {
            "count": 4,
            "visits": 4500,
            "conversions": 85,
            "conversion_rate": "1.89"
          },
          "wellness-center": {
            "count": 2,
            "visits": 2250,
            "conversions": 35,
            "conversion_rate": "1.56"
          }
        }
      },

      "chat_system": {
        "total_sessions": 89,
        "active_sessions": 3,
        "total_messages": 456,
        "crisis_sessions": 2,
        "crisis_rate": "2.25",
        "avg_session_duration_minutes": 12,
        "type_breakdown": {
          "LEAD_ENGAGEMENT": {"count": 45, "avg_messages": 5.2},
          "CLIENT_SUPPORT": {"count": 25, "avg_messages": 4.8},
          "APPOINTMENT_BOOKING": {"count": 12, "avg_messages": 3.5},
          "CRISIS_SUPPORT": {"count": 2, "avg_messages": 8.0}
        }
      },

      "insights": [
        {
          "type": "opportunity",
          "category": "campaigns",
          "title": "Meta Campaigns Outperforming Google",
          "message": "Meta campaigns have 23% higher CTR. Consider reallocating budget.",
          "action": "Optimize Budget Allocation"
        },
        {
          "type": "alert",
          "category": "leads",
          "title": "Conversion Rate Below Target",
          "message": "Lead conversion rate at 17.24% vs target 25%. Review follow-up process.",
          "action": "Improve Lead Nurturing"
        }
      ],

      "trends": {
        "2024-01-01": {
          "impressions": 4200,
          "clicks": 110,
          "spend": 85.50,
          "leads": 5,
          "chat_sessions": 3
        },
        "2024-01-02": {
          "impressions": 4100,
          "clicks": 125,
          "spend": 92.25,
          "leads": 6,
          "chat_sessions": 4
        }
      },

      "user_info": {
        "user_id": "user_uuid",
        "role": "CLIENT",
        "viewing_scope": "user_specific",
        "permissions": {
          "can_view_system_metrics": false,
          "can_manage_campaigns": true,
          "can_export_data": true
        }
      }
    }
  }
}
```

### GET /api/metrics/category/:category
Get detailed metrics for a specific category.

**Headers:** `Authorization: Bearer <token>`

**Categories:** `campaigns`, `leads`, `landing_pages`, `chat`, `creatives`, `approvals`

**Query Parameters:**
- `timeframe` (optional): '7d', '30d', '90d' (default: '30d')
- `detailed` (optional): 'true'/'false' - include detailed breakdowns (default: 'false')

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "campaigns",
    "timeframe": "30d",
    "metrics": {
      "total_count": 12,
      "active_count": 8,
      "total_impressions": 125000,
      "total_clicks": 3250,
      "platform_breakdown": {
        "META": {
          "count": 7,
          "impressions": 80000,
          "clicks": 2100
        },
        "GOOGLE": {
          "count": 5,
          "impressions": 45000,
          "clicks": 1150
        }
      }
    },
    "last_updated": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/metrics/realtime
Get real-time metrics and recent activity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "real_time": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "recent_leads": [
        {
          "id": "lead_uuid",
          "name": "Sarah Johnson",
          "email": "sarah@example.com",
          "source": "Meta Campaign",
          "status": "NEW",
          "time_ago": "5m ago"
        }
      ],
      "active_chat_sessions": 3,
      "recent_campaign_activity": [
        {
          "id": "campaign_uuid",
          "name": "Anxiety Treatment - Meta",
          "status": "ACTIVE",
          "platform": "META",
          "time_ago": "2h ago"
        }
      ],
      "pending_approvals": 2,
      "system_alerts": [
        {
          "type": "warning",
          "message": "5 campaigns pending approval",
          "action": "Review pending approvals"
        }
      ]
    }
  }
}
```

### GET /api/metrics/comparison
Get performance comparison between time periods.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `current_period` (optional): '7d', '30d', '90d' (default: '30d')
- `comparison_period` (optional): '7d', '30d', '90d' (default: '30d')
- `offset_days` (optional): Days to offset comparison period (default: '30')

**Response:**
```json
{
  "success": true,
  "data": {
    "current_period": {
      "timeframe": "30d",
      "metrics": {
        "total_campaigns": 12,
        "total_leads": 145,
        "total_spend": 2450.50,
        "conversion_rate": "15.8%"
      }
    },
    "comparison_period": {
      "timeframe": "30d",
      "offset_days": 30,
      "metrics": {
        "total_campaigns": 8,
        "total_leads": 98,
        "total_spend": 1850.25,
        "conversion_rate": "12.5%"
      }
    },
    "changes": {
      "total_campaigns": "50.00",
      "total_leads": "47.96",
      "total_spend": "32.43",
      "conversion_rate": "26.40"
    },
    "generated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/metrics/export
Export metrics data for external analysis.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `timeframe` (optional): '7d', '30d', '90d' (default: '30d')
- `format` (optional): 'json', 'csv' (default: 'json')
- `categories` (optional): Comma-separated list or 'all' (default: 'all')
- `include_system` (optional): 'true'/'false' - system metrics (admin only, default: 'false')

**Response:** File download with appropriate Content-Type and Content-Disposition headers

**JSON Export Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": {
      "total_count": 12,
      "platform_breakdown": {...}
    },
    "leads": {
      "total_count": 145,
      "status_breakdown": {...}
    },
    "export_info": {
      "exported_by": "user_uuid",
      "export_date": "2024-01-15T10:30:00.000Z",
      "timeframe": "30d",
      "format": "json",
      "scope": "user_specific"
    }
  }
}
```

## Dashboard Features

### Key Performance Indicators (KPIs)
- **Campaign Performance**: Impressions, clicks, conversions, spend, ROAS
- **Lead Generation**: Total leads, conversion rates, pipeline analysis
- **Landing Page Analytics**: Visit tracking, conversion optimization
- **Chat System Metrics**: Session analytics, crisis detection monitoring
- **Creative Performance**: CTR analysis, A/B test results
- **Approval Workflow**: Review times, approval rates

### Real-Time Monitoring
- Live lead notifications and recent activity
- Active chat session monitoring
- Campaign performance alerts
- System health indicators
- Crisis detection alerts for immediate response

### Advanced Analytics
- **Trend Analysis**: Historical performance tracking with time-series data
- **Comparative Analysis**: Period-over-period performance comparison
- **Conversion Funnel**: Lead progression tracking from acquisition to conversion
- **ROI Analysis**: Comprehensive return on ad spend calculations
- **Performance Insights**: AI-powered recommendations and optimization suggestions

### Export Capabilities
- **Multiple Formats**: JSON and CSV export options
- **Customizable Data**: Select specific categories or comprehensive reports
- **Admin Reports**: System-wide analytics for administrative oversight
- **Automated Reporting**: Scheduled export capabilities for regular analysis

---

## Leads Endpoints

### GET /api/leads
Get user's leads with pagination and filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
- `source`: Filter by source
- `campaignId`: Filter by campaign
- `search`: Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "uuid",
        "name": "Jennifer Martinez",
        "email": "jennifer@example.com",
        "phone": "+1-555-0123",
        "source": "Google Ads",
        "status": "NEW",
        "value": 150,
        "notes": "Interested in individual therapy",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "campaign": {
          "id": "uuid",
          "name": "Campaign Name"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
  }
}
```

### POST /api/leads
Create a new lead.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0124",
  "source": "Website",
  "campaignId": "optional_campaign_id",
  "value": 200,
  "notes": "Interested in couples therapy"
}
```

### GET /api/leads/:id
Get lead by ID.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/leads/:id
Update lead.

**Headers:** `Authorization: Bearer <token>`

### DELETE /api/leads/:id
Delete lead.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/leads/:id/status
Update lead status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "CONTACTED",
  "notes": "Called and scheduled consultation"
}
```

---

## Landing Pages Endpoints

### GET /api/landing-pages
Get user's landing pages.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "landingPages": [
      {
        "id": "uuid",
        "name": "Anxiety Treatment Landing Page",
        "url": "https://mindfuladwizard.com/lp/anxiety-treatment",
        "template": "psychology-modern",
        "colors": {
          "primary": "#2563eb",
          "secondary": "#64748b"
        },
        "content": {
          "headline": "Professional Anxiety Treatment",
          "subheadline": "Get the support you need",
          "cta": "Schedule Free Consultation"
        },
        "visits": 1250,
        "conversions": 45,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### POST /api/landing-pages
Create a new landing page.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Landing Page",
  "template": "psychology-modern",
  "colors": {
    "primary": "#2563eb",
    "secondary": "#64748b",
    "accent": "#0ea5e9"
  },
  "content": {
    "headline": "Main Headline",
    "subheadline": "Supporting text",
    "description": "Detailed description",
    "cta": "Call to Action"
  },
  "contact": {
    "phone": "+1-555-THERAPY",
    "email": "contact@example.com",
    "whatsapp": "+1-555-THERAPY"
  }
}
```

### GET /api/landing-pages/:id
Get landing page by ID.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/landing-pages/:id
Update landing page.

**Headers:** `Authorization: Bearer <token>`

### DELETE /api/landing-pages/:id
Delete landing page.

**Headers:** `Authorization: Bearer <token>`

### GET /api/landing-pages/templates
Get available landing page templates.

**Headers:** `Authorization: Bearer <token>`

---

## Analytics Endpoints

### GET /api/analytics/dashboard
Get dashboard analytics overview.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `dateRange`: Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": {
      "total": 5,
      "active": 3,
      "recent": 2,
      "byPlatform": {
        "GOOGLE": 2,
        "META": 2,
        "BOTH": 1
      },
      "byStatus": {
        "ACTIVE": 3,
        "PAUSED": 1,
        "COMPLETED": 1
      }
    },
    "leads": {
      "total": 127,
      "recent": 23,
      "byStatus": {
        "NEW": 15,
        "CONTACTED": 8,
        "QUALIFIED": 3,
        "CONVERTED": 2
      }
    },
    "performance": {
      "impressions": 45230,
      "clicks": 1876,
      "conversions": 89,
      "cost": 3245.67,
      "leads": 127,
      "ctr": 4.14,
      "cpc": 1.73,
      "cpl": 25.56
    },
    "recentActivity": {
      "campaigns": [],
      "leads": []
    },
    "dateRange": 30
  }
}
```

### GET /api/analytics/campaigns
Get campaign analytics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `campaignId`: Specific campaign ID (optional)
- `dateRange`: Number of days to analyze

### GET /api/analytics/leads
Get lead analytics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `dateRange`: Number of days to analyze

### GET /api/analytics/performance
Get performance metrics with comparison.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `compareWith`: Comparison period (default: 'previous_period')

---

## Notifications Endpoints

### GET /api/notifications
Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `unreadOnly`: Show only unread notifications

### PUT /api/notifications/:id/read
Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/notifications/mark-all-read
Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

---

## Admin Endpoints

All admin endpoints require `ADMIN` or `SUPER_ADMIN` role.

### GET /api/admin/stats
Get system statistics.

**Headers:** `Authorization: Bearer <admin_token>`

### GET /api/admin/users
Get all users with pagination.

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page`, `limit`: Pagination
- `role`: Filter by role
- `status`: Filter by active/inactive
- `search`: Search by name, email, or company

### GET /api/admin/users/:id
Get user by ID.

**Headers:** `Authorization: Bearer <admin_token>`

### PUT /api/admin/users/:id
Update user (admin only).

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "role": "CLIENT",
  "isActive": true,
  "isVerified": true
}
```

### DELETE /api/admin/users/:id
Delete user.

**Headers:** `Authorization: Bearer <admin_token>`

### GET /api/admin/campaigns
Get all campaigns across all users.

**Headers:** `Authorization: Bearer <admin_token>`

### GET /api/admin/health
Get system health status.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "database": {
        "status": "healthy",
        "error": null
      },
      "openai": {
        "status": "healthy",
        "error": null
      },
      "metaAds": {
        "status": "healthy",
        "error": null
      },
      "googleAds": {
        "status": "healthy",
        "error": null
      },
      "email": {
        "status": "healthy",
        "error": null
      }
    }
  }
}
```

---

## Rate Limiting

API endpoints are rate limited:
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- AI endpoints: 20 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Webhooks

The API supports webhooks for real-time updates:

### Campaign Status Changes
Triggered when campaign status changes.

**Payload:**
```json
{
  "event": "campaign.status_changed",
  "data": {
    "campaignId": "uuid",
    "userId": "uuid",
    "oldStatus": "DRAFT",
    "newStatus": "ACTIVE",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### New Lead Created
Triggered when a new lead is created.

**Payload:**
```json
{
  "event": "lead.created",
  "data": {
    "leadId": "uuid",
    "userId": "uuid",
    "campaignId": "uuid",
    "source": "Google Ads",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```