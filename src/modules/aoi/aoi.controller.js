/**
 * AOI Controller - Using only assessment_* tables
 */
const AOIService = require('./aoi.service');
const Joi = require('joi');

class AOIController {
  constructor(db) {
    this.service = new AOIService(db);
  }

  // Validation schemas
  createAOISchema = Joi.object({
    assessment_id: Joi.string().uuid().required(),
    target_type: Joi.string().valid('assessment_aspect', 'assessment_parameter', 'assessment_factor').required(),
    target_id: Joi.string().uuid().required(),
    recommendation: Joi.string().required().min(1).max(1000),
    due_date: Joi.date().optional().allow(null),
    status: Joi.string().valid('open', 'in_progress', 'completed', 'overdue').optional()
  });

  updateAOISchema = Joi.object({
    target_type: Joi.string().valid('assessment_aspect', 'assessment_parameter', 'assessment_factor').optional(),
    target_id: Joi.string().uuid().optional(),
    recommendation: Joi.string().optional().min(1).max(1000),
    due_date: Joi.date().optional().allow(null),
    status: Joi.string().valid('open', 'in_progress', 'completed', 'overdue').optional()
  });

  async getAllAOI(req, res) {
    try {
      const { page, limit, search, status, assessment_id } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100,
        search: search || '',
        status: status || '',
        assessment_id: assessment_id || ''
      };

      const result = await this.service.getAllAOI(options);
      
      res.json({
        status: 'success',
        data: result.data.map(aoi => aoi.toJSON()),
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getAOIById(req, res) {
    try {
      const { id } = req.params;
      const aoi = await this.service.getAOIById(id);
      
      res.json({
        status: 'success',
        data: aoi.toJSON()
      });
    } catch (error) {
      if (error.message === 'AOI not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async getAOIByAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const aois = await this.service.getAOIByAssessment(assessmentId);
      
      res.json({
        status: 'success',
        data: aois.map(aoi => aoi.toJSON())
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async createAOI(req, res) {
    try {
      const { error, value } = this.createAOISchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }

      // Add created_by from authenticated user
      const aoiData = {
        ...value,
        created_by: req.user.id
      };

      const aoi = await this.service.createAOI(aoiData);
      
      res.status(201).json({
        status: 'success',
        data: aoi.toJSON(),
        message: 'AOI created successfully'
      });
    } catch (error) {
      if (error.message.includes('Target ID does not exist')) {
        res.status(400).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async updateAOI(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = this.updateAOISchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }

      const aoi = await this.service.updateAOI(id, value);
      
      res.json({
        status: 'success',
        data: aoi.toJSON(),
        message: 'AOI updated successfully'
      });
    } catch (error) {
      if (error.message === 'AOI not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else if (error.message.includes('Target ID does not exist')) {
        res.status(400).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async deleteAOI(req, res) {
    try {
      const { id } = req.params;
      await this.service.deleteAOI(id);
      
      res.json({
        status: 'success',
        message: 'AOI deleted successfully'
      });
    } catch (error) {
      if (error.message === 'AOI not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async getAOIStats(req, res) {
    try {
      const stats = await this.service.getAOIStats();
      
      res.json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getAOIWithTargetDetails(req, res) {
    try {
      const { id } = req.params;
      const aoi = await this.service.getAOIWithTargetDetails(id);
      
      res.json({
        status: 'success',
        data: aoi.toResponse()
      });
    } catch (error) {
      if (error.message === 'AOI not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  /**
   * Get target options for AOI creation
   */
  async getTargetOptions(req, res) {
    try {
      const { assessmentId } = req.params;
      
      if (!assessmentId) {
        return res.status(400).json({
          status: 'error',
          message: 'Assessment ID is required'
        });
      }

      const options = await this.service.getTargetOptions(assessmentId);
      
      res.json({
        status: 'success',
        data: options,
        message: 'Target options retrieved successfully'
      });
    } catch (error) {
      this.logger.error('Error getting target options:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = AOIController;

