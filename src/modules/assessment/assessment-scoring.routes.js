const express = require('express');
const AssessmentScoringController = require('./assessment-scoring.controller');
const { authenticateToken, requireAssessmentOwnerOrAdmin } = require('../../middlewares/auth');

function createAssessmentScoringRoutes(db) {
  const router = express.Router();
  const controller = new AssessmentScoringController(db);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // GET /assessments/:assessmentId/kka/:kkaId/score
  router.get('/:assessmentId/kka/:kkaId/score', requireAssessmentOwnerOrAdmin, controller.getKkaScore);

  // POST /assessments/:assessmentId/kka/:kkaId/aoi/generate
  router.post('/:assessmentId/kka/:kkaId/aoi/generate', requireAssessmentOwnerOrAdmin, controller.generateAoiForKka);

  // GET /assessments/:assessmentId/aoi/candidates
  router.get('/:assessmentId/aoi/candidates', requireAssessmentOwnerOrAdmin, controller.listAoiCandidates);

  return router;
}

module.exports = { createAssessmentScoringRoutes };
