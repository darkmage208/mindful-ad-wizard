import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { generateLandingPageContent, generateLandingPageImages } from '../services/openaiService.js';
import {
  createPaginatedResponse,
  buildPaginationParams,
  asyncControllerHandler,
} from '../utils/controllerHelpers.js';

/**
 * Create landing page
 */
export const createLandingPage = asyncControllerHandler(async (req, res) => {
  const { name, template, colors, content, contact } = req.body;
  const userId = req.user.id;
  
  // Generate unique URL slug
  const slug = generateLandingPageSlug(name);
  const url = `${process.env.FRONTEND_URL}/lp/${slug}`;
  
  // Check if URL already exists
  const existingPage = await prisma.landingPage.findUnique({
    where: { url },
  });
  
  if (existingPage) {
    const uniqueSlug = `${slug}-${Date.now()}`;
    const uniqueUrl = `${process.env.FRONTEND_URL}/lp/${uniqueSlug}`;
    
    const landingPage = await createPage(userId, name, template, uniqueUrl, colors, content, contact);
    return sendResponse(res, landingPage, 'Landing page created successfully');
  }
  
  const landingPage = await createPage(userId, name, template, url, colors, content, contact);
  sendResponse(res, landingPage, 'Landing page created successfully');
});

/**
 * Get user's landing pages
 */
export const getLandingPages = asyncControllerHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, skip } = buildPaginationParams(req.query);
  const [landingPages, total] = await Promise.all([
    prisma.landingPage.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.landingPage.count({ where: { userId } }),
  ]);
  
  // Add calculated metrics
  const pagesWithMetrics = landingPages.map(page => ({
    ...page,
    metrics: {
      visits: page.visits,
      conversions: page.conversions,
      conversionRate: page.visits > 0 ? (page.conversions / page.visits) * 100 : 0,
    },
  }));
  
  res.json({
    success: true,
    data: {
      landingPages: pagesWithMetrics,
      ...createPaginatedResponse(pagesWithMetrics, page, limit, total),
    },
  });
});

/**
 * Get landing page by ID
 */
export const getLandingPageById = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      id,
      userId,
    },
  });
  
  if (!landingPage) {
    throw new NotFoundError('Landing page');
  }
  
  const pageWithMetrics = {
    ...landingPage,
    metrics: {
      visits: landingPage.visits,
      conversions: landingPage.conversions,
      conversionRate: landingPage.visits > 0 ? (landingPage.conversions / landingPage.visits) * 100 : 0,
    },
  };
  
  res.json({
    success: true,
    data: { landingPage: pageWithMetrics },
  });
});

/**
 * Update landing page
 */
export const updateLandingPage = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, template, colors, content, contact } = req.body;
  
  // Check if landing page exists and belongs to user
  const existingPage = await prisma.landingPage.findFirst({
    where: {
      id,
      userId,
    },
  });
  
  if (!existingPage) {
    throw new NotFoundError('Landing page');
  }
  
  // Update landing page
  const landingPage = await prisma.landingPage.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(template && { template }),
      ...(colors && { colors }),
      ...(content && { content }),
      ...(contact && { contact }),
      updatedAt: new Date(),
    },
  });
  
  logger.info(`Landing page updated: ${landingPage.id} by user ${userId}`);
  
  res.json({
    success: true,
    message: 'Landing page updated successfully',
    data: { landingPage },
  });
});

/**
 * Delete landing page
 */
export const deleteLandingPage = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Check if landing page exists and belongs to user
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      id,
      userId,
    },
  });
  
  if (!landingPage) {
    throw new NotFoundError('Landing page');
  }
  
  // Delete landing page
  await prisma.landingPage.delete({
    where: { id },
  });
  
  logger.info(`Landing page deleted: ${id} by user ${userId}`);
  
  res.json({
    success: true,
    message: 'Landing page deleted successfully',
  });
});

/**
 * Generate landing page with AI
 */
