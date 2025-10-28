const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

// Public routes (if any)
// router.get('/public-info', userController.getPublicInfo);

// Protected routes - require authentication
router.use(authenticateToken);

// User management routes
router.get('/', requireRole(['admin', 'user']), userController.getAllUsers);
router.get('/stats', requireRole('admin'), userController.getUserStats);
router.get('/:id', requireRole(['admin', 'user']), userController.getUserById);
router.post('/', requireRole('admin'), userController.createUser);
router.put('/:id', requireRole('admin'), userController.updateUser);
router.delete('/:id', requireRole('admin'), userController.deleteUser);

// LDAP sync routes (admin only)
router.post('/sync-ldap', requireRole('admin'), userController.syncUsersFromLDAP);
router.get('/ldap-status', requireRole('admin'), userController.getLDAPSyncStatus);

// User profile routes (authenticated users can access their own profile)
router.get('/profile/me', userController.getUserById); // Will be handled by middleware to set req.params.id = req.user.id
router.put('/profile/me', userController.updateUser); // Will be handled by middleware to set req.params.id = req.user.id

module.exports = router;
