const aoiMonitoringService = require('./aoi-monitoring.service');
const Joi = require('joi');
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

// Validation schemas
const recommendationSchema = Joi.object({
  id: Joi.string().uuid().allow(null, ''),  // Allow id for update operations
  section: Joi.string().allow(null, ''),
  no: Joi.string().allow(null, ''),
  nomor_indikator: Joi.string().allow(null, ''),
  rekomendasi: Joi.string().required(),
  tindaklanjut_1: Joi.string().allow(null, ''),
  tindaklanjut_2: Joi.string().allow(null, ''),
  pic: Joi.string().allow(null, ''),
  sort: Joi.number().integer().min(0),
  evidence: Joi.any()  // Allow evidence array from frontend (ignored in service)
});

const createAOISchema = Joi.object({
  assessment_type: Joi.string().valid('SK16', 'PUGKI', 'ACGS').required(),
  title: Joi.string().required().min(3).max(500),
  year: Joi.number().integer().min(2000).max(2100),
  status: Joi.string().valid('draft', 'in_progress', 'proses_tindak_lanjut', 'verifikasi', 'selesai', 'published', 'archived'),
  notes: Joi.string().allow(null, ''),
  recommendations: Joi.array().items(recommendationSchema)
});

const updateAOISchema = Joi.object({
  title: Joi.string().min(3).max(500),
  year: Joi.number().integer().min(2000).max(2100),
  status: Joi.string().valid('draft', 'in_progress', 'proses_tindak_lanjut', 'verifikasi', 'selesai', 'published', 'archived'),
  notes: Joi.string().allow(null, ''),
  recommendations: Joi.array().items(recommendationSchema)
});

