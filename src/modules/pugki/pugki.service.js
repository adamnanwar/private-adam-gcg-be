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

  async getAllMasterData(filters) {
    return this.repository.getAllMasterData(filters);
  }

  async getAssessmentById(id) {
    const assessment = await this.repository.getAssessmentById(id);
    if (assessment) {
      // Load hierarchy from database tables
      const prinsip = await this.getAssessmentHierarchy(id);
      assessment.prinsip = prinsip;
    }
    return assessment;
  }

  async getAssessmentHierarchy(assessmentId) {
    // Get all prinsip and rekomendasi in a single query with JOIN
    const results = await this.repository.db('pugki_prinsip')
      .select(
        // Prinsip fields
        'pugki_prinsip.id as prinsip_id',
        'pugki_prinsip.kode as prinsip_kode',
        'pugki_prinsip.nama as prinsip_nama',
        'pugki_prinsip.sort as prinsip_sort',
        // Rekomendasi fields
        'pugki_rekomendasi.id as rekomendasi_id',
        'pugki_rekomendasi.kode as rekomendasi_kode',
        'pugki_rekomendasi.nama as rekomendasi_nama',
        'pugki_rekomendasi.comply',
        'pugki_rekomendasi.comply_explain',
        'pugki_rekomendasi.referensi',
        'pugki_rekomendasi.score',
        'pugki_rekomendasi.comment',
        'pugki_rekomendasi.sort as rekomendasi_sort'
      )
      .where('pugki_prinsip.pugki_assessment_id', assessmentId)
      .leftJoin('pugki_rekomendasi', 'pugki_rekomendasi.pugki_prinsip_id', 'pugki_prinsip.id')
      .orderBy([
        { column: 'pugki_prinsip.sort', order: 'asc' },
        { column: 'pugki_rekomendasi.sort', order: 'asc' }
      ]);

    // Transform flat results into nested hierarchy structure
    const prinsipMap = {};

    for (const row of results) {
      // Build Prinsip
      if (!prinsipMap[row.prinsip_id]) {
        prinsipMap[row.prinsip_id] = {
          id: row.prinsip_id,
          kode: row.prinsip_kode,
          nama: row.prinsip_nama,
          sort: row.prinsip_sort,
          rekomendasi: []
        };
      }

      const prinsip = prinsipMap[row.prinsip_id];

      // Build Rekomendasi
      if (row.rekomendasi_id) {
        prinsip.rekomendasi.push({
          id: row.rekomendasi_id,
          kode: row.rekomendasi_kode,
          nama: row.rekomendasi_nama,
          comply: row.comply || null,
          comply_explain: row.comply_explain || 'Comply',
          referensi: row.referensi || '',
          score: row.score || 0,
          comment: row.comment || '',
          sort: row.rekomendasi_sort
        });
      }
    }

    return Object.values(prinsipMap);
  }

  async createAssessment(data, userId) {
    const { db } = require('../../config/database');
    const trx = await db.transaction();

    try {
      const { v4: uuidv4 } = require('uuid');
      const assessmentId = uuidv4();

      // Create assessment
      await trx('pugki_assessment').insert({
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

      // Create hierarchy (Prinsip and Rekomendasi)
      if (data.prinsip && data.prinsip.length > 0) {
        await this.createHierarchy(trx, assessmentId, data.prinsip);
      }

      await trx.commit();

      // Return created assessment with hierarchy
      return await this.getAssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('Error creating PUGKI assessment:', error);
      throw error;
    }
  }

  async createHierarchy(trx, assessmentId, prinsip) {
    const { v4: uuidv4 } = require('uuid');

    for (const prinsipItem of prinsip) {
      const prinsipId = uuidv4();

      // Insert Prinsip
      await trx('pugki_prinsip').insert({
        id: prinsipId,
        pugki_assessment_id: assessmentId,
        kode: prinsipItem.kode,
        nama: prinsipItem.nama,
        sort: prinsipItem.sort || 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Insert Rekomendasi
      if (prinsipItem.rekomendasi && prinsipItem.rekomendasi.length > 0) {
        for (const rekomendasiItem of prinsipItem.rekomendasi) {
          const rekomendasiId = uuidv4();

          await trx('pugki_rekomendasi').insert({
            id: rekomendasiId,
            pugki_assessment_id: assessmentId,
            pugki_prinsip_id: prinsipId,
            kode: rekomendasiItem.kode,
            nama: rekomendasiItem.nama,
            comply: rekomendasiItem.comply || null,
            comply_explain: rekomendasiItem.comply_explain || 'Comply',
            referensi: rekomendasiItem.referensi || '',
            score: rekomendasiItem.score || 0,
            comment: rekomendasiItem.comment || '',
            sort: rekomendasiItem.sort || 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    }
  }

  async updateAssessment(id, data, userId) {
    const { db } = require('../../config/database');
    const trx = await db.transaction();

    try {
      // Check if assessment exists
      const assessment = await trx('pugki_assessment')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        throw new Error('PUGKI assessment not found');
      }

      // Update assessment basic info
      await trx('pugki_assessment')
        .where('id', id)
        .update({
          title: data.title,
          assessment_year: data.assessment_year,
          status: data.status,
          notes: data.notes || '',
          updated_at: new Date()
        });

      // Delete existing hierarchy
      await trx('pugki_prinsip').where('pugki_assessment_id', id).del();

      // Create new hierarchy
      if (data.prinsip && data.prinsip.length > 0) {
        await this.createHierarchy(trx, id, data.prinsip);
      }

      await trx.commit();

      return await this.getAssessmentById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error updating PUGKI assessment:', error);
      throw error;
    }
  }

  async deleteAssessment(id, userId) {
    return this.repository.deleteAssessment(id, userId);
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
