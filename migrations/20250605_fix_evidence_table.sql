-- Migration: Fix evidence table for new target types and columns
-- Date: 2025-06-05
-- Description: Add support for pugki_rekomendasi, acgs_question, aoi_recommendation target types
--              and add missing columns needed by the evidence service

-- Step 1: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add assessment_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'assessment_id') THEN
        ALTER TABLE evidence ADD COLUMN assessment_id UUID;
        CREATE INDEX IF NOT EXISTS idx_evidence_assessment_id ON evidence(assessment_id);
    END IF;
    
    -- Add filename column (stored filename after upload)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'filename') THEN
        ALTER TABLE evidence ADD COLUMN filename VARCHAR(255);
    END IF;
    
    -- Add original_filename column (if not exists as original_name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'original_filename') THEN
        -- Check if original_name exists, if so rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'original_name') THEN
            ALTER TABLE evidence RENAME COLUMN original_name TO original_filename;
        ELSE
            ALTER TABLE evidence ADD COLUMN original_filename VARCHAR(255);
        END IF;
    END IF;
    
    -- Add file_path column (if uri exists, we'll keep both for compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'file_path') THEN
        ALTER TABLE evidence ADD COLUMN file_path TEXT;
    END IF;
    
    -- Add mime_type column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'mime_type') THEN
        ALTER TABLE evidence ADD COLUMN mime_type VARCHAR(100);
    END IF;
    
    -- Add file_size column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'evidence' AND column_name = 'file_size') THEN
        ALTER TABLE evidence ADD COLUMN file_size BIGINT;
    END IF;
END $$;

-- Step 2: Drop the old CHECK constraint on target_type
-- First, find and drop any CHECK constraint on target_type column
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find all check constraints on the evidence table related to target_type
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'evidence'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%target_type%'
    LOOP
        EXECUTE format('ALTER TABLE evidence DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Change target_type column to VARCHAR without CHECK (allow any value)
-- Or add a new comprehensive CHECK constraint
ALTER TABLE evidence 
    ALTER COLUMN target_type TYPE VARCHAR(50);

-- Step 4: Add new CHECK constraint with all allowed target types
ALTER TABLE evidence 
    ADD CONSTRAINT evidence_target_type_check 
    CHECK (target_type IN (
        -- Legacy types
        'assessment_aspect', 
        'assessment_parameter', 
        'assessment_factor', 
        'aoi',
        -- New types used by the application
        'factor',
        'parameter',
        'kka',
        'pugki_rekomendasi',
        'acgs_question',
        'aoi_recommendation'
    ));

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evidence_target_type ON evidence(target_type);
CREATE INDEX IF NOT EXISTS idx_evidence_target_type_target_id ON evidence(target_type, target_id);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN evidence.assessment_id IS 'ID of the related assessment (for querying evidence by assessment)';
COMMENT ON COLUMN evidence.filename IS 'Stored filename after upload (server-generated name)';
COMMENT ON COLUMN evidence.original_filename IS 'Original filename from user upload';
COMMENT ON COLUMN evidence.file_path IS 'Full file path on server';
COMMENT ON COLUMN evidence.target_type IS 'Type of target entity: factor, parameter, kka, pugki_rekomendasi, acgs_question, aoi_recommendation, etc.';

-- Verify migration
SELECT 'Evidence table migration completed successfully!' as status;
