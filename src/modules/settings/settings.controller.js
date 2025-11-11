const { getConnection } = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger-simple');

class SettingsController {
  /**
   * Get a specific setting by key
   */
  async getSetting(req, res) {
    try {
      const { key } = req.params;
      const db = getConnection();

      const setting = await db('settings')
        .where('key', key)
        .first();

      if (!setting) {
        return res.status(404).json(errorResponse('Setting not found', 'NOT_FOUND'));
      }

      return res.json(successResponse(setting, 'Setting retrieved successfully'));
    } catch (error) {
      logger.error('Get setting error:', error);
      return res.status(500).json(errorResponse('Failed to get setting', 'INTERNAL_SERVER_ERROR'));
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(req, res) {
    try {
      const db = getConnection();

      const settings = await db('settings')
        .select('*')
        .orderBy('key');

      return res.json(successResponse(settings, 'Settings retrieved successfully'));
    } catch (error) {
      logger.error('Get all settings error:', error);
      return res.status(500).json(errorResponse('Failed to get settings', 'INTERNAL_SERVER_ERROR'));
    }
  }

  /**
   * Update a setting value
   * Only admin can update settings
   */
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const db = getConnection();

      if (value === undefined || value === null) {
        return res.status(400).json(errorResponse('Value is required', 'VALIDATION_ERROR'));
      }

      // Check if setting exists
      const existingSetting = await db('settings')
        .where('key', key)
        .first();

      if (!existingSetting) {
        return res.status(404).json(errorResponse('Setting not found', 'NOT_FOUND'));
      }

      // Validate value for specific keys
      if (key === 'aoi_minimum_score') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 1) {
          return res.status(400).json(errorResponse('AOI minimum score must be between 0 and 1', 'VALIDATION_ERROR'));
        }
      }

      // Update setting
      await db('settings')
        .where('key', key)
        .update({
          value: String(value),
          updated_at: new Date()
        });

      const updatedSetting = await db('settings')
        .where('key', key)
        .first();

      logger.info(`Setting updated: ${key} = ${value} by user ${req.user?.id}`);

      return res.json(successResponse(updatedSetting, 'Setting updated successfully'));
    } catch (error) {
      logger.error('Update setting error:', error);
      return res.status(500).json(errorResponse('Failed to update setting', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

module.exports = new SettingsController();
