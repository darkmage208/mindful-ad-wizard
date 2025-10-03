# Meta Ads & Google Ads API Integration Guide

This document provides comprehensive information about the Meta Ads and Google Ads API integration in the Mindful Ad Wizard platform.

## Overview

The platform now supports both Meta Ads (Facebook) and Google Ads API integration, allowing users to:

- Create and manage advertising campaigns on both platforms
- Retrieve campaign metrics and performance data
- Generate psychology-specific targeting and keywords
- Test API connections and configurations

## API Packages Installed

### Backend Dependencies
- `facebook-nodejs-business-sdk: ^19.0.0` - Official Meta Ads Business SDK
- `google-ads-api: ^21.0.1` - Community-maintained Google Ads API client

## Environment Configuration

### Required Environment Variables

Add these variables to your `.env` file:

```bash
# ===== META/FACEBOOK ADS API CONFIGURATION =====
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_ACCESS_TOKEN=your-meta-long-lived-access-token
META_AD_ACCOUNT_ID=act_your-ad-account-id
META_PAGE_ID=your-facebook-page-id
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# ===== GOOGLE ADS API CONFIGURATION =====
GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_REFRESH_TOKEN=your-google-ads-refresh-token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=your-manager-account-id
```

## Meta Ads API Setup

### Prerequisites

