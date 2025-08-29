const assessmentRepository = require('./assessment.repository');
const dictionaryRepository = require('../dictionary/dictionary.repository');
const logger = require('../../utils/logger');
const { ASSESSMENT_STATUS } = require('./assessment.entity');

class AssessmentService {
  constructor() {
    this.repository = assessmentRepository;
    this.dictionaryRepository = dictionaryRepository;
  }

  // Assessment Services
  async getAllAssessments(page = 1, limit = 50, search = '', status = '', assessorId = '') {
    try {
      const offset = (page - 1) * limit;
      const [assessments, total] = await Promise.all([
        this.repository.findAllAssessments(limit, offset, search, status, assessorId),
        this.repository.countAssessments(search, status, assessorId)
      ]);

      return {
        data: assessments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getAllAssessments service:', error);
      throw error;
    }
  }

  async getAssessmentById(id) {
    try {
      const assessment = await this.repository.findAssessmentById(id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      return assessment;
    } catch (error) {
      logger.error('Error in getAssessmentById service:', error);
      throw error;
    }
  }

  async createAssessment(assessmentData, userId) {
    try {
      // Validate required fields
      if (!assessmentData.organization_name || !assessmentData.assessment_date) {
        throw new Error('Organization name and assessment date are required');
      }

      // Set default values
      const assessment = {
        ...assessmentData,
        assessor_id: assessmentData.assessor_id || userId,
        status: assessmentData.status || ASSESSMENT_STATUS.DRAFT,
        notes: assessmentData.notes || '',
        kka_id: null // Remove kka_id requirement for manual entry
      };

      const createdAssessment = await this.repository.createAssessment(assessment);
      logger.info(`Assessment created: ${createdAssessment.id} by user: ${userId}`);
      return createdAssessment;
    } catch (error) {
      logger.error('Error in createAssessment service:', error);
      throw error;
    }
  }

  async updateAssessment(id, assessmentData, userId) {
    try {
      // Check if assessment exists
      const existingAssessment = await this.repository.findAssessmentById(id);
      if (!existingAssessment) {
        throw new Error('Assessment not found');
      }

      // Check if user has permission to update
      if (existingAssessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You can only update your own assessments');
      }

      // Prevent status changes to completed/reviewed if not admin
      if (assessmentData.status && 
          [ASSESSMENT_STATUS.COMPLETED, ASSESSMENT_STATUS.REVIEWED].includes(assessmentData.status) &&
          !this._hasAdminRole(userId)) {
        throw new Error('Only admins can set assessment status to completed or reviewed');
      }

      const assessment = await this.repository.updateAssessment(id, assessmentData);
      logger.info(`Assessment updated: ${id} by user: ${userId}`);
      return assessment;
    } catch (error) {
      logger.error('Error in updateAssessment service:', error);
      throw error;
    }
  }

  async deleteAssessment(id, userId) {
    try {
      // Check if assessment exists
      const existingAssessment = await this.repository.findAssessmentById(id);
      if (!existingAssessment) {
        throw new Error('Assessment not found');
      }

      // Check if user has permission to delete
      if (existingAssessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You can only delete your own assessments');
      }

      const result = await this.repository.deleteAssessment(id);
      if (!result) {
        throw new Error('Assessment not found or cannot be deleted');
      }
      
      logger.info(`Assessment deleted: ${id} by user: ${userId}`);
      return { success: true, message: 'Assessment deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteAssessment service:', error);
      throw error;
    }
  }

  // Response Services
  async getAssessmentResponses(assessmentId, userId) {
    try {
      // Check if assessment exists
      const assessment = await this.repository.findAssessmentById(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Check if user has access to this assessment
      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this assessment');
      }

      const responses = await this.repository.findResponsesByAssessment(assessmentId);
      return responses;
    } catch (error) {
      logger.error('Error in getAssessmentResponses service:', error);
      throw error;
    }
  }

  async createResponse(responseData, userId) {
    try {
      // Validate required fields
      if (!responseData.assessment_id || !responseData.factor_id || responseData.score === undefined) {
        throw new Error('Assessment ID, factor ID, and score are required');
      }

      // Check if assessment exists and user has access
      const assessment = await this.repository.findAssessmentById(responseData.assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this assessment');
      }

      // Check if factor exists
      const factor = await this.dictionaryRepository.findFactorById(responseData.factor_id);
      if (!factor) {
        throw new Error('Factor not found');
      }

      // Validate score
      if (responseData.score < 0 || responseData.score > factor.max_score) {
        throw new Error(`Score must be between 0 and ${factor.max_score}`);
      }

      // Check if response already exists
      const existingResponse = await this.repository.findResponseByAssessmentAndFactor(
        responseData.assessment_id,
        responseData.factor_id
      );

      if (existingResponse) {
        throw new Error('Response for this factor already exists in this assessment');
      }

      const response = await this.repository.createResponse({
        ...responseData,
        created_by: userId
      });

      logger.info(`Response created: ${response.id} by user: ${userId}`);
      return response;
    } catch (error) {
      logger.error('Error in createResponse service:', error);
      throw error;
    }
  }

  async updateResponse(id, responseData, userId) {
    try {
      // Check if response exists
      const existingResponse = await this.repository.findResponseById(id);
      if (!existingResponse) {
        throw new Error('Response not found');
      }

      // Check if user has access to this response
      const assessment = await this.repository.findAssessmentById(existingResponse.assessment_id);
      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this response');
      }

      // Check if factor exists for score validation
      if (responseData.score !== undefined) {
        const factor = await this.dictionaryRepository.findFactorById(existingResponse.factor_id);
        if (factor && (responseData.score < 0 || responseData.score > factor.max_score)) {
          throw new Error(`Score must be between 0 and ${factor.max_score}`);
        }
      }

      const response = await this.repository.updateResponse(id, responseData);
      logger.info(`Response updated: ${id} by user: ${userId}`);
      return response;
    } catch (error) {
      logger.error('Error in updateResponse service:', error);
      throw error;
    }
  }

  async deleteResponse(id, userId) {
    try {
      // Check if response exists
      const existingResponse = await this.repository.findResponseById(id);
      if (!existingResponse) {
        throw new Error('Response not found');
      }

      // Check if user has access to this response
      const assessment = await this.repository.findAssessmentById(existingResponse.assessment_id);
      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this response');
      }

      const result = await this.repository.deleteResponse(id);
      if (!result) {
        throw new Error('Response not found or cannot be deleted');
      }
      
      logger.info(`Response deleted: ${id} by user: ${userId}`);
      return { success: true, message: 'Response deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteResponse service:', error);
      throw error;
    }
  }

