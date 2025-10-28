/**
 * Evidence Repository
 */
const { Evidence } = require('./evidence.entity');

class EvidenceRepository {
  constructor(db) {
    this.db = db;
  }

  async findAllEvidence(options = {}) {
    const { page = 1, limit = 100, search = '', target_type = '', target_id = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.db('evidence')
      .select(
        'evidence.*',
        'users.name as uploaded_by_name',
        'users.email as uploaded_by_email'
      )
      .leftJoin('users', 'evidence.uploaded_by', 'users.id');

    if (search) {
      query = query.where(function() {
        this.where('evidence.original_name', 'ilike', `%${search}%`)
          .orWhere('evidence.note', 'ilike', `%${search}%`);
      });
    }

    if (target_type) {
      query = query.where('evidence.target_type', target_type);
    }

    if (target_id) {
      query = query.where('evidence.target_id', target_id);
    }

    const totalResult = await this.db('evidence')
      .count('* as count')
      .modify(function(queryBuilder) {
        if (search) {
          queryBuilder.where(function() {
            this.where('evidence.original_name', 'ilike', `%${search}%`)
              .orWhere('evidence.note', 'ilike', `%${search}%`);
          });
        }
        if (target_type) {
          queryBuilder.where('evidence.target_type', target_type);
        }
        if (target_id) {
          queryBuilder.where('evidence.target_id', target_id);
        }
      })
      .first();
    
    const total = totalResult.count;
    
    const data = await query
      .orderBy('evidence.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: data.map(item => Evidence.fromDatabase(item)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async findEvidenceById(id) {
    const data = await this.db('evidence')
      .select(
        'evidence.*',
        'users.name as uploaded_by_name',
        'users.email as uploaded_by_email'
      )
      .leftJoin('users', 'evidence.uploaded_by', 'users.id')
      .where('evidence.id', id)
      .first();

    return data ? Evidence.fromDatabase(data) : null;
  }

  async findEvidenceByTarget(targetType, targetId) {
    const data = await this.db('evidence')
      .select(
        'evidence.*',
        'users.name as uploaded_by_name',
        'users.email as uploaded_by_email'
      )
      .leftJoin('users', 'evidence.uploaded_by', 'users.id')
      .where({
        'evidence.target_type': targetType,
        'evidence.target_id': targetId
      })
      .orderBy('evidence.created_at', 'desc');

    return data.map(item => Evidence.fromDatabase(item));
  }

  async createEvidence(evidenceData) {
    const result = await this.db('evidence').insert(evidenceData).returning('id');
    const id = result[0]?.id || result[0];
    return await this.findEvidenceById(id);
  }

  async updateEvidence(id, evidenceData) {
    await this.db('evidence').where('id', id).update({
      ...evidenceData,
      updated_at: this.db.fn.now()
    });
    return await this.findEvidenceById(id);
  }

  async deleteEvidence(id) {
    return await this.db('evidence').where('id', id).del();
  }

  async bulkCreateEvidence(evidences) {
    try {
      const results = [];
      
      for (const evidenceData of evidences) {
        try {
          const evidence = await this.createEvidence(evidenceData);
          results.push({ success: true, data: evidence });
        } catch (error) {
          console.error(`Error creating evidence:`, error);
          results.push({ success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk create evidence:', error);
      throw error;
    }
  }

  async getEvidenceStatistics(targetType = null, targetId = null) {
    try {
      let query = this.db('evidence');
      
      if (targetType) {
        query = query.where('target_type', targetType);
      }

      if (targetId) {
        query = query.where('target_id', targetId);
      }

      const stats = await query
        .select('kind')
        .count('* as count')
        .groupBy('kind');

      const total = await query.count('* as total').first();
      
      return {
        byKind: stats.reduce((acc, item) => {
          acc[item.kind] = parseInt(item.count);
          return acc;
        }, {}),
        total: parseInt(total.total)
      };
    } catch (error) {
      console.error('Error getting evidence statistics:', error);
      return { byKind: {}, total: 0 };
    }
  }

  async validateTargetId(targetType, targetId) {
    try {
      let tableName;
      switch (targetType) {
        case 'aspect':
          tableName = 'aspect';
          break;
        case 'parameter':
          tableName = 'parameter';
          break;
        case 'factor':
          tableName = 'factor';
          break;
        case 'aoi':
          tableName = 'aoi';
          break;
        default:
          return false;
      }

      const result = await this.db(tableName)
        .where('id', targetId)
        .first();

      return !!result;
    } catch (error) {
      console.error('Error validating target ID:', error);
      return false;
    }
  }
}

module.exports = EvidenceRepository;
