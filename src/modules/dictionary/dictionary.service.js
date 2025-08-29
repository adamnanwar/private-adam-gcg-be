const dictionaryRepository = require('./dictionary.repository');
const { logger } = require('../../utils/logger');

class DictionaryService {
  constructor() {
    this.repository = dictionaryRepository;
  }

  // KKA Services
  async getAllKKA(page = 1, limit = 50, search = '') {
    try {
      const offset = (page - 1) * limit;
      const [kkas, total] = await Promise.all([
        this.repository.findAllKKA(limit, offset, search),
        this.repository.countKKA(search)
      ]);

      return {
        data: kkas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getAllKKA service:', error);
      throw error;
    }
  }

  async getKKAById(id) {
    try {
      const kka = await this.repository.findKKAById(id);
      if (!kka) {
        throw new Error('KKA not found');
      }
      return kka;
    } catch (error) {
      logger.error('Error in getKKAById service:', error);
      throw error;
    }
  }

  async createKKA(kkaData) {
    try {
      // Validate required fields
      if (!kkaData.kode || !kkaData.nama) {
        throw new Error('Kode and nama are required');
      }

      // Check if kode already exists
      const existingKKA = await this.repository.findAllKKA(1, 0, kkaData.kode);
      if (existingKKA.length > 0 && existingKKA[0].kode === kkaData.kode) {
        throw new Error('KKA with this kode already exists');
      }

      // Set default weight if not provided
      if (!kkaData.weight) {
        kkaData.weight = 1.0;
      }

      const kka = await this.repository.createKKA(kkaData);
      logger.info(`KKA created: ${kka.id}`);
      return kka;
    } catch (error) {
      logger.error('Error in createKKA service:', error);
      throw error;
    }
  }

  async updateKKA(id, kkaData) {
    try {
      // Check if KKA exists
      const existingKKA = await this.repository.findKKAById(id);
      if (!existingKKA) {
        throw new Error('KKA not found');
      }

      // Check if kode already exists (if being updated)
      if (kkaData.kode && kkaData.kode !== existingKKA.kode) {
        const duplicateKKA = await this.repository.findAllKKA(1, 0, kkaData.kode);
        if (duplicateKKA.length > 0 && duplicateKKA[0].kode === kkaData.kode) {
          throw new Error('KKA with this kode already exists');
        }
      }

      const kka = await this.repository.updateKKA(id, kkaData);
      logger.info(`KKA updated: ${id}`);
      return kka;
    } catch (error) {
      logger.error('Error in updateKKA service:', error);
      throw error;
    }
  }

  async deleteKKA(id) {
    try {
      const deleted = await this.repository.deleteKKA(id);
      if (!deleted) {
        throw new Error('KKA not found or cannot be deleted');
      }
      logger.info(`KKA deleted: ${id}`);
      return { success: true, message: 'KKA deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteKKA service:', error);
      throw error;
    }
  }

  // Aspect Services
  async getAspectsByKKA(kkaId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const aspects = await this.repository.findAspectsByKKA(kkaId, limit, offset);
      
      return {
        data: aspects,
        pagination: {
          page,
          limit,
          total: aspects.length,
          pages: Math.ceil(aspects.length / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getAspectsByKKA service:', error);
      throw error;
    }
  }

  async getAspectById(id) {
    try {
      const aspect = await this.repository.findAspectById(id);
      if (!aspect) {
        throw new Error('Aspect not found');
      }
      return aspect;
    } catch (error) {
      logger.error('Error in getAspectById service:', error);
      throw error;
    }
  }

  async createAspect(aspectData) {
    try {
      // Validate required fields
      if (!aspectData.kka_id || !aspectData.kode || !aspectData.nama) {
        throw new Error('KKA ID, kode, and nama are required');
      }

      // Check if KKA exists
      const kka = await this.repository.findKKAById(aspectData.kka_id);
      if (!kka) {
        throw new Error('KKA not found');
      }

      // Check if kode already exists in this KKA
      const existingAspects = await this.repository.findAspectsByKKA(aspectData.kka_id, 100, 0);
      if (existingAspects.some(a => a.kode === aspectData.kode)) {
        throw new Error('Aspect with this kode already exists in this KKA');
      }

      // Set default values
      if (!aspectData.weight) aspectData.weight = 1.0;
      if (!aspectData.sort) {
        const maxSort = Math.max(0, ...existingAspects.map(a => a.sort || 0));
        aspectData.sort = maxSort + 1;
      }

      const aspect = await this.repository.createAspect(aspectData);
      logger.info(`Aspect created: ${aspect.id}`);
      return aspect;
    } catch (error) {
      logger.error('Error in createAspect service:', error);
      throw error;
    }
  }

  async updateAspect(id, aspectData) {
    try {
      // Check if aspect exists
      const existingAspect = await this.repository.findAspectById(id);
      if (!existingAspect) {
        throw new Error('Aspect not found');
      }

      // Check if kode already exists (if being updated)
      if (aspectData.kode && aspectData.kode !== existingAspect.kode) {
        const existingAspects = await this.repository.findAspectsByKKA(existingAspect.kka_id, 100, 0);
        if (existingAspects.some(a => a.kode === aspectData.kode && a.id !== id)) {
          throw new Error('Aspect with this kode already exists in this KKA');
        }
      }

      const aspect = await this.repository.updateAspect(id, aspectData);
      logger.info(`Aspect updated: ${id}`);
      return aspect;
    } catch (error) {
      logger.error('Error in updateAspect service:', error);
      throw error;
    }
  }

  async deleteAspect(id) {
    try {
      const deleted = await this.repository.deleteAspect(id);
      if (!deleted) {
        throw new Error('Aspect not found or cannot be deleted');
      }
      logger.info(`Aspect deleted: ${id}`);
      return { success: true, message: 'Aspect deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteAspect service:', error);
      throw error;
    }
  }

  // Parameter Services
  async getParametersByAspect(aspectId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const parameters = await this.repository.findParametersByAspect(aspectId, limit, offset);
      
      return {
        data: parameters,
        pagination: {
          page,
          limit,
          total: parameters.length,
          pages: Math.ceil(parameters.length / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getParametersByAspect service:', error);
      throw error;
    }
  }

  async getParameterById(id) {
    try {
      const parameter = await this.repository.findParameterById(id);
      if (!parameter) {
        throw new Error('Parameter not found');
      }
      return parameter;
    } catch (error) {
      logger.error('Error in getParameterById service:', error);
      throw error;
    }
  }

  async createParameter(parameterData) {
    try {
      // Validate required fields
      if (!parameterData.aspect_id || !parameterData.kode || !parameterData.nama) {
        throw new Error('Aspect ID, kode, and nama are required');
      }

      // Check if aspect exists
      const aspect = await this.repository.findAspectById(parameterData.aspect_id);
      if (!aspect) {
        throw new Error('Aspect not found');
      }

      // Check if kode already exists in this aspect
      const existingParameters = await this.repository.findParametersByAspect(parameterData.aspect_id, 100, 0);
      if (existingParameters.some(p => p.kode === parameterData.kode)) {
        throw new Error('Parameter with this kode already exists in this aspect');
      }

      // Set default values
      if (!parameterData.weight) parameterData.weight = 1.0;
      if (!parameterData.sort) {
        const maxSort = Math.max(0, ...existingParameters.map(p => p.sort || 0));
        parameterData.sort = maxSort + 1;
      }

      const parameter = await this.repository.createParameter(parameterData);
      logger.info(`Parameter created: ${parameter.id}`);
      return parameter;
    } catch (error) {
      logger.error('Error in createParameter service:', error);
      throw error;
    }
  }

  async updateParameter(id, parameterData) {
    try {
      // Check if parameter exists
      const existingParameter = await this.repository.findParameterById(id);
      if (!existingParameter) {
        throw new Error('Parameter not found');
      }

      // Check if kode already exists (if being updated)
      if (parameterData.kode && parameterData.kode !== existingParameter.kode) {
        const existingParameters = await this.repository.findParametersByAspect(existingParameter.aspect_id, 100, 0);
        if (existingParameters.some(p => p.kode === parameterData.kode && p.id !== id)) {
          throw new Error('Parameter with this kode already exists in this aspect');
        }
      }

      const parameter = await this.repository.updateParameter(id, parameterData);
      logger.info(`Parameter updated: ${id}`);
      return parameter;
    } catch (error) {
      logger.error('Error in updateParameter service:', error);
      throw error;
    }
  }

  async deleteParameter(id) {
    try {
      const deleted = await this.repository.deleteParameter(id);
      if (!deleted) {
        throw new Error('Parameter not found or cannot be deleted');
      }
      logger.info(`Parameter deleted: ${id}`);
      return { success: true, message: 'Parameter deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteParameter service:', error);
      throw error;
    }
  }

  // Factor Services
  async getFactorsByParameter(parameterId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const factors = await this.repository.findFactorsByParameter(parameterId, limit, offset);
      
      return {
        data: factors,
        pagination: {
          page,
          limit,
          total: factors.length,
          pages: Math.ceil(factors.length / limit)
        }
      };
    } catch (error) {
      logger.error('Error in getFactorsByParameter service:', error);
      throw error;
    }
  }

  async getFactorById(id) {
    try {
      const factor = await this.repository.findFactorById(id);
      if (!factor) {
        throw new Error('Factor not found');
      }
      return factor;
    } catch (error) {
      logger.error('Error in getFactorById service:', error);
      throw error;
    }
  }

  async createFactor(factorData) {
    try {
      // Validate required fields
      if (!factorData.parameter_id || !factorData.kode || !factorData.nama) {
        throw new Error('Parameter ID, kode, and nama are required');
      }

      // Check if parameter exists
      const parameter = await this.repository.findParameterById(factorData.parameter_id);
      if (!parameter) {
        throw new Error('Parameter not found');
      }

      // Check if kode already exists in this parameter
      const existingFactors = await this.repository.findFactorsByParameter(factorData.parameter_id, 100, 0);
      if (existingFactors.some(f => f.kode === factorData.kode)) {
        throw new Error('Factor with this kode already exists in this parameter');
      }

      // Set default values
      if (!factorData.max_score) factorData.max_score = 1;
      if (!factorData.sort) {
        const maxSort = Math.max(0, ...existingFactors.map(f => f.sort || 0));
        factorData.sort = maxSort + 1;
      }

      const factor = await this.repository.createFactor(factorData);
      logger.info(`Factor created: ${factor.id}`);
      return factor;
    } catch (error) {
      logger.error('Error in createFactor service:', error);
      throw error;
    }
  }

  async updateFactor(id, factorData) {
    try {
      // Check if factor exists
      const existingFactor = await this.repository.findFactorById(id);
      if (!existingFactor) {
        throw new Error('Factor not found');
      }

      // Check if kode already exists (if being updated)
      if (factorData.kode && factorData.kode !== existingFactor.kode) {
        const existingFactors = await this.repository.findFactorsByParameter(existingFactor.parameter_id, 100, 0);
        if (existingFactors.some(f => f.kode === factorData.kode && f.id !== id)) {
          throw new Error('Factor with this kode already exists in this parameter');
        }
      }

      const factor = await this.repository.updateFactor(id, factorData);
      logger.info(`Factor updated: ${id}`);
      return factor;
    } catch (error) {
      logger.error('Error in updateFactor service:', error);
      throw error;
    }
  }

  async deleteFactor(id) {
    try {
      const deleted = await this.repository.deleteFactor(id);
      if (!deleted) {
        throw new Error('Factor not found or cannot be deleted');
      }
      logger.info(`Factor deleted: ${id}`);
      return { success: true, message: 'Factor deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteFactor service:', error);
      throw error;
    }
  }

  // Hierarchy Services
  async getFullHierarchy() {
    try {
      return await this.repository.getFullHierarchy();
    } catch (error) {
      logger.error('Error in getFullHierarchy service:', error);
      throw error;
    }
  }

  async getKKAHierarchy(kkaId) {
    try {
      const hierarchy = await this.repository.getKKAHierarchy(kkaId);
      if (!hierarchy) {
        throw new Error('KKA not found');
      }
      return hierarchy;
    } catch (error) {
      logger.error('Error in getKKAHierarchy service:', error);
      throw error;
    }
  }

  async getCompleteHierarchy(kkaId) {
    try {
      const hierarchy = await this.repository.getCompleteHierarchy(kkaId);
      return hierarchy;
    } catch (error) {
      logger.error('Error in getCompleteHierarchy service:', error);
      throw error;
    }
  }

  async getCompleteHierarchyAll() {
    try {
      const hierarchy = await this.repository.getCompleteHierarchyAll();
      return hierarchy;
    } catch (error) {
      logger.error('Error in getCompleteHierarchyAll service:', error);
      throw error;
    }
  }

  // Bulk Operations
  async bulkCreateHierarchy(hierarchyData) {
    try {
      const results = [];
      
      for (const kkaData of hierarchyData) {
        try {
          // Create KKA
          const kka = await this.createKKA({
            kode: kkaData.kode,
            nama: kkaData.nama,
            deskripsi: kkaData.deskripsi || '',
            weight: kkaData.weight || 1.0
          });
          
          const kkaResult = { kka, aspects: [] };
          
          // Create Aspects
          if (kkaData.aspects && Array.isArray(kkaData.aspects)) {
            for (const aspectData of kkaData.aspects) {
              const aspect = await this.createAspect({
                kka_id: kka.id,
                kode: aspectData.kode,
                nama: aspectData.nama,
                weight: aspectData.weight || 1.0,
                sort: aspectData.sort || 0
              });
              
              const aspectResult = { aspect, parameters: [] };
              
              // Create Parameters
              if (aspectData.parameters && Array.isArray(aspectData.parameters)) {
                for (const parameterData of aspectData.parameters) {
                  const parameter = await this.createParameter({
                    aspect_id: aspect.id,
                    kode: parameterData.kode,
                    nama: parameterData.nama,
                    weight: parameterData.weight || 1.0,
                    sort: parameterData.sort || 0
                  });
                  
                  const parameterResult = { parameter, factors: [] };
                  
                  // Create Factors
                  if (parameterData.factors && Array.isArray(parameterData.factors)) {
                    for (const factorData of parameterData.factors) {
                      const factor = await this.createFactor({
                        parameter_id: parameter.id,
                        kode: factorData.kode,
                        nama: factorData.nama,
                        deskripsi: factorData.deskripsi || '',
                        max_score: factorData.max_score || 1,
                        sort: factorData.sort || 0
                      });
                      parameterResult.factors.push(factor);
                    }
                  }
                  
                  aspectResult.parameters.push(parameterResult);
                }
              }
              
              kkaResult.aspects.push(aspectResult);
            }
          }
          
          results.push(kkaResult);
        } catch (error) {
          logger.error(`Error creating hierarchy for KKA ${kkaData.kode}:`, error);
          results.push({ error: error.message, kkaData });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error in bulkCreateHierarchy service:', error);
      throw error;
    }
  }
}

module.exports = new DictionaryService();

