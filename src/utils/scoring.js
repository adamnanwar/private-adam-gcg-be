/**
 * Utility functions for GCG Assessment Scoring and FUK Conversion
 */

/**
 * Convert average score to FUK (Fulfillment Level)
 * @param {number} averageScore - Average score (0-1)
 * @returns {number} FUK value
 */
function convertToFUK(averageScore) {
  if (averageScore > 0.85) return 1.00;
  if (averageScore > 0.75) return 0.75;
  if (averageScore > 0.50) return 0.50;
  if (averageScore > 0.00) return 0.25;
  return 0.00;
}

/**
 * Calculate weighted average score for a collection of items
 * @param {Array} items - Array of items with score and score properties
 * @returns {number} Weighted average score
 */
function calculateWeightedAverage(items) {
  if (!items || items.length === 0) return 0;

  const totalScore = items.reduce((sum, item) => sum + (item.score || 1), 0);
  if (totalScore === 0) return 0;

  const weightedSum = items.reduce((sum, item) => {
    const score = item.score || 1;
    const value = item.value || 0;
    return sum + (score * value);
  }, 0);

  return weightedSum / totalScore;
}

/**
 * Calculate parameter score from factors
 * @param {Array} factors - Array of factors with scores
 * @param {number} parameterScore - Score of the parameter
 * @returns {Object} Parameter score and FUK
 */
function calculateParameterScore(factors, parameterScore = 1) {
  if (!factors || factors.length === 0) {
    return { score: 0, fuk: 0 };
  }

  // Calculate average score from factors
  const avgScore = factors.reduce((sum, factor) => sum + (factor.score || 0), 0) / factors.length;

  // Convert to FUK
  const fuk = convertToFUK(avgScore);

  // Apply score
  const weightedScore = parameterScore * fuk;

  return {
    score: avgScore,
    fuk: fuk,
    weightedScore: weightedScore
  };
}

/**
 * Calculate aspect score from parameters
 * @param {Array} parameters - Array of parameters with scores and scores
 * @returns {Object} Aspect score and FUK
 */
function calculateAspectScore(parameters) {
  if (!parameters || parameters.length === 0) {
    return { score: 0, fuk: 0, weightedScore: 0 };
  }

  // Calculate weighted average of parameter scores
  const weightedScore = calculateWeightedAverage(parameters.map(param => ({
    score: param.score || 1,
    value: param.weightedScore || param.score || 0
  })));

  // Calculate average FUK
  const avgFUK = parameters.reduce((sum, param) => sum + (param.fuk || 0), 0) / parameters.length;

  return {
    score: weightedScore,
    fuk: avgFUK,
    weightedScore: weightedScore
  };
}

/**
 * Calculate KKA score from aspects
 * @param {Array} aspects - Array of aspects with scores and scores
 * @returns {Object} KKA score and FUK
 */
function calculateKKAScore(aspects) {
  if (!aspects || aspects.length === 0) {
    return { score: 0, fuk: 0, weightedScore: 0 };
  }

  // Calculate weighted average of aspect scores
  const weightedScore = calculateWeightedAverage(aspects.map(aspect => ({
    score: aspect.score || 1,
    value: aspect.weightedScore || aspect.score || 0
  })));

  // Calculate average FUK
  const avgFUK = aspects.reduce((sum, aspect) => sum + (aspect.fuk || 0), 0) / aspects.length;

  return {
    score: weightedScore,
    fuk: avgFUK,
    weightedScore: weightedScore
  };
}

/**
 * Calculate overall assessment score
 * @param {Array} kkas - Array of KKAs with scores and scores
 * @returns {Object} Overall assessment score and FUK
 */
function calculateOverallScore(kkas) {
  if (!kkas || kkas.length === 0) {
    return { score: 0, fuk: 0, weightedScore: 0 };
  }

  // Calculate weighted average of KKA scores
  const weightedScore = calculateWeightedAverage(kkas.map(kka => ({
    score: kka.score || 1,
    value: kka.weightedScore || kka.score || 0
  })));

  // Calculate average FUK
  const avgFUK = kkas.reduce((sum, kka) => sum + (kka.fuk || 0), 0) / kkas.length;

  return {
    score: weightedScore,
    fuk: avgFUK,
    weightedScore: weightedScore
  };
}

/**
 * Process assessment responses and calculate all scores
 * @param {Array} responses - Array of assessment responses
 * @param {Object} dictionary - Dictionary structure (KKA -> Aspect -> Parameter -> Factor)
 * @returns {Object} Complete assessment results with scores and FUKs
 */
