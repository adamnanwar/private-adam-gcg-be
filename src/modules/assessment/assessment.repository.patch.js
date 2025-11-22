// Patch for findResponsesByAssessment to support both response table and factor table

async findResponsesByAssessment(assessmentId) {
  try {
    // Try to get data from response table first (new approach)
    let responses = await this.db('response')
      .select(
        'response.*',
        'factor.kode as factor_kode',
        'factor.nama as factor_nama',
        'factor.max_score',
        'parameter.kode as parameter_kode',
        'parameter.nama as parameter_nama',
        'parameter.weight as parameter_weight',
        'aspect.kode as aspect_kode',
        'aspect.nama as aspect_nama',
        'aspect.weight as aspect_weight',
        'kka.kode as kka_kode',
        'kka.nama as kka_nama',
        'kka.weight as kka_weight',
        'users.name as created_by_name'
      )
      .leftJoin('factor', 'response.factor_id', 'factor.id')
      .leftJoin('parameter', 'factor.parameter_id', 'parameter.id')
      .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
      .leftJoin('kka', 'aspect.kka_id', 'kka.id')
      .leftJoin('users', 'response.created_by', 'users.id')
      .where('response.assessment_id', assessmentId)
      .orderBy('kka.sort', 'asc')
      .orderBy('aspect.sort', 'asc')
      .orderBy('parameter.sort', 'asc')
      .orderBy('factor.sort', 'asc');

    // If no responses found in response table, get from factor table directly (old approach for backward compatibility)
    if (responses.length === 0) {
      const factors = await this.db('factor')
        .select(
          'factor.id',
          'factor.score',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'factor.max_score',
          'factor.assessment_id',
          'parameter.id as parameter_id',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'parameter.weight as parameter_weight',
          'aspect.id as aspect_id',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'aspect.weight as aspect_weight',
          'kka.id as kka_id',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama',
          'kka.weight as kka_weight'
        )
        .leftJoin('parameter', 'factor.parameter_id', 'parameter.id')
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .where('factor.assessment_id', assessmentId)
        .where('factor.is_active', true)
        .orderBy('kka.sort', 'asc')
        .orderBy('aspect.sort', 'asc')
        .orderBy('parameter.sort', 'asc')
        .orderBy('factor.sort', 'asc');

      // Transform factor data to look like response data
      responses = factors.map(factor => ({
        id: factor.id,
        assessment_id: factor.assessment_id,
        factor_id: factor.id,
        score: factor.score,
        comment: '',
        factor_kode: factor.factor_kode,
        factor_nama: factor.factor_nama,
        max_score: factor.max_score,
        parameter_id: factor.parameter_id,
        parameter_kode: factor.parameter_kode,
        parameter_nama: factor.parameter_nama,
        parameter_weight: factor.parameter_weight,
        aspect_id: factor.aspect_id,
        aspect_kode: factor.aspect_kode,
        aspect_nama: factor.aspect_nama,
        aspect_weight: aspect_weight,
        kka_id: factor.kka_id,
        kka_kode: factor.kka_kode,
        kka_nama: factor.kka_nama,
        kka_weight: factor.kka_weight
      }));
    }

    // Group responses by aspect to add evidence
    const responsesByAspect = {};
    responses.forEach(response => {
      if (!responsesByAspect[response.aspect_id]) {
        responsesByAspect[response.aspect_id] = {
          aspect_id: response.aspect_id,
          aspect_kode: response.aspect_kode,
          aspect_nama: response.aspect_nama,
          aspect_weight: response.aspect_weight,
          evidence: [], // Will be populated below
          parameters: {}
        };
      }

      if (!responsesByAspect[response.aspect_id].parameters[response.parameter_id]) {
        responsesByAspect[response.aspect_id].parameters[response.parameter_id] = {
          parameter_id: response.parameter_id,
          parameter_kode: response.parameter_kode,
          parameter_nama: response.parameter_nama,
          parameter_weight: response.parameter_weight,
          factors: []
        };
      }

      responsesByAspect[response.aspect_id].parameters[response.parameter_id].factors.push(response);
    });

    // Fetch evidence for each aspect
    for (const aspectId in responsesByAspect) {
      if (aspectId && aspectId !== 'undefined') {
        const evidence = await this.db('evidence')
          .where({
            target_type: 'aspect', // Updated target type
            target_id: aspectId
          })
          .select('*');

        responsesByAspect[aspectId].evidence = evidence;
      } else {
        responsesByAspect[aspectId].evidence = [];
      }
    }

    // Convert back to flat structure with evidence
    const responsesWithEvidence = [];
    Object.values(responsesByAspect).forEach(aspect => {
      Object.values(aspect.parameters).forEach(parameter => {
        parameter.factors.forEach(factor => {
          responsesWithEvidence.push({
            ...factor,
            aspect_evidence: aspect.evidence
          });
        });
      });
    });

    return responsesWithEvidence;
  } catch (error) {
    logger.error('Error finding responses by assessment:', error);
    throw error;
  }
}
