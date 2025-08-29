/**
 * AOI Repository - Using assessment_* tables schema
 */
const { AOI } = require('./aoi.entity');

class AOIRepository {
  constructor(db) {
    this.db = db;
  }

  async findAllAOI(options = {}) {
    const { page = 1, limit = 100, search = '', status = '', assessment_id = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.organization_name as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id');

    if (search) {
      query = query.where(function() {
        this.where('aoi.recommendation', 'ilike', `%${search}%`)
          .orWhere('assessment.organization_name', 'ilike', `%${search}%`);
      });
    }

    if (status) {
      query = query.where('aoi.status', status);
    }

    if (assessment_id) {
      query = query.where('aoi.assessment_id', assessment_id);
    }

    const totalResult = await this.db('aoi')
      .select(this.db.raw('COUNT(*) as count'))
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id')
      .modify(function(queryBuilder) {
        if (search) {
          queryBuilder.where(function() {
            this.where('aoi.recommendation', 'ilike', `%${search}%`)
              .orWhere('assessment.organization_name', 'ilike', `%${search}%`);
          });
        }
        if (status) {
          queryBuilder.where('aoi.status', status);
        }
        if (assessment_id) {
          queryBuilder.where('aoi.assessment_id', assessment_id);
        }
      })
      .first();
    
    const total = totalResult.count;
    
    const data = await query
      .orderBy('aoi.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: data.map(item => AOI.fromDatabase(item)),
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
        'assessment.organization_name as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id')
      .where('aoi.id', id)
      .first();

    return data ? AOI.fromDatabase(data) : null;
  }

  async findAOIByAssessment(assessmentId) {
    const data = await this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id')
      .where('aoi.assessment_id', assessmentId)
      .orderBy('aoi.created_at', 'desc');

    return data.map(item => AOI.fromDatabase(item));
  }

  async findAOIByTarget(targetType, targetId, assessmentId) {
    const data = await this.db('aoi')
      .select(
        'aoi.*',
        'users.name as created_by_name',
        'assessment.organization_name as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id')
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
        'assessment.organization_name as assessment_name',
        'pic_user.name as pic_name',
        'pic_user.email as pic_email'
      )
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('assessment', 'assessment.id', 'aoi.assessment_id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.target_type', '=', 'aoi.target_type')
          .andOn('pic_map.target_id', '=', 'aoi.target_id');
      })
      .leftJoin('users as pic_user', 'pic_map.pic_user_id', 'pic_user.id')
      .where('aoi.id', id)
      .first();

    return data ? AOI.fromDatabase(data) : null;
  }

  async createAOI(aoiData) {
    const result = await this.db('aoi').insert(aoiData).returning('id');
    const id = result[0]?.id || result[0];
    return await this.findAOIById(id);
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
        case 'assessment_aspect':
          tableName = 'assessment_aspect';
          break;
        case 'assessment_parameter':
          tableName = 'assessment_parameter';
          break;
        case 'assessment_factor':
          tableName = 'assessment_factor';
          break;
        default:
          return false;
      }

      const result = await this.db(tableName)
        .where('id', targetId)
        .where('assessment_id', assessmentId)
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

