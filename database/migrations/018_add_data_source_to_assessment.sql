-- Migration: Add data_source column to assessment table
-- Purpose: Differentiate between regular assessments and master data (SK16)
-- Date: 2025-01-27

-- Add data_source column to assessment table
ALTER TABLE assessment
ADD COLUMN IF NOT EXISTS data_source VARCHAR(50)
DEFAULT 'manual'
CHECK (data_source IN ('manual', 'sk16', 'imported'));

-- Add index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_assessment_data_source ON assessment(data_source);

-- Add comment to explain the column
COMMENT ON COLUMN assessment.data_source IS 'Source of assessment data: manual (regular flow), sk16 (master data), imported (bulk import)';

-- Update existing assessments to have 'manual' as data_source
UPDATE assessment SET data_source = 'manual' WHERE data_source IS NULL;
