/**
 * Data Unit Routes
 */
const express = require('express');
const DataUnitController = require('./data-unit.controller');
const { authenticateToken, requireRole } = require('../../middlewares/auth');

const router = express.Router();

module.exports = function(db) {
  const controller = new DataUnitController(db);

  // Apply auth middleware to all routes
  router.use(authenticateToken);

  // GET /api/v1/data-units - Get all data units with pagination
  router.get('/', requireRole(['admin', 'assessor']), controller.getAllDataUnits.bind(controller));

  // GET /api/v1/data-units/active - Get active data units only
  router.get('/active', requireRole(['admin', 'assessor', 'viewer', 'pic']), controller.getActiveDataUnits.bind(controller));

  // GET /api/v1/data-units/:id - Get data unit by ID
  router.get('/:id', requireRole(['admin', 'assessor']), controller.getDataUnitById.bind(controller));

  // POST /api/v1/data-units - Create new data unit
  router.post('/', requireRole(['admin']), controller.createDataUnit.bind(controller));

  // PUT /api/v1/data-units/:id - Update data unit
  router.put('/:id', requireRole(['admin']), controller.updateDataUnit.bind(controller));

  // DELETE /api/v1/data-units/:id - Soft delete data unit
  router.delete('/:id', requireRole(['admin']), controller.deleteDataUnit.bind(controller));

  // DELETE /api/v1/data-units/:id/hard - Hard delete data unit (admin only)
  router.delete('/:id/hard', requireRole(['admin']), controller.hardDeleteDataUnit.bind(controller));

  return router;
};
