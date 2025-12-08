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
   * Get AOI monitoring by ID with recommendations and evidence
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

      // Get all recommendation IDs
      const recommendationIds = recommendations.map(r => r.id);
      console.log(`[AOI DEBUG] Found ${recommendations.length} recommendations, IDs:`, recommendationIds);

      // Get evidence for these recommendations
      // Note: target_type is mapped from 'aoi_recommendation' to 'aoi' by evidence service
      // Also, assessment_id might not be saved due to FK constraint issues
      const evidenceList = recommendationIds.length > 0
        ? await db('evidence')
            .select('evidence.*')
            .whereIn('evidence.target_id', recommendationIds)
            .where(function() {
              // Accept both mapped value ('aoi') and original value ('aoi_recommendation')
              this.where('evidence.target_type', 'aoi')
                  .orWhere('evidence.target_type', 'aoi_recommendation');
            })
            .orderBy('evidence.created_at', 'desc')
        : [];
      
      console.log(`[AOI DEBUG] Found ${evidenceList.length} evidence records`);
      if (evidenceList.length > 0) {
        console.log(`[AOI DEBUG] First evidence:`, JSON.stringify(evidenceList[0], null, 2));
      }

      // Create a map of recommendation_id -> evidence array
      const evidenceMap = {};
      for (const ev of evidenceList) {
        if (!evidenceMap[ev.target_id]) {
          evidenceMap[ev.target_id] = [];
        }
        evidenceMap[ev.target_id].push({
          id: ev.id,
          // Support both old schema (original_name) and new schema (original_filename, filename)
          file_name: ev.original_filename || ev.filename || ev.original_name || ev.file_name || 'Unknown',
          file_path: ev.file_path || ev.uri,
          file_type: ev.mime_type || ev.file_type,
          file_size: ev.file_size,
          note: ev.note,
          uploaded_at: ev.created_at
        });
      }

      // Attach evidence to recommendations
      for (const recommendation of recommendations) {
        recommendation.evidence = evidenceMap[recommendation.id] || [];
      }

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
        status: data.status || 'in_progress', // Manual creation defaults to in_progress, auto-gen uses draft
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
   * Uses upsert pattern to preserve recommendation IDs and linked evidence
   */
  async update(id, data, userId) {
    console.log(`[AOI UPDATE] Starting update for AOI ${id}`);
    console.log(`[AOI UPDATE] Data received:`, JSON.stringify(data, null, 2));
    
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

      // Update recommendations if provided - use upsert pattern to preserve IDs
      if (data.recommendations !== undefined) {
        // Get existing recommendation IDs
        const existingRecs = await trx('aoi_monitoring_recommendation')
          .where('aoi_monitoring_id', id)
          .select('id');
        const existingRecIds = new Set(existingRecs.map(r => r.id));

        // Track which IDs are in the new data
        const newRecIds = new Set();

        for (let index = 0; index < data.recommendations.length; index++) {
          const rec = data.recommendations[index];
          
          if (rec.id && existingRecIds.has(rec.id)) {
            // Update existing recommendation - preserve the ID
            newRecIds.add(rec.id);
            await trx('aoi_monitoring_recommendation')
              .where('id', rec.id)
              .update({
                section: rec.section || null,
                no: rec.no || null,
                nomor_indikator: rec.nomor_indikator || null,
                rekomendasi: rec.rekomendasi,
                tindaklanjut_1: rec.tindaklanjut_1 || null,
                tindaklanjut_2: rec.tindaklanjut_2 || null,
                pic: rec.pic || null,
                sort: rec.sort !== undefined ? rec.sort : index,
                updated_at: now
              });
          } else {
            // Insert new recommendation
            const newId = rec.id || uuidv4();
            newRecIds.add(newId);
            await trx('aoi_monitoring_recommendation').insert({
              id: newId,
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
            });
          }
        }

        // Delete recommendations that are no longer in the list
        // Also delete their associated evidence to avoid orphans
        const idsToDelete = [...existingRecIds].filter(id => !newRecIds.has(id));
        if (idsToDelete.length > 0) {
          // Delete evidence first (foreign key safety)
          await trx('evidence')
            .whereIn('target_id', idsToDelete)
            .where('target_type', 'aoi_recommendation')
            .delete();
          
          // Then delete recommendations
          await trx('aoi_monitoring_recommendation')
            .whereIn('id', idsToDelete)
            .delete();
        }
      }

      await trx.commit();
      console.log(`✅ AOI ${id} updated successfully with status: ${data.status || 'unchanged'}`);

      // Return updated AOI with recommendations
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error('❌ Error updating AOI:', error.message);
      console.error('❌ Error stack:', error.stack);
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

  /**
   * Get settings by assessment type
   */
  async getSettings(assessmentType) {
    try {
      const db = getConnection();

      const settings = await db('aoi_settings')
        .where('assessment_type', assessmentType)
        .first();

      // If not found, return default settings
      if (!settings) {
        return {
          assessment_type: assessmentType,
          min_score_threshold: 80.00,
          auto_generate_enabled: true
        };
      }

      return settings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update settings by assessment type
   */
  async updateSettings(assessmentType, data) {
    try {
      const db = getConnection();
      const now = new Date();

      const updateData = {
        updated_at: now
      };

      if (data.min_score_threshold !== undefined) {
        updateData.min_score_threshold = data.min_score_threshold;
      }

      if (data.auto_generate_enabled !== undefined) {
        updateData.auto_generate_enabled = data.auto_generate_enabled;
      }

      // Upsert settings
      const existing = await db('aoi_settings')
        .where('assessment_type', assessmentType)
        .first();

      if (existing) {
        await db('aoi_settings')
          .where('assessment_type', assessmentType)
          .update(updateData);
      } else {
        await db('aoi_settings').insert({
          assessment_type: assessmentType,
          ...updateData,
          created_at: now
        });
      }

      return await this.getSettings(assessmentType);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AOIMonitoringService();
