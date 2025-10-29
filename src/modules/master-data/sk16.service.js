const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');

class SK16Service {
  constructor() {
    this.db = db;
  }

  /**
   * Get all SK16 master data assessments with full hierarchy and scores
   */
  async getAllSK16Assessments() {
    try {
      // Get all SK16 assessments (marked with [SK16] prefix in notes)
      const assessments = await this.db('assessment')
        .select(
          'assessment.id',
          'assessment.title as organization_name', // Map title to organization_name for compatibility
          'assessment.assessment_date',
          'assessment.status',
          'assessment.notes',
          'assessment.created_at',
          'assessment.updated_at',
          'users.name as assessor_name' // Use 'name' column instead of 'full_name'
        )
        .leftJoin('users', 'assessment.assessor_id', 'users.id')
        .where('assessment.notes', 'like', '[SK16]%')
        .orderBy('assessment.assessment_date', 'desc');

      // For each assessment, get the full hierarchy with scores
      for (const assessment of assessments) {
        const hierarchy = await this.getAssessmentHierarchy(assessment.id);
        assessment.hierarchy = hierarchy;

        // Calculate overall score
        assessment.overall_score = this.calculateOverallScore(hierarchy);
      }

      return assessments;
    } catch (error) {
      console.error('[SK16Service] Error getting SK16 assessments:', error);
      throw error;
    }
  }

  /**
   * Get single SK16 assessment by ID with full details
   */
  async getSK16AssessmentById(assessmentId) {
    try {
      const assessment = await this.db('assessment')
        .select(
          'assessment.*',
          'users.name as assessor_name', // Use 'name' column instead of 'full_name'
          'users.email as assessor_email'
        )
        .leftJoin('users', 'assessment.assessor_id', 'users.id')
        .where('assessment.id', assessmentId)
        .where('assessment.notes', 'like', '[SK16]%')
        .first();

      if (!assessment) {
        throw new Error('SK16 assessment not found');
      }

      // Get full hierarchy with scores and evidence
      const hierarchy = await this.getAssessmentHierarchy(assessmentId);
      assessment.hierarchy = hierarchy;
      assessment.overall_score = this.calculateOverallScore(hierarchy);

      return assessment;
    } catch (error) {
      console.error('[SK16Service] Error getting SK16 assessment:', error);
      throw error;
    }
  }

