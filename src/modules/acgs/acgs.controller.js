/**
 * ACGS Controller
 */

const acgsService = require('./acgs.service');
const Joi = require('joi');

class AcgsController {
  constructor() {
    this.service = acgsService;
  }

  async getTemplates(req, res) {
    try {
      const { level, sheet_type, parent_kode } = req.query;
      const templates = await this.service.getAllTemplates({ level, sheet_type, parent_kode });
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTemplateHierarchy(req, res) {
    try {
      const hierarchy = await this.service.getTemplateHierarchy();
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      console.error('Error getting hierarchy:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAssessments(req, res) {
    try {
      const { page = 1, limit = 10, status, assessment_year, search } = req.query;
      const result = await this.service.getAllAssessments({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        assessment_year,
        search
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting assessments:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMasterData(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await this.service.getAllMasterData({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting master data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAssessmentById(req, res) {
    try {
      const { id } = req.params;
      const assessment = await this.service.getAssessmentById(id);
      if (!assessment) {
        return res.status(404).json({ success: false, error: 'Assessment not found' });
      }
      res.json({ success: true, data: assessment });
    } catch (error) {
      console.error('Error getting assessment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createAssessment(req, res) {
    try {
      const schema = Joi.object({
        assessment_id: Joi.string().uuid().optional(),
        title: Joi.string().required(),
        assessment_year: Joi.number().integer().required(),
        status: Joi.string().valid('draft', 'in_progress', 'proses_tindak_lanjut', 'verifikasi', 'selesai', 'selesai_berkelanjutan').default('draft'),
        notes: Joi.string().allow('').optional(),
        is_master_data: Joi.boolean().optional().default(false),
        assessor_id: Joi.string().uuid().optional(),
        sections: Joi.array().items(Joi.object({
          id: Joi.string().optional(),
          kode: Joi.string().allow('', null).optional(),
          nama: Joi.string().allow('', null).optional(),
          sheet_type: Joi.string().allow('', null).optional(),
          sort: Joi.number().optional(),
          parameters: Joi.array().items(Joi.object({
            id: Joi.string().optional(),
            kode: Joi.string().allow('', null).optional(),
            nama: Joi.string().allow('', null).optional(),
            bobot: Joi.number().allow(null).optional(),
            sort: Joi.number().optional(),
            questions: Joi.array().items(Joi.object({
              id: Joi.string().optional(),
              kode: Joi.string().allow('', null).optional(),
              nama: Joi.string().allow('', null).optional(),
              pertanyaan: Joi.string().allow('', null).optional(),
              bobot: Joi.number().allow(null).optional(),
              jawaban: Joi.string().allow('', null).optional(),
              answer: Joi.string().allow('', null).optional(),
              score: Joi.number().allow(null).optional(),
              referensi_panduan: Joi.string().allow('', null).optional(),
              implementasi_bukti: Joi.string().allow('', null).optional(),
              link_dokumen: Joi.string().allow('', null).optional(),
              referensi: Joi.string().allow('', null).optional(),
              comment: Joi.string().allow('', null).optional(),
              sort: Joi.number().optional(),
              pic_unit_bidang_id: Joi.string().uuid().allow(null).optional()
            })).optional()
          })).optional()
        })).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      // Pass entire data including sections to service
      const assessment = await this.service.createAssessment(value, req.user.id);
      res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      console.error('Error creating assessment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateAssessment(req, res) {
    try {
      const { id } = req.params;

      console.log('ACGS Update - Request body received:', JSON.stringify(req.body, null, 2));

      // Pass entire data including sections to service
      const assessment = await this.service.updateAssessment(id, req.body, req.user.id);
      res.json({ success: true, data: assessment });
    } catch (error) {
      console.error('Error updating assessment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteAssessment(req, res) {
    try {
      const { id } = req.params;
      await this.service.deleteAssessment(id, req.user.id);
      res.json({ success: true, message: 'Assessment deleted successfully' });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async saveResponses(req, res) {
    try {
      const { id } = req.params;
      const { responses } = req.body;
      const result = await this.service.saveResponses(id, responses);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error saving responses:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AcgsController;
