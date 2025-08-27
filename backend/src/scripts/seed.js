import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Seed the database with initial data
 */
async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminPassword = await hashPassword('admin123!');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@mindfuladwizard.com' },
      update: {},
      create: {
        name: 'System Administrator',
        email: 'admin@mindfuladwizard.com',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
      },
    });
    logger.info(`Admin user created: ${admin.email}`);

    // Create demo users
    const demoUsers = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@example.com',
        password: await hashPassword('demo123!'),
        role: 'CLIENT',
        company: 'Mindful Therapy Center',
        bio: 'Licensed clinical psychologist specializing in anxiety and depression treatment.',
        isActive: true,
        isVerified: true,
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@example.com',
        password: await hashPassword('demo123!'),
        role: 'CLIENT',
        company: 'Wellness Psychology Practice',
        bio: 'Couples and family therapist with 10+ years of experience.',
        isActive: true,
        isVerified: true,
      },
    ];

    for (const userData of demoUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData,
      });
      logger.info(`Demo user created: ${user.email}`);

      // Create onboarding data for demo users
      await prisma.onboardingData.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          city: user.name.includes('Sarah') ? 'Los Angeles, CA' : 'San Francisco, CA',
          targetAudience: user.name.includes('Sarah')
            ? 'Adults aged 25-45 experiencing anxiety, depression, or life transitions'
            : 'Couples and families seeking to improve communication and relationships',
          averageTicket: user.name.includes('Sarah') ? 150 : 200,
          serviceType: user.name.includes('Sarah') ? 'Individual Therapy' : 'Couples Therapy',
          businessGoals: user.name.includes('Sarah')
            ? ['Generate more leads', 'Increase online bookings', 'Build email list']
            : ['Expand to new markets', 'Increase brand awareness', 'Generate more leads'],
          budget: user.name.includes('Sarah') ? 2500 : 1500,
          experience: user.name.includes('Sarah')
            ? 'Some experience with online ads'
            : 'New to digital marketing',
          completed: true,
        },
      });

      // Create demo campaigns
      const campaigns = user.name.includes('Sarah')
        ? [
            {
              name: 'Anxiety Treatment - Lead Generation',
              platform: 'BOTH',
              budget: 1500,
              targetAudience: 'Adults in LA area struggling with anxiety and stress',
              objectives: ['Generate more leads', 'Increase online bookings'],
              status: 'ACTIVE',
              impressions: 15420,
              clicks: 892,
              conversions: 45,
              cost: 1247.50,
              leads: 38,
            },
            {
              name: 'Depression Support Services',
              platform: 'META',
              budget: 1000,
              targetAudience: 'Adults seeking depression treatment and mental health support',
              objectives: ['Increase brand awareness', 'Generate more leads'],
              status: 'ACTIVE',
              impressions: 8540,
              clicks: 456,
              conversions: 23,
              cost: 678.90,
              leads: 19,
            },
          ]
        : [
            {
              name: 'Couples Therapy - San Francisco',
              platform: 'GOOGLE',
              budget: 1200,
              targetAudience: 'Couples in SF Bay Area looking to improve their relationship',
              objectives: ['Expand to new markets', 'Generate more leads'],
              status: 'ACTIVE',
              impressions: 6230,
              clicks: 234,
              conversions: 18,
              cost: 890.45,
              leads: 15,
            },
          ];

      for (const campaignData of campaigns) {
        const campaign = await prisma.campaign.create({
          data: {
            ...campaignData,
            userId: user.id,
          },
        });
        logger.info(`Demo campaign created: ${campaign.name}`);

        // Create demo leads for each campaign
        const leads = [
          {
            name: 'Jennifer Martinez',
            email: 'jennifer.martinez@email.com',
            phone: '+1-555-0123',
            source: 'Google Ads',
            status: 'NEW',
            notes: 'Interested in individual therapy for anxiety',
            value: campaign.name.includes('Sarah') ? 150 : 200,
          },
          {
            name: 'Robert Thompson',
            email: 'robert.thompson@email.com',
            phone: '+1-555-0124',
            source: 'Meta Ads',
            status: 'CONTACTED',
            notes: 'Scheduled for consultation next week',
            value: campaign.name.includes('Sarah') ? 150 : 200,
          },
          {
            name: 'Lisa Wang',
            email: 'lisa.wang@email.com',
            phone: '+1-555-0125',
            source: 'Direct',
            status: 'QUALIFIED',
            notes: 'Ready to start sessions, insurance verified',
            value: campaign.name.includes('Sarah') ? 150 : 200,
          },
        ];

        for (const leadData of leads) {
          await prisma.lead.create({
            data: {
              ...leadData,
              userId: user.id,
              campaignId: campaign.id,
            },
          });
        }

        // Create demo landing pages
        await prisma.landingPage.create({
          data: {
            userId: user.id,
            name: `${campaign.name} - Landing Page`,
            url: `https://mindfuladwizard.com/lp/${campaign.name.toLowerCase().replace(/\\s+/g, '-')}`,
            template: 'psychology-modern',
            colors: {
              primary: '#2563eb',
              secondary: '#64748b',
              accent: '#0ea5e9',
            },
            content: {
              headline: user.name.includes('Sarah')
                ? 'Professional Anxiety & Depression Treatment'
                : 'Expert Couples & Family Therapy',
              subheadline: user.name.includes('Sarah')
                ? 'Get the support you need to overcome anxiety and depression'
                : 'Strengthen your relationships with professional guidance',
              description: user.name.includes('Sarah')
                ? 'Licensed clinical psychologist offering evidence-based treatment for anxiety, depression, and life transitions.'
                : 'Experienced therapist helping couples and families improve communication and resolve conflicts.',
              cta: 'Schedule Free Consultation',
            },
            contact: {
              whatsapp: '+1-555-THERAPY',
              phone: '+1-555-THERAPY',
              email: user.email,
            },
            visits: Math.floor(Math.random() * 500) + 100,
            conversions: Math.floor(Math.random() * 50) + 10,
          },
        });
      }
    }

    // Create system notifications
    const notifications = [
      {
        type: 'SYSTEM_UPDATE',
        title: 'Welcome to Mindful Ad Wizard!',
        message: 'Your AI-powered advertising platform is ready to help you grow your practice.',
        data: { version: '1.0.0' },
      },
      {
        type: 'MARKETING_TIP',
        title: 'Optimize Your Target Audience',
        message: 'Tip: Use specific demographics and interests to improve your campaign performance.',
        data: { category: 'targeting' },
      },
    ];

    for (const user of await prisma.user.findMany({ where: { role: 'CLIENT' } })) {
      for (const notificationData of notifications) {
        await prisma.notification.create({
          data: {
            ...notificationData,
            userId: user.id,
          },
        });
      }
    }

    logger.info('✅ Database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seed()
  .catch((error) => {
    logger.error('Seeding script failed:', error);
    process.exit(1);
  });