# Mindful Ad Wizard - Comprehensive Refactoring Plan

## Project Status: 75% Complete ✅

### Executive Summary
The Mindful Ad Wizard project has excellent foundational architecture with professional-grade database design, security implementation, and AI integration. The remaining 25% focuses on critical external integrations and advanced features.

## Phase 1: OAuth Integration (Week 1) 🔐

### 1.1 Meta Business OAuth
**Priority:** CRITICAL
**Files to Create:**
- `backend/src/services/oauth/metaOAuthService.js`
- `backend/src/routes/oauth.js`
- `frontend/src/pages/ConnectAccounts.tsx`

**Implementation:**
```javascript
// backend/src/services/oauth/metaOAuthService.js
export class MetaOAuthService {
  static generateAuthUrl(userId, redirectUri) {
    // Generate Meta Business OAuth URL
  }
  
  static async exchangeCodeForTokens(code, userId) {
    // Exchange code for access tokens
    // Store encrypted tokens in database
  }
  
  static async refreshAccessToken(userId) {
    // Handle token refresh
  }
  
  static async getUserAdAccounts(userId) {
    // Fetch user's ad accounts
  }
}
```

**Database Updates:**
```sql
-- Add to existing User model
model User {
  // existing fields...
  metaAccessToken    String?   @map("meta_access_token")
  metaRefreshToken   String?   @map("meta_refresh_token")
  metaTokenExpiresAt DateTime? @map("meta_token_expires_at")
  metaAdAccountIds   String[]  @map("meta_ad_account_ids")
  
  googleAccessToken    String?   @map("google_access_token")
  googleRefreshToken   String?   @map("google_refresh_token")
  googleTokenExpiresAt DateTime? @map("google_token_expires_at")
  googleCustomerIds    String[]  @map("google_customer_ids")
}
```

### 1.2 Google Ads OAuth
**Similar structure for Google Ads API integration**

**API Routes:**
- `POST /api/oauth/meta/authorize` - Initiate Meta OAuth
- `GET /api/oauth/meta/callback` - Handle OAuth callback
- `POST /api/oauth/google/authorize` - Initiate Google OAuth
- `GET /api/oauth/google/callback` - Handle Google callback
- `GET /api/oauth/status` - Check connection status
- `POST /api/oauth/disconnect` - Disconnect accounts

---

## Phase 2: Landing Page Generation Engine (Week 2) 🏗️

### 2.1 Template Engine Implementation
**Priority:** HIGH
**Files to Create:**
- `backend/src/services/landingPage/templateEngine.js`
- `backend/src/services/landingPage/templateRenderer.js`
- `backend/src/templates/psychology/` (template directory)

**Features:**
```javascript
// Template Engine Architecture
class LandingPageGenerator {
  static generatePage(landingPageData, template) {
    // Generate complete HTML/CSS/JS
    // Include psychology-specific design elements
    // Mobile-responsive layouts
    // Lead capture forms
    // WhatsApp integration
    // Custom color schemes
  }
  
  static deployPage(userId, pageId, htmlContent) {
    // Save to CDN or file system
    // Generate custom URL
    // Setup analytics tracking
  }
}
```

**Templates to Create:**
1. **Psychology Practice** - Professional, calming design
2. **Therapy Services** - Warm, welcoming layout
3. **Mental Health** - Modern, accessible design
4. **Consultation Booking** - Conversion-optimized

### 2.2 Page Builder Interface
**Frontend Components:**
- `frontend/src/components/PageBuilder/`
- `frontend/src/pages/LandingPageEditor.tsx`

**Features:**
- Drag & drop editor
- Real-time preview
- Color scheme customization
- Content editing interface
- Mobile preview mode

---

## Phase 3: Image Generation Service (Week 2-3) 🎨

### 3.1 DALL-E Integration
**Files to Create:**
- `backend/src/services/ai/imageGenerationService.js`
- `backend/src/services/ai/stabilityAIService.js`

```javascript
// Image Generation Service
class AIImageService {
  static async generateAdCreative(campaignData, stylePrompts) {
    // Psychology-appropriate image generation
    // Multiple style variations
    // A/B testing variants
  }
  
  static async generateLandingPageImages(pageData) {
    // Hero images for landing pages
    // Professional headshots
    // Office/therapy space imagery
  }
}
```

### 3.2 Creative Asset Management
**Database Schema Addition:**
```sql
model Creative {
  // existing fields...
  aiGeneratedImages  Json?  // Array of generated image URLs
  imagePrompts       Json?  // Prompts used for generation
  imageVariations    Json?  // A/B test variants
}
```

---

## Phase 4: Real-Time Metrics Sync (Week 3) 📊

### 4.1 Scheduled Jobs Implementation
**Files to Create:**
- `backend/src/jobs/syncMetrics.js`
- `backend/src/jobs/scheduler.js`
- `backend/src/services/metrics/metricsAggregator.js`

```javascript
// Metrics Sync Service
class MetricsSyncService {
  static async syncCampaignMetrics(userId) {
    // Fetch from Meta Ads API
    // Fetch from Google Ads API
    // Update database
    // Calculate ROI and recommendations
  }
  
  static async syncLeadData(userId) {
    // Attribution tracking
    // Lead quality scoring
    // Conversion tracking
  }
}
```

### 4.2 Real-Time Notifications
**Implementation:**
- Performance alerts
- Budget warnings
- Lead notifications
- Campaign optimization suggestions

---

## Phase 5: Advanced Features (Week 4) 🚀

### 5.1 Conversion Tracking
**Files to Create:**
- `backend/src/services/tracking/pixelManager.js`
- `backend/src/services/tracking/conversionTracker.js`

