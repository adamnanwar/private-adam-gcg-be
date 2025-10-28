/**
 * AOI Controller - Using only assessment_* tables
 */
const AOIService = require('./aoi.service');
const Joi = require('joi');
const logger = require('../../utils/logger');

class AOIController {
  constructor() {
    this.service = AOIService;
  }

  // Validation schemas
  createAOISchema = Joi.object({
    assessment_id: Joi.string().uuid().required(),
    target_type: Joi.string().valid('parameter', 'factor').required(),
    target_id: Joi.string().uuid().required(),
    recommendation: Joi.string().required().min(1).max(1000),
    due_date: Joi.date().optional().allow(null),
    status: Joi.string().valid('open', 'in_progress', 'completed', 'overdue').optional()
  });

  updateAOISchema = Joi.object({
    target_type: Joi.string().valid('parameter', 'factor').optional(),
    target_id: Joi.string().uuid().optional(),
    recommendation: Joi.string().optional().min(1).max(1000),
    due_date: Joi.date().optional().allow(null),
    status: Joi.string().valid('open', 'in_progress', 'completed', 'overdue').optional()
  });

  async getAllAOI(req, res) {
    try {
      const { page, limit, search, status, assessment_id } = req.query;

      // Get user's unit ID for filtering (only for non-admin users)
      let userUnitId = null;
      if (req.user.role !== 'admin' && req.user.unit_bidang_id) {
        userUnitId = req.user.unit_bidang_id;
      }

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100,
        search: search || '',
        status: status || '',
        assessment_id: assessment_id || '',
        userUnitId: userUnitId,
        userId: req.user.id,
        isAdmin: req.user.role === 'admin'
      };

      const result = await this.service.getAllAOI(options);

      res.json({
        status: 'success',
        data: result.data.map(aoi => aoi.toJSON()),
        pagination: result.pagination
      });
    } catch (error) {
      console.error('❌ AOI getAllAOI error:', error);
      logger.error('AOI getAllAOI error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getAOIById(req, res) {
    try {
      const { id } = req.params;
      const aoi = await this.service.getAOIById(id, req.user);
      
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
      const aois = await this.service.getAOIByAssessment(assessmentId, req.user);
      
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

      const aoi = await this.service.createAOI(aoiData, req.user);
      
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

      const aoi = await this.service.updateAOI(id, value, req.user);
      
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
      await this.service.deleteAOI(id, req.user);
      
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
      const aoi = await this.service.getAOIWithTargetDetails(id, req.user);
      
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

      const options = await this.service.getTargetOptions(assessmentId, req.user);
      
      res.json({
        status: 'success',
        data: options,
        message: 'Target options retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting target options:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Assign PIC to AOI
   */
  async assignPICToAOI(req, res) {
    try {
      const { id } = req.params;
      const { pic_user_id } = req.body;

      if (!pic_user_id) {
        return res.status(400).json({
          status: 'error',
          message: 'PIC user ID is required'
        });
      }

      const result = await this.service.assignPICToAOI(id, pic_user_id, req.user);
      
      res.json({
        status: 'success',
        data: result,
        message: 'PIC assigned successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Get PIC assignments for AOI
   */
  async getPICAssignments(req, res) {
    try {
      const { id } = req.params;
      const assignments = await this.service.getPICAssignments(id, req.user);
      
      res.json({
        status: 'success',
        data: assignments,
        message: 'PIC assignments retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;
      
      const notifications = await this.service.getUserNotifications(userId, parseInt(limit), parseInt(offset));
      
      res.json({
        status: 'success',
        data: notifications,
        message: 'Notifications retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      await this.service.markNotificationAsRead(notificationId, userId);
      
      res.json({
        status: 'success',
        message: 'Notification marked as read'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = AOIController;

