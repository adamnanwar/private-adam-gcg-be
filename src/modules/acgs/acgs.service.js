/**
 * ACGS Service
 */

const AcgsRepository = require('./acgs.repository');

class AcgsService {
  constructor(db) {
    this.repository = new AcgsRepository(db);
    this.db = db;
  }

  async getAllTemplates(filters) {
    return this.repository.getAllTemplates(filters);
  }

  async getTemplateHierarchy() {
    const templates = await this.repository.getAllTemplates();
    return this.buildHierarchy(templates);
  }

  buildHierarchy(templates) {
    const map = {};
    const roots = [];

    templates.forEach(t => { map[t.kode] = { ...t, children: [] }; });
    templates.forEach(t => {
      if (t.parent_kode && map[t.parent_kode]) {
        map[t.parent_kode].children.push(map[t.kode]);
      } else if (!t.parent_kode) {
        roots.push(map[t.kode]);
      }
    });

    return roots;
  }

  async getAllAssessments(filters) {
    return this.repository.getAllAssessments(filters);
  }

  async getAssessmentById(id) {
    const assessment = await this.repository.getAssessmentById(id);
    if (assessment) {
      assessment.responses = await this.repository.getResponsesByAssessment(id);
    }
    return assessment;
  }

  async createAssessment(data, userId) {
    return this.repository.createAssessment({ ...data, created_by: userId });
  }

  async updateAssessment(id, data) {
    return this.repository.updateAssessment(id, data);
  }

  async deleteAssessment(id) {
    return this.repository.deleteAssessment(id);
  }

  async saveResponses(assessmentId, responses) {
    const results = [];
    for (const response of responses) {
      const score = response.answer === 'Yes' ? 1 : (response.answer === 'N/A' ? 0 : 0);
      const result = await this.repository.upsertResponse(
        assessmentId,
        response.template_id,
        {
          answer: response.answer,
          referensi_panduan: response.referensi_panduan,
          implementasi_bukti: response.implementasi_bukti,
          link_dokumen: response.link_dokumen,
          score
        }
      );
      results.push(result);
    }

    await this.calculateScore(assessmentId);
    return results;
  }

  async calculateScore(assessmentId) {
    const responses = await this.repository.getResponsesByAssessment(assessmentId);

    let totalYes = 0;
    let totalApplicable = 0;

    responses.forEach(r => {
      if (r.answer !== 'N/A') {
        totalApplicable++;
        if (r.answer === 'Yes') totalYes++;
      }
    });

    const overallScore = totalApplicable > 0 ? (totalYes / totalApplicable) * 100 : 0;

    // Determine level achieved
    let levelAchieved = 0;
    const criteria = await this.db('acgs_scoring_criteria').orderBy('level', 'asc');
    for (const c of criteria) {
      if (overallScore >= parseFloat(c.min_score) && overallScore <= parseFloat(c.max_score)) {
        levelAchieved = c.level;
        break;
      }
    }

    await this.repository.updateAssessment(assessmentId, {
      overall_score: overallScore,
      level_achieved: levelAchieved
    });

    return { overallScore, levelAchieved };
  }

  async getDeletedAssessments(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [assessments, total] = await Promise.all([
      this.repository.findDeletedAssessments(limit, offset),
      this.repository.countDeletedAssessments()
    ]);

    return {
      data: assessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async restoreAssessment(id) {
    await this.repository.restoreAssessment(id);
    return { success: true, message: 'ACGS assessment restored successfully' };
  }

  async permanentlyDeleteAssessment(id) {
    // Hard delete from database
    await this.repository.deleteAssessment(id);
    return { success: true, message: 'ACGS assessment permanently deleted' };
  }
}

const { db } = require('../../config/database');
module.exports = new AcgsService(db);
