const express = require('express');
const DashboardController = require('./dashboard.controller');
const { authenticateToken } = require('../../middlewares/auth');
const { db } = require('../../config/database');

const router = express.Router();
const controller = new DashboardController(db);

router.use(authenticateToken);

router.get('/statistics', controller.getStatistics.bind(controller));
router.get('/recent-activities', controller.getRecentActivities.bind(controller));
router.get('/assessment-trends', controller.getAssessmentTrends.bind(controller));
router.get('/kka-performance', controller.getKKAPerformance.bind(controller));

module.exports = router;

