/**
 * Email Test Routes
 */
const express = require('express');
const emailController = require('./email.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/email/config - Check email configuration (admin only)
router.get('/config', requireRole(['admin']), emailController.checkConfig.bind(emailController));

// POST /api/email/test - Send test email (admin only)
router.post('/test', requireRole(['admin']), emailController.testEmail.bind(emailController));

module.exports = router;
