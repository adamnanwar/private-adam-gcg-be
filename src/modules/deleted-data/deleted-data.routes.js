const express = require('express');
const router = express.Router();
const deletedDataController = require('./deleted-data.controller');
const { authenticateToken, requireAdmin } = require('../../middlewares/auth');

// All routes require authentication and admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/deleted-data - Get all deleted data
router.get('/', deletedDataController.getAll);

// POST /api/deleted-data/:id/restore - Restore deleted data
router.post('/:id/restore', deletedDataController.restore);

// DELETE /api/deleted-data/:id/permanent - Permanently delete data
router.delete('/:id/permanent', deletedDataController.permanentlyDelete);

module.exports = router;
