const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authenticateToken, requireAdmin } = require('../../middlewares/auth');

// Public route - get specific setting (e.g., for display purposes)
router.get('/:key', authenticateToken, settingsController.getSetting);

// Admin only - get all settings
router.get('/', authenticateToken, requireAdmin, settingsController.getAllSettings);

// Admin only - update setting
router.put('/:key', authenticateToken, requireAdmin, settingsController.updateSetting);

module.exports = router;
