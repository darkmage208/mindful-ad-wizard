import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { generateLandingPageContent, generateLandingPageImages } from './openaiService.js';
import { storeGeneratedImages, getFallbackImage } from './imageService.js';

/**
 * Generate landing page from campaign data
 * @param {Object} campaignData - Campaign with user and onboarding data
 * @returns {Promise<Object>} Generated landing page
 */
export const generateLandingPageFromCampaign = async (campaignData) => {
  try {
    const userId = campaignData.userId;
    const user = campaignData.user;
    const onboardingData = user.onboardingData;

    if (!onboardingData) {
      throw new Error('User onboarding data required for landing page generation');
    }

    // Build comprehensive context for AI generation
    const generationParams = {
      businessType: onboardingData.serviceType || 'Psychology Practice',
      businessName: user.company || `${user.name} Therapy`,
      targetAudience: campaignData.targetAudience,
      services: extractServicesFromData(onboardingData, campaignData),
      tone: determineToneFromAudience(campaignData.targetAudience),
      city: onboardingData.city,
      averageTicket: onboardingData.averageTicket,
      businessGoals: onboardingData.businessGoals,
      campaignObjectives: campaignData.objectives,
      includeImages: true,
      template: selectOptimalTemplate(onboardingData.serviceType)
    };

    // Generate AI content with enhanced context
    const generatedContent = await generateLandingPageContent({
      businessType: generationParams.businessType,
      businessName: generationParams.businessName,
      targetAudience: generationParams.targetAudience,
      services: generationParams.services,
      tone: generationParams.tone
    });

    // Generate psychology-specific images
    const imageResult = await generateLandingPageImages({
      businessType: generationParams.businessType,
      services: generationParams.services,
      style: `${generationParams.tone} psychology office photography`
    });

    // Process images with fallback
    let images = [];
    let imageWarnings = [];
    if (imageResult.images && imageResult.images.length > 0) {
      try {
        const storedImages = await storeGeneratedImages(
          imageResult.images,
          generationParams.businessType
        );

        images = imageResult.images.map((originalImage, index) => {
          const storedImage = storedImages[index];
          return {
            ...originalImage,
            fallbackUrl: getFallbackImage(originalImage.type, generationParams.businessType).url,
            storedUrl: storedImage && !storedImage.isFallback ? storedImage.url : null
          };
        });

        logger.info('Images processed for campaign landing page', {
          campaignId: campaignData.id,
          imagesGenerated: images.length
        });
      } catch (error) {
        imageWarnings.push(`Image processing failed: ${error.message}`);
      }
    }

    // Generate unique slug based on campaign
    const slug = generateCampaignLandingPageSlug(campaignData.name, onboardingData.city);

    // Check for existing slug
    const existingPage = await prisma.landingPage.findUnique({
      where: { slug }
    });

    let finalSlug = slug;
    if (existingPage) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    // Create enhanced landing page with psychology-specific features
    const landingPage = await prisma.landingPage.create({
      data: {
        userId,
        name: `${campaignData.name} - Landing Page`,
        slug: finalSlug,
        template: generationParams.template,
        colors: getPsychologyColorScheme(generationParams.template, generationParams.tone),
        content: {
          headline: generatedContent.headline,
          subheadline: generatedContent.subheadline,
          description: generatedContent.description,
          cta: generatedContent.cta,
          features: generatedContent.features || generationParams.services,
          testimonials: generateTestimonials(generationParams.businessType),
          trustSignals: generateTrustSignals(user, onboardingData),
          faq: generatePsychologyFAQ(generationParams.businessType)
        },
        contact: {
          phone: user.phone || '',
          email: user.email,
          whatsapp: user.phone || '',
          address: onboardingData.city ? `${onboardingData.city} Area` : '',
          hours: 'Mon-Fri 9AM-6PM, Sat 9AM-3PM',
          emergencyNote: 'For mental health emergencies, please call 988 (Suicide & Crisis Lifeline) or visit your nearest emergency room.'
        },
        seo: {
          title: `${generationParams.businessName} - ${generationParams.businessType} in ${onboardingData.city}`,
          description: generatedContent.seoDescription || `Professional ${generationParams.businessType.toLowerCase()} services in ${onboardingData.city}. ${generatedContent.description.substring(0, 100)}...`,
          keywords: [
            ...generationParams.services,
            `${generationParams.businessType.toLowerCase()} ${onboardingData.city}`,
            `therapy ${onboardingData.city}`,
            'mental health',
            'counseling',
            generationParams.businessType.toLowerCase()
          ].join(', ')
        },
        images: images || [],
        isActive: true,
        // Link to campaign
        campaignId: campaignData.id
      }
    });

    logger.info(`Campaign landing page generated: ${landingPage.id} for campaign: ${campaignData.id}`);

    return {
      success: true,
      landingPage,
      slug: finalSlug,
      url: `${process.env.FRONTEND_URL}/lp/${finalSlug}`,
      imageWarnings
    };

  } catch (error) {
    logger.error('Campaign landing page generation failed:', error);
    throw new Error(`Failed to generate campaign landing page: ${error.message}`);
  }
};

/**
 * Extract services from onboarding and campaign data
 */
