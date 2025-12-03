/**
 * PUGKI Repository
 */

const { PugkiTemplate, PugkiAssessment, PugkiResponse } = require('./pugki.entity');

class PugkiRepository {
  constructor(db) {
    this.db = db;
  }

  // ========== TEMPLATE METHODS ==========

  async getAllTemplates(filters = {}) {
    let query = this.db('pugki_template').where('is_active', true);

    if (filters.level) {
      query = query.where('level', filters.level);
    }

    if (filters.parent_kode) {
      query = query.where('parent_kode', filters.parent_kode);
    }

    const templates = await query.orderBy('sort', 'asc');
    return templates.map(t => PugkiTemplate.fromDatabase(t));
  }

  async getTemplateById(id) {
    const template = await this.db('pugki_template').where('id', id).first();
    return PugkiTemplate.fromDatabase(template);
  }

  async getTemplateByKode(kode) {
    const template = await this.db('pugki_template').where('kode', kode).first();
    return PugkiTemplate.fromDatabase(template);
  }

  async createTemplate(data) {
    const [id] = await this.db('pugki_template').insert(data).returning('id');
    return this.getTemplateById(id);
  }

  async updateTemplate(id, data) {
    await this.db('pugki_template')
      .where('id', id)
      .update({ ...data, updated_at: this.db.fn.now() });
    return this.getTemplateById(id);
  }

  async deleteTemplate(id) {
    await this.db('pugki_template').where('id', id).del();
  }

  // ========== ASSESSMENT METHODS ==========

  async getAllAssessments(filters = {}) {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = this.db('pugki_assessment as pa')
      .leftJoin('users as u', 'pa.created_by', 'u.id')
      .select(
        'pa.*',
        'u.name as created_by_name'
      )
      .whereNull('pa.deleted_at')
      .where('pa.is_master_data', false); // Only show actual assessments, not master data

    if (filters.status) {
      query = query.where('pa.status', filters.status);
    }

    if (filters.assessment_year) {
      query = query.where('pa.assessment_year', filters.assessment_year);
    }

    if (filters.search) {
      query = query.where('pa.title', 'ilike', `%${filters.search}%`);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Get paginated data
    const assessments = await query
      .orderBy('pa.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: assessments.map(a => PugkiAssessment.fromDatabase(a)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getAllMasterData(filters = {}) {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = this.db('pugki_assessment as pa')
      .leftJoin('users as u', 'pa.created_by', 'u.id')
      .select(
        'pa.*',
        'u.name as created_by_name'
      )
      .whereNull('pa.deleted_at')
      .where('pa.is_master_data', true); // Only show master data

    if (filters.search) {
      query = query.where('pa.title', 'ilike', `%${filters.search}%`);
    }

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Get paginated data
    const assessments = await query
      .orderBy('pa.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: assessments.map(a => PugkiAssessment.fromDatabase(a)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getAssessmentById(id) {
    const assessment = await this.db('pugki_assessment as pa')
      .leftJoin('users as u', 'pa.created_by', 'u.id')
      .select('pa.*', 'u.name as created_by_name')
      .where('pa.id', id)
      .whereNull('pa.deleted_at')
      .first();
    return PugkiAssessment.fromDatabase(assessment);
  }

  async createAssessment(data) {
    const [result] = await this.db('pugki_assessment').insert(data).returning('id');
    const id = typeof result === 'object' ? result.id : result;
    return this.getAssessmentById(id);
  }

  async updateAssessment(id, data) {
    await this.db('pugki_assessment')
      .where('id', id)
      .update({ ...data, updated_at: this.db.fn.now() });
    return this.getAssessmentById(id);
  }

  async deleteAssessment(id, userId) {
    await this.db('pugki_assessment')
      .where('id', id)
      .update({
        deleted_at: this.db.fn.now(),
        deleted_by: userId
      });
  }

  // ========== RESPONSE METHODS ==========

  async getResponsesByAssessment(assessmentId) {
    const responses = await this.db('pugki_response as pr')
      .leftJoin('pugki_template as pt', 'pr.template_id', 'pt.id')
      .select(
        'pr.*',
        'pt.kode',
        'pt.nama',
        'pt.level',
        'pt.parent_kode'
      )
      .where('pr.pugki_assessment_id', assessmentId)
      .orderBy('pt.sort', 'asc');

    return responses.map(r => PugkiResponse.fromDatabase(r));
  }

  async getResponseById(id) {
    const response = await this.db('pugki_response as pr')
      .leftJoin('pugki_template as pt', 'pr.template_id', 'pt.id')
      .select('pr.*', 'pt.kode', 'pt.nama', 'pt.level')
      .where('pr.id', id)
      .first();
    return PugkiResponse.fromDatabase(response);
  }

  async createResponse(data) {
    const [id] = await this.db('pugki_response').insert(data).returning('id');
    return this.getResponseById(id);
  }

  async updateResponse(id, data) {
    await this.db('pugki_response')
      .where('id', id)
      .update({ ...data, updated_at: this.db.fn.now() });
    return this.getResponseById(id);
  }

  async upsertResponse(assessmentId, templateId, data) {
    const existing = await this.db('pugki_response')
      .where('pugki_assessment_id', assessmentId)
      .where('template_id', templateId)
      .first();

    if (existing) {
      return this.updateResponse(existing.id, data);
    } else {
      return this.createResponse({
        pugki_assessment_id: assessmentId,
        template_id: templateId,
        ...data
      });
    }
  }

  async deleteResponse(id) {
    await this.db('pugki_response').where('id', id).del();
  }

  // ========== SOFT DELETE METHODS ==========

  async findDeletedAssessments(limit = 50, offset = 0) {
    const assessments = await this.db('pugki_assessment')
      .select(
        'pugki_assessment.id',
        'pugki_assessment.title',
        'pugki_assessment.deleted_at',
        'pugki_assessment.created_at',
        'users.name as deleted_by_name'
      )
      .leftJoin('users', 'pugki_assessment.deleted_by', 'users.id')
      .whereNotNull('pugki_assessment.deleted_at')
      .orderBy('pugki_assessment.deleted_at', 'desc')
      .limit(limit)
      .offset(offset);

    return assessments.map(a => ({
      ...a,
      type: 'pugki',
      nama: a.title
    }));
  }

  async countDeletedAssessments() {
    const result = await this.db('pugki_assessment')
      .whereNotNull('deleted_at')
      .count('* as count')
      .first();

    return parseInt(result.count);
  }

  async restoreAssessment(id) {
    await this.db('pugki_assessment')
      .where('id', id)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: this.db.fn.now()
      });

    return true;
  }
}

module.exports = PugkiRepository;
