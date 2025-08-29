const { db } = require('../../config/database');
const logger = require('../../utils/logger');

class AssessmentRepository {
  constructor() {
    this.db = db;
  }

  // Assessment Methods
  async findAllAssessments(limit = 50, offset = 0, search = '', status = '', assessorId = '') {
    try {
      // Get unique assessments from assessment_kka table
      let query = this.db('assessment_kka')
        .select(
          'assessment_kka.assessment_id',
          'assessment_kka.kode as manual_kka_kode',
          'assessment_kka.nama as manual_kka_nama',
          'assessment_kka.created_at',
          'assessment_kka.updated_at'
        )
        .distinct('assessment_kka.assessment_id')
        .orderBy('assessment_kka.created_at', 'desc');
      
      if (search) {
        query = query.where(function() {
          this.where('assessment_kka.kode', 'ilike', `%${search}%`)
            .orWhere('assessment_kka.nama', 'ilike', `%${search}%`);
        });
      }
      
      const assessments = await query
        .limit(limit)
        .offset(offset);

      // For now, return basic structure - we can enhance this later
      return assessments.map(assessment => ({
        id: assessment.assessment_id,
        organization_name: assessment.manual_kka_nama || 'N/A',
        status: 'draft', // Default status since we don't have it in assessment_* tables
        created_at: assessment.created_at,
        updated_at: assessment.updated_at,
        manual_kka_kode: assessment.manual_kka_kode,
        manual_kka_nama: assessment.manual_kka_nama,
        assessor_name: 'N/A', // We'll need to get this from users table if needed
        assessor_email: 'N/A'
      }));
    } catch (error) {
      logger.error('Error finding assessments:', error);
      throw error;
    }
  }

  async findAssessmentById(id) {
    try {
      const assessment = await this.db('assessment')
        .select(
          'assessment.*',
          'users.name as assessor_name',
          'users.email as assessor_email'
        )
        .leftJoin('users', 'assessment.assessor_id', 'users.id')
        .where('assessment.id', id)
        .first();
      
      return assessment;
    } catch (error) {
      logger.error('Error finding assessment by ID:', error);
      throw error;
    }
  }

