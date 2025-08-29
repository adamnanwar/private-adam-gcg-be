const express = require('express');
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/login-local', authController.loginLocal);
router.post('/login-ldap', authController.loginLDAP);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;

