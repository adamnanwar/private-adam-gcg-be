const express = require('express');
const picAssignmentController = require('./pic-assignment.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// PIC Assignment Routes
router.post('/:assessmentId/assign', requireRole(['admin', 'user']), picAssignmentController.assignPIC);
router.get('/:assessmentId/assignments', requireRole(['admin', 'user']), picAssignmentController.getPICAssignments);

// PIC User Routes
router.get('/assignments', picAssignmentController.getPICAssessments);
router.patch('/assignments/:assignmentId/status', picAssignmentController.updateAssignmentStatus);

module.exports = router;
