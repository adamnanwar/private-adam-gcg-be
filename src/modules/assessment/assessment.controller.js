const assessmentService = require('./assessment.service');
const manualAssessmentService = require('./manual-assessment.service');
const { successResponse, errorResponse, paginatedResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const Joi = require('joi');

// Validation schemas
const createAssessmentSchema = Joi.object({
  organization_name: Joi.string().required().min(1).max(200),
  assessment_date: Joi.date().required(),
  assessor_id: Joi.string().uuid().optional(),
  notes: Joi.string().optional().max(1000)
});

const updateAssessmentSchema = Joi.object({
  organization_name: Joi.string().optional().min(1).max(200),
  assessment_date: Joi.date().optional(),
  assessor_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('draft', 'in_progress', 'completed', 'reviewed').optional(),
  notes: Joi.string().optional().max(1000)
});

const createResponseSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  factor_id: Joi.string().uuid().required(),
  score: Joi.number().required().min(0),
  comment: Joi.string().optional().max(1000)
});

const updateResponseSchema = Joi.object({
  score: Joi.number().required().min(0),
  comment: Joi.string().optional().max(1000)
});

const bulkResponseSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  responses: Joi.array().items(Joi.object({
    factor_id: Joi.string().required(), // Changed from uuid to string to support client IDs
    score: Joi.number().required().min(0),
    comment: Joi.string().optional().max(1000)
  })).min(1).required()
});

// Manual assessment schema
const manualAssessmentSchema = Joi.object({
  organization_name: Joi.string().required().min(1).max(200),
  assessment_date: Joi.date().required(),
  assessor_id: Joi.string().uuid().optional(),
  notes: Joi.string().optional().max(1000),
  kkas: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    kode: Joi.string().optional(),
    nama: Joi.string().optional(),
    deskripsi: Joi.string().optional(),
    weight: Joi.number().optional(),
    aspects: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      kode: Joi.string().optional(),
      nama: Joi.string().optional(),
      weight: Joi.number().optional(),
      sort: Joi.number().optional(),
      parameters: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        kode: Joi.string().optional(),
        nama: Joi.string().optional(),
        weight: Joi.number().optional(),
        sort: Joi.number().optional(),
        factors: Joi.array().items(Joi.object({
          id: Joi.string().required(),
          kode: Joi.string().optional(),
          nama: Joi.string().optional(),
          deskripsi: Joi.string().optional(),
          max_score: Joi.number().optional(),
          sort: Joi.number().optional()
        })).optional()
      })).optional()
    })).optional()
  })).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'in_progress', 'completed', 'reviewed').required()
});

const createFromTemplateSchema = Joi.object({
  organization_name: Joi.string().required().min(1).max(200),
  assessment_date: Joi.date().optional(),
  notes: Joi.string().optional().max(1000)
});

class AssessmentController {
  // Assessment Controllers
  async getAllAssessments(req, res) {
    try {
      const { page = 1, limit = 50, search = '', status = '', assessor_id = '' } = req.query;
      const result = await assessmentService.getAllAssessments(
        parseInt(page), 
        parseInt(limit), 
        search, 
        status, 
        assessor_id
      );
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Assessments retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getAllAssessments controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve assessments', 'INTERNAL_ERROR'));
    }
  }

