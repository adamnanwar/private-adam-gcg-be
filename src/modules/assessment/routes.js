const express = require('express');
const assessmentController = require('./assessment.controller');
const assessmentPICController = require('./assessment-pic.controller');
const { authenticateToken, requireRole, requireAssessmentOwnerOrAdmin } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Assessment Routes
// Place specific routes BEFORE the generic ':id' to avoid 404 on /manual and /full
router.get('/new', assessmentController.getNewAssessmentData.bind(assessmentController));
router.get('/my-assignments', assessmentController.getPICAssessments.bind(assessmentController));
router.get('/stats', requireRole(['admin', 'user']), assessmentController.getAssessmentStats.bind(assessmentController));
router.get('/', requireRole(['admin', 'user']), assessmentController.getAllAssessments.bind(assessmentController));

// Excel Export Route - must be before generic ':id' route
router.get('/:id/export/excel', requireRole(['admin', 'user']), assessmentController.exportToExcel.bind(assessmentController));
router.post('/', requireRole(['admin']), assessmentController.createAssessment.bind(assessmentController));
router.put('/:id', requireRole(['admin']), assessmentController.updateAssessment.bind(assessmentController));
router.delete('/:id', requireRole(['admin']), assessmentController.deleteAssessment.bind(assessmentController));

// Assessment Status Routes (Admin only - for manual override if needed)
router.patch('/:id/status', requireRole(['admin']), assessmentController.updateAssessmentStatus.bind(assessmentController));

// Tindak Lanjut & Verifikasi Routes
router.post('/:id/submit', requireRole(['user', 'admin']), assessmentController.submitTindakLanjut.bind(assessmentController));
router.post('/:id/verify', requireRole(['assessor', 'admin']), assessmentController.verifyAssessment.bind(assessmentController));

// Assessment Review Routes
router.post('/:assessmentId/review/accept', requireAssessmentOwnerOrAdmin, assessmentController.acceptAssessment.bind(assessmentController));
router.post('/:assessmentId/review/reject', requireAssessmentOwnerOrAdmin, assessmentController.rejectAssessment.bind(assessmentController));

// Assessment Results Routes
router.get('/:assessmentId/results', requireRole(['admin', 'user']), assessmentController.getAssessmentResults.bind(assessmentController));
router.get('/:assessmentId/full', requireRole(['admin', 'user']), assessmentController.getAssessmentWithResults.bind(assessmentController));
// Manual structure route
router.get('/:assessmentId/manual', requireRole(['admin', 'user']), assessmentController.getManualAssessment.bind(assessmentController));
router.put('/:assessmentId/manual', requireRole(['admin', 'user']), assessmentController.updateManualAssessment.bind(assessmentController));

// Generic by ID placed after more specific routes
router.get('/:id', requireRole(['admin', 'user']), assessmentController.getAssessmentById.bind(assessmentController));

// Response Routes
router.get('/:assessmentId/responses', requireRole(['admin', 'user']), assessmentController.getAssessmentResponses.bind(assessmentController));
router.post('/responses', requireRole(['admin', 'user']), assessmentController.createResponse.bind(assessmentController));
router.put('/responses/:id', requireRole(['admin', 'user']), assessmentController.updateResponse.bind(assessmentController));
router.delete('/responses/:id', requireRole(['admin', 'user']), assessmentController.deleteResponse.bind(assessmentController));

// Bulk Response Routes
router.post('/:assessmentId/responses', requireRole(['admin', 'user']), assessmentController.bulkUpsertResponses.bind(assessmentController));
router.post('/bulk-responses', requireRole(['admin', 'user']), assessmentController.bulkUpsertResponses.bind(assessmentController));

// Assessment Template Routes
router.post('/from-template', requireRole(['admin', 'user']), assessmentController.createAssessmentFromTemplate.bind(assessmentController));

// PIC Assignment Routes
router.post('/:assessmentId/pic', assessmentPICController.assignPIC.bind(assessmentPICController));
router.get('/:assessmentId/pic', assessmentPICController.getPICAssignments.bind(assessmentPICController));

// Revision Routes
router.post('/:assessmentId/revision', requireRole(['admin', 'user']), assessmentPICController.requestRevision.bind(assessmentPICController));
router.patch('/:assessmentId/revision/:revisionId/complete', assessmentPICController.completeRevision.bind(assessmentPICController));

// Notification Routes
router.get('/notifications', assessmentPICController.getUserNotifications.bind(assessmentPICController));
router.patch('/notifications/:notificationId/read', assessmentPICController.markNotificationAsRead.bind(assessmentPICController));

// AOI Routes - Import AOI controller
const AOIController = require('../aoi/aoi.controller');
const { db } = require('../../config/database');
const aoiController = new AOIController(db);

// GET /api/assessments/:assessmentId/aoi - Get AOI by assessment
router.get('/:assessmentId/aoi',
  requireRole(['admin', 'user']),
  aoiController.getAOIByAssessment.bind(aoiController)
);

module.exports = router;

