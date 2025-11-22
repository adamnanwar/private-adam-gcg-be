const assessmentService = require('../assessment/assessment.service');
const aoiService = require('../aoi/aoi.service');
const pugkiService = require('../pugki/pugki.service');
const acgsService = require('../acgs/acgs.service');

class DeletedDataService {
  async getAllDeleted(page = 1, limit = 50) {
    try {
      // Get deleted data from all sources
      const [assessments, aoi, pugki, acgs] = await Promise.all([
        assessmentService.getDeletedAssessments(page, limit),
        aoiService.getDeletedAOI({ page, limit }),
        pugkiService.getDeletedAssessments(page, limit),
        acgsService.getDeletedAssessments(page, limit)
      ]);

      // Combine and sort by deleted_at
      const combinedData = [
        ...(assessments.data || []),
        ...(aoi.data || []),
        ...(pugki.data || []),
        ...(acgs.data || [])
      ].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

      // Paginate combined data
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = combinedData.slice(startIndex, endIndex);

      const total =
        (assessments.pagination?.total || 0) +
        (aoi.pagination?.total || 0) +
        (pugki.pagination?.total || 0) +
        (acgs.pagination?.total || 0);

      return {
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get deleted data: ${error.message}`);
    }
  }

  async restoreData(id, type, userId) {
    try {
      if (type === 'assessment' || type === 'sk16') {
        return await assessmentService.restoreAssessment(id, userId);
      } else if (type === 'aoi') {
        return await aoiService.restoreAOI(id, { id: userId, role: 'admin' });
      } else if (type === 'pugki') {
        return await pugkiService.restoreAssessment(id);
      } else if (type === 'acgs') {
        return await acgsService.restoreAssessment(id);
      } else {
        throw new Error('Invalid data type');
      }
    } catch (error) {
      throw new Error(`Failed to restore data: ${error.message}`);
    }
  }

  async permanentlyDelete(id, type, userId) {
    try {
      if (type === 'assessment' || type === 'sk16') {
        return await assessmentService.permanentlyDeleteAssessment(id, userId);
      } else if (type === 'aoi') {
        return await aoiService.permanentlyDeleteAOI(id, { id: userId, role: 'admin' });
      } else if (type === 'pugki') {
        return await pugkiService.permanentlyDeleteAssessment(id);
      } else if (type === 'acgs') {
        return await acgsService.permanentlyDeleteAssessment(id);
      } else {
        throw new Error('Invalid data type');
      }
    } catch (error) {
      throw new Error(`Failed to permanently delete data: ${error.message}`);
    }
  }
}

module.exports = new DeletedDataService();
