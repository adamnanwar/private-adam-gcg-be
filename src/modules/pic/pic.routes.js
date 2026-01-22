/**
 * PIC (Person In Charge) Routes
 */
const express = require('express');
const PICController = require('./pic.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();
const picController = new PICController();

// Apply auth middleware to all routes
router.use(authenticateToken);

// POST /api/v1/pic/assign - Assign PIC to target (admin only)
router.post('/assign', requireRole(['admin']), picController.assignPIC.bind(picController));

// GET /api/v1/pic/assessment - Get PIC assignments for current user (MUST be before /:target_type/:target_id)
router.get('/assessment', requireRole(['admin', 'user']), picController.getPICAssignments.bind(picController));

// GET /api/v1/pic/assessment/:assessmentId - Get all PIC assignments for assessment (admin and user) (MUST be before /:target_type/:target_id)
router.get('/assessment/:assessmentId', requireRole(['admin', 'user']), picController.getPICAssignmentsByAssessment.bind(picController));

// GET /api/v1/pic/unit - List units with PIC counts (MUST be before /:target_type/:target_id)
router.get('/unit', requireRole(['admin', 'user']), picController.getUnitPicSummary.bind(picController));

// GET /api/v1/pic/unit/:unitBidangId - Get PIC assignments for unit bidang (admin and user) (MUST be before /:target_type/:target_id)
router.get('/unit/:unitBidangId', requireRole(['admin', 'user']), picController.getPICAssignmentsByUnit.bind(picController));

// GET /api/v1/pic/unit/:unitBidangId/users - Get users mapped to unit bidang (MUST be before /:target_type/:target_id)
router.get('/unit/:unitBidangId/users', requireRole(['admin', 'user']), picController.getUsersByUnit.bind(picController));

// GET /api/v1/pic/unassigned-users - Get users without unit bidang assignment (admin only)
router.get('/unassigned-users', requireRole(['admin']), picController.getUnassignedUsers.bind(picController));

// POST /api/v1/pic/assessment/:assessmentId/bulk - Bulk assign PICs for assessment (admin only) (MUST be before /:target_type/:target_id)
router.post('/assessment/:assessmentId/bulk', requireRole(['admin']), picController.bulkAssignPICs.bind(picController));

// POST /api/v1/pic/assessment/:assessmentId/notify - Send email notifications for PIC assignments (admin only) (MUST be before /:target_type/:target_id)
router.post('/assessment/:assessmentId/notify', requireRole(['admin']), picController.sendAssignmentNotifications.bind(picController));

// DELETE /api/v1/pic/:target_type/:target_id - Remove PIC assignment (admin only)
router.delete('/:target_type/:target_id', requireRole(['admin']), picController.removePIC.bind(picController));

// GET /api/v1/pic/:target_type/:target_id - Get PIC assignment for target (admin and user)
router.get('/:target_type/:target_id', requireRole(['admin', 'user']), picController.getPICAssignment.bind(picController));

module.exports = router;
