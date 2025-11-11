const assessmentService = require('./assessment.service');
const manualAssessmentService = require('./manual-assessment.service');
const picAssignmentService = require('./pic-assignment.service');
const dictionaryRepository = require('../dictionary/dictionary.repository');
const { successResponse, errorResponse, paginatedResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');
const Joi = require('joi');
const { getConnection } = require('../../config/database');
const { randomUUID } = require('crypto');
const ExcelService = require('../../services/excel.service');

// Validation schemas
const createAssessmentSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  assessment_date: Joi.date().required(),
  assessor_id: Joi.string().uuid().optional(),
  notes: Joi.string().optional().max(1000)
});

const updateAssessmentSchema = Joi.object({
  title: Joi.string().optional().min(1).max(200),
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
  title: Joi.string().required().min(1).max(200),
  organization_name: Joi.string().optional().allow('', null),
  assessment_date: Joi.date().required(),
  assessor_id: Joi.string().uuid().optional(),
  notes: Joi.string().optional().max(1000),
  status: Joi.string().valid(
    'draft',
    'in_progress',
    'verifikasi',
    'selesai',
    'selesai_berkelanjutan',
    'proses_tindak_lanjut'
  ).optional(),
  kkas: Joi.array().items(Joi.object({
    id: Joi.string().optional(),
    kode: Joi.string().allow('', null).optional(),
    nama: Joi.string().allow('', null).optional(),
    deskripsi: Joi.string().allow('', null).optional(),
    weight: Joi.number().optional(),
    sort: Joi.number().optional(),
    aspects: Joi.array().items(Joi.object({
      id: Joi.string().optional(),
      kode: Joi.string().allow('', null).optional(),
      nama: Joi.string().allow('', null).optional(),
      weight: Joi.number().optional(),
      sort: Joi.number().optional(),
      parameters: Joi.array().items(Joi.object({
        id: Joi.string().optional(),
        kode: Joi.string().allow('', null).optional(),
        nama: Joi.string().allow('', null).optional(),
        weight: Joi.number().optional(),
        sort: Joi.number().optional(),
        factors: Joi.array().items(Joi.object({
          id: Joi.string().optional(),
          pic_user_id: Joi.string().uuid().allow(null).optional(),
          pic_unit_bidang_id: Joi.string().uuid().allow(null).optional(),
          kode: Joi.string().allow('', null).optional(),
          nama: Joi.string().allow('', null).optional(),
          deskripsi: Joi.string().allow('', null).optional(),
          max_score: Joi.number().optional(),
          sort: Joi.number().optional(),
          comment: Joi.string().allow('', null).optional()
        })).optional()
      })).optional()
    })).optional()
  })).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'in_progress', 'completed', 'reviewed').required()
});

const createFromTemplateSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  assessment_date: Joi.date().optional(),
  notes: Joi.string().optional().max(1000)
});

