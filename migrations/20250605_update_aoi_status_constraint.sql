-- Migration: Update AOI Monitoring Status Check Constraint
-- This migration updates the status check constraint to include new status values:
-- 'proses_tindak_lanjut', 'verifikasi', 'selesai'
-- 
-- Run this migration on your PostgreSQL database:
-- psql -U your_user -d your_database -f this_file.sql

-- First, drop the existing constraint
ALTER TABLE aoi_monitoring DROP CONSTRAINT IF EXISTS aoi_monitoring_status_check;

-- Then, add the updated constraint with all status values
ALTER TABLE aoi_monitoring 
ADD CONSTRAINT aoi_monitoring_status_check 
CHECK (status IN ('draft', 'in_progress', 'proses_tindak_lanjut', 'verifikasi', 'selesai', 'published', 'archived'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'aoi_monitoring_status_check';
