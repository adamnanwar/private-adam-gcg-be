const express = require('express');
const evidenceController = require('./evidence.controller');
const evidenceService = require('./evidence.service');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get multer middleware instance
const uploadMiddleware = evidenceService.upload.single('file');

// Evidence upload routes (with multer middleware)
router.post('/assignment/:assignmentId/upload', uploadMiddleware, evidenceController.uploadEvidence);
router.get('/assignment/:assignmentId', evidenceController.getEvidenceByAssignment);
router.delete('/:evidenceId', evidenceController.deleteEvidence);

// Evidence viewing routes (for assessors)
router.get('/factor/:factorId', requireRole(['admin', 'user']), evidenceController.getEvidenceByFactor);

// File serving route
router.get('/file/:filename', evidenceController.serveEvidence);

module.exports = router;