/**
 * Assessment Entity Definitions
 * Defines the data structures for Assessment, Response, and related entities
 */

// Assessment Entity
const assessmentEntity = {
  id: 'uuid',
  organization_name: 'string',
  assessment_date: 'date',
  assessor_id: 'uuid', // Foreign key to User
  status: 'string', // 'draft', 'in_progress', 'completed', 'reviewed'
  notes: 'string',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Response Entity
const responseEntity = {
  id: 'uuid',
  assessment_id: 'uuid', // Foreign key to Assessment
  factor_id: 'uuid', // Foreign key to Factor
  score: 'number', // Raw score input by user
  comment: 'string',
  created_by: 'uuid', // Foreign key to User
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Assessment Result Entity (calculated)
const assessmentResultEntity = {
  id: 'uuid',
  assessment_id: 'uuid',
  factor_id: 'uuid',
  parameter_id: 'uuid',
  aspect_id: 'uuid',
  kka_id: 'uuid',
  raw_score: 'number',
  normalized_score: 'number',
  fuk_score: 'number', // FUK conversion result
  weight: 'number',
  weighted_score: 'number',
  created_at: 'timestamp'
};

// DTOs for API operations
const createAssessmentDto = {
  organization_name: 'string',
  assessment_date: 'date',
  assessor_id: 'uuid',
  notes: 'string'
};

const updateAssessmentDto = {
  organization_name: 'string',
  assessment_date: 'date',
  assessor_id: 'uuid',
  status: 'string',
  notes: 'string'
};

const createResponseDto = {
  assessment_id: 'uuid',
  factor_id: 'uuid',
  score: 'number',
  comment: 'string'
};

const updateResponseDto = {
  score: 'number',
  comment: 'string'
};

const bulkResponseDto = {
  assessment_id: 'uuid',
  responses: 'array' // Array of { factor_id, score, comment }
};

// Assessment Status Enum
const ASSESSMENT_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed'
};

// Assessment Summary DTO
const assessmentSummaryDto = {
  assessment_id: 'uuid',
  organization_name: 'string',
  assessment_date: 'date',
  assessor_name: 'string',
  status: 'string',
  total_factors: 'number',
  completed_factors: 'number',
  completion_percentage: 'number',
  overall_score: 'number',
  overall_fuk: 'number',
  kka_scores: 'array', // Array of KKA scores with details
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// KKA Score Detail DTO
const kkaScoreDetailDto = {
  kka_id: 'uuid',
  kka_kode: 'string',
  kka_nama: 'string',
  kka_weight: 'number',
  raw_score: 'number',
  fuk_score: 'number',
  weighted_score: 'number',
  aspect_count: 'number',
  parameter_count: 'number',
  factor_count: 'number',
  aspects: 'array' // Array of aspect scores
};

// Aspect Score Detail DTO
const aspectScoreDetailDto = {
  aspect_id: 'uuid',
  aspect_kode: 'string',
  aspect_nama: 'string',
  aspect_weight: 'number',
  raw_score: 'number',
  fuk_score: 'number',
  weighted_score: 'number',
  parameter_count: 'number',
  factor_count: 'number',
  parameters: 'array' // Array of parameter scores
};

// Parameter Score Detail DTO
const parameterScoreDetailDto = {
  parameter_id: 'uuid',
  parameter_kode: 'string',
  parameter_nama: 'string',
  parameter_weight: 'number',
  raw_score: 'number',
  fuk_score: 'number',
  weighted_score: 'number',
  factor_count: 'number',
  factors: 'array' // Array of factor scores
};

// Factor Score Detail DTO
const factorScoreDetailDto = {
  factor_id: 'uuid',
  factor_kode: 'string',
  factor_nama: 'string',
  max_score: 'number',
  raw_score: 'number',
  normalized_score: 'number',
  fuk_score: 'number',
  comment: 'string',
  created_by: 'uuid',
  created_at: 'timestamp'
};

module.exports = {
  assessmentEntity,
  responseEntity,
  assessmentResultEntity,
  createAssessmentDto,
  updateAssessmentDto,
  createResponseDto,
  updateResponseDto,
  bulkResponseDto,
  ASSESSMENT_STATUS,
  assessmentSummaryDto,
  kkaScoreDetailDto,
  aspectScoreDetailDto,
  parameterScoreDetailDto,
  factorScoreDetailDto
};

