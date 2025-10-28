const { db } = require('../../config/database');
const logger = require('../../utils/logger-simple');

class DictionaryRepository {
  constructor() {
    this.db = db;
  }

  // KKA Methods
  async findAllKKA(limit = 50, offset = 0, search = '') {
    try {
      let query = this.db('kka').select('*');
      
      if (search) {
        query = query.where(function() {
          this.where('kode', 'ilike', `%${search}%`)
            .orWhere('nama', 'ilike', `%${search}%`)
            .orWhere('deskripsi', 'ilike', `%${search}%`);
        });
      }
      
      return await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error finding KKA:', error);
      throw error;
    }
  }

  async findKKAById(id) {
    try {
      const kka = await this.db('kka').where('id', id).first();
      return kka;
    } catch (error) {
      console.error('Error finding KKA by ID:', error);
      throw error;
    }
  }

  async createKKA(kkaData) {
    try {
      const [kka] = await this.db('kka')
        .insert({
          ...kkaData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      return kka;
    } catch (error) {
      console.error('Error creating KKA:', error);
      throw error;
    }
  }

  async updateKKA(id, kkaData) {
    try {
      const [kka] = await this.db('kka')
        .where('id', id)
        .update({
          ...kkaData,
          updated_at: new Date()
        })
        .returning('*');
      return kka;
    } catch (error) {
      console.error('Error updating KKA:', error);
      throw error;
    }
  }

  async deleteKKA(id) {
    try {
      // Check if KKA has aspects
      const aspectCount = await this.db('aspect').where('kka_id', id).count('* as count').first();
      if (parseInt(aspectCount.count) > 0) {
        throw new Error('Cannot delete KKA with existing aspects');
      }
      
      const deleted = await this.db('kka').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting KKA:', error);
      throw error;
    }
  }

  async countKKA(search = '') {
    try {
      let query = this.db('kka').count('* as count');
      
      if (search) {
        query = query.where(function() {
          this.where('kode', 'ilike', `%${search}%`)
            .orWhere('nama', 'ilike', `%${search}%`)
            .orWhere('deskripsi', 'ilike', `%${search}%`);
        });
      }
      
      const result = await query.first();
      return parseInt(result.count);
    } catch (error) {
      console.error('Error counting KKA:', error);
      throw error;
    }
  }

  // Aspect Methods
  async findAspectsByKKA(kkaId, limit = 50, offset = 0) {
    try {
      return await this.db('aspect')
        .where('kka_id', kkaId)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error finding aspects by KKA:', error);
      throw error;
    }
  }

  async findAspectById(id) {
    try {
      const aspect = await this.db('aspect').where('id', id).first();
      return aspect;
    } catch (error) {
      console.error('Error finding aspect by ID:', error);
      throw error;
    }
  }

  async createAspect(aspectData) {
    try {
      const [aspect] = await this.db('aspect')
        .insert({
          ...aspectData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      return aspect;
    } catch (error) {
      console.error('Error creating aspect:', error);
      throw error;
    }
  }

  async updateAspect(id, aspectData) {
    try {
      const [aspect] = await this.db('aspect')
        .where('id', id)
        .update({
          ...aspectData,
          updated_at: new Date()
        })
        .returning('*');
      return aspect;
    } catch (error) {
      console.error('Error updating aspect:', error);
      throw error;
    }
  }

  async deleteAspect(id) {
    try {
      // Check if aspect has parameters
      const parameterCount = await this.db('parameter').where('aspect_id', id).count('* as count').first();
      if (parseInt(parameterCount.count) > 0) {
        throw new Error('Cannot delete aspect with existing parameters');
      }
      
      const deleted = await this.db('aspect').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting aspect:', error);
      throw error;
    }
  }

  // Parameter Methods
  async findParametersByAspect(aspectId, limit = 50, offset = 0) {
    try {
      return await this.db('parameter')
        .where('aspect_id', aspectId)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error finding parameters by aspect:', error);
      throw error;
    }
  }

  async findParameterById(id) {
    try {
      const parameter = await this.db('parameter').where('id', id).first();
      return parameter;
    } catch (error) {
      console.error('Error finding parameter by ID:', error);
      throw error;
    }
  }

  async createParameter(parameterData) {
    try {
      const [parameter] = await this.db('parameter')
        .insert({
          ...parameterData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      return parameter;
    } catch (error) {
      console.error('Error creating parameter:', error);
      throw error;
    }
  }

  async updateParameter(id, parameterData) {
    try {
      const [parameter] = await this.db('parameter')
        .where('id', id)
        .update({
          ...parameterData,
          updated_at: new Date()
        })
        .returning('*');
      return parameter;
    } catch (error) {
      console.error('Error updating parameter:', error);
      throw error;
    }
  }

  async deleteParameter(id) {
    try {
      // Check if parameter has factors
      const factorCount = await this.db('factor').where('parameter_id', id).count('* as count').first();
      if (parseInt(factorCount.count) > 0) {
        throw new Error('Cannot delete parameter with existing factors');
      }
      
      const deleted = await this.db('parameter').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting parameter:', error);
      throw error;
    }
  }

  // Factor Methods
  async findFactorsByParameter(parameterId, limit = 50, offset = 0) {
    try {
      return await this.db('factor')
        .where('parameter_id', parameterId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error finding factors by parameter:', error);
      throw error;
    }
  }

  async findFactorById(id) {
    try {
      const factor = await this.db('factor').where('id', id).first();
      return factor;
    } catch (error) {
      console.error('Error finding factor by ID:', error);
      throw error;
    }
  }

  async createFactor(factorData) {
    try {
      const [factor] = await this.db('factor')
        .insert({
          ...factorData,
          id: require('uuid').v4(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      return factor;
    } catch (error) {
      console.error('Error creating factor:', error);
      throw error;
    }
  }

  async updateFactor(id, factorData) {
    try {
      const [factor] = await this.db('factor')
        .where('id', id)
        .update({
          ...factorData,
          updated_at: new Date()
        })
        .returning('*');
      return factor;
    } catch (error) {
      console.error('Error updating factor:', error);
      throw error;
    }
  }

  async deleteFactor(id) {
    try {
      // Check if factor has responses
      const responseCount = await this.db('response').where('factor_id', id).count('* as count').first();
      if (parseInt(responseCount.count) > 0) {
        throw new Error('Cannot delete factor with existing responses');
      }
      
      const deleted = await this.db('factor').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting factor:', error);
      throw error;
    }
  }

  // Hierarchical Data Methods
  async getFullHierarchy() {
    try {
      const kkas = await this.db('kka')
        .select('*')
        .orderBy('created_at', 'asc');

      const aspects = await this.db('aspect')
        .select('*')
        .orderBy('sort', 'asc');

      const parameters = await this.db('parameter')
        .select('*')
        .orderBy('sort', 'asc');

      const factors = await this.db('factor')
        .select('*')
        .orderBy('sort', 'asc');

      // Build hierarchy
      const hierarchy = kkas.map(kka => ({
        ...kka,
        aspects: aspects
          .filter(aspect => aspect.kka_id === kka.id)
          .map(aspect => ({
            ...aspect,
            parameters: parameters
              .filter(parameter => parameter.aspect_id === aspect.id)
              .map(parameter => ({
                ...parameter,
                factors: factors.filter(factor => factor.parameter_id === parameter.id)
              }))
          }))
      }));

      return hierarchy;
    } catch (error) {
      console.error('Error getting full hierarchy:', error);
      throw error;
    }
  }

  async getKKAHierarchy(kkaId) {
    try {
      const kka = await this.db('kka').where('id', kkaId).first();
      if (!kka) return null;

      const aspects = await this.db('aspect')
        .where('kka_id', kkaId)
        .orderBy('sort', 'asc');

      const parameters = await this.db('parameter')
        .whereIn('aspect_id', aspects.map(a => a.id))
        .orderBy('sort', 'asc');

      const factors = await this.db('factor')
        .whereIn('parameter_id', parameters.map(p => p.id))
        .orderBy('sort', 'asc');

      return {
        ...kka,
        aspects: aspects.map(aspect => ({
          ...aspect,
          parameters: parameters
            .filter(parameter => parameter.aspect_id === aspect.id)
            .map(parameter => ({
              ...parameter,
              factors: factors.filter(factor => factor.parameter_id === parameter.id)
            }))
        }))
      };
    } catch (error) {
      console.error('Error getting KKA hierarchy:', error);
      throw error;
    }
  }

  async getCompleteHierarchy(kkaId) {
    try {
      // Get KKA with aspects
      const kka = await this.db('kka').where('id', kkaId).first();
      if (!kka) {
        throw new Error('KKA not found');
      }

      // Get aspects for this KKA
      const aspects = await this.db('aspect')
        .where('kka_id', kkaId)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'asc');

      // Get parameters for each aspect
      const aspectsWithParams = await Promise.all(
        aspects.map(async (aspect) => {
          const parameters = await this.db('parameter')
            .where('aspect_id', aspect.id)
            .orderBy('sort', 'asc')
            .orderBy('created_at', 'asc');

          // Get factors for each parameter
          const parametersWithFactors = await Promise.all(
            parameters.map(async (parameter) => {
              const factors = await this.db('factor')
                .where('parameter_id', parameter.id)
                .orderBy('sort', 'asc')
                .orderBy('created_at', 'asc');

              return {
                ...parameter,
                factors
              };
            })
          );

          return {
            ...aspect,
            parameters: parametersWithFactors
          };
        })
      );

      return {
        ...kka,
        aspects: aspectsWithParams
      };
    } catch (error) {
      console.error('Error getting complete hierarchy:', error);
      throw error;
    }
  }

  async getCompleteHierarchyAll() {
    try {
      // Get all KKAs
      const kkas = await this.db('kka')
        .where('is_active', true)
        .orderBy('sort', 'asc')
        .orderBy('created_at', 'asc');

      // Get complete hierarchy for each KKA
      const kkasWithHierarchy = await Promise.all(
        kkas.map(async (kka) => {
          try {
            return await this.getCompleteHierarchy(kka.id);
          } catch (error) {
            console.warn(`Could not get hierarchy for KKA ${kka.id}:`, error);
            return kka;
          }
        })
      );

      return kkasWithHierarchy;
    } catch (error) {
      console.error('Error getting complete hierarchy for all:', error);
      throw error;
    }
  }

  // Optimized method for new assessment - only get minimal data
  async getMinimalHierarchyForNewAssessment() {
    try {
      // Get only active KKAs with basic info
      const kkas = await this.db('kka')
        .select('id', 'kode', 'nama', 'deskripsi', 'weight', 'sort')
        .where('is_active', true)
        .orderBy('sort', 'asc')
        .limit(5); // Limit to 5 KKAs for new assessment

      // Get aspects for these KKAs in one query
      const kkaIds = kkas.map(k => k.id);
      const aspects = await this.db('aspect')
        .select('id', 'kka_id', 'kode', 'nama', 'weight', 'sort')
        .whereIn('kka_id', kkaIds)
        .where('is_active', true)
        .orderBy('sort', 'asc');

      // Get parameters for these aspects in one query
      const aspectIds = aspects.map(a => a.id);
      const parameters = await this.db('parameter')
        .select('id', 'aspect_id', 'kode', 'nama', 'weight', 'sort')
        .whereIn('aspect_id', aspectIds)
        .where('is_active', true)
        .orderBy('sort', 'asc');

      // Get factors for these parameters in one query
      const parameterIds = parameters.map(p => p.id);
      const factors = await this.db('factor')
        .select('id', 'parameter_id', 'kode', 'nama', 'deskripsi', 'max_score', 'sort')
        .whereIn('parameter_id', parameterIds)
        .where('is_active', true)
        .orderBy('sort', 'asc');

      // Build hierarchy structure
      const kkasWithHierarchy = kkas.map(kka => {
        const kkaAspects = aspects
          .filter(aspect => aspect.kka_id === kka.id)
          .map(aspect => {
            const aspectParameters = parameters
              .filter(param => param.aspect_id === aspect.id)
              .map(parameter => {
                const parameterFactors = factors
                  .filter(factor => factor.parameter_id === parameter.id)
                  .map(factor => ({
                    ...factor,
                    score: 0,
                    comment: '',
                    pic_user_id: null,
                    pic_name: ''
                  }));

                return {
                  ...parameter,
                  factors: parameterFactors
                };
              });

            return {
              ...aspect,
              parameters: aspectParameters
            };
          });

        return {
          ...kka,
          aspects: kkaAspects
        };
      });

      return kkasWithHierarchy;
    } catch (error) {
      console.error('Error getting minimal hierarchy for new assessment:', error);
      throw error;
    }
  }
}

module.exports = new DictionaryRepository();

