const { successResponse, errorResponse } = require('../../utils/response');

class DashboardController {
  constructor(db) {
    this.db = db;
  }

  async _getUserRole(userId) {
    try {
      const user = await this.db('users').where({ id: userId }).first();
      return user?.role || 'viewer';
    } catch (error) {
      return 'viewer';
    }
  }

  async getStatistics(req, res) {
    try {
      const userId = req.user?.id;
      const userUnitId = req.user?.unit_bidang_id;
      const role = await this._getUserRole(userId);

      const assessmentQuery = this.db('assessment')
        .select('assessment.status')
        .count({ count: '*' })
        .groupBy('assessment.status');
      const aoiQuery = this.db('aoi').select('status').count({ count: '*' }).groupBy('status');
      const responseQuery = this.db('response')
        .select(
          'response.score',
          'response.assessment_id',
          'factor.parameter_id',
          'factor.aspect_id',
          'factor.kka_id'
        )
        .leftJoin('factor', 'response.factor_id', 'factor.id');

      // No filters - all users (admin and user) can see all statistics

      const [assessmentRows, aoiRows, responses] = await Promise.all([
        assessmentQuery,
        aoiQuery,
        responseQuery
      ]);

      const assessmentStats = assessmentRows.reduce((acc, row) => {
        acc[row.status || 'unknown'] = Number(row.count);
        acc.total = (acc.total || 0) + Number(row.count);
        return acc;
      }, {});

      const aoiStats = aoiRows.reduce((acc, row) => {
        acc[row.status || 'unknown'] = Number(row.count);
        acc.total = (acc.total || 0) + Number(row.count);
        return acc;
      }, {});

      const kkaIds = [...new Set(responses.map((row) => row.kka_id).filter(Boolean))];
      const aspectIds = [...new Set(responses.map((row) => row.aspect_id).filter(Boolean))];
      const parameterIds = [...new Set(responses.map((row) => row.parameter_id).filter(Boolean))];

      const [kkaMeta, aspectMeta, parameterMeta] = await Promise.all([
        kkaIds.length ? this.db('kka').select('id', 'nama').whereIn('id', kkaIds) : [],
        aspectIds.length ? this.db('aspect').select('id', 'nama').whereIn('id', aspectIds) : [],
        parameterIds.length ? this.db('parameter').select('id', 'nama').whereIn('id', parameterIds) : []
      ]);

      const kkaNames = kkaMeta.reduce((acc, row) => ({ ...acc, [row.id]: row.nama }), {});
      const aspectNames = aspectMeta.reduce((acc, row) => ({ ...acc, [row.id]: row.nama }), {});
      const parameterNames = parameterMeta.reduce((acc, row) => ({ ...acc, [row.id]: row.nama }), {});

      const parameterScores = {};
      const aspectScores = {};
      const kkaScores = {};

      responses.forEach((row) => {
        if (!row.parameter_id || !row.aspect_id || !row.kka_id) {
          return;
        }

        if (!parameterScores[row.parameter_id]) {
          parameterScores[row.parameter_id] = [];
        }
        parameterScores[row.parameter_id].push(Number(row.score));

        if (!aspectScores[row.aspect_id]) {
          aspectScores[row.aspect_id] = [];
        }
        aspectScores[row.aspect_id].push(Number(row.score));

        if (!kkaScores[row.kka_id]) {
          kkaScores[row.kka_id] = [];
        }
        kkaScores[row.kka_id].push(Number(row.score));
      });

      const avg = (scores) => {
        if (!scores?.length) return 0;
        const sum = scores.reduce((acc, s) => acc + (Number(s) || 0), 0);
        return parseFloat((sum / scores.length).toFixed(2));
      };

      const maturityScore = avg(responses.map((row) => Number(row.score)));

      return res.json(successResponse({
        assessment: {
          total: assessmentStats.total || 0,
          ...assessmentStats,
        },
        aoi: {
          total: aoiStats.total || 0,
          ...aoiStats,
        },
        maturity: {
          overall: maturityScore,
          by_kka: Object.entries(kkaScores).map(([id, scores]) => ({ id, name: kkaNames[id] || id, score: avg(scores) })),
          by_aspect: Object.entries(aspectScores).map(([id, scores]) => ({ id, name: aspectNames[id] || id, score: avg(scores) })),
          by_parameter: Object.entries(parameterScores).map(([id, scores]) => ({ id, name: parameterNames[id] || id, score: avg(scores) })),
        },
      }, 'Dashboard statistics retrieved successfully'));
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      return res.status(500).json(errorResponse('Failed to retrieve dashboard statistics', 'INTERNAL_ERROR'));
    }
  }

  async getRecentActivities(req, res) {
    try {
      const userId = req.user?.id;
      const role = await this._getUserRole(userId);

      const activities = [];

      return res.json(successResponse(activities, 'Recent activities retrieved successfully'));
    } catch (error) {
      console.error('Error getting dashboard activities:', error);
      return res.status(500).json(errorResponse('Failed to retrieve dashboard activities', 'INTERNAL_ERROR'));
    }
  }

  async getAssessmentTrends(req, res) {
    try {
      const userId = req.user?.id;
      const role = await this._getUserRole(userId);

      const trendsQuery = this.db('assessment')
        .select(this.db.raw("TO_CHAR(assessment_date, 'YYYY-MM') as period"))
        .count({ total: '*' })
        .groupBy(this.db.raw("TO_CHAR(assessment_date, 'YYYY-MM')"))
        .orderBy('period', 'asc')
        .limit(12);

      // No filters - all users can see all assessment trends

      const trends = await trendsQuery;
      return res.json(successResponse(trends, 'Assessment trends retrieved successfully'));
    } catch (error) {
      console.error('Error getting assessment trends:', error);
      return res.status(500).json(errorResponse('Failed to retrieve assessment trends', 'INTERNAL_ERROR'));
    }
  }

  async getKKAPerformance(req, res) {
    try {
      const userId = req.user?.id;
      const role = await this._getUserRole(userId);

      const assessmentScores = await this.db('assessment')
        .select('assessment.title as kka_name')
        .avg({ avg_score: 'response.score' })
        .leftJoin('response', 'assessment.id', 'response.assessment_id')
        .groupBy('assessment.id')
        .orderBy('avg_score', 'desc')
        .limit(10);

      const performance = assessmentScores.map((item) => ({
        kka_name: item.kka_name,
        avg_score: Number(item.avg_score || 0)
      }));

      return res.json(successResponse(performance, 'KKA performance retrieved successfully'));
    } catch (error) {
      console.error('Error getting KKA performance:', error);
      return res.status(500).json(errorResponse('Failed to retrieve KKA performance', 'INTERNAL_ERROR'));
    }
  }
}

module.exports = DashboardController;