1. **Facebook Developer Account**: Create at [developers.facebook.com](https://developers.facebook.com)
2. **Business Manager Account**: Set up at [business.facebook.com](https://business.facebook.com)
3. **Ad Account**: Create an advertising account

### Step-by-Step Setup

1. **Create Facebook App**:
   - Go to Facebook Developers Console
   - Create a new app with "Business" type
   - Add Marketing API product to your app
   - Note down your App ID and App Secret

2. **Generate Access Token**:
   - Use Graph API Explorer or Facebook Business SDK
   - Request permissions: `ads_management`, `ads_read`, `business_management`
   - Exchange short-lived token for long-lived token

3. **Configure Ad Account**:
   - Get your Ad Account ID from Business Manager
   - Format: `act_1234567890123456`

4. **Set Up Facebook Page**:
   - Create or use existing Facebook Page
   - Get Page ID from Page Settings

### Meta Ads API Features

#### Campaign Creation
```javascript
// Standard campaign
const result = await adsAPI.meta.createCampaign({
  name: "Psychology Practice - Awareness",
  budget: 1000,
  objectives: ["awareness"],
  targetAudience: "Adults 25-65 interested in mental health",
  landingPageSlug: "therapy-consultation"
});

// Lead generation campaign
const leadGenResult = await adsAPI.meta.createLeadGenCampaign({
  name: "Free Consultation",
  budget: 500,
  targetAudience: "Local residents interested in therapy",
  city: "New York"
});
```

#### Campaign Management
```javascript
// Update campaign
await adsAPI.meta.updateCampaign(campaignId, {
  name: "Updated Campaign Name",
  budget: 1500,
  status: "ACTIVE"
});

// Pause campaign
await adsAPI.meta.pauseCampaign(campaignId);

// Get metrics
const metrics = await adsAPI.meta.getCampaignMetrics(campaignId);
```

## Google Ads API Setup

### Prerequisites

1. **Google Ads Account**: Create at [ads.google.com](https://ads.google.com)
2. **Google Cloud Project**: Set up at [console.cloud.google.com](https://console.cloud.google.com)
3. **Developer Token**: Apply through Google Ads account

### Step-by-Step Setup

1. **Enable Google Ads API**:
   - Go to Google Cloud Console
   - Enable Google Ads API for your project
   - Create OAuth 2.0 credentials

2. **Get Developer Token**:
   - In Google Ads account, go to Tools & Settings > Setup > API Center
   - Apply for developer token (may require approval)

3. **OAuth 2.0 Setup**:
   - Create OAuth consent screen
   - Add authorized redirect URIs
   - Download client credentials JSON

4. **Generate Refresh Token**:
   - Use OAuth 2.0 flow to get refresh token
   - Store securely in environment variables

### Google Ads API Features

#### Campaign Creation
```javascript
// Standard search campaign
const result = await adsAPI.google.createCampaign({
  name: "Therapy Services - Search",
  budget: 800,
  keywords: ["therapist near me", "anxiety therapy", "counseling services"],
  landingPageSlug: "book-appointment"
});

// Psychology-specific campaign
const psychologyResult = await adsAPI.google.createPsychologyCampaign({
  name: "Mental Health Practice",
  budget: 1200,
  serviceType: "couples therapy",
  city: "Los Angeles",
  averageTicket: 150
});
```

#### Keyword Research
```javascript
// Get keyword suggestions
const keywords = await adsAPI.google.getKeywordSuggestions(
  "Adults seeking therapy for anxiety and depression"
);
```

## API Endpoints

### Meta Ads Endpoints
- `GET /api/ads/test/meta` - Test Meta API connection
- `POST /api/ads/meta/campaigns` - Create standard campaign
- `POST /api/ads/meta/campaigns/leadgen` - Create lead generation campaign
- `PUT /api/ads/meta/campaigns/:id` - Update campaign
- `POST /api/ads/meta/campaigns/:id/pause` - Pause campaign
- `GET /api/ads/meta/campaigns/:id/metrics` - Get campaign metrics

### Google Ads Endpoints
- `GET /api/ads/test/google` - Test Google API connection
- `POST /api/ads/google/campaigns` - Create standard campaign
- `POST /api/ads/google/campaigns/psychology` - Create psychology-specific campaign
- `PUT /api/ads/google/campaigns/:id` - Update campaign
- `POST /api/ads/google/campaigns/:id/pause` - Pause campaign
- `GET /api/ads/google/campaigns/:id/metrics` - Get campaign metrics
- `POST /api/ads/google/keywords/suggestions` - Get keyword suggestions

## Testing the Integration

### 1. Test API Connections

```javascript
// Test Meta Ads API
try {
  const metaResult = await adsAPI.testMetaConnection();
  console.log('Meta Ads API:', metaResult.data);
} catch (error) {
  console.error('Meta API Error:', error.response.data);
}

// Test Google Ads API
try {
  const googleResult = await adsAPI.testGoogleConnection();
  console.log('Google Ads API:', googleResult.data);
} catch (error) {
  console.error('Google API Error:', error.response.data);
}
```

### 2. Backend Testing

Start the server and test endpoints:

```bash
cd backend
npm run dev

# Test Meta connection
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/ads/test/meta

# Test Google connection
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/ads/test/google
```

## Error Handling

### Common Meta Ads Errors
- **Invalid Access Token**: Regenerate long-lived access token
- **Ad Account Permissions**: Ensure account has proper permissions
- **App Not Approved**: Submit app for review if needed

### Common Google Ads Errors
- **Developer Token Not Approved**: Apply for approval in Google Ads
- **Invalid Customer ID**: Check customer ID format (123-456-7890)
- **OAuth Token Expired**: Regenerate refresh token

## Security Best Practices

1. **Environment Variables**: Never commit API credentials to version control
2. **Token Management**: Use long-lived tokens for Meta, refresh tokens for Google
3. **Rate Limiting**: Implement appropriate rate limiting for API calls
4. **Error Logging**: Log errors securely without exposing credentials

## Psychology-Specific Features

### Meta Ads Psychology Targeting
- Mental health interest targeting
- Life event targeting (new job, moving, etc.)
- Behavioral targeting for wellness content
- Geographic targeting for local practices

### Google Ads Psychology Keywords
- Auto-generated psychology-related keywords
- City-specific targeting
- Service-type specific keywords (couples, family, individual therapy)
- Competition-based bidding strategies

## Monitoring and Analytics

### Available Metrics
- **Impressions**: Number of times ads were shown
- **Clicks**: Number of clicks on ads
- **Conversions**: Number of successful conversions
- **Cost**: Total spend
- **CTR**: Click-through rate
- **CPC**: Cost per click
- **CPL**: Cost per lead

### Real-time Sync
The platform includes automatic metrics synchronization that can be triggered via scheduled jobs.

## Troubleshooting

### Meta Ads Issues
1. Check app status in Facebook Developer Console
2. Verify ad account permissions in Business Manager
3. Ensure page is properly connected to ad account
4. Check for policy violations

### Google Ads Issues
1. Verify developer token status
2. Check OAuth consent screen configuration
3. Ensure proper customer access in Google Ads
4. Verify API quotas and limits

## Production Deployment

### Environment Setup
1. Use production-ready access tokens
2. Configure proper error monitoring
3. Set up automated token refresh
4. Implement comprehensive logging

### Security Considerations
1. Use environment-specific configuration
2. Implement proper access controls
3. Monitor API usage and costs
4. Set up alerts for failures

## Support and Resources

### Meta Ads
- [Meta Business SDK Documentation](https://developers.facebook.com/docs/business-sdk/)
- [Marketing API Reference](https://developers.facebook.com/docs/marketing-api/)
- [Meta Business Help Center](https://www.facebook.com/business/help/)

### Google Ads
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Client Libraries](https://developers.google.com/google-ads/api/docs/client-libs)
- [Google Ads API Forum](https://groups.google.com/g/adwords-api)

---

For additional support or questions about the implementation, please refer to the project documentation or contact the development team.