-- Migration: Add unit_bidang_id to PUGKI and ACGS assessment tables
-- This makes PUGKI and ACGS consistent with SK16 assessment structure

-- Add unit_bidang_id to pugki_assessment
ALTER TABLE pugki_assessment
  ADD COLUMN IF NOT EXISTS unit_bidang_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pugki_assessment_unit_bidang_id_fkey'
  ) THEN
    ALTER TABLE pugki_assessment
      ADD CONSTRAINT pugki_assessment_unit_bidang_id_fkey
        FOREIGN KEY (unit_bidang_id) REFERENCES unit_bidang(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pugki_assessment_unit_bidang
  ON pugki_assessment(unit_bidang_id);

-- Add unit_bidang_id to acgs_assessment
ALTER TABLE acgs_assessment
  ADD COLUMN IF NOT EXISTS unit_bidang_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acgs_assessment_unit_bidang_id_fkey'
  ) THEN
    ALTER TABLE acgs_assessment
      ADD CONSTRAINT acgs_assessment_unit_bidang_id_fkey
        FOREIGN KEY (unit_bidang_id) REFERENCES unit_bidang(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acgs_assessment_unit_bidang
  ON acgs_assessment(unit_bidang_id);

-- Add comment explaining the column
COMMENT ON COLUMN pugki_assessment.unit_bidang_id IS 'Unit/Bidang yang menjadi fokus assessment PUGKI';
COMMENT ON COLUMN acgs_assessment.unit_bidang_id IS 'Unit/Bidang yang menjadi fokus assessment ACGS';
