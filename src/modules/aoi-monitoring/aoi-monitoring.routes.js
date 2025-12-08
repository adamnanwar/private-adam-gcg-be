const express = require('express');
const router = express.Router();
const aoiMonitoringController = require('./aoi-monitoring.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Routes for specific assessment type
router.get('/:assessmentType', aoiMonitoringController.getAllByType);
router.get('/:assessmentType/stats', aoiMonitoringController.getStatsByType);
router.get('/:assessmentType/settings', aoiMonitoringController.getSettings);
router.put('/:assessmentType/settings', requireRole(['admin']), aoiMonitoringController.updateSettings);

// CRUD routes
router.post('/', requireRole(['admin']), aoiMonitoringController.create);
router.get('/detail/:id', aoiMonitoringController.getById);
router.put('/:id', requireRole(['admin']), aoiMonitoringController.update);
router.delete('/:id', requireRole(['admin']), aoiMonitoringController.delete);

module.exports = router;
