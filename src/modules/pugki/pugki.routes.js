/**
 * PUGKI Routes
 */

const express = require('express');
const PugkiController = require('./pugki.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

module.exports = function(db) {
  const controller = new PugkiController();

  router.use(authenticateToken);

  // Templates
  router.get('/templates', controller.getTemplates.bind(controller));
  router.get('/templates/hierarchy', controller.getTemplateHierarchy.bind(controller));

  // Master Data
  router.get('/master-data', controller.getMasterData.bind(controller));

  // Assessments
  router.get('/assessments', controller.getAssessments.bind(controller));
  router.get('/assessments/:id', controller.getAssessmentById.bind(controller));
  router.post('/assessments', requireRole(['admin', 'assessor']), controller.createAssessment.bind(controller));
  router.put('/assessments/:id', requireRole(['admin', 'assessor']), controller.updateAssessment.bind(controller));
  router.delete('/assessments/:id', requireRole(['admin']), controller.deleteAssessment.bind(controller));

  // Tindak Lanjut Submit
  router.post('/assessments/:id/submit', requireRole(['admin', 'assessor', 'user']), controller.submitTindakLanjut.bind(controller));

  // Responses
  router.post('/assessments/:id/responses', requireRole(['admin', 'assessor', 'user']), controller.saveResponses.bind(controller));

  return router;
};
