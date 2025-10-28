const { FactorEnhancedService, AddUnsurPemenuhanSchema, UpdateFactorPicSchema } = require('./factor-enhanced.service');
const { z } = require('zod');

class FactorEnhancedController {
  constructor(db) {
    this.factorService = new FactorEnhancedService(db);
  }

  /**
   * POST /factors/:factorId/unsur
   * Add unsur pemenuhan to factor
   */
  addUnsurPemenuhan = async (req, res) => {
    try {
      const { factorId } = req.params;
      const data = req.body;

      const validatedData = AddUnsurPemenuhanSchema.parse({
        factorId,
        data
      });

      const unsur = await this.factorService.addUnsurPemenuhan(factorId, data);

      res.json({
        success: true,
        data: unsur,
        message: 'Unsur pemenuhan added successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * PATCH /factors/:factorId/pic
   * Update factor PIC
   */
  updateFactorPic = async (req, res) => {
    try {
      const { factorId } = req.params;
      const { picUnitBidangId } = req.body;

      const validatedData = UpdateFactorPicSchema.parse({
        factorId,
        picUnitBidangId
      });

      await this.factorService.updateFactorPic(factorId, picUnitBidangId);

      res.json({
        success: true,
        message: 'Factor PIC updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * GET /factors/:factorId
   * Get factor with details
   */
  getFactorWithDetails = async (req, res) => {
    try {
      const { factorId } = req.params;

      const factor = await this.factorService.getFactorWithDetails(factorId);

      if (!factor) {
        res.status(404).json({
          success: false,
          message: 'Factor not found'
        });
        return;
      }

      res.json({
        success: true,
        data: factor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * GET /assessments/:assessmentId/factors
   * Get factors by assessment
   */
  getFactorsByAssessment = async (req, res) => {
    try {
      const { assessmentId } = req.params;

      const factors = await this.factorService.getFactorsByAssessment(assessmentId);

      res.json({
        success: true,
        data: factors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };
}

module.exports = FactorEnhancedController;
