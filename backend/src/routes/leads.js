import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, leadSchemas } from '../middleware/validation.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  exportLeads,
} from '../controllers/leadController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Lead CRUD operations
router.post('/', validate(leadSchemas.create), asyncHandler(createLead));
router.get('/', asyncHandler(getLeads));
router.get('/export', asyncHandler(exportLeads));
router.get('/:id', requireOwnership(), asyncHandler(getLeadById));
router.put('/:id', requireOwnership(), asyncHandler(updateLead));
router.delete('/:id', requireOwnership(), asyncHandler(deleteLead));

export default router;