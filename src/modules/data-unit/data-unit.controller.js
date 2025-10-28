/**
 * Data Unit Controller
 */
const DataUnitService = require('./data-unit.service');
const Joi = require('joi');

class DataUnitController {
  constructor(db) {
    this.service = new DataUnitService(db);
  }

  // Validation schemas
  createDataUnitSchema = Joi.object({
    kode: Joi.string().required().min(1).max(50),
    nama: Joi.string().required().min(1).max(200),
    deskripsi: Joi.string().optional().allow('').max(500)
  });

  updateDataUnitSchema = Joi.object({
    kode: Joi.string().optional().min(1).max(50),
    nama: Joi.string().optional().min(1).max(200),
    deskripsi: Joi.string().optional().allow('').max(500),
    is_active: Joi.boolean().optional()
  });

  async getAllDataUnits(req, res) {
    try {
      const { page, limit, search, sortBy, sortOrder } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100,
        search: search || '',
        sortBy: sortBy || 'nama',
        sortOrder: sortOrder || 'asc'
      };

      const result = await this.service.getAllDataUnits(options);
      
      res.json({
        status: 'success',
        data: result.data.map(dataUnit => dataUnit.toResponse()),
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getDataUnitById(req, res) {
    try {
      const { id } = req.params;
      const dataUnit = await this.service.getDataUnitById(id);
      
      res.json({
        status: 'success',
        data: dataUnit.toResponse()
      });
    } catch (error) {
      if (error.message === 'Data Unit not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async createDataUnit(req, res) {
    try {
      const { error, value } = this.createDataUnitSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }

      const dataUnit = await this.service.createDataUnit(value);
      
      res.status(201).json({
        status: 'success',
        data: dataUnit.toResponse(),
        message: 'Data Unit created successfully'
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async updateDataUnit(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = this.updateDataUnitSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }

      const dataUnit = await this.service.updateDataUnit(id, value);
      
      res.json({
        status: 'success',
        data: dataUnit.toResponse(),
        message: 'Data Unit updated successfully'
      });
    } catch (error) {
      if (error.message === 'Data Unit not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async deleteDataUnit(req, res) {
    try {
      const { id } = req.params;
      await this.service.deleteDataUnit(id);
      
      res.json({
        status: 'success',
        message: 'Data Unit deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Data Unit not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }

  async getActiveDataUnits(req, res) {
    try {
      const dataUnits = await this.service.getActiveDataUnits();
      
      res.json({
        status: 'success',
        data: dataUnits.map(dataUnit => dataUnit.toResponse())
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async hardDeleteDataUnit(req, res) {
    try {
      const { id } = req.params;
      await this.service.hardDeleteDataUnit(id);
      
      res.json({
        status: 'success',
        message: 'Data Unit permanently deleted'
      });
    } catch (error) {
      if (error.message === 'Data Unit not found') {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }
}

module.exports = DataUnitController;






