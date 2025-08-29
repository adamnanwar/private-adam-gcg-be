const express = require('express');
const assessmentController = require('./assessment.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Assessment Routes
router.get('/', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAllAssessments);
router.get('/stats', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAssessmentStats);
// Place specific routes BEFORE the generic ':id' to avoid 404 on /manual and /full
router.post('/', requireRole(['admin', 'assessor']), assessmentController.createAssessment);
router.put('/:id', requireRole(['admin', 'assessor']), assessmentController.updateAssessment);
router.delete('/:id', requireRole(['admin', 'assessor']), assessmentController.deleteAssessment);

// Assessment Status Routes
router.patch('/:id/status', requireRole(['admin', 'assessor']), assessmentController.updateAssessmentStatus);

// Assessment Results Routes
router.get('/:assessmentId/results', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAssessmentResults);
router.get('/:assessmentId/full', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAssessmentWithResults);
// Manual structure route
router.get('/:assessmentId/manual', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getManualAssessment);

// Generic by ID placed after more specific routes
router.get('/:id', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAssessmentById);

// Response Routes
router.get('/:assessmentId/responses', requireRole(['admin', 'assessor', 'viewer']), assessmentController.getAssessmentResponses);
router.post('/responses', requireRole(['admin', 'assessor']), assessmentController.createResponse);
router.put('/responses/:id', requireRole(['admin', 'assessor']), assessmentController.updateResponse);
router.delete('/responses/:id', requireRole(['admin', 'assessor']), assessmentController.deleteResponse);

// Bulk Response Routes
router.post('/:assessmentId/responses', requireRole(['admin', 'assessor']), assessmentController.bulkUpsertResponses);
router.post('/bulk-responses', requireRole(['admin', 'assessor']), assessmentController.bulkUpsertResponses);

// Assessment Template Routes
router.post('/from-template', requireRole(['admin', 'assessor']), assessmentController.createAssessmentFromTemplate);

module.exports = router;

