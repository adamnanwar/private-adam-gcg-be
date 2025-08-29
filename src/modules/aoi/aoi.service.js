/**
 * AOI Service - Using only assessment_* tables
 */
const AOIRepository = require('./aoi.repository');
const { v4: uuidv4 } = require('uuid');

class AOIService {
  constructor(db) {
    this.repository = new AOIRepository(db);
  }

  async getAllAOI(options = {}) {
    try {
      return await this.repository.findAllAOI(options);
    } catch (error) {
      throw new Error(`Failed to get AOIs: ${error.message}`);
    }
  }

  async getAOIById(id) {
    try {
      const aoi = await this.repository.findAOIById(id);
      if (!aoi) {
        throw new Error('AOI not found');
      }
      return aoi;
    } catch (error) {
      throw new Error(`Failed to get AOI: ${error.message}`);
    }
  }

  async getAOIByAssessment(assessmentId) {
    try {
      return await this.repository.findAOIByAssessment(assessmentId);
    } catch (error) {
      throw new Error(`Failed to get AOIs by assessment: ${error.message}`);
    }
  }

  async createAOI(aoiData) {
    try {
      // Validate required fields
      if (!aoiData.assessment_id || !aoiData.target_type || !aoiData.target_id || !aoiData.recommendation) {
        throw new Error('Assessment ID, target type, target ID, and recommendation are required');
      }

      // Validate target_type
      const validTargetTypes = ['assessment_aspect', 'assessment_parameter', 'assessment_factor'];
      if (!validTargetTypes.includes(aoiData.target_type)) {
        throw new Error('Invalid target type. Must be one of: assessment_aspect, assessment_parameter, assessment_factor');
      }

      // Validate target_id exists in the specified assessment
      const isValidTarget = await this.repository.validateTargetId(
        aoiData.assessment_id,
        aoiData.target_type,
        aoiData.target_id
      );

      if (!isValidTarget) {
        throw new Error('Target ID does not exist in the specified assessment');
      }

      // Prepare AOI data
      const aoiToCreate = {
        id: uuidv4(),
        assessment_id: aoiData.assessment_id,
        target_type: aoiData.target_type,
        target_id: aoiData.target_id,
        recommendation: aoiData.recommendation,
        due_date: aoiData.due_date || null,
        status: aoiData.status || 'open',
        created_by: aoiData.created_by
      };

      return await this.repository.createAOI(aoiToCreate);
    } catch (error) {
      throw new Error(`Failed to create AOI: ${error.message}`);
    }
  }

