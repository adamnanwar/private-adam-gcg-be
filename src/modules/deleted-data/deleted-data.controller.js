const deletedDataService = require('./deleted-data.service');
const logger = require('../../utils/logger-simple');

class DeletedDataController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await deletedDataService.getAllDeleted(page, limit);

      res.json({
        status: 'success',
        ...result
      });
    } catch (error) {
      logger.error('Error in getAll deleted data:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async restore(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const userId = req.user?.id;

      if (!type) {
        return res.status(400).json({
          status: 'error',
          message: 'Type is required (assessment or aoi)'
        });
      }

      const result = await deletedDataService.restoreData(id, type, userId);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Error in restore deleted data:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async permanentlyDelete(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const userId = req.user?.id;

      if (!type) {
        return res.status(400).json({
          status: 'error',
          message: 'Type is required (assessment or aoi)'
        });
      }

      const result = await deletedDataService.permanentlyDelete(id, type, userId);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Error in permanently delete data:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new DeletedDataController();
