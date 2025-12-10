-- Migration: Add overall_score and level_achieved columns to acgs_assessment and pugki_assessment
-- Date: 2025-01-09

-- Add overall_score to acgs_assessment
ALTER TABLE acgs_assessment ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2);
ALTER TABLE acgs_assessment ADD COLUMN IF NOT EXISTS level_achieved INTEGER;

-- Add overall_score to pugki_assessment
ALTER TABLE pugki_assessment ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2);

-- Create indexes for faster sorting/filtering
CREATE INDEX IF NOT EXISTS idx_acgs_assessment_overall_score ON acgs_assessment(overall_score);
CREATE INDEX IF NOT EXISTS idx_pugki_assessment_overall_score ON pugki_assessment(overall_score);

-- Verify changes
SELECT 'acgs_assessment' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'acgs_assessment' AND column_name IN ('overall_score', 'level_achieved')
UNION ALL
SELECT 'pugki_assessment' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pugki_assessment' AND column_name = 'overall_score';
