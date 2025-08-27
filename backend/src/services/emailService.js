import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to Mindful Ad Wizard - Verify Your Email',
    html: `
      <div style=\"max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;\">
        <h1 style=\"color: #2563eb; text-align: center;\">Welcome to Mindful Ad Wizard!</h1>
        <p>Hi {{name}},</p>
        <p>Thank you for joining Mindful Ad Wizard, the AI-powered advertising platform designed specifically for psychology professionals.</p>
        <p>To get started, please verify your email address by clicking the button below:</p>
        <div style=\"text-align: center; margin: 30px 0;\">
          <a href=\"{{verificationUrl}}\" style=\"background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;\">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href=\"{{verificationUrl}}\">{{verificationUrl}}</a></p>
        <p>Once verified, you'll be able to:</p>
        <ul>
          <li>Create AI-powered advertising campaigns</li>
          <li>Generate custom landing pages</li>
          <li>Track leads and performance metrics</li>
          <li>Get intelligent marketing recommendations</li>
        </ul>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>The Mindful Ad Wizard Team</p>
        <hr style=\"margin: 30px 0; border: none; height: 1px; background-color: #e5e7eb;\">
        <p style=\"font-size: 12px; color: #6b7280;\">This email was sent to you because you signed up for Mindful Ad Wizard. If you have any questions, please contact our support team.</p>
      </div>
    `,
  },
  
  'password-reset': {
    subject: 'Password Reset - Mindful Ad Wizard',
    html: `
      <div style=\"max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;\">
        <h1 style=\"color: #2563eb; text-align: center;\">Password Reset Request</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password for your Mindful Ad Wizard account.</p>
        <p>Click the button below to reset your password:</p>
        <div style=\"text-align: center; margin: 30px 0;\">
          <a href=\"{{resetUrl}}\" style=\"background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;\">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href=\"{{resetUrl}}\">{{resetUrl}}</a></p>
        <p><strong>This link will expire in {{expiresIn}}.</strong></p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>For security reasons, please don't share this email with anyone.</p>
        <p>Best regards,<br>The Mindful Ad Wizard Team</p>
        <hr style=\"margin: 30px 0; border: none; height: 1px; background-color: #e5e7eb;\">
        <p style=\"font-size: 12px; color: #6b7280;\">If you're having trouble with the button, copy and paste the URL into your web browser.</p>
      </div>
    `,
  },
  
  'email-verification': {
    subject: 'Verify Your Email - Mindful Ad Wizard',
    html: `
      <div style=\"max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;\">
        <h1 style=\"color: #2563eb; text-align: center;\">Verify Your Email Address</h1>
        <p>Hi {{name}},</p>
        <p>Please verify your email address to complete your account setup.</p>
        <div style=\"text-align: center; margin: 30px 0;\">
          <a href=\"{{verificationUrl}}\" style=\"background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;\">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link:</p>
        <p><a href=\"{{verificationUrl}}\">{{verificationUrl}}</a></p>
        <p>Best regards,<br>The Mindful Ad Wizard Team</p>
      </div>
    `,
  },
  
  'campaign-alert': {
    subject: 'Campaign Alert - {{campaignName}}',
    html: `
      <div style=\"max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;\">
        <h1 style=\"color: #f59e0b; text-align: center;\">Campaign Alert</h1>
        <p>Hi {{name}},</p>
        <p>We wanted to let you know about an important update regarding your campaign \"{{campaignName}}\":</p>
        <div style=\"background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;\">
          <p style=\"margin: 0; font-weight: bold;\">{{alertMessage}}</p>
        </div>
        <p>{{additionalInfo}}</p>
        <div style=\"text-align: center; margin: 30px 0;\">
          <a href=\"{{campaignUrl}}\" style=\"background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;\">View Campaign</a>
        </div>
        <p>Best regards,<br>The Mindful Ad Wizard Team</p>
      </div>
    `,
  },
  
  'lead-notification': {
    subject: 'New Lead - {{leadName}}',
    html: `
      <div style=\"max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;\">
        <h1 style=\"color: #10b981; text-align: center;\">🎉 New Lead Received!</h1>
        <p>Hi {{userName}},</p>
        <p>Great news! You've received a new lead from your campaign \"{{campaignName}}\":</p>
        <div style=\"background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;\">
          <h3 style=\"margin: 0 0 10px 0; color: #065f46;\">Lead Details</h3>
          <p><strong>Name:</strong> {{leadName}}</p>
          <p><strong>Email:</strong> {{leadEmail}}</p>
          <p><strong>Phone:</strong> {{leadPhone}}</p>
          <p><strong>Source:</strong> {{leadSource}}</p>
        </div>
        <div style=\"text-align: center; margin: 30px 0;\">
          <a href=\"{{leadsUrl}}\" style=\"background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;\">View All Leads</a>
        </div>
        <p>Don't forget to follow up promptly to maximize your conversion chances!</p>
        <p>Best regards,<br>The Mindful Ad Wizard Team</p>
      </div>
    `,
  },
};

// Create email transporter
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  return nodemailer.createTransporter(config);
};

// Template engine
const renderTemplate = (template, data) => {
  let rendered = template;
  
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(placeholder, data[key] || '');
  });
  
  return rendered;
};

/**
 * Send email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {object} options.data - Template data
 * @param {string} options.html - Custom HTML (if not using template)
 * @param {string} options.text - Plain text version
 */
export const sendEmail = async (options) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('Email service not configured, skipping email send');
      return { success: true, message: 'Email service not configured' };
    }

    const transporter = createTransporter();
    
    let html = options.html;
    let subject = options.subject;
    
    // Use template if specified
    if (options.template && emailTemplates[options.template]) {
      const template = emailTemplates[options.template];
      html = renderTemplate(template.html, options.data || {});
      
      if (!options.subject) {
        subject = renderTemplate(template.subject, options.data || {});
      }
    }
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: options.to,
      subject: subject,
      html: html,
      text: options.text,
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully to ${options.to}`, {
      messageId: result.messageId,
      template: options.template,
    });
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    logger.error('Failed to send email:', {
      error: error.message,
      to: options.to,
      template: options.template,
    });
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

/**
 * Send campaign alert email
 */
export const sendCampaignAlert = async (user, campaign, alertMessage, additionalInfo = '') => {
  return sendEmail({
    to: user.email,
    template: 'campaign-alert',
    data: {
      name: user.name,
      campaignName: campaign.name,
      alertMessage,
      additionalInfo,
      campaignUrl: `${process.env.FRONTEND_URL}/campaigns/${campaign.id}`,
    },
  });
};

/**
 * Send lead notification email
 */
export const sendLeadNotification = async (user, lead, campaign) => {
  return sendEmail({
    to: user.email,
    template: 'lead-notification',
    data: {
      userName: user.name,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone || 'Not provided',
      leadSource: lead.source,
      campaignName: campaign.name,
      leadsUrl: `${process.env.FRONTEND_URL}/leads`,
    },
  });
};

/**
 * Test email configuration
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    return false;
  }
};