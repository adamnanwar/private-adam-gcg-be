const express = require('express');
const unitBidangController = require('./unit-bidang.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Unit Bidang Routes
router.get('/', unitBidangController.getAll);
router.get('/:id', unitBidangController.getById);
router.post('/', requireRole(['admin']), unitBidangController.create);
router.put('/:id', requireRole(['admin']), unitBidangController.update);
router.delete('/:id', requireRole(['admin']), unitBidangController.delete);
router.post('/sync', requireRole(['admin']), unitBidangController.syncFromLDAP);
router.get('/hierarchy', unitBidangController.getHierarchy);

module.exports = router;
