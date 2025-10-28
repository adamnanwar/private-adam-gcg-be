const authService = require('./auth.service');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});


const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

class AuthController {
  /**
   * Main login endpoint (uses LDAP by default)
   */
  async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const { email, password } = value;
      
      // Use unified login method
      const result = await authService.login({ email, password });
      return res.json(successResponse(result, 'Login successful'));
    } catch (error) {
      logger.error('Login error:', error);
      
      // Handle different types of errors
      if (error.message.includes('LDAP server is currently not available')) {
        return res.status(503).json(errorResponse('LDAP server is currently not available. Please try again later.', 'SERVICE_UNAVAILABLE'));
      }
      
      if (error.message === 'Invalid credentials' || error.message === 'Invalid LDAP credentials' || error.message.includes('Invalid')) {
        return res.status(401).json(errorResponse('Invalid credentials', 'AUTHENTICATION_FAILED'));
      }
      
      if (error.message === 'User not found' || error.message === 'User not found or invalid credentials') {
        return res.status(401).json(errorResponse('User not found or invalid credentials', 'AUTHENTICATION_FAILED'));
      }
      
      if (error.message === 'Invalid password') {
        return res.status(401).json(errorResponse('Invalid password', 'AUTHENTICATION_FAILED'));
      }
      
      // For other errors, return 500
      return res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
    }
  }


  /**
   * Refresh token
   */
  async refreshToken(req, res) {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const { refreshToken } = value;
      const result = await authService.refreshToken(refreshToken);

      res.json(successResponse(result, 'Token refreshed successfully'));
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json(errorResponse(error.message, 'TOKEN_REFRESH_FAILED'));
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const profile = await authService.getProfile(req.user.id);
      res.json(successResponse(profile, 'Profile retrieved successfully'));
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json(errorResponse('Failed to get profile', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const { currentPassword, newPassword } = value;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

      res.json(successResponse(result, 'Password changed successfully'));
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(400).json(errorResponse(error.message, 'PASSWORD_CHANGE_FAILED'));
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      const result = await authService.logout(req.user.id);
      res.json(successResponse(result, 'Logout successful'));
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json(errorResponse('Logout failed', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = new AuthController();