  async createAssessment(assessmentData) {
    try {
      const [assessment] = await this.db('assessment')
        .insert({
          ...assessmentData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      
      return assessment;
    } catch (error) {
      logger.error('Error creating assessment:', error);
      throw error;
    }
  }

  async updateAssessment(id, assessmentData) {
    try {
      const [assessment] = await this.db('assessment')
        .where('id', id)
        .update({
          ...assessmentData,
          updated_at: new Date()
        })
        .returning('*');
      
      return assessment;
    } catch (error) {
      logger.error('Error updating assessment:', error);
      throw error;
    }
  }

  async deleteAssessment(id) {
    try {
      // Check if assessment has responses
      const responseCount = await this.db('response').where('assessment_id', id).count('* as count').first();
      if (parseInt(responseCount.count) > 0) {
        throw new Error('Cannot delete assessment with existing responses');
      }
      
      const deleted = await this.db('assessment').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      logger.error('Error deleting assessment:', error);
      throw error;
    }
  }

  async countAssessments(search = '', status = '', assessorId = '') {
    try {
      let query = this.db('assessment_kka').countDistinct('assessment_id as count');
      
      if (search) {
        query = query.where(function() {
          this.where('kode', 'ilike', `%${search}%`)
            .orWhere('nama', 'ilike', `%${search}%`);
        });
      }
      
      const result = await query.first();
      return parseInt(result.count);
    } catch (error) {
      logger.error('Error counting assessments:', error);
      throw error;
    }
  }

  // Response Methods
  async findResponsesByAssessment(assessmentId) {
    try {
      return await this.db('response')
        .select(
          'response.*',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'factor.max_score',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'parameter.weight as parameter_weight',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'aspect.weight as aspect_weight',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama',
          'kka.weight as kka_weight',
          'users.name as created_by_name'
        )
        .leftJoin('factor', 'response.factor_id', 'factor.id')
        .leftJoin('parameter', 'factor.parameter_id', 'parameter.id')
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .leftJoin('users', 'response.created_by', 'users.id')
        .where('response.assessment_id', assessmentId)
        .orderBy('kka.created_at', 'asc')
        .orderBy('aspect.sort', 'asc')
        .orderBy('parameter.sort', 'asc')
        .orderBy('factor.sort', 'asc');
    } catch (error) {
      logger.error('Error finding responses by assessment:', error);
      throw error;
    }
  }

  async findResponseById(id) {
    try {
      const response = await this.db('response')
        .select(
          'response.*',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'factor.max_score'
        )
        .leftJoin('factor', 'response.factor_id', 'factor.id')
        .where('response.id', id)
        .first();
      
      return response;
    } catch (error) {
      logger.error('Error finding response by ID:', error);
      throw error;
    }
  }

  async findResponseByAssessmentAndFactor(assessmentId, factorId) {
    try {
      const response = await this.db('response')
        .where({
          assessment_id: assessmentId,
          factor_id: factorId
        })
        .first();
      
      return response;
    } catch (error) {
      logger.error('Error finding response by assessment and factor:', error);
      throw error;
    }
  }

  async createResponse(responseData) {
    try {
      const [response] = await this.db('response')
        .insert({
          ...responseData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      
      return response;
    } catch (error) {
      logger.error('Error creating response:', error);
      throw error;
    }
  }

  async updateResponse(id, responseData) {
    try {
      const [response] = await this.db('response')
        .where('id', id)
        .update({
          ...responseData,
          updated_at: new Date()
        })
        .returning('*');
      
      return response;
    } catch (error) {
      logger.error('Error updating response:', error);
      throw error;
    }
  }

  async upsertResponse(assessmentId, factorId, responseData) {
    try {
      // Try to find existing response
      const existingResponse = await this.findResponseByAssessmentAndFactor(assessmentId, factorId);
      
      if (existingResponse) {
        // Update existing response
        return await this.updateResponse(existingResponse.id, responseData);
      } else {
        // Create new response
        return await this.createResponse({
          assessment_id: assessmentId,
          factor_id: factorId,
          ...responseData
        });
      }
    } catch (error) {
      logger.error('Error upserting response:', error);
      throw error;
    }
  }

  async deleteResponse(id) {
    try {
      const deleted = await this.db('response').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      logger.error('Error deleting response:', error);
      throw error;
    }
  }

  async bulkUpsertResponses(assessmentId, responses) {
    try {
      const results = [];
      
      for (const responseData of responses) {
        try {
          const response = await this.upsertResponse(
            assessmentId,
            responseData.factor_id,
            {
              score: responseData.score,
              comment: responseData.comment || '',
              created_by: responseData.created_by
            }
          );
          results.push({ success: true, data: response });
        } catch (error) {
          logger.error(`Error upserting response for factor ${responseData.factor_id}:`, error);
          results.push({ success: false, error: error.message, factor_id: responseData.factor_id });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error in bulk upsert responses:', error);
      throw error;
    }
  }

  // Assessment Results Methods
  async calculateAssessmentResults(assessmentId) {
    try {
      // Get all responses for the assessment with hierarchy information
      const responses = await this.findResponsesByAssessment(assessmentId);
      
      if (responses.length === 0) {
        return {
          assessment_id: assessmentId,
          total_factors: 0,
          completed_factors: 0,
          completion_percentage: 0,
          overall_score: 0,
          overall_fuk: 0,
          kka_scores: []
        };
      }

      // Group responses by KKA
      const kkaGroups = {};
      responses.forEach(response => {
        if (!kkaGroups[response.kka_id]) {
          kkaGroups[response.kka_id] = {
            kka_id: response.kka_id,
            kka_kode: response.kka_kode,
            kka_nama: response.kka_nama,
            kka_weight: response.kka_weight || 1,
            aspects: {}
          };
        }

        if (!kkaGroups[response.kka_id].aspects[response.aspect_id]) {
          kkaGroups[response.kka_id].aspects[response.aspect_id] = {
            aspect_id: response.aspect_id,
            aspect_kode: response.aspect_kode,
            aspect_nama: response.aspect_nama,
            aspect_weight: response.aspect_weight || 1,
            parameters: {}
          };
        }

        if (!kkaGroups[response.kka_id].aspects[response.aspect_id].parameters[response.parameter_id]) {
          kkaGroups[response.kka_id].aspects[response.aspect_id].parameters[response.parameter_id] = {
            parameter_id: response.parameter_id,
            parameter_kode: response.parameter_kode,
            parameter_nama: response.parameter_nama,
            parameter_weight: response.parameter_weight || 1,
            factors: []
          };
        }

        kkaGroups[response.kka_id].aspects[response.aspect_id].parameters[response.parameter_id].factors.push({
          factor_id: response.factor_id,
          factor_kode: response.factor_kode,
          factor_nama: response.factor_nama,
          max_score: response.max_score || 1,
          raw_score: response.score,
          normalized_score: response.score / (response.max_score || 1),
          comment: response.comment,
          created_by: response.created_by,
          created_at: response.created_at
        });
      });

      // Calculate scores for each level
      const kkaScores = [];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      Object.values(kkaGroups).forEach(kka => {
        let kkaRawScore = 0;
        let kkaFactorCount = 0;
        const aspects = [];

        Object.values(kka.aspects).forEach(aspect => {
          let aspectRawScore = 0;
          let aspectFactorCount = 0;
          const parameters = [];

          Object.values(aspect.parameters).forEach(parameter => {
            let parameterRawScore = 0;
            let parameterFactorCount = 0;

            parameter.factors.forEach(factor => {
              parameterRawScore += factor.normalized_score;
              parameterFactorCount++;
            });

            const parameterAvgScore = parameterFactorCount > 0 ? parameterRawScore / parameterFactorCount : 0;
            const parameterFukScore = this._calculateFUKScore(parameterAvgScore);
            const parameterWeightedScore = parameterFukScore * (parameter.parameter_weight || 1);

            parameters.push({
              ...parameter,
              raw_score: parameterAvgScore,
              fuk_score: parameterFukScore,
              weighted_score: parameterWeightedScore,
              factor_count: parameterFactorCount
            });

            aspectRawScore += parameterWeightedScore;
            aspectFactorCount += parameterFactorCount;
          });

          const aspectAvgScore = aspectFactorCount > 0 ? aspectRawScore / aspectFactorCount : 0;
          const aspectFukScore = this._calculateFUKScore(aspectAvgScore);
          const aspectWeightedScore = aspectFukScore * (aspect.aspect_weight || 1);

          aspects.push({
            ...aspect,
            raw_score: aspectAvgScore,
            fuk_score: aspectFukScore,
            weighted_score: aspectWeightedScore,
            parameter_count: parameters.length,
            factor_count: aspectFactorCount,
            parameters
          });

          kkaRawScore += aspectWeightedScore;
          kkaFactorCount += aspectFactorCount;
        });

        const kkaAvgScore = kkaFactorCount > 0 ? kkaRawScore / kkaFactorCount : 0;
        const kkaFukScore = this._calculateFUKScore(kkaAvgScore);
        const kkaWeightedScore = kkaFukScore * (kka.kka_weight || 1);

        kkaScores.push({
          ...kka,
          raw_score: kkaAvgScore,
          fuk_score: kkaFukScore,
          weighted_score: kkaWeightedScore,
          aspect_count: aspects.length,
          parameter_count: Object.values(kka.aspects).reduce((sum, a) => sum + Object.keys(a.parameters).length, 0),
          factor_count: kkaFactorCount,
          aspects
        });

        totalWeightedScore += kkaWeightedScore;
        totalWeight += (kka.kka_weight || 1);
      });

      const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      const overallFuk = this._calculateFUKScore(overallScore);

      return {
        assessment_id: assessmentId,
        total_factors: responses.length,
        completed_factors: responses.length,
        completion_percentage: 100,
        overall_score: overallScore,
        overall_fuk: overallFuk,
        kka_scores: kkaScores
      };
    } catch (error) {
      logger.error('Error calculating assessment results:', error);
      throw error;
    }
  }

  // Helper method to calculate FUK score
  _calculateFUKScore(avgScore) {
    if (avgScore > 0.85) return 1.00;
    if (avgScore > 0.75) return 0.75;
    if (avgScore > 0.50) return 0.50;
    if (avgScore > 0.00) return 0.25;
    return 0.00;
  }

  // Get assessment statistics
  async getAssessmentStats(assessorId = '') {
    try {
      // Since we're now using assessment_* tables, we'll return basic stats
      // This can be enhanced later to count from assessment_kka table
      return {
        total_assessments: 0,
        draft_count: 0,
        in_progress_count: 0,
        completed_count: 0,
        reviewed_count: 0
      };
    } catch (error) {
      logger.error('Error getting assessment stats:', error);
      throw error;
    }
  }
}

module.exports = new AssessmentRepository();

