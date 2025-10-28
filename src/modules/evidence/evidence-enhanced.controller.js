const { EvidenceEnhancedService } = require('./evidence-enhanced.service');

class EvidenceEnhancedController {
  constructor(db) {
    this.evidenceService = new EvidenceEnhancedService(db);
  }

  /**
   * POST /evidence/kka/:kkaId
   * Upload evidence for KKA
   */
  uploadKkaEvidence = async (req, res) => {
    try {
      const { kkaId } = req.params;
      const uploadedBy = req.user?.id;

      if (!uploadedBy) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get file data from multer middleware
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const fileData = {
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        note: req.body.note
      };

      const evidence = await this.evidenceService.uploadKkaEvidence(kkaId, fileData, uploadedBy);

      res.json({
        success: true,
        data: evidence,
        message: 'Evidence uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * POST /evidence/aoi/:aoiId
   * Upload evidence for AOI
   */
  uploadAoiEvidence = async (req, res) => {
    try {
      const { aoiId } = req.params;
      const uploadedBy = req.user?.id;

      if (!uploadedBy) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get file data from multer middleware
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const fileData = {
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        note: req.body.note
      };

      const evidence = await this.evidenceService.uploadAoiEvidence(aoiId, fileData, uploadedBy);

      res.json({
        success: true,
        data: evidence,
        message: 'Evidence uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * GET /evidence/kka/:kkaId
   * Get evidence for KKA
   */
  getKkaEvidence = async (req, res) => {
    try {
      const { kkaId } = req.params;

      const evidence = await this.evidenceService.getEvidenceByTarget('kka', kkaId);

      res.json({
        success: true,
        data: evidence
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * GET /evidence/aoi/:aoiId
   * Get evidence for AOI
   */
  getAoiEvidence = async (req, res) => {
    try {
      const { aoiId } = req.params;

      const evidence = await this.evidenceService.getEvidenceByTarget('aoi', aoiId);

      res.json({
        success: true,
        data: evidence
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };

  /**
   * DELETE /evidence/:evidenceId
   * Delete evidence
   */
  deleteEvidence = async (req, res) => {
    try {
      const { evidenceId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      await this.evidenceService.deleteEvidence(evidenceId, userId);

      res.json({
        success: true,
        message: 'Evidence deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  };
}

module.exports = EvidenceEnhancedController;