  // Bulk Response Services
  async bulkUpsertResponses(assessmentId, responses, userId) {
    try {
      // Check if assessment exists and user has access
      const assessment = await this.repository.findAssessmentById(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this assessment');
      }

      // Validate responses
      if (!Array.isArray(responses) || responses.length === 0) {
        throw new Error('Responses must be a non-empty array');
      }

      // Validate each response
      for (const response of responses) {
        if (!response.factor_id || response.score === undefined) {
          throw new Error('Each response must have factor_id and score');
        }

        // Check if factor exists
        const factor = await this.dictionaryRepository.findFactorById(response.factor_id);
        if (!factor) {
          throw new Error(`Factor not found: ${response.factor_id}`);
        }

        // Validate score
        if (response.score < 0 || response.score > factor.max_score) {
          throw new Error(`Score for factor ${response.factor_id} must be between 0 and ${factor.max_score}`);
        }
      }

      // Process responses
      const results = await this.repository.bulkUpsertResponses(assessmentId, responses.map(r => ({
        ...r,
        created_by: userId
      })));

      logger.info(`Bulk responses processed for assessment: ${assessmentId} by user: ${userId}`);
      return results;
    } catch (error) {
      logger.error('Error in bulkUpsertResponses service:', error);
      throw error;
    }
  }

  // Assessment Results Services
  async getAssessmentResults(assessmentId, userId) {
    try {
      // Check if assessment exists and user has access
      const assessment = await this.repository.findAssessmentById(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You do not have access to this assessment');
      }

      const results = await this.repository.calculateAssessmentResults(assessmentId);
      return results;
    } catch (error) {
      logger.error('Error in getAssessmentResults service:', error);
      throw error;
    }
  }

  async getAssessmentWithResults(assessmentId, userId) {
    try {
      // Get assessment details
      const assessment = await this.getAssessmentById(assessmentId);
      
      // Get assessment results
      const results = await this.getAssessmentResults(assessmentId, userId);
      
      // Get responses for detailed view
      const responses = await this.getAssessmentResponses(assessmentId, userId);
      
      return {
        assessment,
        results,
        responses
      };
    } catch (error) {
      logger.error('Error in getAssessmentWithResults service:', error);
      throw error;
    }
  }

  // Assessment Status Management
  async updateAssessmentStatus(id, status, userId) {
    try {
      // Check if assessment exists
      const existingAssessment = await this.repository.findAssessmentById(id);
      if (!existingAssessment) {
        throw new Error('Assessment not found');
      }

      // Only admins can change status to completed or reviewed
      if ([ASSESSMENT_STATUS.COMPLETED, ASSESSMENT_STATUS.REVIEWED].includes(status) &&
          !this._hasAdminRole(userId)) {
        throw new Error('Only admins can set assessment status to completed or reviewed');
      }

      // Validate status transition
      if (!this._isValidStatusTransition(existingAssessment.status, status)) {
        throw new Error(`Invalid status transition from ${existingAssessment.status} to ${status}`);
      }

      const assessment = await this.repository.updateAssessment(id, { status });
      logger.info(`Assessment status updated: ${id} to ${status} by user: ${userId}`);
      return assessment;
    } catch (error) {
      logger.error('Error in updateAssessmentStatus service:', error);
      throw error;
    }
  }

