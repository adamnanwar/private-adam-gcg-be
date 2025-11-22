/**
 * PUGKI Service
 */

const PugkiRepository = require('./pugki.repository');

class PugkiService {
  constructor(db) {
    this.repository = new PugkiRepository(db);
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

    templates.forEach(t => {
      map[t.kode] = { ...t, children: [] };
    });

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
    return this.repository.createAssessment({
      ...data,
      created_by: userId
    });
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
      const result = await this.repository.upsertResponse(
        assessmentId,
        response.template_id,
        {
          comply_explain: response.comply_explain,
          referensi: response.referensi,
          score: response.score,
          comment: response.comment
        }
      );
      results.push(result);
    }

    await this.calculateScore(assessmentId);
    return results;
  }

  async calculateScore(assessmentId) {
    const responses = await this.repository.getResponsesByAssessment(assessmentId);

    let totalScore = 0;
    let count = 0;

    responses.forEach(r => {
      if (r.score !== null && r.score !== undefined) {
        totalScore += parseFloat(r.score);
        count++;
      }
    });

    const overallScore = count > 0 ? totalScore / count : 0;

    await this.repository.updateAssessment(assessmentId, {
      overall_score: overallScore
    });

    return overallScore;
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
    return { success: true, message: 'PUGKI assessment restored successfully' };
  }

  async permanentlyDeleteAssessment(id) {
    // Hard delete from database
    await this.repository.deleteAssessment(id);
    return { success: true, message: 'PUGKI assessment permanently deleted' };
  }
}

const { db } = require('../../config/database');
module.exports = new PugkiService(db);
