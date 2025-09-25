import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { generateLandingPageContent } from './openaiService.js';

/**
 * Landing Page Customization Service
 * Handles theme management, layout customization, and content modifications
 */

/**
 * Available color themes for different psychology practice types
 */
export const COLOR_THEMES = {
  'professional-blue': {
    name: 'Professional Blue',
    primary: '#1e40af',
    secondary: '#64748b',
    accent: '#3b82f6',
    background: '#f8fafc',
    text: '#1e293b',
    description: 'Clean, trustworthy blue theme ideal for clinical practices'
  },
  'warm-green': {
    name: 'Warm Green',
    primary: '#059669',
    secondary: '#6b7280',
    accent: '#10b981',
    background: '#f0fdf4',
    text: '#1f2937',
    description: 'Calming green theme perfect for wellness and therapy centers'
  },
  'friendly-purple': {
    name: 'Friendly Purple',
    primary: '#7c3aed',
    secondary: '#6b7280',
    accent: '#a855f7',
    background: '#faf5ff',
    text: '#374151',
    description: 'Approachable purple theme great for counseling and coaching'
  },
  'authoritative-gray': {
    name: 'Authoritative Gray',
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#4f46e5',
    background: '#ffffff',
    text: '#111827',
    description: 'Professional gray theme for executive and corporate therapy'
  },
  'compassionate-teal': {
    name: 'Compassionate Teal',
    primary: '#0d9488',
    secondary: '#64748b',
    accent: '#14b8a6',
    background: '#f0fdfa',
    text: '#134e4a',
    description: 'Soothing teal theme for trauma and family therapy'
  }
};

/**
 * Available layout templates
 */
export const LAYOUT_TEMPLATES = {
  'hero-centered': {
    name: 'Hero Centered',
    description: 'Large centered hero section with prominent CTA',
    sections: ['hero', 'features', 'testimonials', 'contact'],
    suitable_for: ['Individual Therapy', 'Counseling']
  },
  'hero-split': {
    name: 'Hero Split',
    description: 'Split hero with image and content side by side',
    sections: ['hero-split', 'services', 'about', 'testimonials', 'contact'],
    suitable_for: ['Couples Therapy', 'Family Therapy']
  },
  'services-first': {
    name: 'Services First',
    description: 'Lead with services overview, then credentials',
    sections: ['services-hero', 'credentials', 'testimonials', 'faq', 'contact'],
    suitable_for: ['Psychology Practice', 'Wellness Center']
  },
  'trust-focused': {
    name: 'Trust Focused',
    description: 'Emphasizes credentials and trust signals upfront',
    sections: ['credentials-hero', 'services', 'testimonials', 'emergency-info', 'contact'],
    suitable_for: ['Clinical Psychology', 'Trauma Therapy']
  },
  'story-driven': {
    name: 'Story Driven',
    description: 'Personal story and approach-focused layout',
    sections: ['story-hero', 'approach', 'services', 'testimonials', 'contact'],
    suitable_for: ['Coaching', 'Holistic Therapy']
  }
};

/**
 * Content section templates
 */
export const CONTENT_SECTIONS = {
  'hero': {
    name: 'Hero Section',
    fields: ['headline', 'subheadline', 'description', 'cta'],
    customizable: true
  },
  'services': {
    name: 'Services Section',
    fields: ['title', 'description', 'services_list'],
    customizable: true
  },
  'about': {
    name: 'About Section',
    fields: ['title', 'bio', 'credentials', 'approach'],
    customizable: true
  },
  'testimonials': {
    name: 'Testimonials',
    fields: ['title', 'testimonials_list'],
    customizable: true
  },
  'faq': {
    name: 'FAQ Section',
    fields: ['title', 'faq_list'],
    customizable: true
  },
  'contact': {
    name: 'Contact Section',
    fields: ['title', 'contact_info', 'hours', 'emergency_note'],
    customizable: true
  },
  'trust-signals': {
    name: 'Trust Signals',
    fields: ['credentials', 'certifications', 'insurance', 'privacy'],
    customizable: false
  }
};

/**
 * Apply theme to landing page
 */
export const applyTheme = async (landingPageId, themeId, userId) => {
  try {
    const theme = COLOR_THEMES[themeId];
    if (!theme) {
      throw new Error(`Theme "${themeId}" not found`);
    }

    // Verify ownership
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Update colors
    const updatedPage = await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        colors: {
          primary: theme.primary,
          secondary: theme.secondary,
          accent: theme.accent,
          background: theme.background,
          text: theme.text,
          theme_name: theme.name
        },
        updatedAt: new Date()
      }
    });

    logger.info(`Theme "${themeId}" applied to landing page ${landingPageId}`);
    return updatedPage;

  } catch (error) {
    logger.error('Theme application failed:', error);
    throw error;
  }
};

