/**
 * AOI Repository - Using assessment_* tables schema
 */
const AOI = require('./aoi.entity');

class AOIRepository {
  constructor(db) {
    this.db = db;
  }

  async findAllAOI(options = {}) {
    const { page = 1, limit = 10, search = '', status = '', assessment_id = '', userUnitId = null, isAdmin = false } = options;
    const offset = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

    let query = this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.title as assessment_name',
        'pic_users.name as pic_name',
        'pic_users.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('users as pic_users', 'aoi.pic_user_id', 'pic_users.id');

    if (search) {
      query = query.where(function() {
        this.where('aoi.recommendation', 'ilike', `%${search}%`)
          .orWhere('assessment.title', 'ilike', `%${search}%`);
      });
    }

    if (status) {
      query = query.where('aoi.status', status);
    }

    if (assessment_id) {
      query = query.where('aoi.assessment_id', assessment_id);
    }

    // Filter by user unit - ONLY apply for non-admin users
    if (userUnitId && !isAdmin) {
      query = query.whereExists(function() {
        this.select('*')
          .from('pic_map as pm')
          .where('pm.assessment_id', this.ref('aoi.assessment_id'))
          .andWhere('pm.unit_bidang_id', userUnitId);
      });
    }

    const totalResult = await this.db('aoi')
      .select(this.db.raw('COUNT(*) as count'))
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .modify(function(queryBuilder) {
        if (search) {
          queryBuilder.where(function() {
            this.where('aoi.recommendation', 'ilike', `%${search}%`)
              .orWhere('assessment.title', 'ilike', `%${search}%`);
          });
        }
        if (status) {
          queryBuilder.where('aoi.status', status);
        }
        if (assessment_id) {
          queryBuilder.where('aoi.assessment_id', assessment_id);
        }
        // Apply same filter for count - ONLY for non-admin
        if (userUnitId && !isAdmin) {
          queryBuilder.whereExists(function() {
            this.select('*')
              .from('pic_map as pm')
              .where('pm.assessment_id', this.ref('aoi.assessment_id'))
              .andWhere('pm.unit_bidang_id', userUnitId);
          });
        }
      })
      .first();
    
    const total = totalResult.count;
    
    const aoiResults = await query
      .orderBy('aoi.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    // Fetch evidence for each AOI
    const aoiWithEvidence = await Promise.all(
      aoiResults.map(async (aoi) => {
        const evidence = await this.db('evidence')
          .where({
            target_type: 'aoi',
            target_id: aoi.id
          })
          .select('*');
        
        return {
          ...aoi,
          evidence: evidence
        };
      })
    );

    return {
      data: aoiWithEvidence.map(item => AOI.fromDatabase(item)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async findAOIById(id) {
    const data = await this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.title as assessment_name',
        'pic_users.name as pic_name',
        'pic_users.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('users as pic_users', 'aoi.pic_user_id', 'pic_users.id')
      .where('aoi.id', id)
      .first();

    if (!data) return null;

    // Fetch evidence for this AOI
    const evidence = await this.db('evidence')
      .where({
        target_type: 'aoi',
        target_id: data.id
      })
      .select('*');

    return AOI.fromDatabase({
      ...data,
      evidence
    });
  }

  async findAOIByAssessment(assessmentId, user) {
    let query = this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .where('aoi.assessment_id', assessmentId)
      .orderBy('aoi.created_at', 'desc');

    if (user && user.role !== 'admin') {
      query = query.where(builder => {
        builder
          .where('aoi.created_by', user.id)
          .orWhereExists(function() {
            this.select('*')
              .from('pic_map')
              .where('pic_map.assessment_id', assessmentId)
              .andWhere('pic_map.target_type', 'aoi')
              .andWhere('pic_map.target_id', this.ref('aoi.id'))
              .andWhere(inner => {
                inner
                  .where('pic_map.pic_user_id', user.id)
                  .orWhere('pic_map.unit_bidang_id', user.unit_bidang_id || null);
              });
          })
          .orWhereExists(function() {
            this.select('*')
              .from('pic_map')
              .where('pic_map.assessment_id', assessmentId)
              .andWhere('pic_map.target_type', 'factor')
              .andWhere(inner => {
                inner
                  .where('pic_map.pic_user_id', user.id)
                  .orWhere('pic_map.unit_bidang_id', user.unit_bidang_id || null);
              });
          });
      });
    }

    const data = await query;

    return data.map(item => AOI.fromDatabase(item));
  }

  async findAOIByTarget(targetType, targetId, assessmentId) {
    const data = await this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.title as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.assessment_id', '=', 'aoi.assessment_id');
      })
      .leftJoin('users as pic_user', 'aoi.pic_user_id', 'pic_user.id')
      .where({
        'aoi.target_type': targetType,
        'aoi.target_id': targetId,
        'aoi.assessment_id': assessmentId
      })
      .orderBy('aoi.created_at', 'desc');

    return data.map(item => AOI.fromDatabase(item));
  }

  async findAOIWithDetails(id) {
    const data = await this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.title as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.assessment_id', '=', 'aoi.assessment_id');
      })
      .leftJoin('users as pic_user', 'aoi.pic_user_id', 'pic_user.id')
      .where('aoi.id', id)
      .first();

    return data ? AOI.fromDatabase(data) : null;
  }

  async createAOI(aoiData) {
    const result = await this.db('aoi').insert(aoiData).returning('*');
    const aoi = result[0];
    return AOI.fromDatabase(aoi);
  }

  async updateAOI(id, aoiData) {
    await this.db('aoi').where('id', id).update({
      ...aoiData,
      updated_at: this.db.fn.now()
    });
    return await this.findAOIById(id);
  }

  async deleteAOI(id) {
    return await this.db('aoi').where('id', id).del();
  }

  async validateTargetId(assessmentId, targetType, targetId) {
    try {
      let tableName;
      switch (targetType) {
        case 'parameter':
          tableName = 'parameter';
          break;
        case 'factor':
          tableName = 'factor';
          break;
        default:
          return false;
      }

      const result = await this.db(tableName)
        .where('id', targetId)
        .where('is_active', true)
        .first();

      return !!result;
    } catch (error) {
      console.error('Error validating target ID:', error);
      return false;
    }
  }

  async getAOIStatistics(assessmentId = null) {
    try {
      let query = this.db('aoi');
      
      if (assessmentId) {
        query = query.where('assessment_id', assessmentId);
      }

      const stats = await query
        .select('status')
        .count('* as count')
        .groupBy('status');

      const total = await query.count('* as total').first();
      
      return {
        byStatus: stats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        total: parseInt(total.total)
      };
    } catch (error) {
      console.error('Error getting AOI statistics:', error);
      return { byStatus: {}, total: 0 };
    }
  }
}

module.exports = AOIRepository;

