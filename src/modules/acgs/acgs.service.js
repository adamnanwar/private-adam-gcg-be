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

  async getAllMasterData(filters) {
    return this.repository.getAllMasterData(filters);
  }

  async getAssessmentById(id) {
    const assessment = await this.repository.getAssessmentById(id);
    if (assessment) {
      // Load hierarchy from database tables
      const sections = await this.getAssessmentHierarchy(id);
      assessment.sections = sections;
    }
    return assessment;
  }

  async getAssessmentHierarchy(assessmentId) {
    // Get all sections, parameters, and questions in a single query with JOIN
    const results = await this.db('acgs_section')
      .select(
        // Section fields
        'acgs_section.id as section_id',
        'acgs_section.kode as section_kode',
        'acgs_section.nama as section_nama',
        'acgs_section.sheet_type as section_sheet_type',
        'acgs_section.sort as section_sort',
        // Parameter fields
        'acgs_parameter.id as parameter_id',
        'acgs_parameter.kode as parameter_kode',
        'acgs_parameter.nama as parameter_nama',
        'acgs_parameter.bobot as parameter_bobot',
        'acgs_parameter.sort as parameter_sort',
        // Question fields
        'acgs_question.id as question_id',
        'acgs_question.kode as question_kode',
        'acgs_question.nama as question_nama',
        'acgs_question.bobot as question_bobot',
        'acgs_question.answer',
        'acgs_question.score',
        'acgs_question.referensi',
        'acgs_question.referensi_panduan',
        'acgs_question.implementasi_bukti',
        'acgs_question.link_dokumen',
        'acgs_question.comment'
      )
      .where('acgs_section.acgs_assessment_id', assessmentId)
      .leftJoin('acgs_parameter', 'acgs_parameter.acgs_section_id', 'acgs_section.id')
      .leftJoin('acgs_question', 'acgs_question.acgs_parameter_id', 'acgs_parameter.id')
      .orderBy([
        { column: 'acgs_section.sort', order: 'asc' },
        { column: 'acgs_parameter.sort', order: 'asc' },
        { column: 'acgs_question.sort', order: 'asc' }
      ]);

    // Transform flat results into nested hierarchy structure
    const sectionMap = {};

    for (const row of results) {
      // Build Section
      if (!sectionMap[row.section_id]) {
        sectionMap[row.section_id] = {
          id: row.section_id,
          kode: row.section_kode,
          nama: row.section_nama,
          sheet_type: row.section_sheet_type,
          sort: row.section_sort,
          parameters: []
        };
      }

      const section = sectionMap[row.section_id];

      // Build Parameter
      if (row.parameter_id) {
        let parameter = section.parameters.find(p => p.id === row.parameter_id);
        if (!parameter) {
          parameter = {
            id: row.parameter_id,
            kode: row.parameter_kode,
            nama: row.parameter_nama,
            bobot: row.parameter_bobot,
            sort: row.parameter_sort,
            questions: []
          };
          section.parameters.push(parameter);
        }

        // Build Question
        if (row.question_id) {
          parameter.questions.push({
            id: row.question_id,
            kode: row.question_kode,
            nama: row.question_nama,
            pertanyaan: row.question_nama,
            bobot: row.question_bobot,
            jawaban: row.answer || null,
            answer: row.answer || null,
            score: row.score || null,
            referensi: row.referensi || '',
            referensi_panduan: row.referensi_panduan || '',
            implementasi_bukti: row.implementasi_bukti || '',
            link_dokumen: row.link_dokumen || '',
            comment: row.comment || '',
            sort: row.question_sort
          });
        }
      }
    }

    return Object.values(sectionMap);
  }


  async createAssessment(data, userId) {
    const { db } = require('../../config/database');
    const trx = await db.transaction();

    try {
      const { v4: uuidv4 } = require('uuid');
      const assessmentId = uuidv4();

      // Create assessment
      await trx('acgs_assessment').insert({
        id: assessmentId,
        title: data.title,
        assessment_year: data.assessment_year,
        status: data.status || 'draft',
        notes: data.notes || '',
        is_master_data: data.is_master_data || false,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create hierarchy (Sections, Parameters, Questions)
      if (data.sections && data.sections.length > 0) {
        await this.createHierarchy(trx, assessmentId, data.sections);
      }

      await trx.commit();

      // Return created assessment with hierarchy
      return await this.getAssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('Error creating ACGS assessment:', error);
      throw error;
    }
  }

  async createHierarchy(trx, assessmentId, sections) {
    const { v4: uuidv4 } = require('uuid');

    for (const sectionItem of sections) {
      const sectionId = uuidv4();

      // Insert Section
      await trx('acgs_section').insert({
        id: sectionId,
        acgs_assessment_id: assessmentId,
        kode: sectionItem.kode,
        nama: sectionItem.nama,
        sheet_type: sectionItem.sheet_type || null,
        sort: sectionItem.sort || 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Insert Parameters
      if (sectionItem.parameters && sectionItem.parameters.length > 0) {
        for (const parameterItem of sectionItem.parameters) {
          const parameterId = uuidv4();

          await trx('acgs_parameter').insert({
            id: parameterId,
            acgs_assessment_id: assessmentId,
            acgs_section_id: sectionId,
            kode: parameterItem.kode,
            nama: parameterItem.nama,
            bobot: parameterItem.bobot || null,
            sort: parameterItem.sort || 0,
            created_at: new Date(),
            updated_at: new Date()
          });

          // Insert Questions
          if (parameterItem.questions && parameterItem.questions.length > 0) {
            for (const questionItem of parameterItem.questions) {
              const questionId = uuidv4();

              await trx('acgs_question').insert({
                id: questionId,
                acgs_assessment_id: assessmentId,
                acgs_section_id: sectionId,
                acgs_parameter_id: parameterId,
                kode: questionItem.kode,
                nama: questionItem.nama || questionItem.pertanyaan,
                bobot: questionItem.bobot || null,
                answer: questionItem.answer || questionItem.jawaban || null,
                score: questionItem.score || null,
                referensi: questionItem.referensi || '',
                referensi_panduan: questionItem.referensi_panduan || '',
                implementasi_bukti: questionItem.implementasi_bukti || '',
                link_dokumen: questionItem.link_dokumen || '',
                comment: questionItem.comment || '',
                sort: questionItem.sort || 0,
                created_at: new Date(),
                updated_at: new Date()
              });
            }
          }
        }
      }
    }
  }

  async updateAssessment(id, data, userId) {
    const { db } = require('../../config/database');
    const trx = await db.transaction();

    try {
      // Check if assessment exists
      const assessment = await trx('acgs_assessment')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        throw new Error('ACGS assessment not found');
      }

      // Update assessment basic info
      await trx('acgs_assessment')
        .where('id', id)
        .update({
          title: data.title,
          assessment_year: data.assessment_year,
          status: data.status,
          notes: data.notes || '',
          updated_at: new Date()
        });

      // Delete existing hierarchy
      await trx('acgs_section').where('acgs_assessment_id', id).del();

      // Create new hierarchy
      if (data.sections && data.sections.length > 0) {
        await this.createHierarchy(trx, id, data.sections);
      }

      await trx.commit();

      return await this.getAssessmentById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error updating ACGS assessment:', error);
      throw error;
    }
  }

  async deleteAssessment(id, userId) {
    return this.repository.deleteAssessment(id, userId);
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
