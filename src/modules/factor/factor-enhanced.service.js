const { z } = require('zod');

class FactorEnhancedService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Add unsur pemenuhan to factor
   */
  async addUnsurPemenuhan(factorId, data) {
    // Verify factor exists
    const factor = await this.db('factor').where('id', factorId).first();
    if (!factor) {
      throw new Error('Factor not found');
    }

    // Validate nilai range
    if (data.nilai < 0.000 || data.nilai > 1.000) {
      throw new Error('Nilai must be between 0.000 and 1.000');
    }

    const [unsur] = await this.db('unsur_pemenuhan')
      .insert({
        factor_id: factorId,
        nama: data.nama,
        deskripsi: data.deskripsi,
        nilai: data.nilai
      })
      .returning('*');

    return this.mapUnsurPemenuhanData(unsur);
  }

  /**
   * Update factor PIC
   */
  async updateFactorPic(factorId, picUnitBidangId) {
    // Verify factor exists
    const factor = await this.db('factor').where('id', factorId).first();
    if (!factor) {
      throw new Error('Factor not found');
    }

    // Verify unit bidang exists
    const unitBidang = await this.db('unit_bidang').where('id', picUnitBidangId).first();
    if (!unitBidang) {
      throw new Error('Unit bidang not found');
    }

    await this.db('factor')
      .where('id', factorId)
      .update({ pic_unit_bidang_id: picUnitBidangId });
  }

  /**
   * Get factor with details
   */
  async getFactorWithDetails(factorId) {
    const factor = await this.db('factor')
      .join('unit_bidang', 'factor.pic_unit_bidang_id', 'unit_bidang.id')
      .where('factor.id', factorId)
      .select(
        'factor.*',
        'unit_bidang.id as pic_unit_bidang_id',
        'unit_bidang.kode as pic_unit_bidang_kode',
        'unit_bidang.nama as pic_unit_bidang_nama'
      )
      .first();

    if (!factor) {
      return null;
    }

    // Get unsur pemenuhan
    const unsurPemenuhan = await this.db('unsur_pemenuhan')
      .where('factor_id', factorId)
      .orderBy('created_at', 'asc');

    return {
      id: factor.id,
      assessmentId: factor.assessment_id,
      kkaId: factor.kka_id,
      aspectId: factor.aspect_id,
      parameterId: factor.parameter_id,
      kode: factor.kode,
      nama: factor.nama,
      deskripsi: factor.deskripsi,
      picUnitBidangId: factor.pic_unit_bidang_id,
      picUnitBidang: {
        id: factor.pic_unit_bidang_id,
        kode: factor.pic_unit_bidang_kode,
        nama: factor.pic_unit_bidang_nama
      },
      unsurPemenuhan: unsurPemenuhan.map(this.mapUnsurPemenuhanData),
      createdAt: factor.created_at,
      updatedAt: factor.updated_at
    };
  }

  /**
   * Get factors by assessment
   */
  async getFactorsByAssessment(assessmentId) {
    const factors = await this.db('factor')
      .join('unit_bidang', 'factor.pic_unit_bidang_id', 'unit_bidang.id')
      .where('factor.assessment_id', assessmentId)
      .select(
        'factor.*',
        'unit_bidang.id as pic_unit_bidang_id',
        'unit_bidang.kode as pic_unit_bidang_kode',
        'unit_bidang.nama as pic_unit_bidang_nama'
      )
      .orderBy('factor.created_at', 'asc');

    const result = [];

    for (const factor of factors) {
      // Get unsur pemenuhan for each factor
      const unsurPemenuhan = await this.db('unsur_pemenuhan')
        .where('factor_id', factor.id)
        .orderBy('created_at', 'asc');

      result.push({
        id: factor.id,
        assessmentId: factor.assessment_id,
        kkaId: factor.kka_id,
        aspectId: factor.aspect_id,
        parameterId: factor.parameter_id,
        kode: factor.kode,
        nama: factor.nama,
        deskripsi: factor.deskripsi,
        picUnitBidangId: factor.pic_unit_bidang_id,
        picUnitBidang: {
          id: factor.pic_unit_bidang_id,
          kode: factor.pic_unit_bidang_kode,
          nama: factor.pic_unit_bidang_nama
        },
        unsurPemenuhan: unsurPemenuhan.map(this.mapUnsurPemenuhanData),
        createdAt: factor.created_at,
        updatedAt: factor.updated_at
      });
    }

    return result;
  }

  mapUnsurPemenuhanData(unsur) {
    return {
      id: unsur.id,
      factorId: unsur.factor_id,
      nama: unsur.nama,
      deskripsi: unsur.deskripsi,
      nilai: parseFloat(unsur.nilai),
      createdAt: unsur.created_at,
      updatedAt: unsur.updated_at
    };
  }
}

// Validation schemas
const AddUnsurPemenuhanSchema = z.object({
  factorId: z.string().uuid(),
  data: z.object({
    nama: z.string().min(1),
    deskripsi: z.string().optional(),
    nilai: z.number().min(0.000).max(1.000)
  })
});

const UpdateFactorPicSchema = z.object({
  factorId: z.string().uuid(),
  picUnitBidangId: z.string().uuid()
});

module.exports = {
  FactorEnhancedService,
  AddUnsurPemenuhanSchema,
  UpdateFactorPicSchema
};
