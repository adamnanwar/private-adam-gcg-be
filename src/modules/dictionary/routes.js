const express = require('express');
const dictionaryController = require('./dictionary.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// KKA Routes
router.get('/kka', requireRole(['admin', 'user']), dictionaryController.getAllKKA);
router.get('/kka/:id', requireRole(['admin', 'user']), dictionaryController.getKKAById);
router.post('/kka', requireRole(['admin']), dictionaryController.createKKA);
router.put('/kka/:id', requireRole(['admin']), dictionaryController.updateKKA);
router.delete('/kka/:id', requireRole(['admin']), dictionaryController.deleteKKA);

// Aspect Routes
router.get('/kka/:kkaId/aspects', requireRole(['admin', 'user']), dictionaryController.getAspectsByKKA);
router.get('/aspects/:id', requireRole(['admin', 'user']), dictionaryController.getAspectById);
router.post('/aspects', requireRole(['admin']), dictionaryController.createAspect);
router.put('/aspects/:id', requireRole(['admin']), dictionaryController.updateAspect);
router.delete('/aspects/:id', requireRole(['admin']), dictionaryController.deleteAspect);

// Parameter Routes
router.get('/aspects/:aspectId/parameters', requireRole(['admin', 'user']), dictionaryController.getParametersByAspect);
router.get('/parameters/:id', requireRole(['admin', 'user']), dictionaryController.getParameterById);
router.post('/parameters', requireRole(['admin']), dictionaryController.createParameter);
router.put('/parameters/:id', requireRole(['admin']), dictionaryController.updateParameter);
router.delete('/parameters/:id', requireRole(['admin']), dictionaryController.deleteParameter);

// Factor Routes
router.get('/parameters/:parameterId/factors', requireRole(['admin', 'user']), dictionaryController.getFactorsByParameter);
router.get('/factors/:id', requireRole(['admin', 'user']), dictionaryController.getFactorById);
router.post('/factors', requireRole(['admin']), dictionaryController.createFactor);
router.put('/factors/:id', requireRole(['admin']), dictionaryController.updateFactor);
router.delete('/factors/:id', requireRole(['admin']), dictionaryController.deleteFactor);

// Hierarchy Routes
router.get('/hierarchy', requireRole(['admin', 'user']), dictionaryController.getCompleteHierarchyAll);
router.get('/hierarchy/minimal', requireRole(['admin', 'user']), dictionaryController.getMinimalHierarchyForNewAssessment);
router.get('/kka/:kkaId/hierarchy', requireRole(['admin', 'user']), dictionaryController.getCompleteHierarchy);

// Bulk Operations
router.post('/bulk-hierarchy', requireRole(['admin']), dictionaryController.bulkCreateHierarchy);

module.exports = router;

