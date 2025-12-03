/**
 * ACGS Repository
 */

const { AcgsTemplate, AcgsAssessment, AcgsResponse } = require('./acgs.entity');

class AcgsRepository {
  constructor(db) {
    this.db = db;
  }

  // ========== TEMPLATE METHODS ==========
  async getAllTemplates(filters = {}) {
    let query = this.db('acgs_template').where('is_active', true);

    if (filters.level) query = query.where('level', filters.level);
    if (filters.sheet_type) query = query.where('sheet_type', filters.sheet_type);
    if (filters.parent_kode) query = query.where('parent_kode', filters.parent_kode);

    const templates = await query.orderBy('sort', 'asc');
    return templates.map(t => AcgsTemplate.fromDatabase(t));
  }

  async getTemplateById(id) {
    const template = await this.db('acgs_template').where('id', id).first();
    return AcgsTemplate.fromDatabase(template);
  }

  // ========== ASSESSMENT METHODS ==========
  async getAllAssessments(filters = {}) {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = this.db('acgs_assessment as aa')
      .leftJoin('users as u', 'aa.created_by', 'u.id')
      .select('aa.*', 'u.name as created_by_name')
      .whereNull('aa.deleted_at')
      .where('aa.is_master_data', false); // Only show actual assessments, not master data

    if (filters.status) query = query.where('aa.status', filters.status);
    if (filters.assessment_year) query = query.where('aa.assessment_year', filters.assessment_year);
    if (filters.search) query = query.where('aa.title', 'ilike', `%${filters.search}%`);

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Get paginated data
    const assessments = await query
      .orderBy('aa.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: assessments.map(a => AcgsAssessment.fromDatabase(a)),
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

    let query = this.db('acgs_assessment as aa')
      .leftJoin('users as u', 'aa.created_by', 'u.id')
      .select('aa.*', 'u.name as created_by_name')
      .whereNull('aa.deleted_at')
      .where('aa.is_master_data', true); // Only show master data

    if (filters.search) query = query.where('aa.title', 'ilike', `%${filters.search}%`);

    // Get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count');
    const [{ count }] = await countQuery;
    const total = parseInt(count);

    // Get paginated data
    const assessments = await query
      .orderBy('aa.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: assessments.map(a => AcgsAssessment.fromDatabase(a)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getAssessmentById(id) {
    const assessment = await this.db('acgs_assessment as aa')
      .leftJoin('users as u', 'aa.created_by', 'u.id')
      .select('aa.*', 'u.name as created_by_name')
      .where('aa.id', id)
      .whereNull('aa.deleted_at')
      .first();
    return AcgsAssessment.fromDatabase(assessment);
  }

  async createAssessment(data) {
    const [result] = await this.db('acgs_assessment').insert(data).returning('id');
    const id = typeof result === 'object' ? result.id : result;
    return this.getAssessmentById(id);
  }

  async updateAssessment(id, data) {
    await this.db('acgs_assessment')
      .where('id', id)
      .update({ ...data, updated_at: this.db.fn.now() });
    return this.getAssessmentById(id);
  }

  async deleteAssessment(id, userId) {
    await this.db('acgs_assessment')
      .where('id', id)
      .update({
        deleted_at: this.db.fn.now(),
        deleted_by: userId
      });
  }

  // ========== RESPONSE METHODS ==========
  async getResponsesByAssessment(assessmentId) {
    const responses = await this.db('acgs_response as ar')
      .leftJoin('acgs_template as at', 'ar.template_id', 'at.id')
      .select('ar.*', 'at.kode', 'at.nama', 'at.level', 'at.parent_kode')
      .where('ar.acgs_assessment_id', assessmentId)
      .orderBy('at.sort', 'asc');
    return responses.map(r => AcgsResponse.fromDatabase(r));
  }

  async getResponseById(id) {
    const response = await this.db('acgs_response as ar')
      .leftJoin('acgs_template as at', 'ar.template_id', 'at.id')
      .select('ar.*', 'at.kode', 'at.nama', 'at.level')
      .where('ar.id', id)
      .first();
    return AcgsResponse.fromDatabase(response);
  }

  async upsertResponse(assessmentId, templateId, data) {
    const existing = await this.db('acgs_response')
      .where('acgs_assessment_id', assessmentId)
      .where('template_id', templateId)
      .first();

    if (existing) {
      await this.db('acgs_response').where('id', existing.id).update({ ...data, updated_at: this.db.fn.now() });
      return this.getResponseById(existing.id);
    } else {
      const [id] = await this.db('acgs_response').insert({
        acgs_assessment_id: assessmentId,
        template_id: templateId,
        ...data
      }).returning('id');
      return this.getResponseById(id);
    }
  }

  // ========== SOFT DELETE METHODS ==========

  async findDeletedAssessments(limit = 50, offset = 0) {
    const assessments = await this.db('acgs_assessment')
      .select(
        'acgs_assessment.id',
        'acgs_assessment.title',
        'acgs_assessment.deleted_at',
        'acgs_assessment.created_at',
        'users.name as deleted_by_name'
      )
      .leftJoin('users', 'acgs_assessment.deleted_by', 'users.id')
      .whereNotNull('acgs_assessment.deleted_at')
      .orderBy('acgs_assessment.deleted_at', 'desc')
      .limit(limit)
      .offset(offset);

    return assessments.map(a => ({
      ...a,
      type: 'acgs',
      nama: a.title
    }));
  }

  async countDeletedAssessments() {
    const result = await this.db('acgs_assessment')
      .whereNotNull('deleted_at')
      .count('* as count')
      .first();

    return parseInt(result.count);
  }

  async restoreAssessment(id) {
    await this.db('acgs_assessment')
      .where('id', id)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: this.db.fn.now()
      });

    return true;
  }
}

module.exports = AcgsRepository;
