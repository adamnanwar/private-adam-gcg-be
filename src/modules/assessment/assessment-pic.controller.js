const assessmentPICService = require('./assessment-pic.service');
const logger = require('../../utils/logger-simple');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');

class AssessmentPICController {
  // Assign PIC to assessment
  async assignPIC(req, res) {
    try {
      const { assessmentId } = req.params;
      const { factorId, picUserId, unitBidang } = req.body;

      if (!factorId || !picUserId || !unitBidang) {
        return res.status(400).json(errorResponse('factorId, picUserId, and unitBidang are required', 'VALIDATION_ERROR'));
      }

      const assignment = await assessmentPICService.assignPICToAssessment(assessmentId, factorId, picUserId, unitBidang);
      
      res.json(successResponse(assignment, 'PIC assigned successfully'));
    } catch (error) {
      logger.error('Error in assignPIC controller:', error);
      res.status(500).json(errorResponse('Failed to assign PIC', 'INTERNAL_ERROR'));
    }
  }

  // Get PIC assignments for assessment
  async getPICAssignments(req, res) {
    try {
      const { assessmentId } = req.params;
      const assignments = await assessmentPICService.getPICAssignments(assessmentId);
      
      res.json(successResponse(assignments, 'PIC assignments retrieved successfully'));
    } catch (error) {
      logger.error('Error in getPICAssignments controller:', error);
      res.status(500).json(errorResponse('Failed to get PIC assignments', 'INTERNAL_ERROR'));
    }
  }

  // Request revision
  async requestRevision(req, res) {
    try {
      const { assessmentId } = req.params;
      const { revisionReason } = req.body;
      const requestedBy = req.user.id;

      if (!revisionReason || revisionReason.trim() === '') {
        return res.status(400).json(errorResponse('Revision reason is required', 'VALIDATION_ERROR'));
      }

      const revision = await assessmentPICService.requestRevision(assessmentId, requestedBy, revisionReason);
      
      res.json(successResponse(revision, 'Revision requested successfully'));
    } catch (error) {
      logger.error('Error in requestRevision controller:', error);
      res.status(500).json(errorResponse('Failed to request revision', 'INTERNAL_ERROR'));
    }
  }

  // Complete revision
  async completeRevision(req, res) {
    try {
      const { assessmentId, revisionId } = req.params;
      await assessmentPICService.completeRevision(revisionId, assessmentId);
      
      res.json(successResponse(null, 'Revision completed successfully'));
    } catch (error) {
      logger.error('Error in completeRevision controller:', error);
      res.status(500).json(errorResponse('Failed to complete revision', 'INTERNAL_ERROR'));
    }
  }

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;
      
      const notifications = await assessmentPICService.getUserNotifications(userId, parseInt(limit), parseInt(offset));
      
      res.json(successResponse(notifications, 'Notifications retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUserNotifications controller:', error);
      res.status(500).json(errorResponse('Failed to get notifications', 'INTERNAL_ERROR'));
    }
  }

  // Mark notification as read
  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      await assessmentPICService.markNotificationAsRead(notificationId, userId);
      
      res.json(successResponse(null, 'Notification marked as read'));
    } catch (error) {
      logger.error('Error in markNotificationAsRead controller:', error);
      res.status(500).json(errorResponse('Failed to mark notification as read', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new AssessmentPICController();
