const { z } = require('zod');

class AssessmentScoringService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Calculate KKA score based on weighted factors and unsur pemenuhan
   */
  async getKkaScore(assessmentId, kkaId) {
    const kka = await this.db('kka')
      .where({ id: kkaId, assessment_id: assessmentId })
      .first();

    if (!kka) {
      throw new Error('KKA not found');
    }

    // Get all factors for this KKA with their aspects and parameters
    const factors = await this.db('factor')
      .join('aspect', 'factor.aspect_id', 'aspect.id')
      .join('parameter', 'factor.parameter_id', 'parameter.id')
      .where('factor.kka_id', kkaId)
      .select(
        'factor.id as factor_id',
        'factor.nama as factor_name',
        'aspect.bobot_indikator as aspect_weight',
        'parameter.bobot_indikator as parameter_weight'
      );

    if (factors.length === 0) {
      return {
        kkaId,
        kkaName: kka.nama,
        score: 0,
        maxScore: 1,
        percentage: 0
      };
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      // Get unsur pemenuhan for this factor
      const unsurPemenuhan = await this.db('unsur_pemenuhan')
        .where('factor_id', factor.factor_id)
        .select('nilai');

      if (unsurPemenuhan.length > 0) {
        // Calculate average nilai for this factor
        const avgNilai = unsurPemenuhan.reduce((sum, unsur) => sum + parseFloat(unsur.nilai), 0) / unsurPemenuhan.length;
        
        // Calculate weight for this factor (aspect_weight * parameter_weight)
        const factorWeight = parseFloat(factor.aspect_weight) * parseFloat(factor.parameter_weight);
        
        totalWeightedScore += avgNilai * factorWeight;
        totalWeight += factorWeight;
      }
    }

    const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    return {
      kkaId,
      kkaName: kka.nama,
      score: finalScore,
      maxScore: 1,
      percentage: Math.round(finalScore * 100)
    };
  }

  /**
   * Get list of KKA candidates for AOI generation (score < 0.5)
   */
  async listAoiCandidates(assessmentId) {
    const kkas = await this.db('kka')
      .where({ assessment_id: assessmentId, is_active: true })
      .select('id', 'nama');

    const candidates = [];

    for (const kka of kkas) {
      const scoreResult = await this.getKkaScore(assessmentId, kka.id);
      
      if (scoreResult.score < 0.5) {
        candidates.push({
          kkaId: kka.id,
          kkaName: kka.nama,
          score: scoreResult.score,
          maxScore: scoreResult.maxScore,
          percentage: scoreResult.percentage
        });
      }
    }

    return candidates;
  }

  /**
   * Generate AOI automatically for KKA with score < 0.5
   */
  async generateAoiForKka(assessmentId, kkaId, createdBy) {
    const scoreResult = await this.getKkaScore(assessmentId, kkaId);
    
    if (scoreResult.score >= 0.5) {
      throw new Error('KKA score is not below 0.5, no AOI needed');
    }

    // Check if AOI already exists for this KKA
    const existingAoi = await this.db('aoi')
      .where({ assessment_id: assessmentId, kka_id: kkaId })
      .first();

    if (existingAoi) {
      throw new Error('AOI already exists for this KKA');
    }

    // Create AOI
    const [aoi] = await this.db('aoi')
      .insert({
        assessment_id: assessmentId,
        kka_id: kkaId,
        nama: `Perbaikan ${scoreResult.kkaName}`,
        recommendation: `KKA ${scoreResult.kkaName} memiliki skor ${scoreResult.percentage}% yang masih di bawah standar. Perlu dilakukan perbaikan untuk meningkatkan skor menjadi minimal 50%.`,
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: 'open',
        priority: scoreResult.percentage < 25 ? 'critical' : scoreResult.percentage < 35 ? 'high' : 'medium',
        created_by: createdBy
      })
      .returning('id');

    return aoi.id;
  }
}

// Validation schemas
const GenerateAoiSchema = z.object({
  assessmentId: z.string().uuid(),
  kkaId: z.string().uuid(),
  createdBy: z.string().uuid()
});

const GetKkaScoreSchema = z.object({
  assessmentId: z.string().uuid(),
  kkaId: z.string().uuid()
});

const ListAoiCandidatesSchema = z.object({
  assessmentId: z.string().uuid()
});

module.exports = {
  AssessmentScoringService,
  GenerateAoiSchema,
  GetKkaScoreSchema,
  ListAoiCandidatesSchema
};
