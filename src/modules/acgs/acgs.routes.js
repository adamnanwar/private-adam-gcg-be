/**
 * ACGS Routes
 */

const express = require('express');
const AcgsController = require('./acgs.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

module.exports = function (db) {
  const controller = new AcgsController();

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
  router.post('/assessments/:id/submit', requireRole(['admin', 'assessor', 'user', 'pic']), controller.submitTindakLanjut.bind(controller));

  // Reject PIC Submission (for admin/assessor during verification)
  router.post('/assessments/:id/reject-pic', requireRole(['admin', 'assessor']), controller.rejectPICSubmission.bind(controller));

  // Reject ALL PIC Submissions at once (global rejection)
  router.post('/assessments/:id/reject-all', requireRole(['admin', 'assessor']), controller.rejectAllPICs.bind(controller));

  // Reset PIC Submission (clear rejection status so PIC can re-submit)
  router.post('/assessments/:id/reset-submission', requireRole(['admin', 'assessor']), controller.resetPICSubmission.bind(controller));

  // Responses
  router.post('/assessments/:id/responses', requireRole(['admin', 'assessor', 'user', 'pic']), controller.saveResponses.bind(controller));

  return router;
};
