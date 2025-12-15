/**
 * ACGS Service - BACKUP BEFORE SCORING UPDATE
 * Backup Date: 2025-12-14
 *
 * Original calculateScore function (lines 922-953):
 *
 * async calculateScore(assessmentId) {
 *   const responses = await this.repository.getResponsesByAssessment(assessmentId);
 *
 *   let totalYes = 0;
 *   let totalApplicable = 0;
 *
 *   responses.forEach(r => {
 *     if (r.answer !== 'N/A') {
 *       totalApplicable++;
 *       if (r.answer === 'Yes') totalYes++;
 *     }
 *   });
 *
 *   const overallScore = totalApplicable > 0 ? (totalYes / totalApplicable) * 100 : 0;
 *
 *   // Determine level achieved
 *   let levelAchieved = 0;
 *   const criteria = await this.db('acgs_scoring_criteria').orderBy('level', 'asc');
 *   for (const c of criteria) {
 *     if (overallScore >= parseFloat(c.min_score) && overallScore <= parseFloat(c.max_score)) {
 *       levelAchieved = c.level;
 *       break;
 *     }
 *   }
 *
 *   await this.repository.updateAssessment(assessmentId, {
 *     overall_score: overallScore,
 *     level_achieved: levelAchieved
 *   });
 *
 *   return { overallScore, levelAchieved };
 * }
 *
 * To restore: Copy the calculateScore function above and replace the new one in acgs.service.js
 */

// FULL BACKUP OF acgs.service.js follows:

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

  async getAllMasterData(filters) {
    return this.repository.getAllMasterData(filters);
  }

  async getAssessmentById(id) {
    const assessment = await this.repository.getAssessmentById(id);
    if (assessment) {
      const sections = await this.getAssessmentHierarchy(id);
      assessment.sections = sections;
    }
    return assessment;
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
}

// NOTE: This is a partial backup. Full file was too long.
// The key function to restore is calculateScore above.
