const express = require('express');
const userController = require('./user.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// User management routes (admin only)
router.get('/', requireRole(['admin']), userController.getAllUsers);
router.get('/stats', requireRole(['admin']), userController.getUserStats);
router.get('/:id', requireRole(['admin']), userController.getUserById);
router.post('/', requireRole(['admin']), userController.createUser);
router.put('/:id', requireRole(['admin']), userController.updateUser);
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

module.exports = router;