  // Assessment Statistics
  async getAssessmentStats(userId) {
    try {
      // If user is not admin, only show their own stats
      const assessorId = this._hasAdminRole(userId) ? '' : userId;
      const stats = await this.repository.getAssessmentStats(assessorId);
      return stats;
    } catch (error) {
      logger.error('Error in getAssessmentStats service:', error);
      throw error;
    }
  }

  // Helper Methods
  _hasAdminRole(userId) {
    // This should be implemented based on your user role system
    // For now, we'll assume all users can manage their own assessments
    // You can implement role checking here
    return false;
  }

  _isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [ASSESSMENT_STATUS.DRAFT]: [ASSESSMENT_STATUS.IN_PROGRESS, ASSESSMENT_STATUS.COMPLETED],
      [ASSESSMENT_STATUS.IN_PROGRESS]: [ASSESSMENT_STATUS.COMPLETED, ASSESSMENT_STATUS.DRAFT],
      [ASSESSMENT_STATUS.COMPLETED]: [ASSESSMENT_STATUS.REVIEWED, ASSESSMENT_STATUS.IN_PROGRESS],
      [ASSESSMENT_STATUS.REVIEWED]: [ASSESSMENT_STATUS.COMPLETED]
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Assessment Template Services
  async createAssessmentFromTemplate(templateData, userId) {
    try {
      // Get the full hierarchy to create assessment structure
      const hierarchy = await this.dictionaryRepository.getFullHierarchy();
      
      if (!hierarchy || hierarchy.length === 0) {
        throw new Error('No dictionary hierarchy found. Please set up KKA, aspects, parameters, and factors first.');
      }

      // Create assessment
      const assessment = await this.createAssessment({
        organization_name: templateData.organization_name,
        assessment_date: templateData.assessment_date || new Date(),
        notes: templateData.notes || 'Assessment created from template'
      }, userId);

      // Create empty responses for all factors
      const responses = [];
      hierarchy.forEach(kka => {
        kka.aspects.forEach(aspect => {
          aspect.parameters.forEach(parameter => {
            parameter.factors.forEach(factor => {
              responses.push({
                factor_id: factor.id,
                score: 0, // Default score
                comment: ''
              });
            });
          });
        });
      });

      // Bulk create responses
      if (responses.length > 0) {
        await this.bulkUpsertResponses(assessment.id, responses, userId);
      }

      logger.info(`Assessment created from template: ${assessment.id} by user: ${userId}`);
      return assessment;
    } catch (error) {
      logger.error('Error in createAssessmentFromTemplate service:', error);
      throw error;
    }
  }

  // Get Assessment with AOI data
  async getAssessmentWithAOI(assessmentId, userId) {
    try {
      const assessment = await this.getAssessmentById(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Check if user has access to this assessment
      if (assessment.assessor_id !== userId && !this._hasAdminRole(userId)) {
        throw new Error('You can only view your own assessments');
      }

      // Get AOI data for this assessment
      let aoiData = [];
      try {
        const aoiService = require('../aoi/aoi.service');
        const aoiServiceInstance = new aoiService(this.repository.db);
        aoiData = await aoiServiceInstance.getAOIByAssessment(assessmentId);
      } catch (aoiError) {
        logger.warn('Could not fetch AOI data:', aoiError.message);
        // Continue without AOI data
      }

      // Get assessment results with scoring
      const results = await this.getAssessmentResults(assessmentId, userId);

      return {
        ...assessment,
        aoi: aoiData,
        results: results
      };
    } catch (error) {
      logger.error('Error in getAssessmentWithAOI service:', error);
      throw error;
    }
  }

  // Get Assessment Summary for Dashboard
  async getAssessmentSummary(userId) {
    try {
      const assessments = await this.getAllAssessments(1, 10, '', '', userId);
      const stats = await this.getAssessmentStats(userId);
      
      // Get recent AOI data
      let recentAOI = [];
      try {
        const aoiService = require('../aoi/aoi.service');
        const aoiServiceInstance = new aoiService(this.repository.db);
        const aoiStats = await aoiServiceInstance.getAOIStatistics();
        recentAOI = aoiStats;
      } catch (aoiError) {
        logger.warn('Could not fetch AOI statistics:', aoiError.message);
      }

      return {
        recent_assessments: assessments.data,
        statistics: stats,
        aoi_summary: recentAOI
      };
    } catch (error) {
      logger.error('Error in getAssessmentSummary service:', error);
      throw error;
    }
  }
}

module.exports = new AssessmentService();

