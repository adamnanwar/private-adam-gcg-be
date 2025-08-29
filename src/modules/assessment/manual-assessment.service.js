const assessmentRepository = require('./assessment.repository');
const logger = require('../../utils/logger');
const { ASSESSMENT_STATUS } = require('./assessment.entity');

class ManualAssessmentService {
  constructor() {
    this.repository = assessmentRepository;
  }

  async createManualAssessment(assessmentData, kkaData, userId) {
    const trx = await this.repository.db.transaction();
    
    try {
      // 1. Create Assessment
      const assessment = {
        organization_name: assessmentData.organization_name,
        assessment_date: assessmentData.assessment_date,
        assessor_id: assessmentData.assessor_id || userId,
        status: assessmentData.status || ASSESSMENT_STATUS.DRAFT,
        notes: assessmentData.notes || ''
      };

      const createdAssessment = await trx('assessment')
        .insert(assessment)
        .returning('*')
        .then(rows => rows[0]);

      // 2. Create mapping for client IDs to database IDs
      const idMapping = {
        kka: {},
        aspect: {},
        parameter: {},
        factor: {}
      };

      // 3. Process each KKA
      for (const kka of kkaData) {
        // Create assessment_kka
        const assessmentKka = await trx('assessment_kka')
          .insert({
            assessment_id: createdAssessment.id,
            client_id: kka.id,
            kode: kka.kode || '',
            nama: kka.nama || '',
            deskripsi: kka.deskripsi || '',
            weight: kka.weight || 1,
            sort: 0
          })
          .returning('*')
          .then(rows => rows[0]);

        idMapping.kka[kka.id] = assessmentKka.id;

        // Process aspects
        if (kka.aspects && kka.aspects.length > 0) {
          for (const aspect of kka.aspects) {
            const assessmentAspect = await trx('assessment_aspect')
              .insert({
                assessment_id: createdAssessment.id,
                assessment_kka_id: assessmentKka.id,
                client_id: aspect.id,
                kode: aspect.kode || '',
                nama: aspect.nama || '',
                weight: aspect.weight || 1,
                sort: aspect.sort || 0
              })
              .returning('*')
              .then(rows => rows[0]);

            idMapping.aspect[aspect.id] = assessmentAspect.id;

            // Process parameters
            if (aspect.parameters && aspect.parameters.length > 0) {
              for (const parameter of aspect.parameters) {
                const assessmentParameter = await trx('assessment_parameter')
                  .insert({
                    assessment_id: createdAssessment.id,
                    assessment_aspect_id: assessmentAspect.id,
                    client_id: parameter.id,
                    kode: parameter.kode || '',
                    nama: parameter.nama || '',
                    weight: parameter.weight || 1,
                    sort: parameter.sort || 0
                  })
                  .returning('*')
                  .then(rows => rows[0]);

                idMapping.parameter[parameter.id] = assessmentParameter.id;

                // Process factors
                if (parameter.factors && parameter.factors.length > 0) {
                  for (const factor of parameter.factors) {
                    const assessmentFactor = await trx('assessment_factor')
                      .insert({
                        assessment_id: createdAssessment.id,
                        assessment_parameter_id: assessmentParameter.id,
                        client_id: factor.id,
                        kode: factor.kode || '',
                        nama: factor.nama || '',
                        deskripsi: factor.deskripsi || '',
                        max_score: factor.max_score || 1,
                        sort: factor.sort || 0
                      })
                      .returning('*')
                      .then(rows => rows[0]);

                    idMapping.factor[factor.id] = assessmentFactor.id;

                    // Persist PIC mapping if provided
                    if (factor.pic_user_id) {
                      await trx('pic_map').insert({
                        id: require('uuid').v4(),
                        target_type: 'factor',
                        target_id: assessmentFactor.id,
                        pic_user_id: factor.pic_user_id
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      await trx.commit();
      
      logger.info(`Manual assessment created: ${createdAssessment.id} by user: ${userId}`);
      return {
        assessment: createdAssessment,
        idMapping: idMapping
      };

    } catch (error) {
      await trx.rollback();
      logger.error('Error in createManualAssessment:', error);
      throw error;
    }
  }

  async submitManualResponses(assessmentId, responses, idMapping, userId) {
    const trx = await this.repository.db.transaction();
    
    try {
      // Process each response
      for (const response of responses) {
        // Map client factor ID to database factor ID
        const assessmentFactorId = idMapping.factor[response.factor_id];
        
        if (!assessmentFactorId) {
          logger.warn(`Factor ID ${response.factor_id} not found in mapping, skipping response`);
          continue;
        }

        // Check if response already exists
        const existingResponse = await trx('response')
          .where({
            assessment_id: assessmentId,
            assessment_factor_id: assessmentFactorId
          })
          .first();

        if (existingResponse) {
          // Update existing response
          await trx('response')
            .where('id', existingResponse.id)
            .update({
              score: response.score,
              comment: response.comment || '',
              created_by: userId,
              updated_at: new Date()
            });
        } else {
          // Create new response
          await trx('response')
            .insert({
              assessment_id: assessmentId,
              assessment_factor_id: assessmentFactorId,
              client_factor_id: response.factor_id,
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

  async getManualAssessmentStructure(assessmentId) {
    try {
      // Get assessment
      const assessment = await this.repository.db('assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Get KKAs with full hierarchy
      const kkas = await this.repository.db('assessment_kka')
        .where('assessment_id', assessmentId)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'asc');

      // Build full hierarchy
      const fullKkas = await Promise.all(
        kkas.map(async (kka) => {
          const aspects = await this.repository.db('assessment_aspect')
            .where('assessment_kka_id', kka.id)
            .orderBy('sort', 'asc')
            .orderBy('created_at', 'asc');

          const aspectsWithParams = await Promise.all(
            aspects.map(async (aspect) => {
              const parameters = await this.repository.db('assessment_parameter')
                .where('assessment_aspect_id', aspect.id)
                .orderBy('sort', 'asc')
                .orderBy('created_at', 'asc');

              const parametersWithFactors = await Promise.all(
                parameters.map(async (parameter) => {
                  const factors = await this.repository.db('assessment_factor as af')
                    .select('af.*')
                    .where('af.assessment_parameter_id', parameter.id)
                    .orderBy('af.sort', 'asc')
                    .orderBy('af.created_at', 'asc');

                  // Map factors
                  const mappedFactors = factors.map(f => ({
                    id: f.id,
                    assessment_id: f.assessment_id,
                    assessment_parameter_id: f.assessment_parameter_id,
                    client_id: f.client_id,
                    kode: f.kode,
                    nama: f.nama,
                    deskripsi: f.deskripsi,
                    max_score: f.max_score,
                    sort: f.sort,
                    created_at: f.created_at,
                    updated_at: f.updated_at
                  }));

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
          'assessment_factor.client_id as factor_client_id'
        ])
        .leftJoin('assessment_factor', 'response.assessment_factor_id', 'assessment_factor.id')
        .where('response.assessment_id', assessmentId);

      // Map back to client IDs for frontend
      const mappedResponses = responses.map(response => ({
        factor_id: response.factor_client_id || response.client_factor_id,
        score: response.score,
        comment: response.comment || ''
      }));

      return mappedResponses;

    } catch (error) {
      logger.error('Error in getManualAssessmentResponses:', error);
      throw error;
    }
  }
}

module.exports = new ManualAssessmentService();

