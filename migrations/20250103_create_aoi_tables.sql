-- Migration: Create AOI tables
-- Description: Tables for Area of Improvement (SK16, PUGKI, ACGS)

-- Create aoi table
CREATE TABLE IF NOT EXISTS aoi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('SK16', 'PUGKI', 'ACGS')),
  title TEXT NOT NULL,
  year INTEGER,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create aoi_recommendation table
CREATE TABLE IF NOT EXISTS aoi_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aoi_id UUID NOT NULL REFERENCES aoi(id) ON DELETE CASCADE,
  section VARCHAR(200), -- For PUGKI: 'A. PERAN...', 'B. KOMPOSISI...'
  no VARCHAR(10), -- Nomor urut atau kosong untuk SK16
  nomor_indikator VARCHAR(50), -- Khusus SK16: '15 (47.4.b)'
  rekomendasi TEXT NOT NULL,
  tindaklanjut_1 TEXT,
  tindaklanjut_2 TEXT, -- NULL untuk PUGKI bagian B
  pic VARCHAR(100),
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aoi_type ON aoi(assessment_type);
CREATE INDEX IF NOT EXISTS idx_aoi_year ON aoi(year);
CREATE INDEX IF NOT EXISTS idx_aoi_status ON aoi(status);
CREATE INDEX IF NOT EXISTS idx_aoi_deleted ON aoi(deleted_at);
CREATE INDEX IF NOT EXISTS idx_aoi_recommendation_aoi ON aoi_recommendation(aoi_id);
CREATE INDEX IF NOT EXISTS idx_aoi_recommendation_section ON aoi_recommendation(section);

-- Add comments
COMMENT ON TABLE aoi IS 'Area of Improvement data for SK16, PUGKI, and ACGS assessments';
COMMENT ON TABLE aoi_recommendation IS 'Recommendations for Area of Improvement';
COMMENT ON COLUMN aoi.assessment_type IS 'Type of assessment: SK16, PUGKI, or ACGS';
COMMENT ON COLUMN aoi_recommendation.section IS 'Section name for PUGKI (e.g., A. PERAN..., B. KOMPOSISI...)';
COMMENT ON COLUMN aoi_recommendation.nomor_indikator IS 'Indicator number for SK16 (e.g., 15 (47.4.b))';
