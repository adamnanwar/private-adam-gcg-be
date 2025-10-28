/**
 * AOI Routes
 */
const express = require('express');
const AOIController = require('./aoi.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');
const { db } = require('../../config/database');

const router = express.Router();
const aoiController = new AOIController(db);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/v1/aoi - Get all AOI with pagination and filters
router.get('/',
  requireRole(['admin', 'user']),
  aoiController.getAllAOI.bind(aoiController)
);

// GET /api/v1/aoi/:id - Get AOI by ID
router.get('/:id',
  requireRole(['admin', 'user']),
  aoiController.getAOIById.bind(aoiController)
);

// GET /api/v1/aoi/assessment/:assessmentId - Get AOI by assessment
router.get('/assessment/:assessmentId',
  requireRole(['admin', 'user']),
  aoiController.getAOIByAssessment.bind(aoiController)
);

// POST /api/v1/aoi - Create new AOI
router.post('/',
  requireRole(['admin']),
  aoiController.createAOI.bind(aoiController)
);

// PUT /api/v1/aoi/:id - Update AOI
router.put('/:id',
  requireRole(['admin', 'user']),
  aoiController.updateAOI.bind(aoiController)
);

// DELETE /api/v1/aoi/:id - Delete AOI
router.delete('/:id',
  requireRole(['admin']),
  aoiController.deleteAOI.bind(aoiController)
);

// GET /api/v1/aoi/:id/target-options - Get target options for AOI creation
router.get('/target-options/:assessmentId',
  requireRole(['admin', 'user']),
  aoiController.getTargetOptions.bind(aoiController)
);

// POST /api/v1/aoi/:id/assign-pic - Assign PIC to AOI
router.post('/:id/assign-pic',
  requireRole(['admin']),
  aoiController.assignPICToAOI.bind(aoiController)
);

// GET /api/v1/aoi/:id/pic-assignments - Get PIC assignments for AOI
router.get('/:id/pic-assignments',
  requireRole(['admin', 'user']),
  aoiController.getPICAssignments.bind(aoiController)
);

// GET /api/v1/aoi/stats/statistics - Get AOI statistics
router.get('/stats/statistics',
  requireRole(['admin', 'user']),
  aoiController.getAOIStats.bind(aoiController)
);

module.exports = router;
