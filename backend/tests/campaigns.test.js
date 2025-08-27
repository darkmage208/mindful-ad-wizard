import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/utils/database.js';

describe('Campaign Endpoints', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'campaign-test@example.com',
        password: 'Password123!',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'campaign-test@example.com',
        password: 'Password123!'
      });

    authToken = loginResponse.body.data.tokens.accessToken;
    userId = loginResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.campaign.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { email: 'campaign-test@example.com' }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/campaigns', () => {
    it('should create a new campaign successfully', async () => {
      const campaignData = {
        name: 'Test Campaign',
        platform: 'GOOGLE',
        budget: 1000,
        targetAudience: 'Adults aged 25-45',
        objectives: ['Generate more leads']
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaign.name).toBe(campaignData.name);
      expect(response.body.data.campaign.platform).toBe(campaignData.platform);
      expect(response.body.data.campaign.budget).toBe(campaignData.budget);
      expect(response.body.data.campaign.status).toBe('DRAFT');
    });

    it('should reject campaign creation without authentication', async () => {
      const campaignData = {
        name: 'Test Campaign',
        platform: 'GOOGLE',
        budget: 1000,
        targetAudience: 'Adults aged 25-45',
        objectives: ['Generate more leads']
      };

      await request(app)
        .post('/api/campaigns')
        .send(campaignData)
        .expect(401);
    });

    it('should validate campaign data', async () => {
      const invalidCampaignData = {
        name: '', // Invalid empty name
        platform: 'INVALID', // Invalid platform
        budget: -100, // Invalid negative budget
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCampaignData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/campaigns', () => {
    beforeEach(async () => {
      // Create test campaigns
      await prisma.campaign.createMany({
        data: [
          {
            userId,
            name: 'Campaign 1',
            platform: 'GOOGLE',
            status: 'ACTIVE',
            budget: 1000,
            targetAudience: 'Test audience 1',
            objectives: ['Generate more leads'],
            impressions: 1000,
            clicks: 50,
            conversions: 5,
            cost: 100,
            leads: 3
          },
          {
            userId,
            name: 'Campaign 2',
            platform: 'META',
            status: 'PAUSED',
            budget: 2000,
            targetAudience: 'Test audience 2',
            objectives: ['Increase brand awareness'],
            impressions: 2000,
            clicks: 100,
            conversions: 10,
            cost: 200,
            leads: 8
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.campaign.deleteMany({
        where: { userId }
      });
    });

    it('should get user campaigns with pagination', async () => {
      const response = await request(app)
        .get('/api/campaigns?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaigns).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter campaigns by status', async () => {
      const response = await request(app)
        .get('/api/campaigns?status=ACTIVE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaigns).toHaveLength(1);
      expect(response.body.data.campaigns[0].status).toBe('ACTIVE');
    });

    it('should filter campaigns by platform', async () => {
      const response = await request(app)
        .get('/api/campaigns?platform=META')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaigns).toHaveLength(1);
      expect(response.body.data.campaigns[0].platform).toBe('META');
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    let campaignId;

    beforeEach(async () => {
      const campaign = await prisma.campaign.create({
        data: {
          userId,
          name: 'Test Campaign',
          platform: 'GOOGLE',
          status: 'DRAFT',
          budget: 1000,
          targetAudience: 'Test audience',
          objectives: ['Generate more leads'],
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          leads: 0
        }
      });
      campaignId = campaign.id;
    });

    afterEach(async () => {
      await prisma.campaign.deleteMany({
        where: { id: campaignId }
      });
    });

    it('should update campaign successfully', async () => {
      const updateData = {
        name: 'Updated Campaign Name',
        budget: 2000,
        targetAudience: 'Updated audience'
      };

      const response = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaign.name).toBe(updateData.name);
      expect(response.body.data.campaign.budget).toBe(updateData.budget);
      expect(response.body.data.campaign.targetAudience).toBe(updateData.targetAudience);
    });

    it('should reject update with invalid data', async () => {
      const invalidUpdateData = {
        budget: -1000, // Invalid negative budget
        platform: 'INVALID_PLATFORM'
      };

      const response = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent campaign', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .put(`/api/campaigns/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});