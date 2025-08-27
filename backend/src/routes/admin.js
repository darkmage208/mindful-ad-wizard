import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import {
  getSystemStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllCampaigns,
  getSystemHealth,
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// System management
router.get('/stats', asyncHandler(getSystemStats));
router.get('/health', asyncHandler(getSystemHealth));

// User management
router.get('/users', asyncHandler(getUsers));
router.get('/users/:id', asyncHandler(getUserById));
router.put('/users/:id', asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));

// Campaign oversight
router.get('/campaigns', asyncHandler(getAllCampaigns));

export default router;