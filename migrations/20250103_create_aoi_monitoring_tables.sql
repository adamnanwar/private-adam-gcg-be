-- Migration: Create AOI Monitoring tables
-- Description: Tables for Area of Improvement Monitoring (SK16, PUGKI, ACGS)

-- Drop tables if exists (for development)
DROP TABLE IF EXISTS aoi_monitoring_recommendation CASCADE;
DROP TABLE IF EXISTS aoi_monitoring CASCADE;

-- Create aoi_monitoring table
CREATE TABLE aoi_monitoring (
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

-- Create aoi_monitoring_recommendation table
CREATE TABLE aoi_monitoring_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aoi_monitoring_id UUID NOT NULL REFERENCES aoi_monitoring(id) ON DELETE CASCADE,
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
CREATE INDEX idx_aoi_monitoring_type ON aoi_monitoring(assessment_type);
CREATE INDEX idx_aoi_monitoring_year ON aoi_monitoring(year);
CREATE INDEX idx_aoi_monitoring_status ON aoi_monitoring(status);
CREATE INDEX idx_aoi_monitoring_deleted ON aoi_monitoring(deleted_at);
CREATE INDEX idx_aoi_monitoring_rec_aoi ON aoi_monitoring_recommendation(aoi_monitoring_id);
CREATE INDEX idx_aoi_monitoring_rec_section ON aoi_monitoring_recommendation(section);

-- Add comments
COMMENT ON TABLE aoi_monitoring IS 'Area of Improvement monitoring data for SK16, PUGKI, and ACGS assessments';
COMMENT ON TABLE aoi_monitoring_recommendation IS 'Recommendations for Area of Improvement monitoring';
COMMENT ON COLUMN aoi_monitoring.assessment_type IS 'Type of assessment: SK16, PUGKI, or ACGS';
COMMENT ON COLUMN aoi_monitoring_recommendation.section IS 'Section name for PUGKI (e.g., A. PERAN..., B. KOMPOSISI...)';
COMMENT ON COLUMN aoi_monitoring_recommendation.nomor_indikator IS 'Indicator number for SK16 (e.g., 15 (47.4.b))';
