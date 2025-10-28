const { AssessmentScoringService, GetKkaScoreSchema, ListAoiCandidatesSchema } = require('./assessment-scoring.service');
const { z } = require('zod');

class AssessmentScoringController {
  constructor(db) {
    this.scoringService = new AssessmentScoringService(db);
  }

  /**
   * GET /assessments/:assessmentId/kka/:kkaId/score
   * Get KKA score
   */
  getKkaScore = async (req, res) => {
    try {
      const { assessmentId, kkaId } = GetKkaScoreSchema.parse({
        assessmentId: req.params.assessmentId,
        kkaId: req.params.kkaId
      });

      const scoreResult = await this.scoringService.getKkaScore(assessmentId, kkaId);

      res.json({
        success: true,
        data: scoreResult
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameters',
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
   * POST /assessments/:assessmentId/kka/:kkaId/aoi/generate
   * Generate AOI for KKA with score < 0.5
   */
  generateAoiForKka = async (req, res) => {
    try {
      const { assessmentId, kkaId } = GetKkaScoreSchema.parse({
        assessmentId: req.params.assessmentId,
        kkaId: req.params.kkaId
      });

      // Get user ID from auth middleware (assuming it's set in req.user)
      const createdBy = req.user?.id;
      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const aoiId = await this.scoringService.generateAoiForKka(assessmentId, kkaId, createdBy);

      res.json({
        success: true,
        data: { aoiId },
        message: 'AOI generated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameters',
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
   * GET /assessments/:assessmentId/aoi/candidates
   * Get list of KKA candidates for AOI generation
   */
  listAoiCandidates = async (req, res) => {
    try {
      const { assessmentId } = ListAoiCandidatesSchema.parse({
        assessmentId: req.params.assessmentId
      });

      const candidates = await this.scoringService.listAoiCandidates(assessmentId);

      res.json({
        success: true,
        data: candidates
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameters',
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
}

module.exports = AssessmentScoringController;
