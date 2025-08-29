/**
 * Data Unit Service
 */
const DataUnitRepository = require('./data-unit.repository');
const { v4: uuidv4 } = require('uuid');

class DataUnitService {
  constructor(db) {
    this.repository = new DataUnitRepository(db);
  }

  async getAllDataUnits(options = {}) {
    try {
      return await this.repository.findAll(options);
    } catch (error) {
      throw new Error(`Failed to get data units: ${error.message}`);
    }
  }

  async getDataUnitById(id) {
    try {
      const dataUnit = await this.repository.findById(id);
      if (!dataUnit) {
        throw new Error('Data Unit not found');
      }
      return dataUnit;
    } catch (error) {
      throw new Error(`Failed to get data unit: ${error.message}`);
    }
  }

  async createDataUnit(dataUnitData) {
    try {
      // Validate required fields
      if (!dataUnitData.kode || !dataUnitData.nama) {
        throw new Error('Kode and nama are required');
      }

      // Check if kode already exists
      const existingDataUnit = await this.repository.findByKode(dataUnitData.kode);
      if (existingDataUnit) {
        throw new Error('Data Unit with this kode already exists');
      }

      // Generate ID and set default values
      const dataUnitToCreate = {
        id: uuidv4(),
        kode: dataUnitData.kode.toUpperCase(),
        nama: dataUnitData.nama,
        deskripsi: dataUnitData.deskripsi || '',
        is_active: true
      };

      return await this.repository.create(dataUnitToCreate);
    } catch (error) {
      throw new Error(`Failed to create data unit: ${error.message}`);
    }
  }

  async updateDataUnit(id, dataUnitData) {
    try {
      // Check if data unit exists
      const existingDataUnit = await this.repository.findById(id);
      if (!existingDataUnit) {
        throw new Error('Data Unit not found');
      }

      // If kode is being updated, check for duplicates
      if (dataUnitData.kode && dataUnitData.kode !== existingDataUnit.kode) {
        const duplicateDataUnit = await this.repository.findByKode(dataUnitData.kode);
        if (duplicateDataUnit) {
          throw new Error('Data Unit with this kode already exists');
        }
      }

      // Prepare update data
      const updateData = {};
      if (dataUnitData.kode) updateData.kode = dataUnitData.kode.toUpperCase();
      if (dataUnitData.nama) updateData.nama = dataUnitData.nama;
      if (dataUnitData.deskripsi !== undefined) updateData.deskripsi = dataUnitData.deskripsi;
      if (dataUnitData.is_active !== undefined) updateData.is_active = dataUnitData.is_active;

      return await this.repository.update(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update data unit: ${error.message}`);
    }
  }

  async deleteDataUnit(id) {
    try {
      // Check if data unit exists
      const existingDataUnit = await this.repository.findById(id);
      if (!existingDataUnit) {
        throw new Error('Data Unit not found');
      }

      // Check if data unit is being used in pic_map
      // This would require a join query to check for dependencies
      // For now, we'll just soft delete

      return await this.repository.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete data unit: ${error.message}`);
    }
  }

  async getActiveDataUnits() {
    try {
      return await this.repository.findActive();
    } catch (error) {
      throw new Error(`Failed to get active data units: ${error.message}`);
    }
  }

  async hardDeleteDataUnit(id) {
    try {
      // Check if data unit exists
      const existingDataUnit = await this.repository.findById(id);
      if (!existingDataUnit) {
        throw new Error('Data Unit not found');
      }

      // This should only be used in development/testing
      return await this.repository.hardDelete(id);
    } catch (error) {
      throw new Error(`Failed to hard delete data unit: ${error.message}`);
    }
  }
}

module.exports = DataUnitService;



