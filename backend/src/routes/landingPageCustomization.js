import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

// Zod validation wrapper for compatibility
const validateZod = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: messages
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message
      });
    }
  };
};
import {
  getCustomizationOptions,
  getAvailableThemes,
  getAvailableLayouts,
  getContentSections,
  applyThemeToPage,
  changePageLayout,
  updatePageContentSection,
  regeneratePageContentSection,
  createCustomPageTheme,
  previewCustomization,
  resetToDefaults,
  getCustomizationAnalytics
} from '../controllers/landingPageCustomizationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const themeSchema = z.object({
  theme_id: z.string().min(1, 'Theme ID is required')
});

const layoutSchema = z.object({
  layout_id: z.string().min(1, 'Layout ID is required')
});

const contentSectionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  cta: z.string().optional(),
  bio: z.string().optional(),
  credentials: z.string().optional(),
  approach: z.string().optional(),
  services_list: z.array(z.string()).optional(),
  testimonials_list: z.array(z.object({
    text: z.string(),
    author: z.string(),
    rating: z.number().min(1).max(5).optional()
  })).optional(),
  faq_list: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional(),
  contact_info: z.string().optional(),
  hours: z.string().optional(),
  emergency_note: z.string().optional()
});

const regenerateContentSchema = z.object({
  custom_prompt: z.string().optional()
});

const customThemeSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
    background: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
    text: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format')
  }),
  theme_name: z.string().optional()
});

const previewSchema = z.object({
  theme_id: z.string().optional(),
  layout_id: z.string().optional(),
  content_changes: z.record(z.any()).optional(),
  custom_colors: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    background: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    text: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
  }).optional()
});

// Base customization routes

/**
 * GET /api/landing-pages/:id/customize
 * Get all customization options for a landing page
 */
router.get('/:id/customize', requireOwnership('landingPage'), asyncHandler(getCustomizationOptions));

/**
 * GET /api/landing-pages/customize/themes
 * Get all available themes
 */
router.get('/customize/themes', asyncHandler(getAvailableThemes));

/**
 * GET /api/landing-pages/customize/layouts
 * Get all available layouts
 */
router.get('/customize/layouts', asyncHandler(getAvailableLayouts));

/**
 * GET /api/landing-pages/customize/sections
 * Get all available content sections
 */
router.get('/customize/sections', asyncHandler(getContentSections));

// Theme customization

/**
 * POST /api/landing-pages/:id/customize/theme
 * Apply a theme to landing page
 */
router.post(
  '/:id/customize/theme',
  requireOwnership('landingPage'),
  validateZod(themeSchema),
  asyncHandler(applyThemeToPage)
);

/**
 * POST /api/landing-pages/:id/customize/custom-theme
 * Create and apply a custom theme
 */
router.post(
  '/:id/customize/custom-theme',
  requireOwnership('landingPage'),
  validateZod(customThemeSchema),
  asyncHandler(createCustomPageTheme)
);

// Layout customization

/**
 * POST /api/landing-pages/:id/customize/layout
 * Change landing page layout
 */
router.post(
  '/:id/customize/layout',
  requireOwnership('landingPage'),
  validateZod(layoutSchema),
  asyncHandler(changePageLayout)
);

// Content customization

/**
 * PUT /api/landing-pages/:id/customize/content/:sectionName
 * Update specific content section
 */
router.put(
  '/:id/customize/content/:sectionName',
  requireOwnership('landingPage'),
  validateZod(contentSectionSchema),
  asyncHandler(updatePageContentSection)
);

/**
 * POST /api/landing-pages/:id/customize/content/:sectionName/regenerate
 * Regenerate content section with AI
 */
router.post(
  '/:id/customize/content/:sectionName/regenerate',
  requireOwnership('landingPage'),
  validateZod(regenerateContentSchema),
  asyncHandler(regeneratePageContentSection)
);

// Preview and utilities

/**
 * POST /api/landing-pages/:id/customize/preview
 * Preview customization changes without saving
 */
router.post(
  '/:id/customize/preview',
  requireOwnership('landingPage'),
  validateZod(previewSchema),
  asyncHandler(previewCustomization)
);

/**
 * POST /api/landing-pages/:id/customize/reset
 * Reset landing page to default settings
 */
router.post('/:id/customize/reset', requireOwnership('landingPage'), asyncHandler(resetToDefaults));

// Analytics

/**
 * GET /api/landing-pages/:id/customize/analytics
 * Get customization analytics and performance metrics
 */
router.get('/:id/customize/analytics', requireOwnership('landingPage'), asyncHandler(getCustomizationAnalytics));

export default router;