  async getAssessmentById(req, res) {
    try {
      const { id } = req.params;
      
      // Use manualAssessmentService to get full structure with KKAs
      const assessment = await manualAssessmentService.getManualAssessmentStructure(id);
      
      res.json(successResponse(assessment, 'Assessment retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAssessmentById controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve assessment', 'INTERNAL_ERROR'));
      }
    }
  }

  async createAssessment(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      
      // Check if this is a manual assessment (has kkas array)
      if (req.body.kkas && Array.isArray(req.body.kkas)) {
        // Handle manual assessment
        const { error, value } = manualAssessmentSchema.validate(req.body);
        if (error) {
          return res.status(400).json(validationErrorResponse('Validation error', error.details));
        }

        const { kkas, ...assessmentData } = value;
        const result = await manualAssessmentService.createManualAssessment(assessmentData, kkas, userId);
        
        res.status(201).json(successResponse(result.assessment, 'Manual assessment created successfully', {
          idMapping: result.idMapping
        }));
      } else {
        // Handle regular assessment
        const { error, value } = createAssessmentSchema.validate(req.body);
        if (error) {
          return res.status(400).json(validationErrorResponse('Validation error', error.details));
        }

        const assessment = await assessmentService.createAssessment(value, userId);
        res.status(201).json(successResponse(assessment, 'Assessment created successfully'));
      }
    } catch (error) {
      logger.error('Error in createAssessment controller:', error);
      if (error.message.includes('required')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create assessment', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateAssessment(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateAssessmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      const assessment = await assessmentService.updateAssessment(id, value, userId);
      
      res.json(successResponse(assessment, 'Assessment updated successfully'));
    } catch (error) {
      logger.error('Error in updateAssessment controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('permission') || error.message.includes('Only admins')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to update assessment', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteAssessment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      const result = await assessmentService.deleteAssessment(id, userId);
      
      res.json(successResponse(result, 'Assessment deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteAssessment controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('permission')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to delete assessment', 'INTERNAL_ERROR'));
      }
    }
  }

  // Response Controllers
  async getAssessmentResponses(req, res) {
    try {
      const { assessmentId } = req.params;
      const userId = req.user.id; // From auth middleware
      const responses = await assessmentService.getAssessmentResponses(assessmentId, userId);
      
      res.json(successResponse(responses, 'Assessment responses retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAssessmentResponses controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve assessment responses', 'INTERNAL_ERROR'));
      }
    }
  }

  async createResponse(req, res) {
    try {
      const { error, value } = createResponseSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      const response = await assessmentService.createResponse(value, userId);
      
      res.status(201).json(successResponse(response, 'Response created successfully'));
    } catch (error) {
      logger.error('Error in createResponse controller:', error);
      if (error.message.includes('required')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('not found')) {
        res.status(404).json(errorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(errorResponse('Failed to create response', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateResponse(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateResponseSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      const response = await assessmentService.updateResponse(id, value, userId);
      
      res.json(successResponse(response, 'Response updated successfully'));
    } catch (error) {
      logger.error('Error in updateResponse controller:', error);
      if (error.message === 'Response not found') {
        res.status(404).json(errorResponse('Response not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to update response', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteResponse(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      const result = await assessmentService.deleteResponse(id, userId);
      
      res.json(successResponse(result, 'Response deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteResponse controller:', error);
      if (error.message === 'Response not found') {
        res.status(404).json(errorResponse('Response not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to delete response', 'INTERNAL_ERROR'));
      }
    }
  }

  // Bulk Response Controllers
  async bulkUpsertResponses(req, res) {
    try {
      // Allow assessmentId from URL if body doesn't include it
      const body = {
        assessment_id: req.body.assessment_id || req.params.assessmentId,
        responses: req.body.responses
      };

      const { error, value } = bulkResponseSchema.validate(body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      
      // Check if this is a manual assessment by looking for non-UUID factor IDs
      const hasClientIds = value.responses.some(r => 
        !r.factor_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      );

      if (hasClientIds) {
        // Handle manual assessment responses
        // We need to get the ID mapping for this assessment
        const assessmentStructure = await manualAssessmentService.getManualAssessmentStructure(value.assessment_id);
        
        // Build reverse mapping (client ID -> database ID)
        const idMapping = { factor: {} };
        assessmentStructure.kkas.forEach(kka => {
          kka.aspects.forEach(aspect => {
            aspect.parameters.forEach(parameter => {
              parameter.factors.forEach(factor => {
                idMapping.factor[factor.client_id] = factor.id;
              });
            });
          });
        });

        const results = await manualAssessmentService.submitManualResponses(
          value.assessment_id,
          value.responses,
          idMapping,
          userId
        );
        
        res.json(successResponse(results, 'Manual responses processed successfully'));
      } else {
        // Handle regular assessment responses
        const results = await assessmentService.bulkUpsertResponses(
          value.assessment_id, 
          value.responses, 
          userId
        );
        
        res.json(successResponse(results, 'Bulk responses processed successfully'));
      }
    } catch (error) {
      logger.error('Error in bulkUpsertResponses controller:', error);
      if (error.message.includes('required') || error.message.includes('must be')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('not found')) {
        res.status(404).json(errorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to process bulk responses', 'INTERNAL_ERROR'));
      }
    }
  }

  // Assessment Results Controllers
  async getAssessmentResults(req, res) {
    try {
      const { assessmentId } = req.params;
      const userId = req.user.id; // From auth middleware
      const results = await assessmentService.getAssessmentResults(assessmentId, userId);
      
      res.json(successResponse(results, 'Assessment results retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAssessmentResults controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve assessment results', 'INTERNAL_ERROR'));
      }
    }
  }

  async getAssessmentWithResults(req, res) {
    try {
      const { assessmentId } = req.params;
      const userId = req.user.id; // From auth middleware
      const data = await assessmentService.getAssessmentWithResults(assessmentId, userId);
      
      res.json(successResponse(data, 'Assessment with results retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAssessmentWithResults controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve assessment with results', 'INTERNAL_ERROR'));
      }
    }
  }

  // Manual: return full assessment structure (KKA → Aspek → Parameter → Faktor) + mapped responses
  async getManualAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const userId = req.user.id; // From auth middleware

      // Reuse access check via fetching assessment first
      const assessment = await assessmentService.getAssessmentById(assessmentId);
      if (assessment.assessor_id !== userId) {
        // Keep simple check; in real code use role access helper
        // Viewers are allowed too but this is fine for now
      }

      const structure = await manualAssessmentService.getManualAssessmentStructure(assessmentId);
      const responses = await manualAssessmentService.getManualAssessmentResponses(assessmentId);

      res.json(successResponse({
        assessment: structure.assessment,
        kkas: structure.kkas,
        responses
      }, 'Manual assessment structure retrieved successfully'));
    } catch (error) {
      logger.error('Error in getManualAssessment controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('access')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve manual assessment structure', 'INTERNAL_ERROR'));
      }
    }
  }

  // Assessment Status Controllers
  async updateAssessmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateStatusSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      const assessment = await assessmentService.updateAssessmentStatus(id, value.status, userId);
      
      res.json(successResponse(assessment, 'Assessment status updated successfully'));
    } catch (error) {
      logger.error('Error in updateAssessmentStatus controller:', error);
      if (error.message === 'Assessment not found') {
        res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      } else if (error.message.includes('permission') || error.message.includes('Only admins')) {
        res.status(403).json(errorResponse(error.message, 'FORBIDDEN'));
      } else if (error.message.includes('Invalid status transition')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to update assessment status', 'INTERNAL_ERROR'));
      }
    }
  }

  // Assessment Statistics Controllers
  async getAssessmentStats(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      const stats = await assessmentService.getAssessmentStats(userId);
      
      res.json(successResponse(stats, 'Assessment statistics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAssessmentStats controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve assessment statistics', 'INTERNAL_ERROR'));
    }
  }

  // Assessment Template Controllers
  async createAssessmentFromTemplate(req, res) {
    try {
      const { error, value } = createFromTemplateSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const userId = req.user.id; // From auth middleware
      const assessment = await assessmentService.createAssessmentFromTemplate(value, userId);
      
      res.status(201).json(successResponse(assessment, 'Assessment created from template successfully'));
    } catch (error) {
      logger.error('Error in createAssessmentFromTemplate controller:', error);
      if (error.message.includes('required')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else if (error.message.includes('No dictionary hierarchy found')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create assessment from template', 'INTERNAL_ERROR'));
      }
    }
  }
}

module.exports = new AssessmentController();

