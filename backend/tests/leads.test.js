import request from 'supertest';
import { app } from '../src/server.js';
import { prisma } from '../src/utils/database.js';

describe('Lead Endpoints', () => {
  let authToken;
  let userId;
  let campaignId;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test user and get auth token
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'lead-test@example.com',
        password: 'Password123!',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'lead-test@example.com',
        password: 'Password123!'
      });

    authToken = loginResponse.body.data.tokens.accessToken;
    userId = loginResponse.body.data.user.id;

    // Create test campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: 'Test Campaign',
        platform: 'GOOGLE',
        status: 'ACTIVE',
        budget: 1000,
        targetAudience: 'Test audience',
        objectives: ['Generate more leads'],
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        cost: 100,
        leads: 0
      }
    });
    campaignId = campaign.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.lead.deleteMany({
      where: { userId }
    });
    await prisma.campaign.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { email: 'lead-test@example.com' }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/leads', () => {
    afterEach(async () => {
      await prisma.lead.deleteMany({
        where: { userId }
      });
    });

    it('should create a new lead successfully', async () => {
      const leadData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        source: 'Google Ads',
        campaignId,
        value: 150,
        notes: 'Interested in therapy'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.name).toBe(leadData.name);
      expect(response.body.data.lead.email).toBe(leadData.email);
      expect(response.body.data.lead.status).toBe('NEW');
      expect(response.body.data.lead.campaignId).toBe(campaignId);
    });

    it('should create lead without campaign', async () => {
      const leadData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1-555-0124',
        source: 'Direct',
        value: 200,
        notes: 'Website inquiry'
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.campaignId).toBeNull();
    });

    it('should validate lead data', async () => {
      const invalidLeadData = {
        name: '', // Invalid empty name
        email: 'invalid-email', // Invalid email format
        value: -100, // Invalid negative value
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLeadData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/leads', () => {
    beforeEach(async () => {
      // Create test leads
      await prisma.lead.createMany({
        data: [
          {
            userId,
            campaignId,
            name: 'Lead 1',
            email: 'lead1@example.com',
            phone: '+1-555-0001',
            source: 'Google Ads',
            status: 'NEW',
            value: 150,
            notes: 'Interested in individual therapy'
          },
          {
            userId,
            campaignId,
            name: 'Lead 2',
            email: 'lead2@example.com',
            phone: '+1-555-0002',
            source: 'Meta Ads',
            status: 'CONTACTED',
            value: 200,
            notes: 'Scheduled consultation'
          },
          {
            userId,
            name: 'Lead 3',
            email: 'lead3@example.com',
            phone: '+1-555-0003',
            source: 'Direct',
            status: 'QUALIFIED',
            value: 175,
            notes: 'Ready to start sessions'
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.lead.deleteMany({
        where: { userId }
      });
    });

    it('should get user leads with pagination', async () => {
      const response = await request(app)
        .get('/api/leads?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(3);
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/leads?status=NEW')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].status).toBe('NEW');
    });

    it('should filter leads by source', async () => {
      const response = await request(app)
        .get('/api/leads?source=Direct')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].source).toBe('Direct');
    });

    it('should search leads by name', async () => {
      const response = await request(app)
        .get('/api/leads?search=Lead 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(1);
      expect(response.body.data.leads[0].name).toBe('Lead 1');
    });
  });

  describe('PUT /api/leads/:id/status', () => {
    let leadId;

    beforeEach(async () => {
      const lead = await prisma.lead.create({
        data: {
          userId,
          campaignId,
          name: 'Test Lead',
          email: 'testlead@example.com',
          phone: '+1-555-0000',
          source: 'Google Ads',
          status: 'NEW',
          value: 150,
          notes: 'Initial inquiry'
        }
      });
      leadId = lead.id;
    });

    afterEach(async () => {
      await prisma.lead.deleteMany({
        where: { id: leadId }
      });
    });

    it('should update lead status successfully', async () => {
      const statusUpdate = {
        status: 'CONTACTED',
        notes: 'Called and scheduled appointment'
      };

      const response = await request(app)
        .put(`/api/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.status).toBe('CONTACTED');
      expect(response.body.data.lead.notes).toBe(statusUpdate.notes);
    });

    it('should validate status values', async () => {
      const invalidStatus = {
        status: 'INVALID_STATUS'
      };

      const response = await request(app)
        .put(`/api/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidStatus)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });
});