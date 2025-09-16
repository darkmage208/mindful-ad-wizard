import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');

/**
 * Ensure upload directories exist
 */
const ensureDirectories = async () => {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }

  try {
    await fs.access(IMAGES_DIR);
  } catch {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  }
};

/**
 * Download and save image from URL
 * @param {string} imageUrl - URL of the image to download
 * @param {string} filename - Filename to save as
 * @returns {Promise<string>} Local file path
 */
export const downloadAndSaveImage = async (imageUrl, filename) => {
  try {
    await ensureDirectories();

    logger.info('Attempting to download image', { imageUrl, filename });

    // Use fetch with timeout and proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MindfulAdWizard/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('Downloaded image is empty');
    }

    const filePath = path.join(IMAGES_DIR, filename);
    await fs.writeFile(filePath, Buffer.from(buffer));

    // Return relative path for serving via Express
    const relativePath = `/uploads/images/${filename}`;

    logger.info('Image downloaded and saved successfully', {
      originalUrl: imageUrl,
      savedPath: relativePath,
      fileSize: buffer.byteLength,
      contentType
    });

    return relativePath;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Image download timed out:', { imageUrl, filename });
      throw new Error('Image download timed out after 30 seconds');
    }

    logger.error('Failed to download and save image:', {
      error: error.message,
      imageUrl,
      filename
    });
    throw new Error(`Image download failed: ${error.message}`);
  }
};

/**
 * Generate unique filename for image
 * @param {string} type - Image type (hero, feature, etc.)
 * @param {string} businessType - Business type for naming
 * @returns {string} Unique filename
 */
export const generateImageFilename = (type, businessType) => {
  const timestamp = Date.now();
  const businessSlug = businessType.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${businessSlug}-${type}-${timestamp}.png`;
};

/**
 * Store generated images permanently
 * @param {Array} images - Array of image objects with URLs
 * @param {string} businessType - Business type for naming
 * @returns {Promise<Array>} Array of images with local URLs
 */
export const storeGeneratedImages = async (images, businessType) => {
  const storedImages = [];

  for (const image of images) {
    try {
      const filename = generateImageFilename(image.type, businessType);
      const localPath = await downloadAndSaveImage(image.url, filename);

      storedImages.push({
        ...image,
        url: localPath,
        originalUrl: image.url // Keep original for reference
      });

      logger.info(`Successfully stored ${image.type} image`, {
        type: image.type,
        localPath,
        originalUrl: image.url
      });
    } catch (error) {
      logger.warn(`Failed to store ${image.type} image:`, error.message);

      // Use fallback image if storage fails
      const fallbackImage = getFallbackImage(image.type, businessType);
      storedImages.push({
        ...image,
        url: fallbackImage.url,
        alt: fallbackImage.alt,
        originalUrl: image.url,
        isFallback: true
      });

      logger.info(`Using fallback image for ${image.type}`, {
        fallbackUrl: fallbackImage.url
      });
    }
  }

  logger.info('Image storage completed', {
    businessType,
    totalImages: images.length,
    storedImages: storedImages.length,
    fallbacksUsed: storedImages.filter(img => img.isFallback).length
  });

  return storedImages;
};

/**
 * Get fallback placeholder images
 * @param {string} type - Image type (hero, feature)
 * @param {string} businessType - Business type
 * @returns {Object} Fallback image object
 */
export const getFallbackImage = (type, businessType) => {
  const placeholders = {
    hero: {
      url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      alt: `${businessType} professional environment`,
      type: 'hero'
    },
    feature: {
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
      alt: `${businessType} services`,
      type: 'feature'
    }
  };

  return placeholders[type] || placeholders.hero;
};

/**
 * Clean up old images (optional maintenance function)
 * @param {number} maxAgeHours - Maximum age in hours before cleanup
 */
export const cleanupOldImages = async (maxAgeHours = 24 * 7) => { // 1 week default
  try {
    await ensureDirectories();

    const files = await fs.readdir(IMAGES_DIR);
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(IMAGES_DIR, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(filePath);
        cleanedCount++;
      }
    }

    logger.info('Image cleanup completed', {
      filesProcessed: files.length,
      filesDeleted: cleanedCount
    });

    return cleanedCount;
  } catch (error) {
    logger.error('Image cleanup failed:', error);
    throw error;
  }
};