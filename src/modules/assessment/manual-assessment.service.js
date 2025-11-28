const assessmentRepository = require('./assessment.repository');
const logger = require('../../utils/logger-simple');
const { ASSESSMENT_STATUS } = require('./assessment.entity');
// Temporarily use crypto instead of uuid to avoid import issues
const crypto = require('crypto');
function uuidv4() {
  return crypto.randomUUID();
}

// Utility function to check if string is valid UUID
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

class ManualAssessmentService {
  constructor() {
    this.repository = assessmentRepository;
  }

  async createManualAssessment(assessmentData, kkaData, userId) {
    console.log('createManualAssessment called with:', { assessmentData, kkaData, userId });
    const trx = await this.repository.db.transaction();

    try {
      const assessmentId = uuidv4();

      // Check if any PICs are assigned in the hierarchy
      const hasPICAssignments = (kkaData || []).some(kka =>
        (kka.aspects || []).some(aspect =>
          (aspect.parameters || []).some(parameter =>
            (parameter.factors || []).some(factor =>
              factor.pic_unit_bidang_id || factor.pic_user_id
            )
          )
        )
      );

      // If PICs are assigned during creation, set status to in_progress
      const initialStatus = hasPICAssignments
        ? ASSESSMENT_STATUS.IN_PROGRESS
        : (assessmentData.status || ASSESSMENT_STATUS.DRAFT);

      const assessment = {
        id: assessmentId,
        title: assessmentData.title || assessmentData.organization_name, // Accept both for compatibility
        assessment_date: assessmentData.assessment_date,
        assessor_id: assessmentData.assessor_id || userId,
        status: initialStatus,
        notes: assessmentData.notes || '',
        assessment_type: 'SK16', // Set assessment type for SK16 manual assessments
        created_at: new Date(),
        updated_at: new Date()
      };

      await trx('assessment').insert(assessment);

      const hierarchy = await this._persistHierarchy(trx, assessmentId, kkaData || [], userId);

      await trx.commit();

      logger.info(`Manual assessment created: ${assessmentId} by user: ${userId}`);

      // Send email notifications for PIC assignments (after commit, in background)
      setImmediate(async () => {
        try {
          const notificationService = require('../pic/pic-notification.service');
          await notificationService.sendAssessmentPICNotifications(assessmentId);
        } catch (emailError) {
          logger.error('Failed to send email notifications (non-blocking):', emailError);
        }
      });

      return {
        assessment,
        hierarchy
      };

    } catch (error) {
      await trx.rollback();
      logger.error('Error in createManualAssessment:', error);
      logger.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });

      // Throw more descriptive error
      if (error.code === '23502') { // NOT NULL violation
        throw new Error(`Missing required field: ${error.column || 'unknown'}`);
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error(`Invalid reference: ${error.detail || 'foreign key constraint'}`);
      }
      if (error.code === '23505') { // Unique violation
        throw new Error(`Duplicate entry: ${error.detail || 'unique constraint'}`);
      }

