-- =====================================================
-- Migration: Add is_master_data column to PUGKI and ACGS assessment tables
-- This fixes the issue where master data appears in assessment list
-- Run this in production database
-- =====================================================

-- Add is_master_data column to pugki_assessment if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pugki_assessment' AND column_name = 'is_master_data'
    ) THEN
        ALTER TABLE pugki_assessment ADD COLUMN is_master_data BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_master_data column to pugki_assessment';
    ELSE
        RAISE NOTICE 'is_master_data column already exists in pugki_assessment';
    END IF;
END $$;

-- Add is_master_data column to acgs_assessment if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'acgs_assessment' AND column_name = 'is_master_data'
    ) THEN
        ALTER TABLE acgs_assessment ADD COLUMN is_master_data BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_master_data column to acgs_assessment';
    ELSE
        RAISE NOTICE 'is_master_data column already exists in acgs_assessment';
    END IF;
END $$;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_pugki_assessment_is_master_data ON pugki_assessment(is_master_data);
CREATE INDEX IF NOT EXISTS idx_acgs_assessment_is_master_data ON acgs_assessment(is_master_data);

-- Verify the changes
SELECT 
    'pugki_assessment' as table_name,
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pugki_assessment' AND column_name = 'is_master_data'
UNION ALL
SELECT 
    'acgs_assessment' as table_name,
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'acgs_assessment' AND column_name = 'is_master_data';
