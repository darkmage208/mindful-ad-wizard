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
  getLeadManagementDashboard,
  getMessageSuggestions,
  executeFollowUpSequence,
  executeBulkOperation,
  addLeadInteraction,
  addLeadNote
} from '../controllers/leadController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// AI-powered lead management dashboard
router.get('/management', asyncHandler(getLeadManagementDashboard));

// Bulk operations
router.post('/bulk', asyncHandler(executeBulkOperation));

// Lead CRUD operations
router.post('/', validate(leadSchemas.create), asyncHandler(createLead));
router.get('/', asyncHandler(getLeads));
router.get('/export', asyncHandler(exportLeads));

// Individual lead operations
router.get('/:id', requireOwnership('lead'), asyncHandler(getLeadById));
router.put('/:id', validate(leadSchemas.update), requireOwnership('lead'), asyncHandler(updateLead));
router.delete('/:id', requireOwnership('lead'), asyncHandler(deleteLead));

// AI-powered features for individual leads
router.post('/:id/message-suggestions', requireOwnership('lead'), asyncHandler(getMessageSuggestions));
router.post('/:id/follow-up', requireOwnership('lead'), asyncHandler(executeFollowUpSequence));
router.post('/:id/interactions', requireOwnership('lead'), asyncHandler(addLeadInteraction));
router.post('/:id/notes', requireOwnership('lead'), asyncHandler(addLeadNote));

export default router;