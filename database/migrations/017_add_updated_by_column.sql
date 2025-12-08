-- Migration 017: Add updated_by column to track who last updated records
-- Run this on the production database

-- Add updated_by column to assessment table
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add updated_by column to acgs_assessment table  
ALTER TABLE acgs_assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add updated_by column to pugki_assessment table
ALTER TABLE pugki_assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add updated_by column to aoi_monitoring table
ALTER TABLE aoi_monitoring ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assessment_updated_by ON assessment(updated_by);
CREATE INDEX IF NOT EXISTS idx_acgs_assessment_updated_by ON acgs_assessment(updated_by);
CREATE INDEX IF NOT EXISTS idx_pugki_assessment_updated_by ON pugki_assessment(updated_by);
CREATE INDEX IF NOT EXISTS idx_aoi_monitoring_updated_by ON aoi_monitoring(updated_by);
