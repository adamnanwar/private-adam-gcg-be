const express = require('express');
const unitBidangController = require('./unit-bidang.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Unit Bidang Routes
// Static routes first (before :id parameter routes)
router.get('/hierarchy', unitBidangController.getHierarchy);
router.post('/sync', requireRole(['admin']), unitBidangController.syncFromLDAP);

// CRUD routes
router.get('/', unitBidangController.getAll);
router.post('/', requireRole(['admin']), unitBidangController.create);
router.get('/:id', unitBidangController.getById);
router.put('/:id', requireRole(['admin']), unitBidangController.update);
router.delete('/:id', requireRole(['admin']), unitBidangController.delete);

module.exports = router;
