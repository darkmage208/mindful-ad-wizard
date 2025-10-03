# How to Use Meta Ads & Google Ads API in Your Project

## 🚀 **Integration Overview**

Your Mindful Ad Wizard project now has full Meta Ads and Google Ads API integration! Here's how to use it in your existing campaign management system.

## 📍 **Where to Find the Integration**

### 1. **Campaign Detail Page**
- Go to any campaign: `/campaigns/{id}`
- Click on the **"Ads Platforms"** tab
- This is where you'll manage Meta and Google Ads for each campaign

### 2. **New Components Added**
- **AdsManager**: Main integration component in campaign details
- **AdsConnectionTest**: Standalone component for testing API connections
- **AdsCampaignCreator**: Standalone campaign creation (if needed)

## 🔧 **Step-by-Step Usage**

### **Step 1: Setup API Credentials**

1. **Configure Environment Variables** (already done in your `.env.prod`):
   ```bash
   # Meta Ads API
   META_APP_ID=your-meta-app-id
   META_APP_SECRET=your-meta-app-secret
   META_ACCESS_TOKEN=your-meta-long-lived-access-token
   META_AD_ACCOUNT_ID=act_your-ad-account-id
   META_PAGE_ID=your-facebook-page-id

   # Google Ads API
   GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
   GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret
   GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
   GOOGLE_ADS_CUSTOMER_ID=123-456-7890
   GOOGLE_ADS_REFRESH_TOKEN=your-google-ads-refresh-token
   ```

2. **Get Your API Credentials**:
   - **Meta Ads**: Follow [ADS_API_INTEGRATION.md](./ADS_API_INTEGRATION.md) guide
   - **Google Ads**: Follow [ADS_API_INTEGRATION.md](./ADS_API_INTEGRATION.md) guide

### **Step 2: Test API Connections**

1. Go to any campaign details page
2. Click **"Ads Platforms"** tab
3. Click **"Test Connections"** button
4. You should see:
   - ✅ **Meta Ads**: Connected
   - ✅ **Google Ads**: Connected

### **Step 3: Create Ad Campaigns**

#### **For Meta Ads (Facebook/Instagram):**
1. In the "Meta Ads" section:
   - **Standard Campaign**: For awareness and traffic
   - **Lead Generation Campaign**: For collecting leads with forms

2. Click either button to create the campaign
3. The system will:
   - Use your existing campaign data (name, budget, target audience)
   - Create ads on Meta's platform
   - Return the campaign ID for tracking

#### **For Google Ads:**
1. In the "Google Ads" section:
   - **Search Campaign**: Keyword-based ads
   - **Psychology Campaign**: Therapy-specific targeting

2. Click either button to create the campaign
3. The system will:
   - Generate relevant keywords automatically
   - Create responsive search ads
   - Set up psychology-specific targeting

### **Step 4: Monitor Performance**

1. **Real-time Metrics**: Each platform shows:
   - **Impressions**: How many people saw your ads
   - **Clicks**: How many people clicked
   - **Conversions**: How many became leads/customers
   - **Cost**: Total spend
   - **CTR, CPC, CPL**: Performance ratios

2. **Refresh Metrics**: Click the refresh button to get latest data

3. **Campaign Management**:
   - **Pause campaigns** if needed
   - **Update budgets** and settings
   - **View detailed analytics**

## 🎯 **Practical Example**

Let's say you have a campaign called "São Paulo Anxiety Therapy":

1. **Go to Campaign**: Navigate to `/campaigns/your-campaign-id`
2. **Click "Ads Platforms" tab**
3. **Test connections** first
4. **Create Meta Lead Gen Campaign**:
   - Uses your target audience: "Adults in São Paulo seeking anxiety therapy"
   - Sets up lead forms for consultation requests
   - Targets mental health interests + São Paulo location
5. **Create Google Psychology Campaign**:
   - Auto-generates keywords: "therapist São Paulo", "anxiety therapy", etc.
   - Sets up search ads for therapy-related searches
   - Uses psychology-specific ad copy

## 📊 **Available Features**

### **Meta Ads Features:**
- ✅ Standard awareness campaigns
- ✅ Lead generation with instant forms
- ✅ Psychology-specific targeting
- ✅ Age, gender, location targeting
- ✅ Mental health interest targeting
- ✅ Real-time metrics and reporting

### **Google Ads Features:**
- ✅ Search campaigns with keywords
- ✅ Psychology-specific campaigns
- ✅ Auto-generated therapy keywords
- ✅ City-specific targeting
- ✅ Responsive search ads
- ✅ Keyword suggestions based on target audience

### **General Features:**
- ✅ Campaign pause/resume
- ✅ Budget management
- ✅ Real-time metrics sync
- ✅ Error handling and validation
- ✅ Integrated with existing campaign management

## 🔧 **Campaign Database Integration**

To fully integrate with your database, you'll want to add these fields to your Campaign model:

```sql
-- Add these columns to your campaigns table
ALTER TABLE campaigns ADD COLUMN meta_campaign_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN google_campaign_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN meta_ad_set_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN google_ad_group_id VARCHAR(255);
```

Then update your campaign creation/update API calls to store these IDs.

## 🚨 **Important Notes**

### **Cost Management:**
- Campaigns start **PAUSED** by default for safety
- You need to manually activate them in the platform
- Set appropriate budgets to avoid overspending

### **Testing Environment:**
- Use Meta's and Google's sandbox/test environments first
- Verify all targeting and budgets before going live
- Test with small budgets initially

### **Error Handling:**
- If API calls fail, check your credentials
- Ensure your accounts have proper permissions
- Check the console for detailed error messages

## 📈 **Next Steps**

1. **Set up your API credentials** using the detailed guide
2. **Test the integration** with a sample campaign
3. **Create your first Meta and Google campaigns**
4. **Monitor performance** and optimize based on results
5. **Scale up** successful campaigns

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **"API not initialized"**: Check your environment variables
2. **"Access token expired"**: Regenerate your Meta access token
3. **"Customer ID not found"**: Verify your Google Ads customer ID format
4. **"Campaign creation failed"**: Check account permissions and budgets

### **Getting Help:**
- Check the detailed [ADS_API_INTEGRATION.md](./ADS_API_INTEGRATION.md) guide
- Review the API error messages in browser console
- Test API connections first before creating campaigns

---

**🎉 Your ads integration is ready to use! Start by testing the connections and creating your first campaigns.**