/**
 * Change landing page layout template
 */
export const changeLayout = async (landingPageId, layoutId, userId) => {
  try {
    const layout = LAYOUT_TEMPLATES[layoutId];
    if (!layout) {
      throw new Error(`Layout "${layoutId}" not found`);
    }

    // Verify ownership
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Update template and reorganize content sections
    const currentContent = landingPage.content || {};
    const reorganizedContent = reorganizeContentForLayout(currentContent, layout);

    const updatedPage = await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        template: layoutId,
        content: reorganizedContent,
        updatedAt: new Date()
      }
    });

    logger.info(`Layout "${layoutId}" applied to landing page ${landingPageId}`);
    return updatedPage;

  } catch (error) {
    logger.error('Layout change failed:', error);
    throw error;
  }
};

/**
 * Update specific content section
 */
export const updateContentSection = async (landingPageId, sectionName, sectionData, userId) => {
  try {
    // Verify ownership
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Validate section
    const section = CONTENT_SECTIONS[sectionName];
    if (!section) {
      throw new Error(`Section "${sectionName}" not found`);
    }

    if (!section.customizable) {
      throw new Error(`Section "${sectionName}" is not customizable`);
    }

    // Merge new content with existing
    const currentContent = landingPage.content || {};
    const updatedContent = {
      ...currentContent,
      [sectionName]: {
        ...currentContent[sectionName],
        ...sectionData,
        last_modified: new Date()
      }
    };

    const updatedPage = await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        content: updatedContent,
        updatedAt: new Date()
      }
    });

    logger.info(`Content section "${sectionName}" updated for landing page ${landingPageId}`);
    return updatedPage;

  } catch (error) {
    logger.error('Content section update failed:', error);
    throw error;
  }
};

/**
 * Regenerate content section with AI
 */
export const regenerateContentSection = async (landingPageId, sectionName, customPrompt, userId) => {
  try {
    // Verify ownership and get landing page
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId },
      include: {
        user: {
          include: {
            onboardingData: true
          }
        }
      }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Validate section
    const section = CONTENT_SECTIONS[sectionName];
    if (!section || !section.customizable) {
      throw new Error(`Section "${sectionName}" cannot be regenerated`);
    }

    // Build context for AI generation
    const context = {
      businessType: landingPage.user.onboardingData?.serviceType || 'Psychology Practice',
      businessName: landingPage.user.company || landingPage.user.name,
      currentContent: landingPage.content,
      section: sectionName,
      customPrompt: customPrompt
    };

    let newContent;
    switch (sectionName) {
      case 'hero':
        newContent = await generateHeroSection(context);
        break;
      case 'services':
        newContent = await generateServicesSection(context);
        break;
      case 'about':
        newContent = await generateAboutSection(context);
        break;
      case 'testimonials':
        newContent = await generateTestimonialsSection(context);
        break;
      case 'faq':
        newContent = await generateFAQSection(context);
        break;
      default:
        throw new Error(`AI regeneration not supported for section "${sectionName}"`);
    }

    // Update the landing page
    const currentContent = landingPage.content || {};
    const updatedContent = {
      ...currentContent,
      [sectionName]: {
        ...currentContent[sectionName],
        ...newContent,
        ai_generated: true,
        generated_at: new Date(),
        custom_prompt: customPrompt
      }
    };

    const updatedPage = await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        content: updatedContent,
        updatedAt: new Date()
      }
    });

    logger.info(`AI regenerated "${sectionName}" for landing page ${landingPageId}`);
    return updatedPage;

  } catch (error) {
    logger.error('AI content regeneration failed:', error);
    throw error;
  }
};

/**
 * Get customization options for a landing page
 */
export const getCustomizationOptions = async (landingPageId, userId) => {
  try {
    // Verify ownership
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    return {
      current_theme: landingPage.colors?.theme_name || 'Custom',
      current_layout: landingPage.template || 'psychology-practice',
      available_themes: COLOR_THEMES,
      available_layouts: LAYOUT_TEMPLATES,
      content_sections: CONTENT_SECTIONS,
      current_content: landingPage.content
    };

  } catch (error) {
    logger.error('Failed to get customization options:', error);
    throw error;
  }
};

/**
 * Create custom color theme
 */
