import {
  applyTheme,
  changeLayout,
  updateContentSection,
  regenerateContentSection,
  getCustomizationOptions as getCustomizationOptionsService,
  createCustomTheme,
  COLOR_THEMES,
  LAYOUT_TEMPLATES,
  CONTENT_SECTIONS
} from '../services/landingPageCustomizationService.js';
import { asyncControllerHandler } from '../utils/controllerHelpers.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';

/**
 * Get all customization options for a landing page
 */
export const getCustomizationOptions = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const options = await getCustomizationOptionsService(id, userId);

  res.json({
    success: true,
    data: {
      customization_options: options
    }
  });
});

/**
 * Get available themes
 */
export const getAvailableThemes = asyncControllerHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      themes: COLOR_THEMES
    }
  });
});

/**
 * Get available layouts
 */
export const getAvailableLayouts = asyncControllerHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      layouts: LAYOUT_TEMPLATES
    }
  });
});

/**
 * Get available content sections
 */
export const getContentSections = asyncControllerHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      sections: CONTENT_SECTIONS
    }
  });
});

/**
 * Apply theme to landing page
 */
export const applyThemeToPage = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const { theme_id } = req.body;
  const userId = req.user.id;

  if (!theme_id) {
    throw new BadRequestError('Theme ID is required');
  }

  if (!COLOR_THEMES[theme_id]) {
    throw new BadRequestError(`Invalid theme ID: ${theme_id}`);
  }

  const updatedPage = await applyTheme(id, theme_id, userId);

  logger.info(`Theme applied: ${theme_id} to landing page ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Theme applied successfully',
    data: {
      landing_page: updatedPage,
      applied_theme: COLOR_THEMES[theme_id]
    }
  });
});

/**
 * Change landing page layout
 */
export const changePageLayout = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const { layout_id } = req.body;
  const userId = req.user.id;

  if (!layout_id) {
    throw new BadRequestError('Layout ID is required');
  }

  if (!LAYOUT_TEMPLATES[layout_id]) {
    throw new BadRequestError(`Invalid layout ID: ${layout_id}`);
  }

  const updatedPage = await changeLayout(id, layout_id, userId);

  logger.info(`Layout changed: ${layout_id} for landing page ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Layout changed successfully',
    data: {
      landing_page: updatedPage,
      applied_layout: LAYOUT_TEMPLATES[layout_id]
    }
  });
});

/**
 * Update content section
 */
export const updatePageContentSection = asyncControllerHandler(async (req, res) => {
  const { id, sectionName } = req.params;
  const sectionData = req.body;
  const userId = req.user.id;

  if (!sectionName) {
    throw new BadRequestError('Section name is required');
  }

  if (!CONTENT_SECTIONS[sectionName]) {
    throw new BadRequestError(`Invalid section name: ${sectionName}`);
  }

  if (!CONTENT_SECTIONS[sectionName].customizable) {
    throw new BadRequestError(`Section "${sectionName}" is not customizable`);
  }

  const updatedPage = await updateContentSection(id, sectionName, sectionData, userId);

  logger.info(`Content section updated: ${sectionName} for landing page ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Content section updated successfully',
    data: {
      landing_page: updatedPage,
      updated_section: sectionName
    }
  });
});

/**
 * Regenerate content section with AI
 */
export const regeneratePageContentSection = asyncControllerHandler(async (req, res) => {
  const { id, sectionName } = req.params;
  const { custom_prompt } = req.body;
  const userId = req.user.id;

  if (!sectionName) {
    throw new BadRequestError('Section name is required');
  }

  if (!CONTENT_SECTIONS[sectionName]) {
    throw new BadRequestError(`Invalid section name: ${sectionName}`);
  }

  if (!CONTENT_SECTIONS[sectionName].customizable) {
    throw new BadRequestError(`Section "${sectionName}" cannot be regenerated with AI`);
  }

  const updatedPage = await regenerateContentSection(id, sectionName, custom_prompt, userId);

  logger.info(`AI regenerated content section: ${sectionName} for landing page ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Content section regenerated successfully with AI',
    data: {
      landing_page: updatedPage,
      regenerated_section: sectionName,
      ai_generated: true
    }
  });
});

/**
 * Create custom theme
 */