  async updateAOI(id, aoiData) {
    try {
      // Check if AOI exists
      const existingAOI = await this.repository.findAOIById(id);
      if (!existingAOI) {
        throw new Error('AOI not found');
      }

      // If target is being updated, validate it
      if (aoiData.target_type || aoiData.target_id) {
        const targetType = aoiData.target_type || existingAOI.target_type;
        const targetId = aoiData.target_id || existingAOI.target_id;
        const assessmentId = aoiData.assessment_id || existingAOI.assessment_id;

        const isValidTarget = await this.repository.validateTargetId(
          assessmentId,
          targetType,
          targetId
        );

        if (!isValidTarget) {
          throw new Error('Target ID does not exist in the specified assessment');
        }
      }

      // Prepare update data
      const updateData = {};
      if (aoiData.recommendation !== undefined) updateData.recommendation = aoiData.recommendation;
      if (aoiData.due_date !== undefined) updateData.due_date = aoiData.due_date;
      if (aoiData.status !== undefined) updateData.status = aoiData.status;
      if (aoiData.target_type !== undefined) updateData.target_type = aoiData.target_type;
      if (aoiData.target_id !== undefined) updateData.target_id = aoiData.target_id;

      return await this.repository.updateAOI(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update AOI: ${error.message}`);
    }
  }

  async deleteAOI(id) {
    try {
      // Check if AOI exists
      const existingAOI = await this.repository.findAOIById(id);
      if (!existingAOI) {
        throw new Error('AOI not found');
      }

      return await this.repository.deleteAOI(id);
    } catch (error) {
      throw new Error(`Failed to delete AOI: ${error.message}`);
    }
  }

  async getAOIStats() {
    try {
      return await this.repository.getAOIStats();
    } catch (error) {
      throw new Error(`Failed to get AOI stats: ${error.message}`);
    }
  }

  async getAOIWithTargetDetails(id) {
    try {
      const aoi = await this.repository.getAOIWithTargetDetails(id);
      if (!aoi) {
        throw new Error('AOI not found');
      }
      return aoi;
    } catch (error) {
      throw new Error(`Failed to get AOI with target details: ${error.message}`);
    }
  }

  /**
   * Get assessment structure for AOI target selection
   */
  async getAssessmentStructure(assessmentId) {
    try {
      // Get assessment aspects
      const aspects = await this.repository.db('assessment_aspect')
        .select('id', 'kode', 'nama', 'client_id')
        .where('assessment_id', assessmentId)
        .orderBy('sort', 'asc');

      // Get assessment parameters for each aspect
      const parameters = await this.repository.db('assessment_parameter')
        .select('id', 'kode', 'nama', 'client_id', 'assessment_aspect_id')
        .whereIn('assessment_aspect_id', aspects.map(a => a.id))
        .orderBy('sort', 'asc');

      // Get assessment factors for each parameter
      const factors = await this.repository.db('assessment_factor')
        .select('id', 'kode', 'nama', 'client_id', 'assessment_parameter_id')
        .whereIn('assessment_parameter_id', parameters.map(p => p.id))
        .orderBy('sort', 'asc');

      // Group by hierarchy
      const structure = aspects.map(aspect => ({
        ...aspect,
        type: 'assessment_aspect',
        label: `Aspek: ${aspect.nama}`,
        parameters: parameters
          .filter(p => p.assessment_aspect_id === aspect.id)
          .map(parameter => ({
            ...parameter,
            type: 'assessment_parameter',
            label: `Parameter: ${parameter.nama}`,
            factors: factors
              .filter(f => f.assessment_parameter_id === parameter.id)
              .map(factor => ({
                ...factor,
                type: 'assessment_factor',
                label: `Faktor: ${factor.nama}`
              }))
          }))
      }));

      return structure;
    } catch (error) {
      // this.logger.error('Error getting assessment structure:', error); // Assuming logger is available
      throw new Error('Failed to get assessment structure');
    }
  }

  /**
   * Get target options for AOI creation
   */
  async getTargetOptions(assessmentId) {
    try {
      const structure = await this.getAssessmentStructure(assessmentId);
      
      // Flatten the structure for easy selection
      const options = [];
      
      // Add aspects
      structure.forEach(aspect => {
        options.push({
          id: aspect.id,
          kode: aspect.kode,
          nama: aspect.nama,
          type: 'assessment_aspect',
          label: `Aspek: ${aspect.nama}`
        });
      });

      // Add parameters
      structure.forEach(aspect => {
        aspect.parameters.forEach(parameter => {
          options.push({
            id: parameter.id,
            kode: parameter.kode,
            nama: parameter.nama,
            type: 'assessment_parameter',
            label: `Parameter: ${parameter.nama}`
          });
        });
      });

      // Add factors
      structure.forEach(aspect => {
        aspect.parameters.forEach(parameter => {
          parameter.factors.forEach(factor => {
            options.push({
              id: factor.id,
              kode: factor.kode,
              nama: factor.nama,
              type: 'assessment_factor',
              label: `Faktor: ${factor.nama}`
            });
          });
        });
      });

      return options;
    } catch (error) {
      // this.logger.error('Error getting target options:', error); // Assuming logger is available
      throw new Error('Failed to get target options');
    }
  }
}

module.exports = AOIService;

