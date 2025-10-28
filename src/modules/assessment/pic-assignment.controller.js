const picAssignmentService = require('./pic-assignment.service');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');
const Joi = require('joi');

// Validation schemas
const assignPICSchema = Joi.object({
  factor_assignments: Joi.array().items(Joi.object({
    factor_id: Joi.string().uuid().required(),
    pic_user_id: Joi.string().uuid().optional()
  })).min(1).required()
});

const updateStatusSchema = Joi.object({
  // PIC hanya boleh in_progress -> submitted -> (menunggu review)
  status: Joi.string().valid('in_progress', 'submitted', 'needs_revision').required()
});

class PICAssignmentController {
  /**
   * Assign PIC to assessment factors
   */
  async assignPIC(req, res) {
    try {
      const { assessmentId } = req.params;
      const { error, value } = assignPICSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const result = await picAssignmentService.assignPICToAssessment(assessmentId, value.factor_assignments);
      
      res.json(successResponse(result, 'PIC assigned successfully'));
    } catch (error) {
      logger.error('Error in assignPIC controller:', error);
      res.status(500).json(errorResponse('Failed to assign PIC', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get PIC assignments for an assessment
   */
  async getPICAssignments(req, res) {
    try {
      const { assessmentId } = req.params;
      const assignments = await picAssignmentService.getPICAssignments(assessmentId);
      
      res.json(successResponse(assignments, 'PIC assignments retrieved successfully'));
    } catch (error) {
      logger.error('Error in getPICAssignments controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve PIC assignments', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Get assessments assigned to a PIC user
   */
  async getPICAssessments(req, res) {
    try {
      const userId = req.user.id;
      const assessments = await picAssignmentService.getPICAssessments(userId);
      
      res.json(successResponse(assessments, 'PIC assessments retrieved successfully'));
    } catch (error) {
      logger.error('Error in getPICAssessments controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve PIC assessments', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(req, res) {
    try {
      const { assignmentId } = req.params;
      const { error, value } = updateStatusSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id;
      const result = await picAssignmentService.updateAssignmentStatus(assignmentId, value.status, userId);
      
      res.json(successResponse(result, 'Assignment status updated successfully'));
    } catch (error) {
      logger.error('Error in updateAssignmentStatus controller:', error);
      if (error.message === 'Assignment not found or unauthorized') {
        res.status(404).json(errorResponse('Assignment not found or unauthorized', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to update assignment status', 'INTERNAL_ERROR'));
      }
    }
  }
}

module.exports = new PICAssignmentController();