function processAssessmentResponses(responses, dictionary) {
  const results = {
    kka_results: [],
    overall_score: 0,
    overall_fuk: 0,
    total_factors: 0,
    completed_factors: 0
  };
  
  // Map responses to factors for easy lookup
  const responseMap = new Map();
  responses.forEach(response => {
    responseMap.set(response.factor_id, response.score);
  });
  
  // Process each KKA
  results.kka_results = dictionary.map(kka => {
    const kkaResult = {
      kka_id: kka.id,
      kka_kode: kka.kode,
      kka_nama: kka.nama,
      kka_score: kka.score || 1,
      aspects: []
    };

    // Process aspects
    kkaResult.aspects = kka.aspects.map(aspect => {
      const aspectResult = {
        aspect_id: aspect.id,
        aspect_kode: aspect.kode,
        aspect_nama: aspect.nama,
        aspect_score: aspect.score || 1,
        parameters: []
      };

      // Process parameters
      aspectResult.parameters = aspect.parameters.map(parameter => {
        const parameterResult = {
          parameter_id: parameter.id,
          parameter_kode: parameter.kode,
          parameter_nama: parameter.nama,
          parameter_score: parameter.score || 1,
          factors: []
        };

        // Process factors
        parameterResult.factors = parameter.factors.map(factor => {
          const score = responseMap.get(factor.id) || 0;
          const fuk = convertToFUK(score);

          results.total_factors++;
          if (score > 0) results.completed_factors++;

          return {
            factor_id: factor.id,
            factor_kode: factor.kode,
            factor_nama: factor.nama,
            factor_score: score,
            factor_fuk: fuk
          };
        });

        // Calculate parameter score
        const paramScore = calculateParameterScore(
          parameterResult.factors,
          parameterResult.parameter_score
        );
        parameterResult.parameter_score = paramScore.score;
        parameterResult.parameter_fuk = paramScore.fuk;
        parameterResult.weightedScore = paramScore.weightedScore;

        return parameterResult;
      });

      // Calculate aspect score
      const aspectScore = calculateAspectScore(aspectResult.parameters);
      aspectResult.aspect_score = aspectScore.score;
      aspectResult.aspect_fuk = aspectScore.fuk;
      aspectResult.weightedScore = aspectScore.weightedScore;

      return aspectResult;
    });

    // Calculate KKA score
    const kkaScore = calculateKKAScore(kkaResult.aspects);
    kkaResult.kka_score = kkaScore.score;
    kkaResult.kka_fuk = kkaScore.fuk;
    kkaResult.weightedScore = kkaScore.weightedScore;

    return kkaResult;
  });
  
  // Calculate overall score
  const overallScore = calculateOverallScore(results.kka_results);
  results.overall_score = overallScore.score;
  results.overall_fuk = overallScore.fuk;
  
  return results;
}

/**
 * Get FUK label based on FUK value
 * @param {number} fuk - FUK value
 * @returns {string} FUK label
 */
function getFUKLabel(fuk) {
  if (fuk >= 0.85) return 'Sangat Baik';
  if (fuk >= 0.75) return 'Baik';
  if (fuk >= 0.50) return 'Cukup';
  if (fuk >= 0.25) return 'Kurang';
  return 'Tidak Ada';
}

/**
 * Get FUK color class for UI
 * @param {number} fuk - FUK value
 * @returns {string} CSS color class
 */
function getFUKColorClass(fuk) {
  if (fuk >= 0.85) return 'text-green-600 bg-green-100';
  if (fuk >= 0.75) return 'text-blue-600 bg-blue-100';
  if (fuk >= 0.50) return 'text-yellow-600 bg-yellow-100';
  if (fuk >= 0.25) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Validate assessment data
 * @param {Object} assessment - Assessment data
 * @returns {Object} Validation result
 */
function validateAssessment(assessment) {
  const errors = [];
  
  if (!assessment.title) {
    errors.push('Organization name is required');
  }
  
  if (!assessment.assessment_date) {
    errors.push('Assessment date is required');
  }
  
  if (!assessment.assessor_id) {
    errors.push('Assessor ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate response data
 * @param {Object} response - Response data
 * @param {Object} factor - Factor data for validation
 * @returns {Object} Validation result
 */
function validateResponse(response, factor) {
  const errors = [];
  
  if (!response.factor_id) {
    errors.push('Factor ID is required');
  }
  
  if (response.score === undefined || response.score === null) {
    errors.push('Score is required');
  }
  
  if (response.score < 0 || response.score > (factor.max_score || 1)) {
    errors.push(`Score must be between 0 and ${factor.max_score || 1}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  convertToFUK,
  calculateWeightedAverage,
  calculateParameterScore,
  calculateAspectScore,
  calculateKKAScore,
  calculateOverallScore,
  processAssessmentResponses,
  getFUKLabel,
  getFUKColorClass,
  validateAssessment,
  validateResponse
};

