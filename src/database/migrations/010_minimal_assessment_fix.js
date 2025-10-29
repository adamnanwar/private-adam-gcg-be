/**
 * Minimal assessment schema fix - only add missing columns
 * @param {import('knex').Knex} knex
 */
exports.up = async function(knex) {
  // Check if columns exist before adding them
  const hasMaxScore = await knex.schema.hasColumn('factor', 'max_score');
  const hasWeight = await knex.schema.hasColumn('factor', 'weight');
  const hasSort = await knex.schema.hasColumn('factor', 'sort');
  const hasIsActive = await knex.schema.hasColumn('factor', 'is_active');
  
  const hasKkaWeight = await knex.schema.hasColumn('kka', 'weight');
  const hasAspectWeight = await knex.schema.hasColumn('aspect', 'weight');
  const hasParameterWeight = await knex.schema.hasColumn('parameter', 'weight');
  
  const hasEvidenceAssessmentId = await knex.schema.hasColumn('evidence', 'assessment_id');
  
  const queries = [];
  
  // Add missing columns to factor table if they don't exist
  if (!hasMaxScore) queries.push('ALTER TABLE factor ADD COLUMN max_score DECIMAL(4,2) DEFAULT 1.00;');
  if (!hasWeight) queries.push('ALTER TABLE factor ADD COLUMN weight DECIMAL(10,3) DEFAULT 1.000;');
  if (!hasSort) queries.push('ALTER TABLE factor ADD COLUMN sort INTEGER DEFAULT 0;');
  if (!hasIsActive) queries.push('ALTER TABLE factor ADD COLUMN is_active BOOLEAN DEFAULT true;');
  
  // Add missing columns to kka table if they don't exist
  if (!hasKkaWeight) queries.push('ALTER TABLE kka ADD COLUMN weight DECIMAL(10,3) DEFAULT 1.000;');
  
  // Add missing columns to aspect table if they don't exist
  if (!hasAspectWeight) queries.push('ALTER TABLE aspect ADD COLUMN weight DECIMAL(10,3) DEFAULT 1.000;');
  
  // Add missing columns to parameter table if they don't exist
  if (!hasParameterWeight) queries.push('ALTER TABLE parameter ADD COLUMN weight DECIMAL(10,3) DEFAULT 1.000;');
  
  // Update evidence table to support factor evidence if not already done
  if (!hasEvidenceAssessmentId) queries.push('ALTER TABLE evidence ADD COLUMN assessment_id UUID REFERENCES assessment(id) ON DELETE CASCADE;');
  
  // Add indexes for new columns
  queries.push('CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessment(status)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_factor_max_score ON factor(max_score)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_factor_weight ON factor(weight)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_factor_sort ON factor(sort)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_factor_is_active ON factor(is_active)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_evidence_assessment_id ON evidence(assessment_id)');
  queries.push('CREATE INDEX IF NOT EXISTS idx_evidence_target_type_target_id ON evidence(target_type, target_id)');
  
  // Execute queries one by one
  for (const query of queries) {
    if (query.trim()) {
      await knex.raw(query);
    }
  }
  
  return Promise.resolve();
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .raw('ALTER TABLE factor DROP COLUMN IF EXISTS max_score;')
    .raw('ALTER TABLE factor DROP COLUMN IF EXISTS weight;')
    .raw('ALTER TABLE factor DROP COLUMN IF EXISTS sort;')
    .raw('ALTER TABLE factor DROP COLUMN IF EXISTS is_active;')
    .raw('ALTER TABLE kka DROP COLUMN IF EXISTS weight;')
    .raw('ALTER TABLE aspect DROP COLUMN IF EXISTS weight;')
    .raw('ALTER TABLE parameter DROP COLUMN IF EXISTS weight;')
    .raw('ALTER TABLE evidence DROP COLUMN IF EXISTS assessment_id;');
};