export const generateLandingPageWithAI = asyncControllerHandler(async (req, res) => {
  const { 
    businessType, 
    targetAudience, 
    services, 
    businessName, 
    tone = 'professional', 
    includeImages = true,
    template = 'psychology-practice',
    contact = {}
  } = req.body;
  const userId = req.user.id;

  try {
    // Generate content with AI
    const generatedContent = await generateLandingPageContent({
      businessType,
      targetAudience,
      services,
      businessName,
      tone,
    });

    // Generate images if requested
    let images = [];
    if (includeImages) {
      try {
        images = await generateLandingPageImages({
          businessType,
          services,
          style: tone === 'professional' ? 'professional medical photography' : 
                tone === 'friendly' ? 'warm and welcoming photography' :
                tone === 'casual' ? 'relaxed lifestyle photography' : 
                'authoritative corporate photography'
        });
      } catch (error) {
        logger.warn('Image generation failed, proceeding without images:', error.message);
        // Continue without images if generation fails
      }
    }

    // Generate unique URL slug
    const slug = generateLandingPageSlug(`${businessName} ${businessType}`);
    const url = `${process.env.FRONTEND_URL}/lp/${slug}`;

    // Check if URL already exists
    const existingPage = await prisma.landingPage.findUnique({
      where: { url },
    });

    let finalUrl = url;
    if (existingPage) {
      const uniqueSlug = `${slug}-${Date.now()}`;
      finalUrl = `${process.env.FRONTEND_URL}/lp/${uniqueSlug}`;
    }

    // Create the landing page
    const landingPage = await prisma.landingPage.create({
      data: {
        userId,
        name: `${businessName} - ${businessType} Landing Page`,
        url: finalUrl,
        template,
        colors: getTemplateColors(template),
        content: {
          headline: generatedContent.headline,
          subheadline: generatedContent.subheadline,
          description: generatedContent.description,
          cta: generatedContent.cta,
          features: generatedContent.features || services,
          testimonials: generatedContent.testimonials || [],
        },
        contact: {
          phone: contact.phone || '',
          email: contact.email || '',
          whatsapp: contact.phone || '',
          address: contact.address || '',
          hours: 'Mon-Fri 9AM-6PM',
        },
        seo: {
          title: generatedContent.seoTitle || `${businessName} - ${businessType}`,
          description: generatedContent.seoDescription || generatedContent.description.substring(0, 160),
          keywords: generatedContent.keywords || services.join(', '),
        },
        images: images || [],
      },
    });

    logger.info(`AI-generated landing page created: ${landingPage.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'AI-powered landing page generated successfully!',
      data: { 
        landingPage: {
          ...landingPage,
          metrics: {
            visits: 0,
            conversions: 0,
            conversionRate: 0,
          }
        }
      },
    });
  } catch (error) {
    logger.error('AI landing page generation failed:', error);
    throw new Error('Failed to generate landing page with AI');
  }
});

// Helper functions
const createPage = async (userId, name, template, url, colors, content, contact) => {
  return prisma.landingPage.create({
    data: {
      userId,
      name,
      url,
      template,
      colors: colors || {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#0ea5e9',
      },
      content: content || {
        headline: 'Professional Psychology Services',
        subheadline: 'Compassionate care for your mental health journey',
        description: 'Get the support you need from a licensed mental health professional.',
        cta: 'Schedule Consultation',
      },
      contact: contact || {
        whatsapp: '',
        phone: '',
        email: '',
      },
    },
  });
};

const sendResponse = (res, landingPage, message) => {
  logger.info(`Landing page created: ${landingPage.id}`);
  res.status(201).json({
    success: true,
    message,
    data: { landingPage },
  });
};

const generateLandingPageSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

const getTemplateColors = (template) => {
  const colorSchemes = {
    'psychology-practice': {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
    },
    'wellness-center': {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#10b981',
    },
    'medical-clinic': {
      primary: '#1e40af',
      secondary: '#64748b',
      accent: '#3b82f6',
    },
    'coaching-practice': {
      primary: '#7c3aed',
      secondary: '#6b7280',
      accent: '#a855f7',
    },
  };

  return colorSchemes[template] || colorSchemes['psychology-practice'];
};

/**
 * Get public landing page by slug (no authentication required)
 */
export const getPublicLandingPage = asyncControllerHandler(async (req, res) => {
  const { slug } = req.params;

  // Extract slug from URL path
  const url = `${process.env.FRONTEND_URL}/lp/${slug}`;

  const landingPage = await prisma.landingPage.findFirst({
    where: {
      url,
      isActive: true
    },
  });

  if (!landingPage) {
    throw new NotFoundError('Landing page not found');
  }

  // Increment visit count
  await prisma.landingPage.update({
    where: { id: landingPage.id },
    data: { visits: { increment: 1 } },
  });

  // Don't return sensitive user information for public access
  const publicLandingPage = {
    id: landingPage.id,
    name: landingPage.name,
    url: landingPage.url,
    template: landingPage.template,
    colors: landingPage.colors,
    content: landingPage.content,
    contact: landingPage.contact,
    seo: landingPage.seo,
    visits: landingPage.visits + 1,
    conversions: landingPage.conversions,
    isActive: landingPage.isActive,
    createdAt: landingPage.createdAt,
    updatedAt: landingPage.updatedAt,
  };

  res.json({
    success: true,
    data: { landingPage: publicLandingPage },
  });
});