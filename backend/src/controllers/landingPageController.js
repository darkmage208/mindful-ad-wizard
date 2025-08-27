import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/helpers.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';

/**
 * Create landing page
 */
export const createLandingPage = async (req, res) => {
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
};

/**
 * Get user's landing pages
 */
export const getLandingPages = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  
  const skip = (page - 1) * limit;
  const [landingPages, total] = await Promise.all([
    prisma.landingPage.findMany({
      where: { userId },
      skip,
      take: parseInt(limit),
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
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * Get landing page by ID
 */
export const getLandingPageById = async (req, res) => {
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
};

/**
 * Update landing page
 */
export const updateLandingPage = async (req, res) => {
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
};

/**
 * Delete landing page
 */
export const deleteLandingPage = async (req, res) => {
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
};

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