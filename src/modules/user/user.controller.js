const userService = require('./user.service');
const Joi = require('joi');
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

// Validation schemas
const createUserSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  password: Joi.string().optional().min(6),
  role: Joi.string().valid('admin', 'assessor', 'user').required(),
  auth_provider: Joi.string().valid('local', 'ldap').default('local')
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional().min(2).max(100),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'assessor', 'user').optional(),
  auth_provider: Joi.string().valid('local', 'ldap').optional()
});

class UserController {
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, search = '', role, auth_provider } = req.query;
      
      const filters = {
        search,
        role: role ? role.split(',') : undefined,
        auth_provider: auth_provider ? auth_provider.split(',') : undefined
      };

      const result = await userService.getAllUsers(parseInt(page), parseInt(limit), filters);
      
      res.json(paginatedResponse(
        result.data,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Users retrieved successfully'
      ));
    } catch (error) {
      logger.error('Error in getAllUsers controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve users', 'INTERNAL_ERROR'));
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      if (!user) {
        return res.status(404).json(errorResponse('User not found', 'NOT_FOUND'));
      }

      res.json(successResponse(user, 'User retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUserById controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve user', 'INTERNAL_ERROR'));
    }
  }

  async createUser(req, res) {
    try {
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR', error.details));
      }

      const user = await userService.createUser(value, req.user.id);
      res.status(201).json(successResponse(user, 'User created successfully'));
    } catch (error) {
      logger.error('Error in createUser controller:', error);
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json(errorResponse('Email already exists', 'DUPLICATE_EMAIL'));
      }
      res.status(500).json(errorResponse('Failed to create user', 'INTERNAL_ERROR'));
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR', error.details));
      }

      const user = await userService.updateUser(id, value, req.user.id);
      
      if (!user) {
        return res.status(404).json(errorResponse('User not found', 'NOT_FOUND'));
      }

      res.json(successResponse(user, 'User updated successfully'));
    } catch (error) {
      logger.error('Error in updateUser controller:', error);
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json(errorResponse('Email already exists', 'DUPLICATE_EMAIL'));
      }
      res.status(500).json(errorResponse('Failed to update user', 'INTERNAL_ERROR'));
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json(errorResponse('Cannot delete your own account', 'INVALID_OPERATION'));
      }

      const deleted = await userService.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json(errorResponse('User not found', 'NOT_FOUND'));
      }

      res.json(successResponse(null, 'User deleted successfully'));
    } catch (error) {
      logger.error('Error in deleteUser controller:', error);
      res.status(500).json(errorResponse('Failed to delete user', 'INTERNAL_ERROR'));
    }
  }

  async getUserStats(req, res) {
    try {
      const stats = await userService.getUserStats();
      res.json(successResponse(stats, 'User statistics retrieved successfully'));
    } catch (error) {
      logger.error('Error in getUserStats controller:', error);
      res.status(500).json(errorResponse('Failed to retrieve user statistics', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new UserController();





