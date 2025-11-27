-- Migration: Add PIC assignment and workflow columns to PUGKI and ACGS
-- Date: 2025-11-27
-- Description: Add pic_unit_bidang_id columns and update status workflow for PUGKI and ACGS assessments

-- Add pic_unit_bidang_id to pugki_rekomendasi
ALTER TABLE pugki_rekomendasi
ADD COLUMN IF NOT EXISTS pic_unit_bidang_id UUID REFERENCES unit_bidang(id);

-- Add pic_unit_bidang_id to acgs_question
ALTER TABLE acgs_question
ADD COLUMN IF NOT EXISTS pic_unit_bidang_id UUID REFERENCES unit_bidang(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pugki_rekomendasi_pic_unit ON pugki_rekomendasi(pic_unit_bidang_id);
CREATE INDEX IF NOT EXISTS idx_acgs_question_pic_unit ON acgs_question(pic_unit_bidang_id);

-- Add assessor_id to track who created the assessment (like SK16)
ALTER TABLE pugki_assessment
ADD COLUMN IF NOT EXISTS assessor_id UUID REFERENCES users(id);

ALTER TABLE acgs_assessment
ADD COLUMN IF NOT EXISTS assessor_id UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pugki_assessment_assessor ON pugki_assessment(assessor_id);
CREATE INDEX IF NOT EXISTS idx_acgs_assessment_assessor ON acgs_assessment(assessor_id);

-- Note: Status field already exists as VARCHAR(50), which supports all workflow statuses:
-- 'draft', 'in_progress', 'proses_tindak_lanjut', 'verifikasi', 'selesai', 'selesai_berkelanjutan'
-- No need to alter the status column

-- Update existing records to have assessor_id from created_by if not set
UPDATE pugki_assessment
SET assessor_id = created_by
WHERE assessor_id IS NULL AND created_by IS NOT NULL;

UPDATE acgs_assessment
SET assessor_id = created_by
WHERE assessor_id IS NULL AND created_by IS NOT NULL;

-- Print success message
SELECT 'Migration completed: PIC assignment and workflow columns added to PUGKI and ACGS' AS result;
