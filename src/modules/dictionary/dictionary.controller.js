const dictionaryService = require('./dictionary.service');
const { successResponse, errorResponse, paginatedResponse, validationErrorResponse } = require('../../utils/response');
const { logger } = require('../../utils/logger');
const Joi = require('joi');

// Validation schemas
const createKKASchema = Joi.object({
  kode: Joi.string().required().min(1).max(50),
  nama: Joi.string().required().min(1).max(200),
  deskripsi: Joi.string().optional().max(1000),
  weight: Joi.number().optional().min(0).max(10)
});

const updateKKASchema = Joi.object({
  kode: Joi.string().optional().min(1).max(50),
  nama: Joi.string().optional().min(1).max(200),
  deskripsi: Joi.string().optional().max(1000),
  weight: Joi.number().optional().min(0).max(10)
});

const createAspectSchema = Joi.object({
  kka_id: Joi.string().uuid().required(),
  kode: Joi.string().required().min(1).max(50),
  nama: Joi.string().required().min(1).max(200),
  weight: Joi.number().optional().min(0).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const updateAspectSchema = Joi.object({
  kode: Joi.string().optional().min(1).max(50),
  nama: Joi.string().optional().min(1).max(200),
  weight: Joi.number().optional().min(0).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const createParameterSchema = Joi.object({
  aspect_id: Joi.string().uuid().required(),
  kode: Joi.string().required().min(1).max(50),
  nama: Joi.string().required().min(1).max(200),
  weight: Joi.number().optional().min(0).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const updateParameterSchema = Joi.object({
  kode: Joi.string().optional().min(1).max(50),
  nama: Joi.string().optional().min(1).max(200),
  weight: Joi.number().optional().min(0).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const createFactorSchema = Joi.object({
  parameter_id: Joi.string().uuid().required(),
  kode: Joi.string().required().min(1).max(50),
  nama: Joi.string().required().min(1).max(200),
  deskripsi: Joi.string().optional().max(1000),
  max_score: Joi.number().integer().optional().min(1).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const updateFactorSchema = Joi.object({
  kode: Joi.string().optional().min(1).max(50),
  nama: Joi.string().optional().min(1).max(200),
  deskripsi: Joi.string().optional().max(1000),
  max_score: Joi.number().integer().optional().min(1).max(10),
  sort: Joi.number().integer().optional().min(0)
});

const bulkHierarchySchema = Joi.array().items(Joi.object({
  kode: Joi.string().required(),
  nama: Joi.string().required(),
  deskripsi: Joi.string().optional(),
  weight: Joi.number().optional(),
  aspects: Joi.array().items(Joi.object({
    kode: Joi.string().required(),
    nama: Joi.string().required(),
    weight: Joi.number().optional(),
    sort: Joi.number().optional(),
    parameters: Joi.array().items(Joi.object({
      kode: Joi.string().required(),
      nama: Joi.string().required(),
      weight: Joi.number().optional(),
      sort: Joi.number().optional(),
      factors: Joi.array().items(Joi.object({
        kode: Joi.string().required(),
        nama: Joi.string().required(),
        deskripsi: Joi.string().optional(),
        max_score: Joi.number().optional(),
        sort: Joi.number().optional()
      }))
    }))
  }))
}));

class DictionaryController {
  // KKA Controllers
  async getAllKKA(req, res) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const result = await dictionaryService.getAllKKA(parseInt(page), parseInt(limit), search);
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'KKA retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getAllKKA controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve KKA', 'INTERNAL_ERROR'));
    }
  }

  async getKKAById(req, res) {
    try {
      const { id } = req.params;
      const kka = await dictionaryService.getKKAById(id);
      
      res.json(successResponse(kka, 'KKA retrieved successfully'));
    } catch (error) {
      logger.error('Error in getKKAById controller:', error);
      if (error.message === 'KKA not found') {
        res.status(404).json(errorResponse('KKA not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve KKA', 'INTERNAL_ERROR'));
      }
    }
  }

  async createKKA(req, res) {
    try {
      const { error, value } = createKKASchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const kka = await dictionaryService.createKKA(value);
      res.status(201).json(successResponse(kka, 'KKA created successfully'));
    } catch (error) {
      logger.error('Error in createKKA controller:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else if (error.message.includes('required')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create KKA', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateKKA(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateKKASchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const kka = await dictionaryService.updateKKA(id, value);
      res.json(successResponse(kka, 'KKA updated successfully'));
    } catch (error) {
      logger.error('Error in updateKKA controller:', error);
      if (error.message === 'KKA not found') {
        res.status(404).json(errorResponse('KKA not found', 'NOT_FOUND'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(errorResponse('Failed to update KKA', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteKKA(req, res) {
    try {
      const { id } = req.params;
      const result = await dictionaryService.deleteKKA(id);
      
      res.json(successResponse(result, 'KKA deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteKKA controller:', error);
      if (error.message === 'KKA not found or cannot be deleted') {
        res.status(404).json(errorResponse('KKA not found or cannot be deleted', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to delete KKA', 'INTERNAL_ERROR'));
      }
    }
  }

  // Aspect Controllers
  async getAspectsByKKA(req, res) {
    try {
      const { kkaId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await dictionaryService.getAspectsByKKA(kkaId, parseInt(page), parseInt(limit));
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Aspects retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getAspectsByKKA controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve aspects', 'INTERNAL_ERROR'));
    }
  }

  async getAspectById(req, res) {
    try {
      const { id } = req.params;
      const aspect = await dictionaryService.getAspectById(id);
      
      res.json(successResponse(aspect, 'Aspect retrieved successfully'));
    } catch (error) {
      logger.error('Error in getAspectById controller:', error);
      if (error.message === 'Aspect not found') {
        res.status(404).json(errorResponse('Aspect not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve aspect', 'INTERNAL_ERROR'));
      }
    }
  }

  async createAspect(req, res) {
    try {
      const { error, value } = createAspectSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const aspect = await dictionaryService.createAspect(value);
      res.status(201).json(successResponse(aspect, 'Aspect created successfully'));
    } catch (error) {
      logger.error('Error in createAspect controller:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else if (error.message.includes('required') || error.message.includes('not found')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create aspect', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateAspect(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateAspectSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const aspect = await dictionaryService.updateAspect(id, value);
      res.json(successResponse(aspect, 'Aspect updated successfully'));
    } catch (error) {
      logger.error('Error in updateAspect controller:', error);
      if (error.message === 'Aspect not found') {
        res.status(404).json(errorResponse('Aspect not found', 'NOT_FOUND'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(errorResponse('Failed to update aspect', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteAspect(req, res) {
    try {
      const { id } = req.params;
      const result = await dictionaryService.deleteAspect(id);
      
      res.json(successResponse(result, 'Aspect deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteAspect controller:', error);
      if (error.message === 'Aspect not found or cannot be deleted') {
        res.status(404).json(errorResponse('Aspect not found or cannot be deleted', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to delete aspect', 'INTERNAL_ERROR'));
      }
    }
  }

  // Parameter Controllers
  async getParametersByAspect(req, res) {
    try {
      const { aspectId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await dictionaryService.getParametersByAspect(aspectId, parseInt(page), parseInt(limit));
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Parameters retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getParametersByAspect controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve parameters', 'INTERNAL_ERROR'));
    }
  }

  async getParameterById(req, res) {
    try {
      const { id } = req.params;
      const parameter = await dictionaryService.getParameterById(id);
      
      res.json(successResponse(parameter, 'Parameter retrieved successfully'));
    } catch (error) {
      logger.error('Error in getParameterById controller:', error);
      if (error.message === 'Parameter not found') {
        res.status(404).json(errorResponse('Parameter not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve parameter', 'INTERNAL_ERROR'));
      }
    }
  }

  async createParameter(req, res) {
    try {
      const { error, value } = createParameterSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const parameter = await dictionaryService.createParameter(value);
      res.status(201).json(successResponse(parameter, 'Parameter created successfully'));
    } catch (error) {
      logger.error('Error in createParameter controller:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else if (error.message.includes('required') || error.message.includes('not found')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create parameter', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateParameter(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateParameterSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const parameter = await dictionaryService.updateParameter(id, value);
      res.json(successResponse(parameter, 'Parameter updated successfully'));
    } catch (error) {
      logger.error('Error in updateParameter controller:', error);
      if (error.message === 'Parameter not found') {
        res.status(404).json(errorResponse('Parameter not found', 'NOT_FOUND'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(errorResponse('Failed to update parameter', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteParameter(req, res) {
    try {
      const { id } = req.params;
      const result = await dictionaryService.deleteParameter(id);
      
      res.json(successResponse(result, 'Parameter deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteParameter controller:', error);
      if (error.message === 'Parameter not found or cannot be deleted') {
        res.status(404).json(errorResponse('Parameter not found or cannot be deleted', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to delete parameter', 'INTERNAL_ERROR'));
      }
    }
  }

  // Factor Controllers
  async getFactorsByParameter(req, res) {
    try {
      const { parameterId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await dictionaryService.getFactorsByParameter(parameterId, parseInt(page), parseInt(limit));
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Factors retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getFactorsByParameter controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve factors', 'INTERNAL_ERROR'));
    }
  }

  async getFactorById(req, res) {
    try {
      const { id } = req.params;
      const factor = await dictionaryService.getFactorById(id);
      
      res.json(successResponse(factor, 'Factor retrieved successfully'));
    } catch (error) {
      logger.error('Error in getFactorById controller:', error);
      if (error.message === 'Factor not found') {
        res.status(404).json(errorResponse('Factor not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve factor', 'INTERNAL_ERROR'));
      }
    }
  }

  async createFactor(req, res) {
    try {
      const { error, value } = createFactorSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const factor = await dictionaryService.createFactor(value);
      res.status(201).json(successResponse(factor, 'Factor created successfully'));
    } catch (error) {
      logger.error('Error in createFactor controller:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else if (error.message.includes('required') || error.message.includes('not found')) {
        res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(errorResponse('Failed to create factor', 'INTERNAL_ERROR'));
      }
    }
  }

  async updateFactor(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateFactorSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const factor = await dictionaryService.updateFactor(id, value);
      res.json(successResponse(factor, 'Factor updated successfully'));
    } catch (error) {
      logger.error('Error in updateFactor controller:', error);
      if (error.message === 'Factor not found') {
        res.status(404).json(errorResponse('Factor not found', 'NOT_FOUND'));
      } else if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message, 'CONFLICT'));
      } else {
        res.status(500).json(errorResponse('Failed to update factor', 'INTERNAL_ERROR'));
      }
    }
  }

  async deleteFactor(req, res) {
    try {
      const { id } = req.params;
      const result = await dictionaryService.deleteFactor(id);
      
      res.json(successResponse(result, 'Factor deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteFactor controller:', error);
      if (error.message === 'Factor not found or cannot be deleted') {
        res.status(404).json(errorResponse('Factor not found or cannot be deleted', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to delete factor', 'INTERNAL_ERROR'));
      }
    }
  }

  // Hierarchy Controllers
  async getFullHierarchy(req, res) {
    try {
      const hierarchy = await dictionaryService.getFullHierarchy();
      res.json(successResponse(hierarchy, 'Full hierarchy retrieved successfully'));
    } catch (error) {
      logger.error('Error in getFullHierarchy controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve hierarchy', 'INTERNAL_ERROR'));
    }
  }

  async getKKAHierarchy(req, res) {
    try {
      const { kkaId } = req.params;
      const hierarchy = await dictionaryService.getKKAHierarchy(kkaId);
      
      res.json(successResponse(hierarchy, 'KKA hierarchy retrieved successfully'));
    } catch (error) {
      logger.error('Error in getKKAHierarchy controller:', error);
      if (error.message === 'KKA not found') {
        res.status(404).json(errorResponse('KKA not found', 'NOT_FOUND'));
      } else {
        res.status(500).json(errorResponse('Failed to retrieve KKA hierarchy', 'INTERNAL_ERROR'));
      }
    }
  }

  async getCompleteHierarchy(req, res) {
    try {
      const { kkaId } = req.params;
      const hierarchy = await dictionaryService.getCompleteHierarchy(kkaId);
      
      return successResponse(res, hierarchy, 'Hierarchy retrieved successfully');
    } catch (error) {
      logger.error('Error in getCompleteHierarchy controller:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getCompleteHierarchyAll(req, res) {
    try {
      const hierarchy = await dictionaryService.getCompleteHierarchyAll();
      
      return successResponse(res, hierarchy, 'Complete hierarchy retrieved successfully');
    } catch (error) {
      logger.error('Error in getCompleteHierarchyAll controller:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Bulk Operations
  async bulkCreateHierarchy(req, res) {
    try {
      const { error, value } = bulkHierarchySchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const results = await dictionaryService.bulkCreateHierarchy(value);
      res.status(201).json(successResponse(results, 'Hierarchy created successfully'));
    } catch (error) {
      logger.error('Error in bulkCreateHierarchy controller:', error);
      res.status(500).json(errorResponse('Failed to create hierarchy', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new DictionaryController();