**Features:**
- Meta Pixel integration
- Google Analytics 4 setup
- Custom conversion events
- Attribution modeling

### 5.2 A/B Testing Framework
```javascript
// A/B Testing Service
class ABTestingService {
  static createTest(campaignId, variants) {
    // Create A/B test structure
    // Traffic splitting
    // Statistical significance tracking
  }
  
  static analyzeResults(testId) {
    // Performance comparison
    // Statistical analysis
    // Winner determination
  }
}
```

---

## Database Schema Additions Required

```sql
-- OAuth tokens and ad account management
model UserAdAccount {
  id           String @id @default(cuid())
  userId       String
  platform     String // "META" | "GOOGLE"
  accountId    String
  accountName  String
  accessToken  String // Encrypted
  refreshToken String? // Encrypted
  expiresAt    DateTime?
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, platform, accountId])
}

-- Landing page templates and deployment
model LandingPageTemplate {
  id          String @id @default(cuid())
  name        String
  category    String // "psychology", "therapy", etc.
  previewUrl  String
  htmlTemplate String @db.Text
  cssTemplate  String @db.Text
  jsTemplate   String? @db.Text
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  
  landingPages LandingPage[]
}

-- A/B testing framework
model ABTest {
  id          String @id @default(cuid())
  campaignId  String?
  landingPageId String?
  testType    String // "CREATIVE", "LANDING_PAGE", "AUDIENCE"
  variants    Json   // Array of variant configurations
  trafficSplit Json  // Traffic distribution
  startDate   DateTime
  endDate     DateTime?
  status      String @default("ACTIVE") // "ACTIVE", "PAUSED", "COMPLETED"
  results     Json?  // Test results and statistics
  
  campaign     Campaign?    @relation(fields: [campaignId], references: [id])
  landingPage  LandingPage? @relation(fields: [landingPageId], references: [id])
}
```

---

## New API Endpoints Required

### OAuth Management
- `POST /api/oauth/meta/authorize`
- `GET /api/oauth/meta/callback`
- `POST /api/oauth/google/authorize`
- `GET /api/oauth/google/callback`
- `GET /api/oauth/status`
- `DELETE /api/oauth/disconnect`

### Landing Page Generation
- `POST /api/landing-pages/generate`
- `GET /api/templates`
- `POST /api/landing-pages/:id/deploy`
- `GET /api/landing-pages/:id/preview`
- `POST /api/landing-pages/:id/duplicate`

### Image Generation
- `POST /api/ai/generate-image`
- `GET /api/ai/image-styles`
- `POST /api/creatives/:id/generate-images`

### A/B Testing
- `POST /api/ab-tests`
- `GET /api/ab-tests/:id/results`
- `POST /api/ab-tests/:id/stop`

---

## Frontend Components to Add

### OAuth Connection Flow
```typescript
// ConnectAccounts.tsx
export default function ConnectAccounts() {
  // Meta Business connection
  // Google Ads connection
  // Connection status display
  // Disconnect functionality
}
```

### Landing Page Builder
```typescript
// PageBuilder components
- PageEditor.tsx
- TemplateSelector.tsx
- ColorCustomizer.tsx
- ContentEditor.tsx
- PreviewPanel.tsx
- DeploymentSettings.tsx
```

### Enhanced Campaign Creation
```typescript
// Enhanced NewCampaign.tsx
- Image generation options
- A/B testing setup
- Advanced targeting
- Landing page selection
- Conversion tracking setup
```

---

## Implementation Priority Order

### Week 1: Foundation (OAuth + Database)
1. **OAuth Service Implementation** - Meta & Google
2. **Database Schema Updates** - Add OAuth tables
3. **Frontend Connection Flow** - Account linking UI

### Week 2: Content Generation
1. **Landing Page Templates** - Psychology-focused designs
2. **Template Engine** - HTML/CSS generation
3. **Image Generation Service** - DALL-E integration

### Week 3: Automation & Sync
1. **Metrics Sync Jobs** - Real-time data updates
2. **Conversion Tracking** - Pixel & analytics setup
3. **Performance Optimization** - Automated recommendations

### Week 4: Advanced Features
1. **A/B Testing Framework** - Campaign optimization
2. **Advanced Analytics** - ROI and attribution
3. **User Experience Polish** - Final UI improvements

---

## Risk Mitigation Strategies

### 1. API Rate Limits
- Implement queue system for API calls
- Cache frequently requested data
- Batch operations where possible

### 2. OAuth Token Management
- Secure token storage with encryption
- Automatic refresh workflows
- Fallback authentication methods

### 3. Template Generation
- Pre-built template library
- Fallback to default designs
- Performance optimization for large pages

### 4. Image Generation Costs
- Implement usage limits per user
- Caching of generated images
- Alternative stock photo integration

---

## Success Metrics

### Technical KPIs
- **OAuth Success Rate** > 95%
- **Landing Page Load Time** < 2 seconds
- **Image Generation Time** < 30 seconds
- **Metrics Sync Accuracy** > 99%

### Business KPIs
- **User Onboarding Completion** > 80%
- **Campaign Creation Success** > 90%
- **Platform Engagement** > 70% daily active usage
- **Customer Satisfaction** > 4.5/5 rating

---

## Conclusion

The Mindful Ad Wizard project has exceptional foundational architecture. The remaining work focuses on high-value integrations that will complete the AI-powered marketing automation platform for psychology practices.

**Estimated Timeline:** 4 weeks to production-ready MVP
**Development Effort:** ~160 hours
**Risk Level:** Low (excellent foundation exists)

The platform will be competitive with enterprise marketing tools while being specifically tailored for the psychology and mental health services market.