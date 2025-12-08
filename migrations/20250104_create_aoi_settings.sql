-- Create AOI Settings table
CREATE TABLE IF NOT EXISTS aoi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type VARCHAR(20) NOT NULL UNIQUE CHECK (assessment_type IN ('SK16', 'PUGKI', 'ACGS')),
  min_score_threshold DECIMAL(5,2) DEFAULT 80.00,
  auto_generate_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings for each assessment type
INSERT INTO aoi_settings (assessment_type, min_score_threshold, auto_generate_enabled)
VALUES
  ('SK16', 80.00, true),
  ('PUGKI', 80.00, true),
  ('ACGS', 80.00, true)
ON CONFLICT (assessment_type) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_aoi_settings_type ON aoi_settings(assessment_type);
