/**
 * Data Unit Repository
 */
const DataUnit = require('./data-unit.entity');

class DataUnitRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll(options = {}) {
    const { page = 1, limit = 100, search = '', sortBy = 'nama', sortOrder = 'asc' } = options;
    const offset = (page - 1) * limit;

    let query = this.db('data_unit')
      .where('is_active', true);

    if (search) {
      query = query.where(function() {
        this.where('kode', 'ilike', `%${search}%`)
          .orWhere('nama', 'ilike', `%${search}%`)
          .orWhere('deskripsi', 'ilike', `%${search}%`);
      });
    }

    const total = await query.clone().count('* as count').first();
    
    const data = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: data.map(item => DataUnit.fromDatabase(item)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        totalPages: Math.ceil(total.count / limit)
      }
    };
  }

  async findById(id) {
    const data = await this.db('data_unit')
      .where('id', id)
      .where('is_active', true)
      .first();

    return data ? DataUnit.fromDatabase(data) : null;
  }

  async findByKode(kode) {
    const data = await this.db('data_unit')
      .where('kode', kode)
      .where('is_active', true)
      .first();

    return data ? DataUnit.fromDatabase(data) : null;
  }

  async create(dataUnitData) {
    const [id] = await this.db('data_unit')
      .insert(dataUnitData)
      .returning('id');

    return this.findById(id);
  }

  async update(id, dataUnitData) {
    await this.db('data_unit')
      .where('id', id)
      .update({
        ...dataUnitData,
        updated_at: this.db.fn.now()
      });

    return this.findById(id);
  }

  async delete(id) {
    // Soft delete by setting is_active to false
    await this.db('data_unit')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: this.db.fn.now()
      });

    return true;
  }

  async hardDelete(id) {
    await this.db('data_unit')
      .where('id', id)
      .del();

    return true;
  }

  async findActive() {
    const data = await this.db('data_unit')
      .where('is_active', true)
      .orderBy('nama', 'asc');

    return data.map(item => DataUnit.fromDatabase(item));
  }
}

module.exports = DataUnitRepository;



