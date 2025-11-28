const evidenceService = require('./evidence.service');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');

// Validation schemas
const uploadEvidenceSchema = Joi.object({
  note: Joi.string().optional().max(500)
});

const uploadEvidenceGenericSchema = Joi.object({
  target_type: Joi.string().valid('factor', 'parameter', 'aoi').required(),
  target_id: Joi.string().uuid().required(),
  assessment_id: Joi.string().uuid().required(),  // REQUIRED for linking evidence
  note: Joi.string().optional().max(500).allow('')
});

// Simple file upload schema (for form fields like referensi)
const simpleUploadSchema = Joi.object({
  targetType: Joi.string().optional().allow(''),
  targetId: Joi.string().optional().allow(''),
  note: Joi.string().optional().max(500).allow('')
});

class EvidenceController {
  /**
   * Upload evidence for factor/parameter/aoi (generic)
   */
  async uploadEvidenceGeneric(req, res) {
    try {
      const { error, value } = uploadEvidenceGenericSchema.validate(req.body);

      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      if (!req.file) {
        return res.status(400).json(errorResponse('No file uploaded', 'VALIDATION_ERROR'));
      }

      const userId = req.user.id;
      const result = await evidenceService.uploadEvidenceGeneric(
        value.target_type,
        value.target_id,
        req.file,
        value.note || '',
        userId,
        value.assessment_id  // Pass assessment_id
      );

      res.json(successResponse(result, 'Evidence uploaded successfully'));
    } catch (error) {
      logger.error('Error in uploadEvidenceGeneric controller:', error);
      if (error.message.includes('not found')) {
        res.status(404).json(errorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('Only images, PDFs, and Office documents are allowed')) {
        res.status(400).json(errorResponse('Invalid file type. Only images, PDFs, and Office documents are allowed', 'VALIDATION_ERROR'));
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json(errorResponse('File too large. Maximum size is 10MB', 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to upload evidence', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Simple file upload (for form fields like referensi, bukti, etc.)
   * Does NOT require assessment_id or target validation
   */
  async uploadSimple(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('No file uploaded', 'VALIDATION_ERROR'));
      }

      // Generate file URL
      const fileUrl = `/uploads/evidence/${req.file.filename}`;
      
      res.json(successResponse({
        uri: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }, 'File uploaded successfully'));
    } catch (error) {
      logger.error('Error in uploadSimple controller:', error);
      if (error.message.includes('Only images, PDFs, and Office documents are allowed')) {
        res.status(400).json(errorResponse('Invalid file type. Only images, PDFs, and Office documents are allowed', 'VALIDATION_ERROR'));
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json(errorResponse('File too large. Maximum size is 10MB', 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to upload file', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Upload evidence for an assignment
   */
  async uploadEvidence(req, res) {
    try {
      const { assignmentId } = req.params;
      const { error, value } = uploadEvidenceSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      if (!req.file) {
        return res.status(400).json(errorResponse('No file uploaded', 'VALIDATION_ERROR'));
      }

      const userId = req.user.id;
      const result = await evidenceService.uploadEvidence(
        assignmentId, 
        req.file, 
        value.note, 
        userId
      );
      
      res.json(successResponse(result, 'Evidence uploaded successfully'));
    } catch (error) {
      logger.error('Error in uploadEvidence controller:', error);
      if (error.message === 'Assignment not found or unauthorized') {
        res.status(404).json(errorResponse('Assignment not found or unauthorized', 'NOT_FOUND'));
      } else if (error.message.includes('Only images, PDFs, and Office documents are allowed')) {
        res.status(400).json(errorResponse('Invalid file type. Only images, PDFs, and Office documents are allowed', 'VALIDATION_ERROR'));
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json(errorResponse('File too large. Maximum size is 10MB', 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to upload evidence', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get evidence for an assignment
   */
  async getEvidenceByAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.id;
      const evidence = await evidenceService.getEvidenceByAssignment(assignmentId, userId);
      
      res.json(successResponse(evidence, 'Evidence retrieved successfully'));
    } catch (error) {
      logger.error('Error in getEvidenceByAssignment controller:', error);
      if (error.message === 'Assignment not found or unauthorized') {
        res.status(404).json(errorResponse('Assignment not found or unauthorized', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve evidence', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(req, res) {
    try {
      const { evidenceId } = req.params;
      const userId = req.user.id;
      const result = await evidenceService.deleteEvidence(evidenceId, userId);
      
      res.json(successResponse(result, 'Evidence deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteEvidence controller:', error);
      if (error.message === 'Evidence not found or unauthorized') {
        res.status(404).json(errorResponse('Evidence not found or unauthorized', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to delete evidence', 'INTERNAL_ERROR'));
      }
    }
  }

  /**
   * Get evidence by factor (for assessors)
   */
  async getEvidenceByFactor(req, res) {
    try {
      const { factorId } = req.params;
      const evidence = await evidenceService.getEvidenceByFactor(factorId);
      
      res.json(successResponse(evidence, 'Evidence retrieved successfully'));
    } catch (error) {
      logger.error('Error in getEvidenceByFactor controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve evidence', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Serve evidence files
   */
  async serveEvidence(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../../uploads/evidence', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json(errorResponse('File not found', 'NOT_FOUND'));
      }

      res.sendFile(filePath);
    } catch (error) {
      logger.error('Error in serveEvidence controller:', error);
      res.status(500).json(errorResponse('Failed to serve file', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new EvidenceController();