  /**
   * Create new SK16 master data assessment
   */
  async createSK16Assessment(data, userId) {
    const trx = await this.db.transaction();

    try {
      const assessmentId = uuidv4();

      // Create assessment with status 'completed' and [SK16] prefix in notes
      const notes = data.notes ? `[SK16] ${data.notes}` : '[SK16] Master Data';

      await trx('assessment').insert({
        id: assessmentId,
        title: data.organization_name, // Use 'title' column instead of 'organization_name'
        assessment_date: data.assessment_date,
        assessor_id: userId,
        status: 'selesai', // Use 'selesai' instead of 'completed' to match constraint
        notes: notes,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create hierarchy (KKA, Aspect, Parameter, Factor)
      await this.createHierarchy(trx, assessmentId, data.hierarchy);

      await trx.commit();

      // Return created assessment
      return await this.getSK16AssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('[SK16Service] Error creating SK16 assessment:', error);
      throw error;
    }
  }

  /**
   * Update SK16 assessment
   */
  async updateSK16Assessment(assessmentId, data, userId) {
    const trx = await this.db.transaction();

    try {
      // Check if assessment exists and is SK16
      const assessment = await trx('assessment')
        .where('id', assessmentId)
        .where('notes', 'like', '[SK16]%')
        .first();

      if (!assessment) {
        throw new Error('SK16 assessment not found');
      }

      // Preserve [SK16] prefix in notes
      const notes = data.notes ? `[SK16] ${data.notes}` : '[SK16] Master Data';

      // Update assessment basic info
      await trx('assessment')
        .where('id', assessmentId)
        .update({
          title: data.organization_name, // Use 'title' column
          assessment_date: data.assessment_date,
          notes: notes,
          updated_at: new Date()
        });

      // Delete existing hierarchy
      await trx('kka').where('assessment_id', assessmentId).del(); // Use 'kka' table instead of 'assessment_kka'

      // Create new hierarchy
      await this.createHierarchy(trx, assessmentId, data.hierarchy);

      await trx.commit();

      return await this.getSK16AssessmentById(assessmentId);
    } catch (error) {
      await trx.rollback();
      console.error('[SK16Service] Error updating SK16 assessment:', error);
      throw error;
    }
  }

  /**
   * Delete SK16 assessment
   */
  async deleteSK16Assessment(assessmentId) {
    try {
      // Check if assessment exists and is SK16
      const assessment = await this.db('assessment')
        .where('id', assessmentId)
        .where('notes', 'like', '[SK16]%')
        .first();

      if (!assessment) {
        throw new Error('SK16 assessment not found');
      }

      // Delete assessment (cascade will delete all related data)
      await this.db('assessment').where('id', assessmentId).del();

      return { success: true, message: 'SK16 assessment deleted successfully' };
    } catch (error) {
      console.error('[SK16Service] Error deleting SK16 assessment:', error);
      throw error;
    }
  }

  /**
   * Get assessment hierarchy with scores and evidence
   */
  async getAssessmentHierarchy(assessmentId) {
    const kkas = await this.db('kka') // Use 'kka' table instead of 'assessment_kka'
      .select('*')
      .where('assessment_id', assessmentId)
      .orderBy('sort', 'asc');

    for (const kka of kkas) {
      const aspects = await this.db('aspect') // Use 'aspect' table instead of 'assessment_aspect'
        .select('*')
        .where('kka_id', kka.id) // Use 'kka_id' instead of 'assessment_kka_id'
        .orderBy('sort', 'asc');

      for (const aspect of aspects) {
        const parameters = await this.db('parameter') // Use 'parameter' table instead of 'assessment_parameter'
          .select('*')
          .where('aspect_id', aspect.id) // Use 'aspect_id' instead of 'assessment_aspect_id'
          .orderBy('sort', 'asc');

        for (const parameter of parameters) {
          const factors = await this.db('factor') // Use 'factor' table instead of 'assessment_factor'
            .select('*')
            .where('parameter_id', parameter.id) // Use 'parameter_id' instead of 'assessment_parameter_id'
            .orderBy('sort', 'asc');

          for (const factor of factors) {
            // Get score from response table
            const response = await this.db('response')
              .select('score', 'comment')
              .where('assessment_id', assessmentId)
              .where('factor_id', factor.id) // Use 'factor_id' instead of 'assessment_factor_id'
              .first();

            factor.score = response ? parseFloat(response.score) : null;
            factor.comment = response ? response.comment : null;

            // Get evidence
            const evidence = await this.db('evidence')
              .select('*')
              .where('target_type', 'factor') // Use 'factor' instead of 'assessment_factor'
              .where('target_id', factor.id);

            factor.evidence = evidence || [];
          }

          parameter.factors = factors;
        }

        aspect.parameters = parameters;
      }

      kka.aspects = aspects;
    }

    return kkas;
  }

  /**
   * Create hierarchy with scores and evidence
   */
  async createHierarchy(trx, assessmentId, hierarchy) {
    for (const kka of hierarchy) {
      const kkaId = uuidv4();

      await trx('kka').insert({ // Use 'kka' table instead of 'assessment_kka'
        id: kkaId,
        assessment_id: assessmentId,
        kode: kka.kode,
        nama: kka.nama,
        deskripsi: kka.deskripsi || null,
        weight: kka.weight || 1.00,
        sort: kka.sort || 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      for (const aspect of kka.aspects || []) {
        const aspectId = uuidv4();

        await trx('aspect').insert({ // Use 'aspect' table instead of 'assessment_aspect'
          id: aspectId,
          assessment_id: assessmentId,
          kka_id: kkaId, // Use 'kka_id' instead of 'assessment_kka_id'
          kode: aspect.kode,
          nama: aspect.nama,
          weight: aspect.weight || 1.00,
          sort: aspect.sort || 0,
          created_at: new Date(),
          updated_at: new Date()
        });

        for (const parameter of aspect.parameters || []) {
          const parameterId = uuidv4();

          await trx('parameter').insert({ // Use 'parameter' table instead of 'assessment_parameter'
            id: parameterId,
            assessment_id: assessmentId,
            kka_id: kkaId, // Add kka_id
            aspect_id: aspectId, // Use 'aspect_id' instead of 'assessment_aspect_id'
            kode: parameter.kode,
            nama: parameter.nama,
            weight: parameter.weight || 1.00,
            sort: parameter.sort || 0,
            created_at: new Date(),
            updated_at: new Date()
          });

          for (const factor of parameter.factors || []) {
            const factorId = uuidv4();

            await trx('factor').insert({ // Use 'factor' table instead of 'assessment_factor'
              id: factorId,
              assessment_id: assessmentId,
              kka_id: kkaId, // Add kka_id
              aspect_id: aspectId, // Add aspect_id
              parameter_id: parameterId, // Use 'parameter_id' instead of 'assessment_parameter_id'
              kode: factor.kode,
              nama: factor.nama,
              deskripsi: factor.deskripsi || null,
              max_score: factor.max_score || 1,
              sort: factor.sort || 0,
              created_at: new Date(),
              updated_at: new Date()
            });

            // Insert score if provided
            if (factor.score !== null && factor.score !== undefined) {
              await trx('response').insert({
                id: uuidv4(),
                assessment_id: assessmentId,
                factor_id: factorId, // Use 'factor_id' instead of 'assessment_factor_id'
                score: factor.score,
                comment: factor.comment || null,
                created_by: assessmentId, // Use assessment ID as created_by for now
                created_at: new Date(),
                updated_at: new Date()
              });
            }

            // Insert evidence if provided
            if (factor.evidence && factor.evidence.length > 0) {
              for (const ev of factor.evidence) {
                await trx('evidence').insert({
                  id: uuidv4(),
                  target_type: 'factor', // Use 'factor' instead of 'assessment_factor'
                  target_id: factorId,
                  kind: ev.kind || 'document',
                  uri: ev.uri,
                  original_name: ev.original_name,
                  file_size: ev.file_size || 0,
                  mime_type: ev.mime_type || 'application/octet-stream',
                  note: ev.note || null,
                  uploaded_by: assessmentId, // Use assessment ID as uploaded_by for now
                  created_at: new Date(),
                  updated_at: new Date()
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Calculate overall score from hierarchy
   */
  calculateOverallScore(hierarchy) {
    if (!hierarchy || hierarchy.length === 0) return 0;

    let totalScore = 0;
    let totalFactors = 0;

    for (const kka of hierarchy) {
      for (const aspect of kka.aspects || []) {
        for (const parameter of aspect.parameters || []) {
          for (const factor of parameter.factors || []) {
            if (factor.score !== null && factor.score !== undefined) {
              totalScore += parseFloat(factor.score);
              totalFactors++;
            }
          }
        }
      }
    }

    return totalFactors > 0 ? (totalScore / totalFactors).toFixed(2) : 0;
  }
}

module.exports = new SK16Service();