export const createCustomTheme = async (landingPageId, colors, themeName, userId) => {
  try {
    // Verify ownership
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: landingPageId, userId }
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Validate color format (basic validation)
    const colorFields = ['primary', 'secondary', 'accent', 'background', 'text'];
    for (const field of colorFields) {
      if (!colors[field] || !isValidColor(colors[field])) {
        throw new Error(`Invalid color value for ${field}: ${colors[field]}`);
      }
    }

    const customColors = {
      ...colors,
      theme_name: themeName || 'Custom Theme',
      custom: true,
      created_at: new Date()
    };

    const updatedPage = await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        colors: customColors,
        updatedAt: new Date()
      }
    });

    logger.info(`Custom theme "${themeName}" created for landing page ${landingPageId}`);
    return updatedPage;

  } catch (error) {
    logger.error('Custom theme creation failed:', error);
    throw error;
  }
};

// Helper Functions

/**
 * Reorganize content sections based on new layout
 */
const reorganizeContentForLayout = (currentContent, layout) => {
  const reorganized = { ...currentContent };

  // Add layout-specific metadata
  reorganized.layout = {
    template: layout.name,
    sections: layout.sections,
    updated_at: new Date()
  };

  // Ensure all required sections exist
  layout.sections.forEach(sectionName => {
    if (!reorganized[sectionName] && CONTENT_SECTIONS[sectionName]) {
      reorganized[sectionName] = getDefaultSectionContent(sectionName);
    }
  });

  return reorganized;
};

/**
 * Get default content for a section
 */
const getDefaultSectionContent = (sectionName) => {
  const defaults = {
    'hero': {
      headline: 'Professional Mental Health Services',
      subheadline: 'Compassionate care for your mental health journey',
      description: 'Get the support you need from licensed professionals.',
      cta: 'Schedule Consultation'
    },
    'services': {
      title: 'Our Services',
      description: 'Comprehensive mental health services tailored to your needs',
      services_list: ['Individual Therapy', 'Couples Counseling', 'Family Therapy']
    },
    'about': {
      title: 'About Our Practice',
      bio: 'Dedicated to providing compassionate, evidence-based mental health care.',
      credentials: 'Licensed Mental Health Professional',
      approach: 'Client-centered, evidence-based therapeutic approaches'
    },
    'contact': {
      title: 'Contact Us',
      contact_info: 'Reach out to schedule your appointment',
      hours: 'Mon-Fri 9AM-6PM',
      emergency_note: 'For emergencies, please call 988 or visit your nearest ER'
    }
  };

  return defaults[sectionName] || {};
};

/**
 * Generate hero section with AI
 */
const generateHeroSection = async (context) => {
  const prompt = `Create a compelling hero section for a ${context.businessType} landing page for ${context.businessName}.
  ${context.customPrompt ? `Additional requirements: ${context.customPrompt}` : ''}

  Generate:
  - Headline (max 60 characters)
  - Subheadline (max 100 characters)
  - Description (max 200 characters)
  - Call-to-action button text (max 25 characters)

  Make it professional, empathetic, and focused on the client's needs.`;

  const response = await generateLandingPageContent({
    businessType: context.businessType,
    businessName: context.businessName,
    customPrompt: prompt
  });

  return {
    headline: response.headline,
    subheadline: response.subheadline,
    description: response.description,
    cta: response.cta
  };
};

/**
 * Generate services section with AI
 */
const generateServicesSection = async (context) => {
  // Implementation for AI-generated services section
  return {
    title: 'Our Services',
    description: 'Comprehensive mental health services',
    services_list: ['Individual Therapy', 'Group Sessions', 'Crisis Support']
  };
};

/**
 * Generate about section with AI
 */
const generateAboutSection = async (context) => {
  // Implementation for AI-generated about section
  return {
    title: 'About Our Practice',
    bio: 'Professional mental health services with compassionate care.',
    credentials: 'Licensed Mental Health Professional',
    approach: 'Evidence-based therapeutic approaches'
  };
};

/**
 * Generate testimonials section
 */
const generateTestimonialsSection = async (context) => {
  return {
    title: 'Client Testimonials',
    testimonials_list: [
      {
        text: 'The care I received was exceptional and truly life-changing.',
        author: 'Sarah M.',
        rating: 5
      }
    ]
  };
};

/**
 * Generate FAQ section
 */
const generateFAQSection = async (context) => {
  return {
    title: 'Frequently Asked Questions',
    faq_list: [
      {
        question: 'What can I expect in my first session?',
        answer: 'Your first session focuses on understanding your needs and goals in a comfortable, supportive environment.'
      }
    ]
  };
};

/**
 * Validate hex color format
 */
const isValidColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};