class AOIMonitoringController {
  /**
   * Get all AOI by type (SK16, PUGKI, or ACGS)
   */
  async getAllByType(req, res) {
    try {
      const { assessmentType } = req.params;
      const { page = 1, limit = 10, search = '', year, status } = req.query;

      // Validate assessment type
      if (!['SK16', 'PUGKI', 'ACGS'].includes(assessmentType.toUpperCase())) {
        return res.status(400).json(errorResponse('Invalid assessment type', 'INVALID_TYPE'));
      }

      const filters = {
        search,
        year: year ? parseInt(year) : undefined,
        status
      };

      const result = await aoiMonitoringService.getAllByType(
        assessmentType.toUpperCase(),
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        `AOI ${assessmentType} retrieved successfully`
      ));
    } catch (error) {
      logger.error(`Error in getAllByType controller (${req.params.assessmentType}):`, error);
      res.status(500).json(errorResponse('Failed to retrieve AOI monitoring', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get AOI monitoring by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const aoi = await aoiMonitoringService.getById(id);

      if (!aoi) {
        return res.status(404).json(errorResponse('AOI monitoring not found', 'NOT_FOUND'));
      }

      res.json(successResponse(aoi, 'AOI monitoring retrieved successfully'));
    } catch (error) {
      logger.error('Error in getById controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve AOI monitoring', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Create new AOI monitoring
   */
  async create(req, res) {
    try {
      const { error, value } = createAOISchema.validate(req.body);

      if (error) {
        return res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR', error.details));
      }

      const aoi = await aoiMonitoringService.create(value, req.user.id);

      res.status(201).json(successResponse(aoi, 'AOI monitoring created successfully'));
    } catch (error) {
      logger.error('Error in create controller:', error);
      res.status(500).json(errorResponse('Failed to create AOI monitoring', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update AOI monitoring
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateAOISchema.validate(req.body);

      if (error) {
        return res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR', error.details));
      }

      const aoi = await aoiMonitoringService.update(id, value, req.user.id);

      if (!aoi) {
        return res.status(404).json(errorResponse('AOI monitoring not found', 'NOT_FOUND'));
      }

      res.json(successResponse(aoi, 'AOI monitoring updated successfully'));
    } catch (error) {
      logger.error('Error in update controller:', error);
      res.status(500).json(errorResponse('Failed to update AOI monitoring', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Delete AOI monitoring (soft delete)
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const deleted = await aoiMonitoringService.delete(id);

      if (!deleted) {
        return res.status(404).json(errorResponse('AOI monitoring not found', 'NOT_FOUND'));
      }

      res.json(successResponse(null, 'AOI monitoring deleted successfully'));
    } catch (error) {
      logger.error('Error in delete controller:', error);
      res.status(500).json(errorResponse('Failed to delete AOI monitoring', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get statistics by type
   */
  async getStatsByType(req, res) {
    try {
      const { assessmentType } = req.params;

      // Validate assessment type
      if (!['SK16', 'PUGKI', 'ACGS'].includes(assessmentType.toUpperCase())) {
        return res.status(400).json(errorResponse('Invalid assessment type', 'INVALID_TYPE'));
      }

      const stats = await aoiMonitoringService.getStatsByType(assessmentType.toUpperCase());

      res.json(successResponse(stats, `AOI ${assessmentType} statistics retrieved successfully`));
    } catch (error) {
      logger.error(`Error in getStatsByType controller (${req.params.assessmentType}):`, error);
      res.status(500).json(errorResponse('Failed to retrieve statistics', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get settings by assessment type
   */
  async getSettings(req, res) {
    try {
      const { assessmentType } = req.params;

      // Validate assessment type
      if (!['SK16', 'PUGKI', 'ACGS'].includes(assessmentType.toUpperCase())) {
        return res.status(400).json(errorResponse('Invalid assessment type', 'INVALID_TYPE'));
      }

      const settings = await aoiMonitoringService.getSettings(assessmentType.toUpperCase());

      res.json(successResponse(settings, 'Settings retrieved successfully'));
    } catch (error) {
      logger.error(`Error in getSettings controller (${req.params.assessmentType}):`, error);
      res.status(500).json(errorResponse('Failed to retrieve settings', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update settings by assessment type
   */
  async updateSettings(req, res) {
    try {
      const { assessmentType } = req.params;
      const { min_score_threshold, auto_generate_enabled } = req.body;

      // Validate assessment type
      if (!['SK16', 'PUGKI', 'ACGS'].includes(assessmentType.toUpperCase())) {
        return res.status(400).json(errorResponse('Invalid assessment type', 'INVALID_TYPE'));
      }

      // Validate threshold
      if (min_score_threshold !== undefined) {
        if (typeof min_score_threshold !== 'number' || min_score_threshold < 0 || min_score_threshold > 100) {
          return res.status(400).json(errorResponse('min_score_threshold must be between 0 and 100', 'INVALID_INPUT'));
        }
      }

      const settings = await aoiMonitoringService.updateSettings(
        assessmentType.toUpperCase(),
        { min_score_threshold, auto_generate_enabled }
      );

      res.json(successResponse(settings, 'Settings updated successfully'));
    } catch (error) {
      logger.error(`Error in updateSettings controller (${req.params.assessmentType}):`, error);
      res.status(500).json(errorResponse('Failed to update settings', 'INTERNAL_ERROR'));
    }
  }
}

const aoiMonitoringController = new AOIMonitoringController();

module.exports = {
  getAllByType: aoiMonitoringController.getAllByType.bind(aoiMonitoringController),
  getById: aoiMonitoringController.getById.bind(aoiMonitoringController),
  create: aoiMonitoringController.create.bind(aoiMonitoringController),
  update: aoiMonitoringController.update.bind(aoiMonitoringController),
  delete: aoiMonitoringController.delete.bind(aoiMonitoringController),
  getStatsByType: aoiMonitoringController.getStatsByType.bind(aoiMonitoringController),
  getSettings: aoiMonitoringController.getSettings.bind(aoiMonitoringController),
  updateSettings: aoiMonitoringController.updateSettings.bind(aoiMonitoringController)
};