export const createCustomPageTheme = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const { colors, theme_name } = req.body;
  const userId = req.user.id;

  if (!colors) {
    throw new BadRequestError('Colors object is required');
  }

  const requiredColors = ['primary', 'secondary', 'accent', 'background', 'text'];
  for (const colorField of requiredColors) {
    if (!colors[colorField]) {
      throw new BadRequestError(`Missing required color: ${colorField}`);
    }
  }

  const updatedPage = await createCustomTheme(id, colors, theme_name, userId);

  logger.info(`Custom theme created for landing page ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Custom theme created successfully',
    data: {
      landing_page: updatedPage,
      theme_name: theme_name || 'Custom Theme'
    }
  });
});

/**
 * Preview customization changes
 */
export const previewCustomization = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const {
    theme_id,
    layout_id,
    content_changes,
    custom_colors
  } = req.body;
  const userId = req.user.id;

  // Get current landing page
  const landingPage = await prisma.landingPage.findFirst({
    where: { id, userId }
  });

  if (!landingPage) {
    throw new NotFoundError('Landing page not found');
  }

  // Build preview data without saving to database
  let previewData = {
    id: landingPage.id,
    name: landingPage.name,
    slug: landingPage.slug,
    template: landingPage.template,
    colors: landingPage.colors,
    content: landingPage.content,
    contact: landingPage.contact,
    seo: landingPage.seo
  };

  // Apply theme preview
  if (theme_id && COLOR_THEMES[theme_id]) {
    const theme = COLOR_THEMES[theme_id];
    previewData.colors = {
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      background: theme.background,
      text: theme.text,
      theme_name: theme.name
    };
  }

  // Apply custom colors preview
  if (custom_colors) {
    previewData.colors = {
      ...previewData.colors,
      ...custom_colors,
      theme_name: 'Custom Preview'
    };
  }

  // Apply layout preview
  if (layout_id && LAYOUT_TEMPLATES[layout_id]) {
    previewData.template = layout_id;
  }

  // Apply content changes preview
  if (content_changes) {
    previewData.content = {
      ...previewData.content,
      ...content_changes
    };
  }

  res.json({
    success: true,
    message: 'Customization preview generated',
    data: {
      preview: previewData,
      is_preview: true,
      original_id: landingPage.id
    }
  });
});

/**
 * Reset customizations to default
 */
export const resetToDefaults = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get current landing page
  const landingPage = await prisma.landingPage.findFirst({
    where: { id, userId }
  });

  if (!landingPage) {
    throw new NotFoundError('Landing page not found');
  }

  // Reset to psychology-practice defaults
  const defaultTheme = COLOR_THEMES['professional-blue'];
  const defaultLayout = 'psychology-practice';

  const updatedPage = await prisma.landingPage.update({
    where: { id },
    data: {
      template: defaultLayout,
      colors: {
        primary: defaultTheme.primary,
        secondary: defaultTheme.secondary,
        accent: defaultTheme.accent,
        background: defaultTheme.background,
        text: defaultTheme.text,
        theme_name: defaultTheme.name
      },
      updatedAt: new Date()
    }
  });

  logger.info(`Landing page ${id} reset to defaults by user ${userId}`);

  res.json({
    success: true,
    message: 'Landing page reset to default settings',
    data: {
      landing_page: updatedPage
    }
  });
});

/**
 * Get customization analytics
 */
export const getCustomizationAnalytics = asyncControllerHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get landing page with metrics
  const landingPage = await prisma.landingPage.findFirst({
    where: { id, userId }
  });

  if (!landingPage) {
    throw new NotFoundError('Landing page not found');
  }

  // Calculate performance metrics
  const conversionRate = landingPage.visits > 0
    ? (landingPage.conversions / landingPage.visits * 100).toFixed(2)
    : 0;

  const analytics = {
    current_theme: landingPage.colors?.theme_name || 'Custom',
    current_layout: landingPage.template || 'psychology-practice',
    performance: {
      visits: landingPage.visits,
      conversions: landingPage.conversions,
      conversion_rate: parseFloat(conversionRate)
    },
    last_modified: landingPage.updatedAt,
    customization_history: {
      // This could be expanded to track customization history
      current_version: 1,
      last_theme_change: landingPage.updatedAt,
      last_content_update: landingPage.updatedAt
    }
  };

  res.json({
    success: true,
    data: {
      analytics
    }
  });
});