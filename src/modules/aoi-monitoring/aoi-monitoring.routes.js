const express = require('express');
const router = express.Router();
const aoiMonitoringController = require('./aoi-monitoring.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Routes for specific assessment type
router.get('/:assessmentType', aoiMonitoringController.getAllByType);
router.get('/:assessmentType/stats', aoiMonitoringController.getStatsByType);

// CRUD routes
router.post('/', authorize(['admin']), aoiMonitoringController.create);
router.get('/detail/:id', aoiMonitoringController.getById);
router.put('/:id', authorize(['admin']), aoiMonitoringController.update);
router.delete('/:id', authorize(['admin']), aoiMonitoringController.delete);

module.exports = router;
