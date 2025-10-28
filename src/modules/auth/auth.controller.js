const authService = require('./auth.service');
const { successResponse, errorResponse, validationErrorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().optional(),
  username: Joi.string().optional(),
  password: Joi.string().required()
}).or('email', 'username'); // At least one of email or username must be provided

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

      const { email, username, password } = value;
      
      // Use email if provided, otherwise use username
      const loginIdentifier = email || username;
      
      // Use unified login method
      const result = await authService.login({ email: loginIdentifier, password });
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

      // Generic server error
      return res.status(500).json(errorResponse('Internal server error during login', 'INTERNAL_SERVER_ERROR'));
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const userProfile = await authService.getProfile(userId);
      return res.json(successResponse(userProfile, 'Profile retrieved successfully'));
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(500).json(errorResponse('Failed to retrieve user profile', 'INTERNAL_SERVER_ERROR'));
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
      const userId = req.user.id;

      await authService.changePassword(userId, currentPassword, newPassword);
      return res.json(successResponse({}, 'Password changed successfully'));
    } catch (error) {
      logger.error('Change password error:', error);
      
      if (error.message === 'Invalid current password') {
        return res.status(400).json(errorResponse('Invalid current password', 'INVALID_CURRENT_PASSWORD'));
      }
      
      return res.status(500).json(errorResponse('Failed to change password', 'INTERNAL_SERVER_ERROR'));
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      // For JWT, we don't need to do anything on server side
      // The token will be removed from client side
      return res.json(successResponse({}, 'Logged out successfully'));
    } catch (error) {
      logger.error('Logout error:', error);
      return res.status(500).json(errorResponse('Failed to logout', 'INTERNAL_SERVER_ERROR'));
    }
  }

  /**
   * Refresh token (optional)
   */
  async refreshToken(req, res) {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        return res.status(400).json(validationErrorResponse('Validation error', error.details));
      }

      const { refreshToken } = value;
      const result = await authService.refreshToken(refreshToken);
      return res.json(successResponse(result, 'Token refreshed successfully'));
    } catch (error) {
      logger.error('Refresh token error:', error);
      
      if (error.message === 'Invalid refresh token') {
        return res.status(401).json(errorResponse('Invalid refresh token', 'INVALID_REFRESH_TOKEN'));
      }
      
      return res.status(500).json(errorResponse('Failed to refresh token', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

module.exports = new AuthController();
