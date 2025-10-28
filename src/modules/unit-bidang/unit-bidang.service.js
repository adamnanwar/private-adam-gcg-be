const { getConnection } = require('../../config/database');
const { randomUUID } = require('crypto');
const ldapService = require('../../services/ldap.service');
const logger = require('../../utils/logger-simple');

class UnitBidangService {
  constructor() {
    this.db = getConnection();
  }

  /**
   * Get all unit bidang with pagination and search
   */
  async getAll(options = {}) {
    const { page = 1, limit = 10, search = '', is_active } = options;
    const offset = (page - 1) * limit;

    let query = this.db('unit_bidang as ub')
      .leftJoin('unit_bidang as parent', 'ub.parent_id', 'parent.id')
      .select(
        'ub.*',
        'parent.nama as parent_nama',
        'parent.kode as parent_kode'
      );

    // Apply search filter
    if (search) {
      query = query.where(function() {
        this.where('ub.nama', 'ilike', `%${search}%`)
            .orWhere('ub.kode', 'ilike', `%${search}%`)
            .orWhere('ub.deskripsi', 'ilike', `%${search}%`);
      });
    }

    // Apply active filter
    if (is_active !== undefined) {
      query = query.where('ub.is_active', is_active);
    }

    // Get total count
    const totalQuery = this.db('unit_bidang as ub')
      .leftJoin('unit_bidang as parent', 'ub.parent_id', 'parent.id');

    // Apply search filter to count query
    if (search) {
      totalQuery.where(function() {
        this.where('ub.nama', 'ilike', `%${search}%`)
            .orWhere('ub.kode', 'ilike', `%${search}%`)
            .orWhere('ub.deskripsi', 'ilike', `%${search}%`);
      });
    }

    // Apply active filter to count query
    if (is_active !== undefined) {
      totalQuery.where('ub.is_active', is_active);
    }

    const [{ count: total }] = await totalQuery.count('ub.id as count');

    // Get paginated results
    const data = await query
      .orderBy('ub.nama', 'asc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get unit bidang by ID
   */
  async getById(id) {
    return await this.db('unit_bidang as ub')
      .leftJoin('unit_bidang as parent', 'ub.parent_id', 'parent.id')
      .select(
        'ub.*',
        'parent.nama as parent_nama',
        'parent.kode as parent_kode'
      )
      .where('ub.id', id)
      .first();
  }

  /**
   * Create new unit bidang
   */
  async create(data) {
    const { kode, nama, deskripsi, parent_id, ldap_dn } = data;

    // Validate required fields
    if (!kode || !nama) {
      throw new Error('Kode and nama are required');
    }

    // Check if kode already exists
    const existing = await this.db('unit_bidang')
      .where('kode', kode)
      .first();

    if (existing) {
      throw new Error('Kode unit bidang already exists');
    }

    // Validate parent_id if provided
    if (parent_id) {
      const parent = await this.db('unit_bidang')
        .where('id', parent_id)
        .first();

      if (!parent) {
        throw new Error('Parent unit bidang not found');
      }
    }

    const newUnitBidang = {
      id: randomUUID(),
      kode: kode.toUpperCase(),
      nama,
      deskripsi,
      parent_id: parent_id || null,
      ldap_dn,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.db('unit_bidang').insert(newUnitBidang);

    return await this.getById(newUnitBidang.id);
  }

  /**
   * Update unit bidang
   */
  async update(id, data) {
    const { kode, nama, deskripsi, parent_id, ldap_dn, is_active } = data;

    // Check if unit bidang exists
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    // Check if kode already exists (excluding current record)
    if (kode && kode !== existing.kode) {
      const duplicate = await this.db('unit_bidang')
        .where('kode', kode)
        .whereNot('id', id)
        .first();

      if (duplicate) {
        throw new Error('Kode unit bidang already exists');
      }
    }

    // Validate parent_id if provided
    if (parent_id && parent_id !== existing.parent_id) {
      // Check if parent exists
      const parent = await this.db('unit_bidang')
        .where('id', parent_id)
        .first();

      if (!parent) {
        throw new Error('Parent unit bidang not found');
      }

      // Prevent circular reference
      if (parent_id === id) {
        throw new Error('Unit bidang cannot be its own parent');
      }
    }

    const updateData = {
      updated_at: new Date()
    };

    if (kode !== undefined) updateData.kode = kode.toUpperCase();
    if (nama !== undefined) updateData.nama = nama;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (ldap_dn !== undefined) updateData.ldap_dn = ldap_dn;
    if (is_active !== undefined) updateData.is_active = is_active;

    await this.db('unit_bidang')
      .where('id', id)
      .update(updateData);

    return await this.getById(id);
  }

  /**
   * Delete unit bidang (soft delete by setting is_active to false)
   */
  async delete(id) {
    // Check if unit bidang exists
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    // Check if there are child units
    const children = await this.db('unit_bidang')
      .where('parent_id', id)
      .where('is_active', true)
      .count('id as count')
      .first();

    if (parseInt(children.count) > 0) {
      throw new Error('Cannot delete unit bidang with active child units');
    }

    // Check if there are users assigned to this unit
    const users = await this.db('users')
      .where('unit_bidang_id', id)
      .where('is_active', true)
      .count('id as count')
      .first();

    if (parseInt(users.count) > 0) {
      throw new Error('Cannot delete unit bidang with active users assigned');
    }

    // Soft delete
    await this.db('unit_bidang')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    return true;
  }

  /**
   * Sync unit bidang from LDAP
   */
  async syncFromLDAP() {
    try {
      const result = await ldapService.syncUnitsFromLDAP();
      
      logger.info(`Synchronized ${result.count} units from LDAP`);
      
      return {
        synchronized: result.count,
        success: result.success,
        message: `Successfully synchronized ${result.count} organizational units from LDAP`
      };
    } catch (error) {
      logger.error('Failed to sync units from LDAP:', error);
      throw new Error(`Failed to sync units from LDAP: ${error.message}`);
    }
  }

  /**
   * Get unit bidang hierarchy
   */
  async getHierarchy() {
    const allUnits = await this.db('unit_bidang')
      .where('is_active', true)
      .orderBy('nama', 'asc');

    // Build hierarchy tree
    const unitMap = {};
    const rootUnits = [];

    // Create map of all units
    allUnits.forEach(unit => {
      unitMap[unit.id] = {
        ...unit,
        children: []
      };
    });

    // Build hierarchy
    allUnits.forEach(unit => {
      if (unit.parent_id && unitMap[unit.parent_id]) {
        unitMap[unit.parent_id].children.push(unitMap[unit.id]);
      } else {
        rootUnits.push(unitMap[unit.id]);
      }
    });

    return rootUnits;
  }

  /**
   * Get users by unit bidang
   */
  async getUsersByUnit(unitId) {
    return await this.db('users')
      .where('unit_bidang_id', unitId)
      .where('is_active', true)
      .select('id', 'username', 'name', 'email', 'role')
      .orderBy('name', 'asc');
  }
}

module.exports = new UnitBidangService();