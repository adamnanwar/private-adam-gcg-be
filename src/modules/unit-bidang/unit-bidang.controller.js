const unitBidangService = require('./unit-bidang.service');
const { success, error } = require('../../utils/response');
const logger = require('../../utils/logger-simple');

class UnitBidangController {
  /**
   * Get all unit bidang
   */
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search = '', is_active } = req.query;
      
      const result = await unitBidangService.getAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      });

      return success(res, result, 'Unit bidang retrieved successfully');
    } catch (err) {
      logger.error('Get all unit bidang error:', err);
      return error(res, err.message, 500);
    }
  }

  /**
   * Get unit bidang by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const unitBidang = await unitBidangService.getById(id);

      if (!unitBidang) {
        return error(res, 'Unit bidang not found', 404);
      }

      return success(res, unitBidang, 'Unit bidang retrieved successfully');
    } catch (err) {
      logger.error('Get unit bidang by ID error:', err);
      return error(res, err.message, 500);
    }
  }

  /**
   * Create new unit bidang
   */
  async create(req, res) {
    try {
      const unitBidang = await unitBidangService.create(req.body);
      return success(res, unitBidang, 'Unit bidang created successfully', 201);
    } catch (err) {
      logger.error('Create unit bidang error:', err);
      return error(res, err.message, 400);
    }
  }

  /**
   * Update unit bidang
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const unitBidang = await unitBidangService.update(id, req.body);

      if (!unitBidang) {
        return error(res, 'Unit bidang not found', 404);
      }

      return success(res, unitBidang, 'Unit bidang updated successfully');
    } catch (err) {
      logger.error('Update unit bidang error:', err);
      return error(res, err.message, 400);
    }
  }

  /**
   * Delete unit bidang
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await unitBidangService.delete(id);

      if (!result) {
        return error(res, 'Unit bidang not found', 404);
      }

      return success(res, null, 'Unit bidang deleted successfully');
    } catch (err) {
      logger.error('Delete unit bidang error:', err);
      return error(res, err.message, 500);
    }
  }

  /**
   * Sync unit bidang from LDAP
   */
  async syncFromLDAP(req, res) {
    try {
      const result = await unitBidangService.syncFromLDAP();
      return success(res, result, 'Unit bidang synchronized from LDAP successfully');
    } catch (err) {
      logger.error('Sync unit bidang from LDAP error:', err);
      return error(res, err.message, 500);
    }
  }

  /**
   * Get unit hierarchy
   */
  async getHierarchy(req, res) {
    try {
      const hierarchy = await unitBidangService.getHierarchy();
      return success(res, hierarchy, 'Unit bidang hierarchy retrieved successfully');
    } catch (err) {
      logger.error('Get unit bidang hierarchy error:', err);
      return error(res, err.message, 500);
    }
  }
}

module.exports = new UnitBidangController();