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
        'pugki_rekomendasi.pic_unit_bidang_id',
        'pugki_rekomendasi.sort as rekomendasi_sort',
        'pugki_rekomendasi.pic_submitted',
        'pugki_rekomendasi.pic_rejected',
        'pugki_rekomendasi.pic_rejection_note',
        'pugki_rekomendasi.pic_submitted_at',
        'unit_bidang.nama as pic_unit_bidang_nama'
      )
      .where('pugki_prinsip.pugki_assessment_id', assessmentId)
      .leftJoin('pugki_rekomendasi', 'pugki_rekomendasi.pugki_prinsip_id', 'pugki_prinsip.id')
      .leftJoin('unit_bidang', 'unit_bidang.id', 'pugki_rekomendasi.pic_unit_bidang_id')
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
          pic_unit_bidang_id: row.pic_unit_bidang_id || null,
          pic_unit_bidang_nama: row.pic_unit_bidang_nama || null,
          sort: row.rekomendasi_sort,
          evidence: [], // Will be populated below
          pic_submitted: row.pic_submitted || false,
          pic_rejected: row.pic_rejected || false,
          pic_rejection_note: row.pic_rejection_note || null,
          pic_submitted_at: row.pic_submitted_at || null
        });
      }
    }

    // Load evidence for all rekomendasi
    const prinsipList = Object.values(prinsipMap);
    const allRekomendasiIds = [];
    prinsipList.forEach(p => {
      p.rekomendasi.forEach(r => {
        allRekomendasiIds.push(r.id);
      });
    });

    if (allRekomendasiIds.length > 0) {
      const evidenceList = await this.repository.db('evidence')
        .select('*')
        .whereIn('target_id', allRekomendasiIds)
        .where('target_type', 'rekomendasi')
        .orderBy('created_at', 'desc');

      // Create a map of rekomendasi_id -> evidence array
      const evidenceMap = {};
      evidenceList.forEach(ev => {
        if (!evidenceMap[ev.target_id]) {
          evidenceMap[ev.target_id] = [];
        }
        evidenceMap[ev.target_id].push({
          id: ev.id,
          file_name: ev.original_filename || ev.filename,
          file_path: ev.file_path,
          file_type: ev.mime_type,
          file_size: ev.file_size,
          note: ev.note,
          uploaded_at: ev.created_at
        });
      });

      // Attach evidence to rekomendasi
      prinsipList.forEach(p => {
        p.rekomendasi.forEach(r => {
          r.evidence = evidenceMap[r.id] || [];
        });
      });
    }

    return prinsipList;
  }

  async createAssessment(data, userId) {
    const { db } = require('../../config/database');
    const trx = await db.transaction();

    try {
      const { v4: uuidv4 } = require('uuid');
      const assessmentId = uuidv4();

      // Check if any PICs are assigned
      const hasPICAssignments = (data.prinsip || []).some(prinsip =>
        (prinsip.rekomendasi || []).some(rekomendasi =>
          rekomendasi.pic_unit_bidang_id
        )
      );

      // Always set status to in_progress for new assessments (master data uses 'selesai')
      const initialStatus = data.is_master_data
        ? 'selesai'
        : 'in_progress';

      // Create assessment
      await trx('pugki_assessment').insert({
        id: assessmentId,
        title: data.title,
        assessment_year: data.assessment_year,
        unit_bidang_id: data.unit_bidang_id || null,
        status: initialStatus,
        notes: data.notes || '',
        is_master_data: data.is_master_data || false,
        assessor_id: data.assessor_id || userId,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create hierarchy (Prinsip and Rekomendasi)
      if (data.prinsip && data.prinsip.length > 0) {
        await this.createHierarchy(trx, assessmentId, data.prinsip);
      }

      await trx.commit();

      // Send email notifications for PIC assignments (after commit, in background)
      if (hasPICAssignments && !data.is_master_data) {
        setImmediate(async () => {
          try {
            await this.sendPICNotifications(assessmentId);
          } catch (emailError) {
            console.error('Failed to send PUGKI email notifications (non-blocking):', emailError);
          }
        });
      }

      // Return created assessment with hierarchy
      return await this.getAssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('Error creating PUGKI assessment:', error);
      throw error;
    }
  }

  async sendPICNotifications(assessmentId) {
    const { db } = require('../../config/database');
    const emailService = require('../../services/email.service');

    try {
      // Get assessment details
      const assessment = await db('pugki_assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        console.log('⚠️  PUGKI Assessment not found, skipping email');
        return;
      }

      // Get all rekomendasi with PIC assignments for this assessment
      const rekomendasi = await db('pugki_rekomendasi')
        .where('pugki_assessment_id', assessmentId)
        .whereNotNull('pic_unit_bidang_id')
        .select('*');

      if (rekomendasi.length === 0) {
        console.log('⚠️  No PUGKI rekomendasi with PIC assignments, skipping email');
        return;
      }

      console.log(`📧 Sending PUGKI notifications for ${rekomendasi.length} rekomendasi`);

      // Group by unit bidang
      const unitGroups = {};
      for (const rek of rekomendasi) {
        const unitId = rek.pic_unit_bidang_id;
        if (!unitGroups[unitId]) {
          const unit = await db('unit_bidang').where('id', unitId).first();
          unitGroups[unitId] = {
            unit_id: unitId,
            unit_nama: unit?.nama || 'Unknown',
            unit_kode: unit?.kode || 'Unknown',
            items: []
          };
        }
        unitGroups[unitId].items.push(rek);
      }

      // Get users for each unit and send emails
      for (const unitId of Object.keys(unitGroups)) {
        const users = await db('users')
          .where('unit_bidang_id', unitId)
          .andWhere('is_active', true)
          .select('*');

        console.log(`   📌 Unit "${unitGroups[unitId].unit_nama}": Found ${users.length} active user(s)`);

        if (users.length > 0) {
          const picUsers = users.map(user => ({
            ...user,
            unit_nama: unitGroups[unitId].unit_nama,
            unit_kode: unitGroups[unitId].unit_kode,
            assigned_items: unitGroups[unitId].items
          }));

          try {
            await emailService.sendPugkiAssessmentNotification(assessment, picUsers, unitGroups[unitId].items);
            console.log(`✅ PUGKI email sent to unit "${unitGroups[unitId].unit_nama}"`);
          } catch (emailError) {
            console.error(`⚠️  Failed to send PUGKI email to unit "${unitGroups[unitId].unit_nama}":`, emailError.message);
          }
        }
      }
    } catch (error) {
      console.error('Error sending PUGKI PIC notifications:', error);
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
            pic_unit_bidang_id: rekomendasiItem.pic_unit_bidang_id || null,
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

      // Update assessment basic info - only update fields that are provided
      const updateFields = {
        updated_at: new Date(),
        updated_by: userId
      };
      if (data.title !== undefined) updateFields.title = data.title;
      if (data.assessment_year !== undefined) updateFields.assessment_year = data.assessment_year;
      if (data.unit_bidang_id !== undefined) updateFields.unit_bidang_id = data.unit_bidang_id || null;
      if (data.status !== undefined) updateFields.status = data.status;
      if (data.notes !== undefined) updateFields.notes = data.notes || '';

      await trx('pugki_assessment')
        .where('id', id)
        .update(updateFields);

      // Only delete and recreate hierarchy if prinsip data is provided
      if (data.prinsip && data.prinsip.length > 0) {
        // Delete existing hierarchy
        await trx('pugki_prinsip').where('pugki_assessment_id', id).del();
        // Create new hierarchy
        await this.createHierarchy(trx, id, data.prinsip);
      }

      await trx.commit();

      // Auto-save to master data if status is 'selesai'
      if (data.status === 'selesai' && !data.is_master_data) {
        setImmediate(async () => {
          try {
            await this.autoSaveToMasterData(id);
          } catch (error) {
            console.error('Failed to auto-save to master data (non-blocking):', error);
          }
        });
      }

      // Calculate and save overall score when status changes to selesai
      if (data.status === 'selesai') {
        try {
          await this.calculateScore(id);
        } catch (error) {
          console.error('Failed to calculate score (non-blocking):', error);
        }

        // Auto-generate AOI if score below threshold
        setImmediate(async () => {
          try {
            await this.autoGenerateAOI(id);
          } catch (error) {
            console.error('Failed to auto-generate AOI (non-blocking):', error);
          }
        });
      }

      return await this.getAssessmentById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error updating PUGKI assessment:', error);
      throw error;
    }
  }

  async autoSaveToMasterData(assessmentId) {
    try {
      const { db } = require('../../config/database');

      // Get assessment
      const assessment = await db('pugki_assessment')
        .where('id', assessmentId)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        console.log('Assessment not found for auto-save');
        return;
      }

      // Only save if status is 'selesai' and NOT already master data
      if (assessment.status !== 'selesai' || assessment.is_master_data) {
        console.log('Assessment does not meet criteria for auto-save to master data');
        return;
      }

      // Get full assessment structure
      const fullData = await this.getAssessmentById(assessmentId);

      // Check if 100% similar master data already exists
      const similarMasterData = await this.find100PercentSimilarMasterData(fullData);

      if (similarMasterData) {
        console.log(`100% similar master data already exists: ${similarMasterData.title} (ID: ${similarMasterData.id})`);
        return;
      }

      if (!fullData || !fullData.prinsip || fullData.prinsip.length === 0) {
        console.log('No structure to save to master data');
        return;
      }

      // Create as master data
      const { v4: uuidv4 } = require('uuid');
      const masterDataId = uuidv4();
      const trx = await db.transaction();

      try {
        // Create master data assessment
        await trx('pugki_assessment').insert({
          id: masterDataId,
          title: assessment.title,
          assessment_year: assessment.assessment_year,
          status: 'selesai',
          notes: (assessment.notes || '') + ' [AUTO-SAVED FROM ASSESSMENT]',
          is_master_data: true,
          assessor_id: assessment.assessor_id,
          created_by: assessment.created_by,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Copy structure (prinsip & rekomendasi) - but clear assessment-specific data
        const masterDataPrinsip = fullData.prinsip.map(p => ({
          ...p,
          rekomendasi: (p.rekomendasi || []).map(r => ({
            kode: r.kode,
            nama: r.nama,
            comply_explain: r.comply_explain,
            referensi: r.referensi,
            // Clear assessment-specific fields
            score: null,
            comment: null,
            pic_unit_bidang_id: null
          }))
        }));

        await this.createHierarchy(trx, masterDataId, masterDataPrinsip);

        await trx.commit();
        console.log(`✅ Auto-saved to master data: ${masterDataId} (${assessment.title})`);
      } catch (error) {
        await trx.rollback();
        console.error('Failed to create master data in transaction:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to auto-save to master data:', error);
      // Non-blocking, don't throw
    }
  }

  async autoGenerateAOI(assessmentId) {
    try {
      const { db } = require('../../config/database');
      const { v4: uuidv4 } = require('uuid');

      // Get assessment with overall score
      const assessment = await db('pugki_assessment')
        .where('id', assessmentId)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        console.log('Assessment not found for auto-generate AOI');
        return;
      }

      // Only auto-generate if status is 'selesai' and NOT master data
      if (assessment.status !== 'selesai' || assessment.is_master_data) {
        console.log('Assessment does not meet criteria for auto-generate AOI');
        return;
      }

      // Get AOI settings for PUGKI
      const aoiSettings = await db('aoi_settings')
        .where('assessment_type', 'PUGKI')
        .first();

      const minimumScore = aoiSettings ? parseFloat(aoiSettings.min_score_threshold) / 100 : 0.80;
      const autoGenerateEnabled = aoiSettings ? aoiSettings.auto_generate_enabled : true;

      const overallScore = assessment.overall_score || 0;

      // Check if score is below threshold and auto-generate is enabled
      if (autoGenerateEnabled && overallScore < minimumScore) {
        console.log(`Overall score ${overallScore.toFixed(2)} is below minimum ${minimumScore.toFixed(2)}, creating PUGKI AOI...`);

        const aoiId = uuidv4();
        const now = new Date();

        await db('aoi_monitoring').insert({
          id: aoiId,
          assessment_type: 'PUGKI',
          title: `AOI - ${assessment.title}`,
          year: assessment.assessment_year || new Date().getFullYear(),
          status: 'draft',
          notes: `Auto-generated: Assessment score (${(overallScore * 100).toFixed(1)}%) is below threshold (${(minimumScore * 100).toFixed(0)}%). Requires improvement actions.`,
          created_by: assessment.assessor_id,
          created_at: now,
          updated_at: now
        });

        // Generate recommendations from rekomendasi with 'Explain' or low scores
        const rekomendasis = await db('pugki_rekomendasi')
          .leftJoin('pugki_prinsip', 'pugki_rekomendasi.pugki_prinsip_id', 'pugki_prinsip.id')
          .where('pugki_rekomendasi.pugki_assessment_id', assessmentId)
          .select(
            'pugki_rekomendasi.id',
            'pugki_rekomendasi.kode',
            'pugki_rekomendasi.nama',
            'pugki_rekomendasi.comply_explain',
            'pugki_rekomendasi.score',
            'pugki_prinsip.nama as prinsip_nama'
          );

        // Filter items that need improvement (Explain or low score)
        const needsImprovement = rekomendasis.filter(r => 
          r.comply_explain === 'Explain' || (r.score !== null && parseFloat(r.score) < minimumScore)
        );

        if (needsImprovement.length > 0) {
          const recommendations = needsImprovement.map((item, index) => ({
            id: uuidv4(),
            aoi_monitoring_id: aoiId,
            section: item.prinsip_nama || null,
            nomor_indikator: item.kode,
            rekomendasi: `Perbaikan diperlukan untuk: ${item.nama}${item.comply_explain === 'Explain' ? ' (Explain)' : ''}`,
            sort: index,
            created_at: now,
            updated_at: now
          }));

          await db('aoi_monitoring_recommendation').insert(recommendations);
          console.log(`Created ${recommendations.length} recommendations for PUGKI AOI ${aoiId}`);
        }

        console.log(`✅ AOI ${aoiId} created automatically for PUGKI assessment ${assessmentId}`);
      } else {
        console.log(`Score ${overallScore.toFixed(2)} is above threshold ${minimumScore.toFixed(2)}, no AOI needed`);
      }
    } catch (error) {
      console.error('Failed to auto-generate AOI:', error);
      // Non-blocking, don't throw
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

  /**
   * Find 100% similar master data based on full structure comparison
   * @param {Object} assessmentData - Full assessment data with prinsip/rekomendasi
   * @returns {Object|null} - Similar master data or null if not found
   */
  async find100PercentSimilarMasterData(assessmentData) {
    try {
      // Get all master data with same title + year as candidates
      const candidates = await this.db('pugki_assessment')
        .where('title', assessmentData.title)
        .where('assessment_year', assessmentData.assessment_year)
        .where('is_master_data', true)
        .whereNull('deleted_at');

      // Check each candidate for 100% structural similarity
      for (const candidate of candidates) {
        const candidateData = await this.getAssessmentById(candidate.id);

        if (this.isStructure100PercentSimilar(assessmentData, candidateData)) {
          return candidate;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding similar master data:', error);
      return null;
    }
  }

  /**
   * Compare two PUGKI assessment structures for 100% similarity
   * Only compares structure (prinsip, rekomendasi), not scores/comments
   * @param {Object} data1 - First assessment data
   * @param {Object} data2 - Second assessment data
   * @returns {boolean} - True if 100% similar
   */
  isStructure100PercentSimilar(data1, data2) {
    // Compare prinsip count
    if (!data1.prinsip || !data2.prinsip) return false;
    if (data1.prinsip.length !== data2.prinsip.length) return false;

    // Compare each prinsip
    for (let i = 0; i < data1.prinsip.length; i++) {
      const p1 = data1.prinsip[i];
      const p2 = data2.prinsip[i];

      // Compare prinsip kode + nama
      if (p1.kode !== p2.kode || p1.nama !== p2.nama) return false;

      // Compare rekomendasi count
      if (!p1.rekomendasi || !p2.rekomendasi) return false;
      if (p1.rekomendasi.length !== p2.rekomendasi.length) return false;

      // Compare each rekomendasi
      for (let j = 0; j < p1.rekomendasi.length; j++) {
        const r1 = p1.rekomendasi[j];
        const r2 = p2.rekomendasi[j];

        // Compare rekomendasi kode + nama
        if (r1.kode !== r2.kode || r1.nama !== r2.nama) return false;
      }
    }

    // All structure matches 100%
    return true;
  }

  /**
   * Submit tindak lanjut - marks PIC's rekomendasi as submitted
   * Only changes status to verifikasi when ALL PICs have submitted
   */
  async submitTindakLanjut(assessmentId, userId, userUnitBidangId) {
    const db = this.repository.db;

    try {
      // Check if assessment exists
      const assessment = await db('pugki_assessment')
        .where('id', assessmentId)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Validate status (must be in_progress or proses_tindak_lanjut)
      if (assessment.status !== 'in_progress' && assessment.status !== 'proses_tindak_lanjut') {
        throw new Error(`Cannot submit from status '${assessment.status}'`);
      }

      // Get user's unit_bidang_id from users table if not provided
      let unitBidangId = userUnitBidangId;
      if (!unitBidangId) {
        const user = await db('users').where('id', userId).first();
        unitBidangId = user?.unit_bidang_id;
      }

      // Check if user is admin
      const user = await db('users').where('id', userId).first();
      const isAdmin = user?.role === 'admin';

      if (isAdmin) {
        // Admin can force submit all - mark all rekomendasi as submitted
        await db('pugki_rekomendasi')
          .where('pugki_assessment_id', assessmentId)
          .whereNotNull('pic_unit_bidang_id')
          .update({
            pic_submitted: true,
            pic_submitted_at: new Date(),
            pic_rejected: false,
            pic_rejection_note: null,
            updated_at: new Date()
          });

        console.log(`✅ Admin ${userId} force-submitted all PICs for PUGKI assessment ${assessmentId}`);
      } else {
        // PIC submits only their assigned rekomendasi
        if (!unitBidangId) {
          throw new Error('User does not have a unit bidang assigned');
        }

        // Check if this PIC has already submitted
        const alreadySubmitted = await db('pugki_rekomendasi')
          .where('pugki_assessment_id', assessmentId)
          .where('pic_unit_bidang_id', unitBidangId)
          .where('pic_submitted', true)
          .first();

        if (alreadySubmitted) {
          throw new Error('Anda sudah submit tindak lanjut. Tidak dapat submit ulang kecuali ada rejection dari verifikator.');
        }

        // Mark all rekomendasi assigned to this PIC as submitted
        const updatedCount = await db('pugki_rekomendasi')
          .where('pugki_assessment_id', assessmentId)
          .where('pic_unit_bidang_id', unitBidangId)
          .update({
            pic_submitted: true,
            pic_submitted_at: new Date(),
            pic_rejected: false,
            pic_rejection_note: null,
            updated_at: new Date()
          });

        console.log(`✅ PIC ${userId} (Unit: ${unitBidangId}) submitted ${updatedCount} rekomendasi for PUGKI assessment ${assessmentId}`);
      }

      // Check if ALL PICs have submitted - if so, change status to verifikasi
      // Otherwise, keep status as in_progress
      const allPICsSubmitted = await this.checkAllPICsSubmitted(assessmentId);

      if (allPICsSubmitted) {
        await db('pugki_assessment')
          .where('id', assessmentId)
          .update({
            status: 'verifikasi',
            updated_at: new Date(),
            updated_by: userId
          });

        console.log(`✅ All PICs submitted! PUGKI assessment ${assessmentId} moved to verifikasi`);
        return { assessmentId, status: 'verifikasi', allPICsSubmitted: true };
      }

      // Keep status as in_progress until all PICs submit
      return { assessmentId, status: 'in_progress', allPICsSubmitted: false };
    } catch (error) {
      console.error('Error submitting PUGKI tindak lanjut:', error);
      throw error;
    }
  }

  /**
   * Check if all PICs have submitted their tindak lanjut
   */
  async checkAllPICsSubmitted(assessmentId) {
    const db = this.repository.db;

    // Get all unique unit_bidang_ids that have rekomendasi assigned
    const assignedUnits = await db('pugki_rekomendasi')
      .where('pugki_assessment_id', assessmentId)
      .whereNotNull('pic_unit_bidang_id')
      .distinct('pic_unit_bidang_id');

    if (assignedUnits.length === 0) {
      // No PICs assigned, can proceed to verifikasi
      return true;
    }

    // Check if there are any rekomendasi that are NOT submitted yet
    const unsubmittedCount = await db('pugki_rekomendasi')
      .where('pugki_assessment_id', assessmentId)
      .whereNotNull('pic_unit_bidang_id')
      .where(function() {
        this.where('pic_submitted', false).orWhereNull('pic_submitted');
      })
      .count('id as count')
      .first();

    return parseInt(unsubmittedCount.count) === 0;
  }

  /**
   * Reject PIC's submission during verification
   */
  async rejectPICSubmission(assessmentId, unitBidangId, rejectionNote, userId) {
    const db = this.repository.db;

    try {
      // Mark all rekomendasi for this unit bidang as rejected
      const updatedCount = await db('pugki_rekomendasi')
        .where('pugki_assessment_id', assessmentId)
        .where('pic_unit_bidang_id', unitBidangId)
        .update({
          pic_submitted: false,
          pic_rejected: true,
          pic_rejection_note: rejectionNote,
          updated_at: new Date()
        });

      // Update assessment status back to in_progress (so rejected PIC can re-submit)
      await db('pugki_assessment')
        .where('id', assessmentId)
        .update({
          status: 'in_progress',
          updated_at: new Date(),
          updated_by: userId
        });

      console.log(`✅ Rejected ${updatedCount} rekomendasi for unit ${unitBidangId} in PUGKI assessment ${assessmentId}`);

      return { success: true, updatedCount };
    } catch (error) {
      console.error('Error rejecting PIC submission:', error);
      throw error;
    }
  }
}

const { db } = require('../../config/database');
module.exports = new PugkiService(db);
