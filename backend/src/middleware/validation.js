import Joi from 'joi';
import { ValidationError } from './errorHandler.js';

/**
 * Validation middleware factory
 * @param {object} schema - Joi schema object with body, params, query
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        errors.push(...error.details.map(detail => `Body: ${detail.message}`));
      }
    }

    // Validate request parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
      });
      
      if (error) {
        errors.push(...error.details.map(detail => `Params: ${detail.message}`));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        errors.push(...error.details.map(detail => `Query: ${detail.message}`));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors.join(', '));
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string().length(24).hex(),
  
  // Allow any string for ID (temporary fix for CUID vs UUID mismatch)
  uuid: Joi.string().min(20).max(30),
  
  // Email validation
  email: Joi.string().email().lowercase().trim(),
  
  // Password validation
  password: Joi.string().min(6).max(128).message('Password must at least 6 characters'),
  
  // Name validation
  name: Joi.string().min(2).max(50).trim(),
  
  // Phone validation
  phone: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).message('Invalid phone number format'),
  
  // URL validation
  url: Joi.string().uri(),
  
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  }),
  
  // Campaign status
  campaignStatus: Joi.string().valid('DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'),
  
  // Platform
  platform: Joi.string().valid('META', 'GOOGLE', 'BOTH'),
  
  // User role
  userRole: Joi.string().valid('CLIENT', 'ADMIN', 'SUPER_ADMIN'),
  
  // Lead status
  leadStatus: Joi.string().valid('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'),
};

// Authentication schemas
export const authSchemas = {
  register: {
    body: Joi.object({
      name: commonSchemas.name.required(),
      email: commonSchemas.email.required(),
      password: commonSchemas.password.required(),
    }),
  },
  
  login: {
    body: Joi.object({
      email: commonSchemas.email.required(),
      password: Joi.string().required(),
    }),
  },
  
  forgotPassword: {
    body: Joi.object({
      email: commonSchemas.email.required(),
    }),
  },
  
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      password: commonSchemas.password.required(),
    }),
  },
  
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: commonSchemas.password.required(),
    }),
  },
};

// User schemas
export const userSchemas = {
  updateProfile: {
    body: Joi.object({
      name: commonSchemas.name,
      phone: commonSchemas.phone,
      company: Joi.string().max(100).trim(),
      bio: Joi.string().max(500).trim(),
    }),
  },
  
  getUserById: {
    params: Joi.object({
      id: commonSchemas.uuid.required(),
    }),
  },
};

// Campaign schemas
export const campaignSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      platform: commonSchemas.platform.required(),
      budget: Joi.number().positive().required(),
      targetAudience: Joi.string().min(10).max(1000).required(),
      objectives: Joi.array().items(Joi.string()).min(1).required(),
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid.required(),
    }),
    body: Joi.object({
      name: Joi.string().min(3).max(100),
      platform: commonSchemas.platform,
      budget: Joi.number().positive(),
      targetAudience: Joi.string().min(10).max(1000),
      objectives: Joi.array().items(Joi.string()).min(1),
      status: commonSchemas.campaignStatus,
    }),
  },
  
  getById: {
    params: Joi.object({
      id: commonSchemas.uuid.required(),
    }),
  },
  
  delete: {
    params: Joi.object({
      id: commonSchemas.uuid.required(),
    }),
  },
  
  list: {
    query: Joi.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      status: commonSchemas.campaignStatus,
      platform: commonSchemas.platform,
      search: Joi.string().max(100),
    }),
  },
};

// Lead schemas
export const leadSchemas = {
  create: {
    body: Joi.object({
      campaignId: commonSchemas.uuid,
      name: commonSchemas.name.required(),
      email: commonSchemas.email.required(),
      phone: commonSchemas.phone,
      source: Joi.string().max(50).required(),
      notes: Joi.string().max(1000),
      value: Joi.number().positive(),
    }),
  },
  
  update: {
    params: Joi.object({
      id: commonSchemas.uuid.required(),
    }),
    body: Joi.object({
      status: commonSchemas.leadStatus,
      notes: Joi.string().max(1000),
      value: Joi.number().positive(),
    }),
  },
  
  list: {
    query: Joi.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      status: commonSchemas.leadStatus,
      campaignId: commonSchemas.uuid,
      search: Joi.string().max(100),
    }),
  },
};

// Landing page schemas
export const landingPageSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      template: Joi.string().required(),
      colors: Joi.object({
        primary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
        secondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
        accent: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      }),
      content: Joi.object({
        headline: Joi.string().max(100),
        subheadline: Joi.string().max(200),
        description: Joi.string().max(1000),
        cta: Joi.string().max(50),
      }),
      contact: Joi.object({
        whatsapp: commonSchemas.phone.allow('').optional(),
        phone: commonSchemas.phone.allow('').optional(),
        email: commonSchemas.email.allow('').optional(),
      }),
    }),
  },
};

// AI schemas
export const aiSchemas = {
  chat: {
    body: Joi.object({
      message: Joi.string().min(1).max(1000).required(),
      context: Joi.object(),
    }),
  },
  
  generateContent: {
    body: Joi.object({
      type: Joi.string().valid('headline', 'description', 'ad-copy').required(),
      context: Joi.object().required(),
    }),
  },
};

// Onboarding schemas
export const onboardingSchemas = {
  submit: {
    body: Joi.object({
      city: Joi.string().min(2).max(100).required(),
      targetAudience: Joi.string().min(10).max(1000).required(),
      averageTicket: Joi.number().positive().required(),
      serviceType: Joi.string().required(),
      businessGoals: Joi.array().items(Joi.string()).min(1).required(),
      budget: Joi.number().positive().min(100).required(),
      experience: Joi.string().required(),
    }),
  },
};