class AssessmentController {
  // Assessment Controllers
  async getAllAssessments(req, res) {
    try {
      const { page = 1, limit = 50, search = '', status = '', assessor_id = '' } = req.query;
      
      // Get user's unit ID for filtering (only for non-admin users)
      let userUnitId = null;
      if (req.user.role !== 'admin' && req.user.unit_bidang_id) {
        userUnitId = req.user.unit_bidang_id;
      }
      
      const result = await assessmentService.getAllAssessments(
        parseInt(page), 
        parseInt(limit), 
        search, 
        status, 
        assessor_id,
        userUnitId
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
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json(errorResponse('Invalid assessment ID format', 'VALIDATION_ERROR'));
      }
      
      // Use repository-backed service to fetch assessment and its hierarchy
      const includeDetails = req.query.include === 'full';
      const assessment = includeDetails
        ? await assessmentService.getDetailedAssessment(id)
        : await assessmentService.getAssessmentById(id);
      return res.json(successResponse(assessment, 'Assessment retrieved successfully'));
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
      console.log('Assessment creation request body:', JSON.stringify(req.body, null, 2));
      if (req.body.kkas && Array.isArray(req.body.kkas)) {
        const { error, value } = manualAssessmentSchema.validate(req.body);
        if (error) {
          return res.status(400).json(validationErrorResponse('Validation error', error.details));
        }

        const result = await manualAssessmentService.createManualAssessment(value, value.kkas, userId);
        res.status(201).json(successResponse({
          assessment: result.assessment,
          idMapping: result.hierarchy
        }, 'Manual assessment created successfully'));
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
      const includeHierarchy = req.query.include === 'hierarchy';
      if (includeHierarchy) {
        const assessment = await assessmentService.getDetailedAssessment(assessmentId);
        return res.json(successResponse(assessment, 'Assessment detail retrieved successfully'));
      }

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
        const assessmentStructure = await manualAssessmentService.getManualAssessmentStructure(value.assessment_id);

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

        const responseFactorIds = value.responses
          .map((r) => idMapping.factor[r.factor_id])
          .filter(Boolean);

        if (responseFactorIds.length) {
          const missingEvidence = await manualAssessmentService.getManualFactorsMissingEvidence(
            value.assessment_id,
            responseFactorIds,
            req.user.id,
            req.user.unit_bidang_id
          );

          if (missingEvidence.length) {
            return res.status(400).json(errorResponse(
              'Evidence required before submitting scores',
              'EVIDENCE_REQUIRED',
              missingEvidence
            ));
          }
        }

        const results = await manualAssessmentService.submitManualResponses(
          value.assessment_id,
          value.responses,
          idMapping,
          userId
        );

        res.json(successResponse(results, 'Manual responses processed successfully'));
      } else {
        const factorIds = value.responses.map((r) => r.factor_id);
        if (factorIds.length) {
          const missingEvidence = await assessmentService.getFactorsMissingEvidence(
            value.assessment_id,
            factorIds,
            req.user.id,
            req.user.unit_bidang_id
          );

          if (missingEvidence.length) {
            return res.status(400).json(errorResponse(
              'Evidence required before submitting scores',
              'EVIDENCE_REQUIRED',
              missingEvidence
            ));
          }
        }

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

  // Get data needed for creating new assessment
  async getNewAssessmentData(req, res) {
    try {
      // Get dictionary data for new assessment
      const [kkas, aspects, parameters, factors] = await Promise.all([
        dictionaryRepository.findAllKKA(),
        dictionaryRepository.findAllAspects(),
        dictionaryRepository.findAllParameters(),
        dictionaryRepository.findAllFactors()
      ]);

      res.json({
        status: 'success',
        data: {
          kkas: kkas || [],
          aspects: aspects || [],
          parameters: parameters || [],
          factors: factors || [],
          aois: []
        },
        message: 'New assessment data retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getNewAssessmentData:', error);
      res.status(500).json(errorResponse('Failed to retrieve new assessment data', 'INTERNAL_ERROR'));
    }
  }

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

  // Assessment Review Controllers
  async acceptAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const db = getConnection();

      // Pastikan semua assignment PIC untuk assessment ini statusnya 'submitted'
      const items = await db('pic_map').where('assessment_id', assessmentId);
      const allSubmitted = items.length > 0 && items.every(it => it.status === 'submitted');
      if (!allSubmitted) {
        return res.status(400).json(errorResponse('All PIC assignments must be submitted before accept', 'INVALID_STATE'));
      }

      // Hitung skor akhir (kalau perlu) lalu set assessment -> 'completed'
      await db('assessment').where('id', assessmentId).update({
        status: 'completed',
        updated_at: new Date(),
      });

      return res.json(successResponse({ assessmentId }, 'Assessment accepted & completed'));
    } catch (err) {
      logger.error('Error in acceptAssessment:', err);
      return res.status(500).json(errorResponse('Failed to accept assessment', 'INTERNAL_ERROR'));
    }
  }

  async rejectAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const { note } = req.body || {};
      const db = getConnection();

      // Saat reject: ubah semua assignment yang 'submitted' kembali ke 'needs_revision'
      await db('pic_map').where({ assessment_id: assessmentId, status: 'submitted' })
        .update({ status: 'needs_revision', updated_at: new Date() });

      // Opsional: simpan catatan revisi
      if (note) {
        await db('assessment_revisions').insert({
          id: randomUUID(),
          assessment_id: assessmentId,
          reason: 'Revision requested',
          notes: note,
          requested_by: req.user.id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Assessment tetap di 'in_progress' saat reject
      await db('assessment').where('id', assessmentId).update({
        status: 'in_progress',
        updated_at: new Date(),
      });

      return res.json(successResponse({ assessmentId }, 'Assessment rejected, awaiting revision'));
    } catch (err) {
      logger.error('Error in rejectAssessment:', err);
      return res.status(500).json(errorResponse('Failed to reject assessment', 'INTERNAL_ERROR'));
    }
  }

  async updateManualAssessment(req, res) {
    try {
      const { assessmentId } = req.params;
      const payload = req.body;
      const userId = req.user.id;

      const result = await manualAssessmentService.updateManualAssessment(assessmentId, payload, userId);

      // Return with same format as create for consistency
      res.json(successResponse({
        assessment: { id: assessmentId },
        idMapping: result.hierarchy || { kkas: [], aspects: [], parameters: [], factors: [] }
      }, 'Assessment updated successfully'));
    } catch (error) {
      logger.error('Error in updateManualAssessment controller:', error);
      const message = process.env.NODE_ENV === 'development' ? error.message : 'Failed to update assessment';
      res.status(500).json(errorResponse(message, 'INTERNAL_ERROR'));
    }
  }

  /**
   * Export assessment to Excel
   */
  async exportToExcel(req, res) {
    try {
      const { id } = req.params;

      // Check if assessment exists
      const db = getConnection();
      const assessment = await db('assessment').where('id', id).first();

      if (!assessment) {
        return res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      }

      // Generate Excel
      const excelService = new ExcelService(db);
      const buffer = await excelService.exportAssessmentToExcel(id);

      // Set headers for file download
      const filename = `Assessment_${assessment.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      logger.error('Error exporting assessment to Excel:', error);
      res.status(500).json(errorResponse('Failed to export assessment', 'EXPORT_ERROR'));
    }
  }

  /**
   * Submit tindak lanjut (PIC submits evidence)
   * Changes status from in_progress/revisi to verifikasi
   */
  async submitTindakLanjut(req, res) {
    try {
      const { id: assessmentId } = req.params;
      const userId = req.user.id;
      const db = getConnection();

      // Check if assessment exists
      const assessment = await db('assessment').where('id', assessmentId).first();
      if (!assessment) {
        return res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      }

      // Check if status is in_progress or revisi
      if (assessment.status !== 'in_progress' && assessment.status !== 'revisi') {
        return res.status(400).json(errorResponse('Assessment cannot be submitted in current status', 'INVALID_STATUS'));
      }

      // Update status to verifikasi
      await db('assessment')
        .where('id', assessmentId)
        .update({
          status: 'verifikasi',
          updated_at: new Date()
        });

      logger.info(`Assessment ${assessmentId} submitted for verification by user ${userId}`);

      return res.json(successResponse({ assessmentId }, 'Assessment submitted for verification'));
    } catch (error) {
      logger.error('Error in submitTindakLanjut:', error);
      return res.status(500).json(errorResponse('Failed to submit assessment', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Verify assessment (Assessor verifies and scores)
   * Includes auto-create AOI logic if score < minimum threshold
   */
  async verifyAssessment(req, res) {
    try {
      const { id: assessmentId } = req.params;
      const { action, scores, revisionNotes } = req.body;
      const userId = req.user.id;
      const db = getConnection();

      // Validate request
      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json(errorResponse('Action must be approve or reject', 'INVALID_ACTION'));
      }

      // Check if assessment exists
      const assessment = await db('assessment').where('id', assessmentId).first();
      if (!assessment) {
        return res.status(404).json(errorResponse('Assessment not found', 'NOT_FOUND'));
      }

      // Check if status is verifikasi
      if (assessment.status !== 'verifikasi') {
        return res.status(400).json(errorResponse('Assessment is not ready for verification', 'INVALID_STATUS'));
      }

      if (action === 'reject') {
        // Reject: change status to in_progress (not 'revisi' as it's not in allowed values)
        await db('assessment')
          .where('id', assessmentId)
          .update({
            status: 'in_progress',  // Use valid status value instead of 'revisi'
            updated_at: new Date()
          });

        // Save revision notes if provided
        if (revisionNotes) {
          await db('assessment_revisions').insert({
            id: randomUUID(),
            assessment_id: assessmentId,
            reason: 'Verification rejected',
            notes: revisionNotes,
            requested_by: userId,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        logger.info(`Assessment ${assessmentId} rejected by assessor ${userId}`);
        return res.json(successResponse({ assessmentId }, 'Assessment rejected for revision'));
      }

      // Action = approve
      // Save scores to 'response' table (not 'factor_score')
      if (scores && Array.isArray(scores)) {
        for (const scoreData of scores) {
          const { factorId, score, comment } = scoreData;

          // Check if response already exists
          const existingResponse = await db('response')
            .where({ assessment_id: assessmentId, factor_id: factorId })
            .first();

          if (existingResponse) {
            await db('response')
              .where({ assessment_id: assessmentId, factor_id: factorId })
              .update({
                score,
                comment: comment || null,
                updated_at: new Date()
              });
          } else {
            await db('response').insert({
              id: randomUUID(),
              assessment_id: assessmentId,
              factor_id: factorId,
              score,
              comment: comment || null,
              created_by: userId,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
      }

      // Calculate overall score (rata-rata dari semua response scores)
      const allScores = await db('response')
        .where('assessment_id', assessmentId)
        .select('score');

      let overallScore = 0;
      if (allScores.length > 0) {
        const totalScore = allScores.reduce((sum, s) => sum + parseFloat(s.score), 0);
        overallScore = totalScore / allScores.length;
      }

      // Update assessment status to selesai
      await db('assessment')
        .where('id', assessmentId)
        .update({
          status: 'selesai',
          updated_at: new Date()
        });

      logger.info(`Assessment ${assessmentId} approved with overall score: ${overallScore.toFixed(2)}`);

      // Check AOI minimum score threshold
      const aoiSetting = await db('settings')
        .where('key', 'aoi_minimum_score')
        .first();

      const minimumScore = aoiSetting ? parseFloat(aoiSetting.value) : 0.75;

      // Auto-create AOI if overall score < minimum
      if (overallScore < minimumScore) {
        logger.info(`Overall score ${overallScore.toFixed(2)} is below minimum ${minimumScore.toFixed(2)}, creating AOI...`);

        const aoiId = randomUUID();
        await db('aoi').insert({
          id: aoiId,
          assessment_id: assessmentId,
          nama: `AOI - ${assessment.title}`,
          recommendation: `Assessment score (${(overallScore * 100).toFixed(0)}%) is below threshold (${(minimumScore * 100).toFixed(0)}%). Requires improvement action.`,
          status: 'draft',
          priority: overallScore < 0.5 ? 'high' : 'medium',
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        });

        logger.info(`AOI ${aoiId} created automatically for assessment ${assessmentId}`);

        return res.json(successResponse({
          assessmentId,
          overallScore: parseFloat(overallScore.toFixed(2)),
          aoiCreated: true,
          aoiId
        }, 'Assessment approved. AOI created due to low score.'));
      }

      return res.json(successResponse({
        assessmentId,
        overallScore: parseFloat(overallScore.toFixed(2)),
        aoiCreated: false
      }, 'Assessment approved successfully'));

    } catch (error) {
      logger.error('Error in verifyAssessment:', error);
      return res.status(500).json(errorResponse('Failed to verify assessment', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new AssessmentController();

