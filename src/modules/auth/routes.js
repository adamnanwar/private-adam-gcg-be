const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/auth');

// Login (public) - Universal login that handles both local and LDAP
router.post('/login', authController.login);
router.post('/login-local', authController.login); // Alias for frontend compatibility
router.post('/login-ldap', authController.login); // Alias for LDAP login

// Protected routes
router.get('/me', authMiddleware.authenticateToken, authController.getProfile);
router.post('/change-password', authMiddleware.authenticateToken, authController.changePassword);
router.post('/logout', authMiddleware.authenticateToken, authController.logout);

module.exports = router;

