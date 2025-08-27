import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, userSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  updateProfile,
  uploadAvatar,
  getProfile,
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', validate(userSchemas.updateProfile), asyncHandler(updateProfile));
router.post('/avatar', asyncHandler(uploadAvatar));

export default router;