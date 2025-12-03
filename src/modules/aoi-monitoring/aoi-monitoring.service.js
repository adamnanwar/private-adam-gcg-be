const { getConnection } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class AOIMonitoringService {
  /**
   * Get all AOI monitoring by type with pagination and filters
   */
  async getAllByType(assessmentType, page = 1, limit = 10, filters = {}) {
    try {
      const db = getConnection();
      let query = db('aoi_monitoring')
        .select('*')
        .where('assessment_type', assessmentType)
        .whereNull('deleted_at');

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('title', 'ilike', `%${filters.search}%`)
              .orWhere('notes', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.year) {
        query = query.where('year', filters.year);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      // Get total count
      const totalQuery = query.clone().clearSelect().count('* as count');
      const total = await totalQuery.first();

      // Apply pagination
      const offset = (page - 1) * limit;
      const data = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          total: parseInt(total.count),
          page,
          limit,
          pages: Math.ceil(parseInt(total.count) / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get AOI monitoring by ID with recommendations
   */
  async getById(id) {
    try {
      const db = getConnection();

      // Get main AOI data
      const aoi = await db('aoi_monitoring')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!aoi) {
        return null;
      }

      // Get recommendations
      const recommendations = await db('aoi_monitoring_recommendation')
        .where('aoi_monitoring_id', id)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'asc');

      aoi.recommendations = recommendations;

      return aoi;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new AOI monitoring with recommendations
   */
  async create(data, userId) {
    const db = getConnection();
    const trx = await db.transaction();

    try {
      const aoiId = uuidv4();
      const now = new Date();

      // Insert main AOI data
      await trx('aoi_monitoring').insert({
        id: aoiId,
        assessment_type: data.assessment_type,
        title: data.title,
        year: data.year || new Date().getFullYear(),
        status: data.status || 'draft',
        notes: data.notes || null,
        created_by: userId,
        created_at: now,
        updated_at: now
      });

      // Insert recommendations if provided
      if (data.recommendations && data.recommendations.length > 0) {
        const recommendations = data.recommendations.map((rec, index) => ({
          id: uuidv4(),
          aoi_monitoring_id: aoiId,
          section: rec.section || null,
          no: rec.no || null,
          nomor_indikator: rec.nomor_indikator || null,
          rekomendasi: rec.rekomendasi,
          tindaklanjut_1: rec.tindaklanjut_1 || null,
          tindaklanjut_2: rec.tindaklanjut_2 || null,
          pic: rec.pic || null,
          sort: rec.sort !== undefined ? rec.sort : index,
          created_at: now,
          updated_at: now
        }));

        await trx('aoi_monitoring_recommendation').insert(recommendations);
      }

      await trx.commit();

      // Return created AOI with recommendations
      return await this.getById(aoiId);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Update AOI monitoring with recommendations
   */
  async update(id, data, userId) {
    const db = getConnection();
    const trx = await db.transaction();

    try {
      // Check if AOI exists
      const existing = await trx('aoi_monitoring')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        await trx.rollback();
        return null;
      }

      const now = new Date();

      // Update main AOI data
      await trx('aoi_monitoring')
        .where('id', id)
        .update({
          title: data.title !== undefined ? data.title : existing.title,
          year: data.year !== undefined ? data.year : existing.year,
          status: data.status !== undefined ? data.status : existing.status,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          updated_at: now
        });

      // Update recommendations if provided
      if (data.recommendations !== undefined) {
        // Delete old recommendations
        await trx('aoi_monitoring_recommendation')
          .where('aoi_monitoring_id', id)
          .delete();

        // Insert new recommendations
        if (data.recommendations.length > 0) {
          const recommendations = data.recommendations.map((rec, index) => ({
            id: uuidv4(),
            aoi_monitoring_id: id,
            section: rec.section || null,
            no: rec.no || null,
            nomor_indikator: rec.nomor_indikator || null,
            rekomendasi: rec.rekomendasi,
            tindaklanjut_1: rec.tindaklanjut_1 || null,
            tindaklanjut_2: rec.tindaklanjut_2 || null,
            pic: rec.pic || null,
            sort: rec.sort !== undefined ? rec.sort : index,
            created_at: now,
            updated_at: now
          }));

          await trx('aoi_monitoring_recommendation').insert(recommendations);
        }
      }

      await trx.commit();

      // Return updated AOI with recommendations
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Soft delete AOI monitoring
   */
  async delete(id) {
    try {
      const db = getConnection();

      const result = await db('aoi_monitoring')
        .where('id', id)
        .whereNull('deleted_at')
        .update({
          deleted_at: new Date()
        });

      return result > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get statistics by type
   */
  async getStatsByType(assessmentType) {
    try {
      const db = getConnection();

      const stats = await db('aoi_monitoring')
        .select('status')
        .count('* as count')
        .where('assessment_type', assessmentType)
        .whereNull('deleted_at')
        .groupBy('status');

      const total = await db('aoi_monitoring')
        .where('assessment_type', assessmentType)
        .whereNull('deleted_at')
        .count('* as count')
        .first();

      const statusStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {});

      return {
        total: parseInt(total.count),
        by_status: statusStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AOIMonitoringService();
