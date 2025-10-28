const express = require('express');
const FactorEnhancedController = require('./factor-enhanced.controller');

function createFactorEnhancedRoutes(db) {
  const router = express.Router();
  const controller = new FactorEnhancedController(db);

  // POST /factors/:factorId/unsur
  router.post('/:factorId/unsur', controller.addUnsurPemenuhan);

  // PATCH /factors/:factorId/pic
  router.patch('/:factorId/pic', controller.updateFactorPic);

  // GET /factors/:factorId
  router.get('/:factorId', controller.getFactorWithDetails);

  // GET /assessments/:assessmentId/factors
  router.get('/assessments/:assessmentId/factors', controller.getFactorsByAssessment);

  return router;
}

module.exports = { createFactorEnhancedRoutes };
