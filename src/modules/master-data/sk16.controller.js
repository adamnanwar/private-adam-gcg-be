const sk16Service = require('./sk16.service');
const { successResponse, errorResponse } = require('../../utils/response');

class SK16Controller {
  /**
   * Get all SK16 assessments
   * GET /api/master-data/sk16
   */
  async getAllSK16Assessments(req, res) {
    try {
      const assessments = await sk16Service.getAllSK16Assessments();
      return successResponse(res, assessments, 'SK16 assessments retrieved successfully');
    } catch (error) {
      console.error('[SK16Controller] Error getting SK16 assessments:', error);
      return errorResponse(res, 'Failed to retrieve SK16 assessments', 500);
    }
  }

  /**
   * Get single SK16 assessment by ID
   * GET /api/master-data/sk16/:id
   */
  async getSK16AssessmentById(req, res) {
    try {
      const { id } = req.params;
      const assessment = await sk16Service.getSK16AssessmentById(id);
      return successResponse(res, assessment, 'SK16 assessment retrieved successfully');
    } catch (error) {
      console.error('[SK16Controller] Error getting SK16 assessment:', error);

      if (error.message === 'SK16 assessment not found') {
        return errorResponse(res, 'SK16 assessment not found', 404);
      }

      return errorResponse(res, 'Failed to retrieve SK16 assessment', 500);
    }
  }

  /**
   * Create new SK16 assessment
   * POST /api/master-data/sk16
   */
  async createSK16Assessment(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      const assessment = await sk16Service.createSK16Assessment(req.body, userId);
      return successResponse(res, assessment, 'SK16 assessment created successfully', 201);
    } catch (error) {
      console.error('[SK16Controller] Error creating SK16 assessment:', error);
      return errorResponse(res, 'Failed to create SK16 assessment: ' + error.message, 500);
    }
  }

  /**
   * Update SK16 assessment
   * PUT /api/master-data/sk16/:id
   */
  async updateSK16Assessment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      const assessment = await sk16Service.updateSK16Assessment(id, req.body, userId);
      return successResponse(res, assessment, 'SK16 assessment updated successfully');
    } catch (error) {
      console.error('[SK16Controller] Error updating SK16 assessment:', error);

      if (error.message === 'SK16 assessment not found') {
        return errorResponse(res, 'SK16 assessment not found', 404);
      }

      return errorResponse(res, 'Failed to update SK16 assessment: ' + error.message, 500);
    }
  }

  /**
   * Delete SK16 assessment
   * DELETE /api/master-data/sk16/:id
   */
  async deleteSK16Assessment(req, res) {
    try {
      const { id } = req.params;
      const result = await sk16Service.deleteSK16Assessment(id);
      return successResponse(res, result, 'SK16 assessment deleted successfully');
    } catch (error) {
      console.error('[SK16Controller] Error deleting SK16 assessment:', error);

      if (error.message === 'SK16 assessment not found') {
        return errorResponse(res, 'SK16 assessment not found', 404);
      }

      return errorResponse(res, 'Failed to delete SK16 assessment', 500);
    }
  }
}

module.exports = new SK16Controller();