      throw new Error(`Failed to create assessment: ${error.message}`);
    }
  }

  async _persistHierarchy(trx, assessmentId, kkaData, userId) {
    const hierarchyIds = {
        kka: {},
        aspect: {},
        parameter: {},
        factor: {}
      };

        for (const kka of kkaData) {
      // Check if ID is a valid UUID, otherwise generate new one
      const kkaId = (kka.id && isValidUUID(kka.id)) ? kka.id : uuidv4();
      hierarchyIds.kka[kka.id || kkaId] = { clientId: kka.id || kkaId, dbId: kkaId };

      await trx('kka').insert({
        id: kkaId,
        assessment_id: assessmentId,
        kode: kka.kode || 'KKA-' + kkaId.substring(0, 8),  // Generate default if not provided
        nama: kka.nama || 'Unnamed KKA',  // Default name if not provided
        deskripsi: kka.deskripsi || null,
        weight: kka.weight || null,
        sort: kka.sort || 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      for (const aspect of kka.aspects || []) {
        // Check if ID is a valid UUID, otherwise generate new one
        const aspectId = (aspect.id && isValidUUID(aspect.id)) ? aspect.id : uuidv4();
        hierarchyIds.aspect[aspect.id || aspectId] = { clientId: aspect.id || aspectId, dbId: aspectId };

        await trx('aspect').insert({
          id: aspectId,
          assessment_id: assessmentId,
          kka_id: kkaId,
          kode: aspect.kode || 'ASP-' + aspectId.substring(0, 8),  // Generate default if not provided
          nama: aspect.nama || 'Unnamed Aspect',  // Default name if not provided
          weight: aspect.weight || 1,
          sort: aspect.sort || 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });

        for (const parameter of aspect.parameters || []) {
          // Check if ID is a valid UUID, otherwise generate new one
          const parameterId = (parameter.id && isValidUUID(parameter.id)) ? parameter.id : uuidv4();
          hierarchyIds.parameter[parameter.id || parameterId] = { clientId: parameter.id || parameterId, dbId: parameterId };

          await trx('parameter').insert({
            id: parameterId,
            assessment_id: assessmentId,
            kka_id: kkaId,
            aspect_id: aspectId,
            kode: parameter.kode || 'PAR-' + parameterId.substring(0, 8),  // Generate default if not provided
            nama: parameter.nama || 'Unnamed Parameter',  // Default name if not provided
            weight: parameter.weight || 1,
            sort: parameter.sort || 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });

          for (const factor of parameter.factors || []) {
            // Check if ID is a valid UUID, otherwise generate new one
            const factorId = (factor.id && isValidUUID(factor.id)) ? factor.id : uuidv4();
            hierarchyIds.factor[factor.id || factorId] = {
              clientId: factor.id || factorId,
              dbId: factorId,
              unit_bidang_id: factor.pic_unit_bidang_id || null,
              pic_user_id: factor.pic_user_id || null
            };

            // Create hierarchical code: KKA-Aspect-Parameter-Factor
            const hierarchicalKode = `${kka.kode || '1'}-${aspect.kode || '1'}-${parameter.kode || '1'}-${factor.kode || '1'}`;

            await trx('factor').insert({
              id: factorId,
              assessment_id: assessmentId,
              kka_id: kkaId,
              aspect_id: aspectId,
              parameter_id: parameterId,
              kode: hierarchicalKode,  // Use hierarchical code to ensure uniqueness
              nama: factor.nama || 'Unnamed Factor',  // Default name if not provided
              deskripsi: factor.deskripsi || null,
              score: factor.score || 0,  // Renamed from weight
              max_score: factor.max_score || 1,
              sort: factor.sort || 0,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            });

                      if (factor.pic_unit_bidang_id) {
              await trx('pic_map').insert({
                              id: uuidv4(),
                assessment_id: assessmentId,
                              target_type: 'factor',
                              target_id: factorId,
                              unit_bidang_id: factor.pic_unit_bidang_id,
                pic_user_id: factor.pic_user_id || null,
                              status: 'assigned',
                              created_at: new Date(),
                updated_at: new Date(),
                created_by: userId
              });
            }
          }
        }
      }
    }

      return {
      kkas: Object.values(hierarchyIds.kka),
      aspects: Object.values(hierarchyIds.aspect),
      parameters: Object.values(hierarchyIds.parameter),
      factors: Object.values(hierarchyIds.factor)
    };
  }

  async submitManualResponses(assessmentId, responses, idMapping, userId) {
    const trx = await this.repository.db.transaction();
    
    try {
      for (const response of responses) {
        const assessmentFactorId = idMapping.factor[response.factor_id];
        
        if (!assessmentFactorId) {
          logger.warn(`Factor ID ${response.factor_id} not found in mapping, skipping response`);
          continue;
        }

        const existingResponse = await trx('response')
          .where({
            assessment_id: assessmentId,
            factor_id: assessmentFactorId
          })
          .first();

        if (existingResponse) {
          await trx('response')
            .where('id', existingResponse.id)
            .update({
              score: response.score,
              comment: response.comment || '',
              created_by: userId,
              updated_at: new Date()
            });
        } else {
          await trx('response')
            .insert({
              assessment_id: assessmentId,
              factor_id: assessmentFactorId,
              score: response.score,
              comment: response.comment || '',
              created_by: userId
            });
        }
      }

      await trx.commit();
      logger.info(`Manual responses submitted for assessment: ${assessmentId} by user: ${userId}`);
      return true;

    } catch (error) {
      await trx.rollback();
      logger.error('Error in submitManualResponses:', error);
      throw error;
    }
  }

  async updateManualAssessment(assessmentId, payload, userId) {
    const db = this.repository.db;
    const trx = await db.transaction();

    try {
      await trx('assessment')
        .where('id', assessmentId)
        .update({
          title: payload.title || payload.organization_name, // Accept both for compatibility
          notes: payload.notes,
          assessment_date: payload.assessment_date,
          status: payload.status || 'draft',
          updated_at: new Date(),
        });

      await trx('response').where('assessment_id', assessmentId).del();
      await trx('pic_map').where('assessment_id', assessmentId).del();
      await trx('factor').where('assessment_id', assessmentId).del();
      await trx('parameter').where('assessment_id', assessmentId).del();
      await trx('aspect').where('assessment_id', assessmentId).del();
      await trx('kka').where('assessment_id', assessmentId).del();

      const hierarchy = await this._persistHierarchy(trx, assessmentId, payload.kkas || [], userId);

      await trx.commit();
      logger.info(`Manual assessment ${assessmentId} updated by ${userId}`);

      return { hierarchy };
    } catch (error) {
      await trx.rollback();
      logger.error('Error in updateManualAssessment service:', error);
      throw error;
    }
  }

  async getManualAssessmentStructure(assessmentId) {
    try {
      // Get assessment
      const assessment = await this.repository.db('assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Get KKAs that are assigned to this assessment directly from kka table
      const kkasResult = await this.repository.db('kka')
        .where('assessment_id', assessmentId)
        .where('kka.is_active', true)
        .select('kka.*')
        .orderBy('kka.created_at', 'asc');

      let kkas = kkasResult || [];
      
      if (kkas.length === 0) {
        logger.info(`No KKAs found for assessment ${assessmentId} - user needs to select KKAs`);
        // Return empty array for KKAs - user needs to select them
        return {
          assessment,
          kkas: [],
          responses: []
        };
      } else {
        logger.info(`Found ${kkas.length} KKAs assigned to assessment ${assessmentId}`);
      }

      // Build full hierarchy
      const fullKkas = await Promise.all(
        kkas.map(async (kka) => {
          // Get all active aspects for this KKA
          const aspects = await this.repository.db('aspect')
            .select('aspect.*')
            .where('aspect.kka_id', kka.id)
            .where('aspect.is_active', true)
            .orderBy('aspect.created_at', 'asc');

          const aspectsWithParams = await Promise.all(
            aspects.map(async (aspect) => {
              // Get all active parameters for this aspect
              const parameters = await this.repository.db('parameter')
                .select('parameter.*')
                .where('parameter.aspect_id', aspect.id)
                .where('parameter.is_active', true)
                .orderBy('parameter.created_at', 'asc');

              const parametersWithFactors = await Promise.all(
                parameters.map(async (parameter) => {
                  // Get all active factors for this parameter
                  const factors = await this.repository.db('factor')
                    .select('factor.*')
                    .where('factor.parameter_id', parameter.id)
                    .where('factor.is_active', true)
                    .orderBy('factor.created_at', 'asc');

                  // Get PIC assignments for these factors
                  const factorIds = factors.map(f => f.id);
                  const picAssignments = factorIds.length > 0 
                    ? await this.repository.db('pic_map')
                        .select(
                          'pic_map.id',
                          'pic_map.target_id',
                          'pic_map.target_type',
                          'pic_map.unit_bidang_id',
                          'pic_map.pic_user_id',
                          'pic_map.status',
                          'unit_bidang.kode as unit_kode',
                          'unit_bidang.nama as unit_nama'
                        )
                        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
                        .where('pic_map.assessment_id', assessmentId)
                        .whereIn('pic_map.target_id', factorIds)
                        .where('pic_map.target_type', 'factor')
                    : [];

                  // Create a map of factor_id -> unit_bidang_id
                  const picMap = {};
                  picAssignments.forEach(pic => {
                    picMap[pic.target_id] = pic.unit_bidang_id;
                  });

                  // Get existing responses for these factors
                  const existingResponses = factorIds.length > 0 
                    ? await this.repository.db('response')
                        .select('factor_id', 'score', 'comment')
                        .whereIn('factor_id', factorIds)
                        .where('assessment_id', assessmentId)
                    : [];

                  // Create a map of factor_id -> response
                  const responseMap = {};
                  existingResponses.forEach(response => {
                    responseMap[response.factor_id] = response;
                  });

                  // Get evidence for these factors
                  const evidenceList = factorIds.length > 0
                    ? await this.repository.db('evidence')
                        .select('evidence.*')
                        .whereIn('evidence.target_id', factorIds)
                        .where('evidence.target_type', 'factor')  // Fixed: use 'factor' not 'kka'
                        .where('evidence.assessment_id', assessmentId)
                        .orderBy('evidence.created_at', 'desc')
                    : [];

                  // Create a map of factor_id -> evidence array
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
                      description: ev.note,
                      uploaded_at: ev.created_at
                    });
                  });

                  // Map factors with PIC assignments, existing responses, and evidence
                  const mappedFactors = factors.map(f => {
                    const picAssignment = picAssignments.find(pic => pic.target_id === f.id);
                    const existingResponse = responseMap[f.id];
                    const factorEvidence = evidenceMap[f.id] || [];
                    return {
                      id: f.id,
                      parameter_id: f.parameter_id,
                      kode: f.kode,
                      nama: f.nama,
                      deskripsi: f.deskripsi,
                      score: f.score || 0,  // Renamed from weight to score
                      max_score: f.max_score,
                      sort: f.sort,
                      response_score: existingResponse?.score || 0,
                      comment: existingResponse?.comment || '',
                      evidence: factorEvidence,  // Add evidence array
                      pic_unit_bidang: picAssignment ? {
                        id: picAssignment.unit_bidang_id,
                        kode: picAssignment.unit_kode,
                        nama: picAssignment.unit_nama
                      } : null,
                      pic_unit_bidang_id: picAssignment?.unit_bidang_id || null,
                      pic_assignment_status: picAssignment?.status || 'assigned',
                      created_at: f.created_at,
                      updated_at: f.updated_at
                    };
                  });

                  return { ...parameter, factors: mappedFactors };
                })
              );

              return { ...aspect, parameters: parametersWithFactors };
            })
          );

          return { ...kka, aspects: aspectsWithParams };
        })
      );

      return {
        assessment,
        kkas: fullKkas
      };

    } catch (error) {
      logger.error('Error in getManualAssessmentStructure:', error);
      throw error;
    }
  }

  async getManualAssessmentResponses(assessmentId) {
    try {
      const responses = await this.repository.db('response')
        .select([
          'response.*',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama'
        ])
        .leftJoin('factor', 'response.factor_id', 'factor.id')
        .where('response.assessment_id', assessmentId);

      // Map responses for frontend
      const mappedResponses = responses.map(response => ({
        factor_id: response.factor_id, // Use direct factor ID since we use master data
        score: response.score,
        comment: response.comment || ''
      }));

      return mappedResponses;

    } catch (error) {
      logger.error('Error in getManualAssessmentResponses:', error);
      throw error;
    }
  }

  async getManualFactorsMissingEvidence(assessmentId, factorIds, userId, unitBidangId) {
    const assignments = await this.repository.db('pic_map')
      .select('pic_map.target_id as factor_id', 'pic_map.unit_bidang_id', 'pic_map.pic_user_id')
      .where('pic_map.assessment_id', assessmentId)
      .whereIn('pic_map.target_id', factorIds)
      .where('pic_map.target_type', 'factor');

    const allowedFactorIds = new Set();
    assignments.forEach(row => {
      if (row.pic_user_id === userId) {
        allowedFactorIds.add(row.factor_id);
      }
      if (unitBidangId && row.unit_bidang_id === unitBidangId) {
        allowedFactorIds.add(row.factor_id);
      }
    });

    const evidenceEntries = await this.repository.db('evidence')
      .select('target_id')
      .count({ total: '*' })
      .whereIn('target_id', factorIds)
      .andWhere('target_type', 'factor')
      .groupBy('target_id');

    const evidenceMap = evidenceEntries.reduce((acc, row) => {
      acc[row.target_id] = Number(row.total) || 0;
      return acc;
    }, {});

    return factorIds
      .filter(factorId => !allowedFactorIds.has(factorId) || !evidenceMap[factorId])
      .map(factorId => ({
        factor_id: factorId,
        hasEvidence: Boolean(evidenceMap[factorId]),
        allowed: allowedFactorIds.has(factorId)
      }));
  }
}

module.exports = new ManualAssessmentService();

