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