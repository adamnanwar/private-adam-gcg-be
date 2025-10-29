-- Migration: Rollback data_source column from assessment table
-- Purpose: Remove data_source column as it's not needed
-- Date: 2025-01-27

-- Drop index first
DROP INDEX IF EXISTS idx_assessment_data_source;

-- Drop the column
ALTER TABLE assessment DROP COLUMN IF EXISTS data_source;