const extractServicesFromData = (onboardingData, campaignData) => {
  const services = [];

  // Add primary service type
  if (onboardingData.serviceType) {
    services.push(onboardingData.serviceType);
  }

  // Extract services from target audience
  const audience = campaignData.targetAudience.toLowerCase();
  if (audience.includes('anxiety')) services.push('Anxiety Treatment');
  if (audience.includes('depression')) services.push('Depression Counseling');
  if (audience.includes('couples') || audience.includes('relationship')) services.push('Couples Therapy');
  if (audience.includes('family')) services.push('Family Therapy');
  if (audience.includes('trauma') || audience.includes('ptsd')) services.push('Trauma Therapy');
  if (audience.includes('addiction')) services.push('Addiction Counseling');

  // Add from business goals
  if (onboardingData.businessGoals) {
    onboardingData.businessGoals.forEach(goal => {
      if (goal.includes('new service') || goal.includes('expand')) {
        services.push('Specialized Treatment');
      }
    });
  }

  // Default services if none found
  if (services.length === 0) {
    services.push('Individual Therapy', 'Counseling Services', 'Mental Health Support');
  }

  return [...new Set(services)]; // Remove duplicates
};

/**
 * Determine tone based on target audience
 */
const determineToneFromAudience = (targetAudience) => {
  const audience = targetAudience.toLowerCase();

  if (audience.includes('young') || audience.includes('teen') || audience.includes('college')) {
    return 'friendly';
  } else if (audience.includes('professional') || audience.includes('executive') || audience.includes('corporate')) {
    return 'authoritative';
  } else if (audience.includes('family') || audience.includes('parent')) {
    return 'warm';
  }

  return 'professional'; // Default
};

/**
 * Select optimal template based on service type
 */
const selectOptimalTemplate = (serviceType) => {
  const service = serviceType?.toLowerCase() || '';

  if (service.includes('couples') || service.includes('family')) {
    return 'family-therapy';
  } else if (service.includes('wellness') || service.includes('holistic')) {
    return 'wellness-center';
  } else if (service.includes('coaching')) {
    return 'coaching-practice';
  } else if (service.includes('group') || service.includes('workshop')) {
    return 'group-therapy';
  }

  return 'psychology-practice'; // Default
};

/**
 * Get psychology-specific color schemes
 */
const getPsychologyColorScheme = (template, tone) => {
  const colorSchemes = {
    professional: {
      primary: '#1e40af',
      secondary: '#64748b',
      accent: '#3b82f6',
      background: '#f8fafc',
      text: '#1e293b'
    },
    warm: {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#f0fdf4',
      text: '#1f2937'
    },
    friendly: {
      primary: '#7c3aed',
      secondary: '#6b7280',
      accent: '#a855f7',
      background: '#faf5ff',
      text: '#374151'
    },
    authoritative: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#4f46e5',
      background: '#ffffff',
      text: '#111827'
    }
  };

  return colorSchemes[tone] || colorSchemes.professional;
};

/**
 * Generate psychology-specific testimonials
 */
const generateTestimonials = (businessType) => {
  const testimonials = [
    {
      text: "The support I received here was life-changing. I finally feel like myself again.",
      author: "Sarah M.",
      rating: 5,
      service: "Individual Therapy"
    },
    {
      text: "Professional, caring, and exactly what our family needed during a difficult time.",
      author: "Mike & Jennifer K.",
      rating: 5,
      service: "Family Therapy"
    },
    {
      text: "I was skeptical about therapy, but this experience completely changed my perspective.",
      author: "David R.",
      rating: 5,
      service: "Counseling"
    }
  ];

  return testimonials.slice(0, 2); // Return 2 testimonials
};

/**
 * Generate trust signals
 */
const generateTrustSignals = (user, onboardingData) => {
  return {
    credentials: "Licensed Mental Health Professional",
    experience: "Years of experience helping clients achieve their goals",
    approach: "Evidence-based therapeutic approaches",
    confidentiality: "100% confidential and secure",
    insurance: "Most insurance plans accepted",
    emergency: "24/7 crisis support available"
  };
};

/**
 * Generate psychology FAQ
 */
const generatePsychologyFAQ = (businessType) => {
  return [
    {
      question: "What can I expect in my first session?",
      answer: "Your first session is about getting to know each other. We'll discuss your concerns, goals, and what brought you here. It's completely normal to feel nervous - we'll go at your pace."
    },
    {
      question: "How long does therapy typically take?",
      answer: "The duration varies for each person and situation. Some people benefit from short-term focused work (6-12 sessions), while others prefer longer-term support. We'll work together to determine what's right for you."
    },
    {
      question: "Is everything we discuss confidential?",
      answer: "Yes, everything discussed in therapy is confidential. There are only a few legal exceptions, which we'll review together in our first session."
    },
    {
      question: "Do you accept insurance?",
      answer: "We accept most major insurance plans. Please contact us to verify your specific coverage and benefits."
    }
  ];
};

/**
 * Generate landing page slug for campaign
 */
const generateCampaignLandingPageSlug = (campaignName, city) => {
  const baseName = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const citySlug = city
    ? city.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    : '';

  return citySlug ? `${baseName}-${citySlug}` : baseName;
};