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
  router.get('/', requireRole(['admin', 'assessor', 'viewer']), controller.getAllAOI.bind(controller));

  // GET /api/v1/aoi/stats - Get AOI statistics
  router.get('/stats', requireRole(['admin', 'assessor', 'viewer']), controller.getAOIStats.bind(controller));

  // GET /api/v1/aoi/assessment/:assessmentId - Get AOIs by assessment
  router.get('/assessment/:assessmentId', requireRole(['admin', 'assessor', 'viewer']), controller.getAOIByAssessment.bind(controller));

  // GET /api/v1/aoi/:id - Get AOI by ID
  router.get('/:id', requireRole(['admin', 'assessor', 'viewer']), controller.getAOIById.bind(controller));

  // GET /api/v1/aoi/:id/details - Get AOI with target details
  router.get('/:id/details', requireRole(['admin', 'assessor', 'viewer']), controller.getAOIWithTargetDetails.bind(controller));

  // POST /api/v1/aoi - Create new AOI
  router.post('/', requireRole(['admin', 'assessor']), controller.createAOI.bind(controller));

  // PUT /api/v1/aoi/:id - Update AOI
  router.put('/:id', requireRole(['admin', 'assessor']), controller.updateAOI.bind(controller));

  // DELETE /api/v1/aoi/:id - Delete AOI
  router.delete('/:id', requireRole(['admin', 'assessor']), controller.deleteAOI.bind(controller));

  // Get target options for AOI creation
  router.get('/target-options/:assessmentId', requireRole(['admin', 'assessor']), controller.getTargetOptions.bind(controller));

  return router;
};

