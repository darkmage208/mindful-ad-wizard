import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  NotFoundError,
} from '../middleware/errorHandler.js';

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      company: true,
      bio: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  const { name, phone, company, bio } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(company !== undefined && { company }),
      ...(bio !== undefined && { bio }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      company: true,
      bio: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  logger.info(`User profile updated: ${userId}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (req, res) => {
  const userId = req.user.id;

  // In a real implementation, you would:
  // 1. Handle file upload with multer
  // 2. Validate file type and size
  // 3. Upload to cloud storage (AWS S3, CloudFront, etc.)
  // 4. Generate thumbnail
  // 5. Update user record with avatar URL

  // For now, return a placeholder response
  res.json({
    success: true,
    message: 'Avatar upload functionality coming soon',
    data: {
      avatar: null,
    },
  });
};