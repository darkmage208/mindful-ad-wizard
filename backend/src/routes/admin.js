import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import {
  getSystemStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  addUser,
  getAllCampaigns,
  updateCampaign,
  getSystemHealth,
  getSystemAnalytics,
  getUserManagement,
  getContentModeration,
  moderateContent,
  getSystemConfig,
  updateSystemConfig,
  getAuditLog,
  executeEmergencyAction
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// System management and analytics
router.get('/stats', asyncHandler(getSystemStats));
router.get('/analytics', asyncHandler(getSystemAnalytics));
router.get('/health', asyncHandler(getSystemHealth));

// Enhanced user management
router.get('/users', asyncHandler(getUsers));
router.post('/users', asyncHandler(addUser));
router.get('/user-management', asyncHandler(getUserManagement));
router.get('/users/:id', asyncHandler(getUserById));
router.put('/users/:id', asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));

// Campaign oversight
router.get('/campaigns', asyncHandler(getAllCampaigns));
router.put('/campaigns/:id', asyncHandler(updateCampaign));

// Content moderation
router.get('/moderation', asyncHandler(getContentModeration));
router.post('/moderation/action', asyncHandler(moderateContent));

// System configuration
router.get('/config', asyncHandler(getSystemConfig));
router.put('/config', asyncHandler(updateSystemConfig));

// Audit and compliance
router.get('/audit-log', asyncHandler(getAuditLog));

// Emergency actions (super admin only)
router.post('/emergency', asyncHandler(executeEmergencyAction));

export default router;