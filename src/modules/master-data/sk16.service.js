const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');

class SK16Service {
  constructor() {
    this.db = db;
  }

  /**
   * Get all SK16 master data assessments with basic info (no hierarchy for list view)
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

      // For each assessment, calculate overall score from responses (without loading full hierarchy)
      for (const assessment of assessments) {
        const scores = await this.db('response')
          .where('assessment_id', assessment.id)
          .select('score');

        if (scores.length > 0) {
          const totalScore = scores.reduce((sum, r) => sum + parseFloat(r.score || 0), 0);
          assessment.overall_score = (totalScore / scores.length).toFixed(2);
        } else {
          assessment.overall_score = 0;
        }
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
      await this.createHierarchy(trx, assessmentId, data.hierarchy, userId);

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
      await this.createHierarchy(trx, assessmentId, data.hierarchy, userId);

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
    // Single optimized query with JOINs to get all hierarchy data at once
    const results = await this.db('kka')
      .select(
        // KKA fields
        'kka.id as kka_id',
        'kka.kode as kka_kode',
        'kka.nama as kka_nama',
        'kka.deskripsi as kka_deskripsi',
        'kka.weight as kka_weight',
        'kka.sort as kka_sort',
        'kka.created_at as kka_created_at',
        'kka.updated_at as kka_updated_at',
        // Aspect fields
        'aspect.id as aspect_id',
        'aspect.kode as aspect_kode',
        'aspect.nama as aspect_nama',
        'aspect.weight as aspect_weight',
        'aspect.sort as aspect_sort',
        'aspect.created_at as aspect_created_at',
        'aspect.updated_at as aspect_updated_at',
        // Parameter fields
        'parameter.id as parameter_id',
        'parameter.kode as parameter_kode',
        'parameter.nama as parameter_nama',
        'parameter.weight as parameter_weight',
        'parameter.sort as parameter_sort',
        'parameter.created_at as parameter_created_at',
        'parameter.updated_at as parameter_updated_at',
        // Factor fields
        'factor.id as factor_id',
        'factor.kode as factor_kode',
        'factor.nama as factor_nama',
        'factor.deskripsi as factor_deskripsi',
        'factor.max_score as factor_max_score',
        'factor.sort as factor_sort',
        'factor.created_at as factor_created_at',
        'factor.updated_at as factor_updated_at',
        // Response fields
        'response.score',
        'response.comment'
      )
      .where('kka.assessment_id', assessmentId)
      .leftJoin('aspect', 'aspect.kka_id', 'kka.id')
      .leftJoin('parameter', 'parameter.aspect_id', 'aspect.id')
      .leftJoin('factor', 'factor.parameter_id', 'parameter.id')
      .leftJoin('response', function() {
        this.on('response.factor_id', '=', 'factor.id');
      })
      .where(function() {
        this.whereNull('response.assessment_id')
            .orWhere('response.assessment_id', assessmentId);
      })
      .orderBy([
        { column: 'kka.sort', order: 'asc' },
        { column: 'aspect.sort', order: 'asc' },
        { column: 'parameter.sort', order: 'asc' },
        { column: 'factor.sort', order: 'asc' }
      ]);

    // Get all evidence in a single query
    const factorIds = results
      .filter(r => r.factor_id)
      .map(r => r.factor_id)
      .filter((id, index, self) => self.indexOf(id) === index); // unique IDs

    let evidenceMap = {};
    if (factorIds.length > 0) {
      const allEvidence = await this.db('evidence')
        .select('*')
        .where('target_type', 'factor')
        .whereIn('target_id', factorIds);

      // Group evidence by factor_id
      evidenceMap = allEvidence.reduce((acc, ev) => {
        if (!acc[ev.target_id]) acc[ev.target_id] = [];
        acc[ev.target_id].push(ev);
        return acc;
      }, {});
    }

    // Transform flat results into nested hierarchy structure
    const kkaMap = {};

    for (const row of results) {
      // Build KKA
      if (!kkaMap[row.kka_id]) {
        kkaMap[row.kka_id] = {
          id: row.kka_id,
          kode: row.kka_kode,
          nama: row.kka_nama,
          deskripsi: row.kka_deskripsi,
          weight: row.kka_weight,
          sort: row.kka_sort,
          created_at: row.kka_created_at,
          updated_at: row.kka_updated_at,
          aspects: []
        };
      }

      const kka = kkaMap[row.kka_id];

      // Build Aspect
      if (row.aspect_id) {
        let aspect = kka.aspects.find(a => a.id === row.aspect_id);
        if (!aspect) {
          aspect = {
            id: row.aspect_id,
            kode: row.aspect_kode,
            nama: row.aspect_nama,
            weight: row.aspect_weight,
            sort: row.aspect_sort,
            created_at: row.aspect_created_at,
            updated_at: row.aspect_updated_at,
            parameters: []
          };
          kka.aspects.push(aspect);
        }

        // Build Parameter
        if (row.parameter_id) {
          let parameter = aspect.parameters.find(p => p.id === row.parameter_id);
          if (!parameter) {
            parameter = {
              id: row.parameter_id,
              kode: row.parameter_kode,
              nama: row.parameter_nama,
              weight: row.parameter_weight,
              sort: row.parameter_sort,
              created_at: row.parameter_created_at,
              updated_at: row.parameter_updated_at,
              factors: []
            };
            aspect.parameters.push(parameter);
          }

          // Build Factor
          if (row.factor_id) {
            let factor = parameter.factors.find(f => f.id === row.factor_id);
            if (!factor) {
              factor = {
                id: row.factor_id,
                kode: row.factor_kode,
                nama: row.factor_nama,
                deskripsi: row.factor_deskripsi,
                max_score: row.factor_max_score,
                sort: row.factor_sort,
                created_at: row.factor_created_at,
                updated_at: row.factor_updated_at,
                score: row.score ? parseFloat(row.score) : null,
                comment: row.comment || null,
                evidence: evidenceMap[row.factor_id] || []
              };
              parameter.factors.push(factor);
            }
          }
        }
      }
    }

    return Object.values(kkaMap);
  }

  /**
   * Create hierarchy with scores and evidence
   */
  async createHierarchy(trx, assessmentId, hierarchy, userId) {
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
                created_by: userId, // Use actual user ID
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
                  uploaded_by: userId, // Use actual user ID
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
