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
        'acgs_question.comment',
        'acgs_question.pic_unit_bidang_id'
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
            pic_unit_bidang_id: row.pic_unit_bidang_id || null,
            sort: row.question_sort
          });
        }
      }
    }

    // Fetch evidence for all questions
    const questionIds = [];
    for (const section of Object.values(sectionMap)) {
      for (const parameter of section.parameters) {
        for (const question of parameter.questions) {
          questionIds.push(question.id);
        }
      }
    }

    // Get evidence for these questions
    // Note: target_type is mapped from 'acgs_question' to 'aoi' by evidence service
    const evidenceList = questionIds.length > 0
      ? await this.db('evidence')
          .select('evidence.*')
          .whereIn('evidence.target_id', questionIds)
          .where(function() {
            // Accept both mapped value ('aoi') and original value ('acgs_question')
            this.where('evidence.target_type', 'aoi')
                .orWhere('evidence.target_type', 'acgs_question');
          })
          .orderBy('evidence.created_at', 'desc')
      : [];

    // Create a map of question_id -> evidence array
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

    // Attach evidence to questions
    for (const section of Object.values(sectionMap)) {
      for (const parameter of section.parameters) {
        for (const question of parameter.questions) {
          question.evidence = evidenceMap[question.id] || [];
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

      // Check if any PICs are assigned
      const hasPICAssignments = (data.sections || []).some(section =>
        (section.parameters || []).some(parameter =>
          (parameter.questions || []).some(question =>
            question.pic_unit_bidang_id
          )
        )
      );

      // Always set status to in_progress for new assessments (master data uses 'selesai')
      const initialStatus = data.is_master_data
        ? 'selesai'
        : 'in_progress';

      // Create assessment
      await trx('acgs_assessment').insert({
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

      // Create hierarchy (Sections, Parameters, Questions)
      if (data.sections && data.sections.length > 0) {
        await this.createHierarchy(trx, assessmentId, data.sections);
      }

      await trx.commit();

      // Send email notifications to PICs if any were assigned and not master data
      if (hasPICAssignments && !data.is_master_data) {
        setImmediate(async () => {
          try {
            await this.sendPICNotifications(assessmentId);
          } catch (emailError) {
            console.error('Failed to send ACGS email notifications (non-blocking):', emailError);
          }
        });
      }

      // Return created assessment with hierarchy
      return await this.getAssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('Error creating ACGS assessment:', error);
      throw error;
    }
  }

  async sendPICNotifications(assessmentId) {
    try {
      const { db } = require('../../config/database');

      // Get assessment details
      const assessment = await db('acgs_assessment')
        .where('id', assessmentId)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Get all questions with PIC assignments
      const questionsWithPIC = await db('acgs_question as q')
        .join('acgs_parameter as p', 'q.acgs_parameter_id', 'p.id')
        .join('acgs_section as s', 'q.acgs_section_id', 's.id')
        .join('unit_bidang as u', 'q.pic_unit_bidang_id', 'u.id')
        .where('q.acgs_assessment_id', assessmentId)
        .whereNotNull('q.pic_unit_bidang_id')
        .select(
          'q.id as question_id',
          'q.kode as question_kode',
          'q.nama as question_nama',
          'p.nama as parameter_nama',
          's.nama as section_nama',
          'q.pic_unit_bidang_id',
          'u.nama as unit_nama',
          'u.kode as unit_kode'
        );

      if (questionsWithPIC.length === 0) {
        console.log('No PIC assignments found for notifications');
        return;
      }

      // Group by unit_bidang
      const picGroups = {};
      for (const question of questionsWithPIC) {
        const unitId = question.pic_unit_bidang_id;
        if (!picGroups[unitId]) {
          picGroups[unitId] = {
            unit_id: unitId,
            unit_nama: question.unit_nama,
            unit_kode: question.unit_kode,
            questions: []
          };
        }
        picGroups[unitId].questions.push(question);
      }

      // Get users for each unit and send emails
      for (const unitId in picGroups) {
        const group = picGroups[unitId];

        // Get users in this unit
        const users = await db('users')
          .where('unit_bidang_id', unitId)
          .whereNull('deleted_at')
          .select('id', 'email', 'name');

        if (users.length === 0) {
          console.log(`No users found for unit ${group.unit_nama}`);
          continue;
        }

        // Send email to each user
        for (const user of users) {
          if (!user.email) continue;

          try {
            // Here you would call your email service
            // await emailService.sendAcgsAssessmentNotification(user.email, {
            //   userName: user.name,
            //   assessmentTitle: assessment.title,
            //   unitName: group.unit_nama,
            //   questionCount: group.questions.length,
            //   questions: group.questions
            // });

            console.log(`Would send ACGS notification email to ${user.email} for ${group.questions.length} questions`);
          } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in sendPICNotifications:', error);
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
                pic_unit_bidang_id: questionItem.pic_unit_bidang_id || null,
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

      await trx('acgs_assessment')
        .where('id', id)
        .update(updateFields);

      // Only delete and recreate hierarchy if sections data is provided
      if (data.sections && data.sections.length > 0) {
        // Delete existing hierarchy
        await trx('acgs_section').where('acgs_assessment_id', id).del();
        // Create new hierarchy
        await this.createHierarchy(trx, id, data.sections);
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

      // Auto-generate AOI if status is 'selesai' and score below threshold
      if (data.status === 'selesai') {
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
      console.error('Error updating ACGS assessment:', error);
      throw error;
    }
  }

  async autoSaveToMasterData(assessmentId) {
    try {
      const { db } = require('../../config/database');

      // Get assessment
      const assessment = await db('acgs_assessment')
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

      if (!fullData || !fullData.sections || fullData.sections.length === 0) {
        console.log('No structure to save to master data');
        return;
      }

      // Create as master data
      const { v4: uuidv4 } = require('uuid');
      const masterDataId = uuidv4();
      const trx = await db.transaction();

      try {
        // Create master data assessment
        await trx('acgs_assessment').insert({
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

        // Copy structure (sections, parameters, questions) - but clear assessment-specific data
        const masterDataSections = fullData.sections.map(s => ({
          ...s,
          parameters: (s.parameters || []).map(p => ({
            ...p,
            questions: (p.questions || []).map(q => ({
              kode: q.kode,
              nama: q.nama,
              pertanyaan: q.pertanyaan || q.nama,
              bobot: q.bobot,
              // Clear assessment-specific fields
              answer: null,
              jawaban: null,
              score: null,
              referensi: q.referensi || '',
              referensi_panduan: '',
              implementasi_bukti: '',
              link_dokumen: '',
              comment: '',
              pic_unit_bidang_id: null,
              sort: q.sort
            }))
          }))
        }));

        await this.createHierarchy(trx, masterDataId, masterDataSections);

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
      const assessment = await db('acgs_assessment')
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

      // Get AOI settings for ACGS
      const aoiSettings = await db('aoi_settings')
        .where('assessment_type', 'ACGS')
        .first();

      const minimumScore = aoiSettings ? parseFloat(aoiSettings.min_score_threshold) / 100 : 0.80;
      const autoGenerateEnabled = aoiSettings ? aoiSettings.auto_generate_enabled : true;

      const overallScore = assessment.overall_score || 0;

      // Check if score is below threshold and auto-generate is enabled
      if (autoGenerateEnabled && overallScore < minimumScore) {
        console.log(`Overall score ${overallScore.toFixed(2)} is below minimum ${minimumScore.toFixed(2)}, creating ACGS AOI...`);

        const aoiId = uuidv4();
        const now = new Date();

        await db('aoi_monitoring').insert({
          id: aoiId,
          assessment_type: 'ACGS',
          title: `AOI - ${assessment.title}`,
          year: assessment.assessment_year || new Date().getFullYear(),
          status: 'draft',
          notes: `Auto-generated: Assessment score (${(overallScore * 100).toFixed(1)}%) is below threshold (${(minimumScore * 100).toFixed(0)}%). Requires improvement actions.`,
          created_by: assessment.assessor_id,
          created_at: now,
          updated_at: now
        });

        // Generate recommendations from questions with 'No' answer
        const questions = await db('acgs_question')
          .leftJoin('acgs_parameter', 'acgs_question.acgs_parameter_id', 'acgs_parameter.id')
          .leftJoin('acgs_section', 'acgs_question.acgs_section_id', 'acgs_section.id')
          .where('acgs_question.acgs_assessment_id', assessmentId)
          .select(
            'acgs_question.id',
            'acgs_question.kode',
            'acgs_question.nama',
            'acgs_question.answer',
            'acgs_question.score',
            'acgs_parameter.nama as parameter_nama',
            'acgs_section.nama as section_nama'
          );

        // Filter questions that need improvement (answer = 'No')
        const needsImprovement = questions.filter(q => q.answer === 'No');

        if (needsImprovement.length > 0) {
          const recommendations = needsImprovement.map((item, index) => ({
            id: uuidv4(),
            aoi_monitoring_id: aoiId,
            section: item.section_nama || null,
            nomor_indikator: item.kode,
            rekomendasi: `Perbaikan diperlukan untuk: ${item.nama} (${item.parameter_nama || 'Parameter'})`,
            sort: index,
            created_at: now,
            updated_at: now
          }));

          await db('aoi_monitoring_recommendation').insert(recommendations);
          console.log(`Created ${recommendations.length} recommendations for ACGS AOI ${aoiId}`);
        }

        console.log(`✅ AOI ${aoiId} created automatically for ACGS assessment ${assessmentId}`);
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

  /**
   * Find 100% similar master data based on full structure comparison
   * @param {Object} assessmentData - Full assessment data with sections/parameters/questions
   * @returns {Object|null} - Similar master data or null if not found
   */
  async find100PercentSimilarMasterData(assessmentData) {
    try {
      // Get all master data with same title + year as candidates
      const candidates = await this.db('acgs_assessment')
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
   * Compare two ACGS assessment structures for 100% similarity
   * Only compares structure (sections, parameters, questions), not answers/scores
   * @param {Object} data1 - First assessment data
   * @param {Object} data2 - Second assessment data
   * @returns {boolean} - True if 100% similar
   */
  isStructure100PercentSimilar(data1, data2) {
    // Compare sections count
    if (!data1.sections || !data2.sections) return false;
    if (data1.sections.length !== data2.sections.length) return false;

    // Compare each section
    for (let i = 0; i < data1.sections.length; i++) {
      const s1 = data1.sections[i];
      const s2 = data2.sections[i];

      // Compare section kode + nama
      if (s1.kode !== s2.kode || s1.nama !== s2.nama) return false;

      // Compare parameters count
      if (!s1.parameters || !s2.parameters) return false;
      if (s1.parameters.length !== s2.parameters.length) return false;

      // Compare each parameter
      for (let j = 0; j < s1.parameters.length; j++) {
        const p1 = s1.parameters[j];
        const p2 = s2.parameters[j];

        // Compare parameter kode + nama
        if (p1.kode !== p2.kode || p1.nama !== p2.nama) return false;

        // Compare questions count
        if (!p1.questions || !p2.questions) return false;
        if (p1.questions.length !== p2.questions.length) return false;

        // Compare each question
        for (let k = 0; k < p1.questions.length; k++) {
          const q1 = p1.questions[k];
          const q2 = p2.questions[k];

          // Compare question kode + pertanyaan text
          if (q1.kode !== q2.kode || q1.pertanyaan !== q2.pertanyaan) return false;
        }
      }
    }

    // All structure matches 100%
    return true;
  }

  /**
   * Submit tindak lanjut - changes status to verifikasi
   */
  async submitTindakLanjut(assessmentId, userId) {
    const { db } = require('../../config/database');

    try {
      // Check if assessment exists
      const assessment = await db('acgs_assessment')
        .where('id', assessmentId)
        .whereNull('deleted_at')
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Validate status (must be in_progress)
      if (assessment.status !== 'in_progress') {
        throw new Error(`Cannot submit from status '${assessment.status}'`);
      }

      // Update status to verifikasi
      await db('acgs_assessment')
        .where('id', assessmentId)
        .update({
          status: 'verifikasi',
          updated_at: new Date()
        });

      console.log(`✅ ACGS assessment ${assessmentId} submitted for verification by user ${userId}`);

      return { assessmentId, status: 'verifikasi' };
    } catch (error) {
      console.error('Error submitting ACGS tindak lanjut:', error);
      throw error;
    }
  }
}

const { db } = require('../../config/database');
module.exports = new AcgsService(db);
