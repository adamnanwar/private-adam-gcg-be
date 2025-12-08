-- Migration: Update AOI monitoring status to include 'in_progress'
-- Manual AOI creation should use 'in_progress', auto-generated uses 'draft'

-- Drop existing check constraint
ALTER TABLE aoi_monitoring DROP CONSTRAINT IF EXISTS aoi_monitoring_status_check;

-- Add new check constraint with in_progress status
ALTER TABLE aoi_monitoring
  ADD CONSTRAINT aoi_monitoring_status_check
  CHECK (status IN ('draft', 'in_progress', 'published', 'archived'));

-- Update default status for manual creation
ALTER TABLE aoi_monitoring
  ALTER COLUMN status SET DEFAULT 'in_progress';

-- Add comment
COMMENT ON COLUMN aoi_monitoring.status IS 'Status: draft (auto-generated), in_progress (manual/being worked on), published (completed), archived (closed)';
