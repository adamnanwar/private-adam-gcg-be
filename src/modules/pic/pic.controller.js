/**
 * PIC (Person In Charge) Controller
 */
const PICService = require('./pic.service');
const Joi = require('joi');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

class PICController {
  constructor() {
    this.service = new PICService();
  }

  // Validation schemas
  assignPICSchema = Joi.object({
    target_type: Joi.string().valid('factor', 'parameter').required(),
    target_id: Joi.string().uuid().required(),
    unit_bidang_id: Joi.string().uuid().required()
  });

  bulkAssignSchema = Joi.object({
    assignments: Joi.array().items(Joi.object({
      target_type: Joi.string().valid('factor', 'parameter').required(),
      target_id: Joi.string().uuid().required(),
      unit_bidang_id: Joi.string().uuid().required()
    })).required()
  });

  /**
   * Assign PIC to a target
   */
  async assignPIC(req, res) {
    try {
      const { assessmentId } = req.params;
      const { error, value } = this.assignPICSchema.validate(req.body);
      if (error) {
        return res.status(400).json(errorResponse(
          'Validation error',
          'VALIDATION_ERROR',
          error.details.map(detail => detail.message)
        ));
      }

      const { target_type, target_id, unit_bidang_id } = value;
      const assignment = await this.service.assignPIC(assessmentId, target_type, target_id, unit_bidang_id, req.user.id);

      return res.status(201).json(successResponse(
        assignment,
        'PIC assigned successfully'
      ));

    } catch (error) {
      logger.error('Error in assignPIC controller:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(error.message, 'NOT_FOUND'));
      }
      if (error.message.includes('Invalid target type')) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }

      return res.status(500).json(errorResponse('Failed to assign PIC', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Remove PIC assignment
   */
  async removePIC(req, res) {
    try {
      const { assessmentId, target_type, target_id } = req.params;

      if (!['factor', 'parameter'].includes(target_type)) {
        return res.status(400).json(errorResponse('Invalid target type', 'VALIDATION_ERROR'));
      }

      await this.service.removePIC(assessmentId, target_type, target_id);

      return res.json(successResponse(null, 'PIC assignment removed successfully'));

    } catch (error) {
      logger.error('Error in removePIC controller:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json(errorResponse(error.message, 'NOT_FOUND'));
      }

      return res.status(500).json(errorResponse('Failed to remove PIC assignment', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get PIC assignment for a target
   */
  async getPICAssignment(req, res) {
    try {
      const { assessmentId, target_type, target_id } = req.params;

      if (!['factor', 'parameter'].includes(target_type)) {
        return res.status(400).json(errorResponse('Invalid target type', 'VALIDATION_ERROR'));
      }

      const assignment = await this.service.getPICAssignment(assessmentId, target_type, target_id);

      if (!assignment) {
        return res.status(404).json(errorResponse('PIC assignment not found', 'NOT_FOUND'));
      }

      return res.json(successResponse(assignment, 'PIC assignment retrieved successfully'));

    } catch (error) {
      logger.error('Error in getPICAssignment controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve PIC assignment', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get all PIC assignments for an assessment
   */
  async getPICAssignmentsByAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const assignments = await this.service.getPICAssignmentsByAssessment(assessmentId);

      return res.json(successResponse(assignments, 'PIC assignments retrieved successfully'));

    } catch (error) {
      logger.error('Error in getPICAssignmentsByAssessment controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve PIC assignments', 'INTERNAL_ERROR'));
    }
  }

  async getPICAssignments(req, res) {
    try {
      const userId = req.user.id;
      const assignments = await this.service.getUserPICAssignments(userId);

      return res.json(successResponse(assignments, 'PIC assignments retrieved successfully'));
    } catch (error) {
      logger.error('Error in getPICAssignments controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve PIC assignments', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get PIC assignments for a unit bidang
   */
  async getPICAssignmentsByUnit(req, res) {
    try {
      const { unitBidangId } = req.params;
      const assignments = await this.service.getPICAssignmentsByUnit(unitBidangId);

      return res.json(successResponse(assignments, 'PIC assignments retrieved successfully'));

    } catch (error) {
      logger.error('Error in getPICAssignmentsByUnit controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve PIC assignments', 'INTERNAL_ERROR'));
    }
  }

  async getUnitPicSummary(req, res) {
    try {
      const summary = await this.service.getUnitPicSummary();
      return res.json(successResponse(summary, 'Unit PIC summary retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUnitPicSummary controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve unit PIC summary', 'INTERNAL_ERROR'));
    }
  }

  async getUsersByUnit(req, res) {
    try {
      const { unitBidangId } = req.params;
      const users = await this.service.getUsersByUnit(unitBidangId);
      return res.json(successResponse(users, 'Unit users retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUsersByUnit controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve unit users', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get users without unit bidang assignment (unassigned users)
   */
  async getUnassignedUsers(req, res) {
    try {
      const { search } = req.query;
      const users = await this.service.getUnassignedUsers(search);
      return res.json(successResponse(users, 'Unassigned users retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUnassignedUsers controller:', error);
      return res.status(500).json(errorResponse('Failed to retrieve unassigned users', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Bulk assign PICs
   */
  async bulkAssignPICs(req, res) {
    try {
      const { assessmentId } = req.params;
      const { error, value } = this.bulkAssignSchema.validate(req.body);

      if (error) {
        return res.status(400).json(errorResponse(
          'Validation error',
          'VALIDATION_ERROR',
          error.details.map(detail => detail.message)
        ));
      }

      const results = await this.service.bulkAssignPICs(assessmentId, value.assignments, req.user.id);

      return res.json(successResponse(results, 'PICs assigned successfully'));

    } catch (error) {
      logger.error('Error in bulkAssignPICs controller:', error);
      return res.status(500).json(errorResponse('Failed to assign PICs', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Send email notifications for PIC assignments
   */
  async sendAssignmentNotifications(req, res) {
    try {
      const { assessmentId } = req.params;
      const notificationService = require('./pic-notification.service');

      const result = await notificationService.sendAssessmentPICNotifications(assessmentId);

      if (result.success) {
        return res.json(successResponse(result, 'Notifications sent successfully'));
      } else {
        return res.status(500).json(errorResponse(result.error || 'Failed to send notifications', 'EMAIL_ERROR'));
      }

    } catch (error) {
      logger.error('Error sending PIC notifications:', error);
      return res.status(500).json(errorResponse('Failed to send notifications', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = PICController;
