/**
 * AOI Routes - Using only assessment_* tables
 */
const express = require('express');
const AOIController = require('./aoi.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

module.exports = function(db) {
  const controller = new AOIController(db);

  // Apply auth middleware to all routes
  router.use(authenticateToken);

  // GET /api/v1/aoi - Get all AOIs with pagination
  router.get('/', requireRole(['admin', 'user']), controller.getAllAOI.bind(controller));

  // GET /api/v1/aoi/stats - Get AOI statistics
  router.get('/stats', requireRole(['admin', 'user']), controller.getAOIStats.bind(controller));

  // GET /api/v1/aoi/assessment/:assessmentId - Get AOIs by assessment
  router.get('/assessment/:assessmentId', requireRole(['admin', 'user']), controller.getAOIByAssessment.bind(controller));

  // GET /api/v1/aoi/:id - Get AOI by ID
  router.get('/:id', requireRole(['admin', 'user']), controller.getAOIById.bind(controller));

  // GET /api/v1/aoi/:id/details - Get AOI with target details
  router.get('/:id/details', requireRole(['admin', 'user']), controller.getAOIWithTargetDetails.bind(controller));

  // POST /api/v1/aoi - Create new AOI
  router.post('/', requireRole(['admin', 'user']), controller.createAOI.bind(controller));

  // PUT /api/v1/aoi/:id - Update AOI
  router.put('/:id', requireRole(['admin', 'user']), controller.updateAOI.bind(controller));

  // DELETE /api/v1/aoi/:id - Delete AOI
  router.delete('/:id', requireRole(['admin', 'user']), controller.deleteAOI.bind(controller));

  // Get target options for AOI creation
  router.get('/target-options/:assessmentId', requireRole(['admin', 'user']), controller.getTargetOptions.bind(controller));

  // PIC Assignment Routes
  router.post('/:aoiId/pic', requireRole(['admin', 'user']), controller.assignPICToAOI.bind(controller));
  router.get('/:aoiId/pic', controller.getPICAssignments.bind(controller));

  // Notification Routes
  router.get('/notifications', controller.getUserNotifications.bind(controller));
  router.patch('/notifications/:notificationId/read', controller.markNotificationAsRead.bind(controller));

  return router;
};

