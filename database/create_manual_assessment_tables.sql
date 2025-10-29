-- =====================================================
-- Create Manual Assessment Tables
-- Database: gcg
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ASSESSMENT KKA TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_kka (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL, -- Client-side ID from frontend
    kode VARCHAR(50),
    nama VARCHAR(255),
    deskripsi TEXT,
    weight NUMERIC(3,2) DEFAULT 1.00,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ASSESSMENT ASPECT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_aspect (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    assessment_kka_id UUID NOT NULL REFERENCES assessment_kka(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL, -- Client-side ID from frontend
    kode VARCHAR(50),
    nama VARCHAR(255),
    weight NUMERIC(3,2) DEFAULT 1.00,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ASSESSMENT PARAMETER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_parameter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    assessment_aspect_id UUID NOT NULL REFERENCES assessment_aspect(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL, -- Client-side ID from frontend
    kode VARCHAR(50),
    nama VARCHAR(255),
    weight NUMERIC(3,2) DEFAULT 1.00,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ASSESSMENT FACTOR TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_factor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    assessment_parameter_id UUID NOT NULL REFERENCES assessment_parameter(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL, -- Client-side ID from frontend
    kode VARCHAR(50),
    nama VARCHAR(255),
    deskripsi TEXT,
    max_score INTEGER DEFAULT 1,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- UPDATE RESPONSE TABLE FOR MANUAL ASSESSMENT
-- =====================================================
-- Add column for assessment_factor_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'response' AND column_name = 'assessment_factor_id') THEN
        ALTER TABLE response ADD COLUMN assessment_factor_id UUID REFERENCES assessment_factor(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'response' AND column_name = 'client_factor_id') THEN
        ALTER TABLE response ADD COLUMN client_factor_id TEXT;
    END IF;
END $$;

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_assessment_kka_assessment_id ON assessment_kka(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_kka_client_id ON assessment_kka(client_id);

CREATE INDEX IF NOT EXISTS idx_assessment_aspect_assessment_id ON assessment_aspect(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_aspect_kka_id ON assessment_aspect(assessment_kka_id);
CREATE INDEX IF NOT EXISTS idx_assessment_aspect_client_id ON assessment_aspect(client_id);

CREATE INDEX IF NOT EXISTS idx_assessment_parameter_assessment_id ON assessment_parameter(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_parameter_aspect_id ON assessment_parameter(assessment_aspect_id);
CREATE INDEX IF NOT EXISTS idx_assessment_parameter_client_id ON assessment_parameter(client_id);

CREATE INDEX IF NOT EXISTS idx_assessment_factor_assessment_id ON assessment_factor(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_factor_parameter_id ON assessment_factor(assessment_parameter_id);
CREATE INDEX IF NOT EXISTS idx_assessment_factor_client_id ON assessment_factor(client_id);

CREATE INDEX IF NOT EXISTS idx_response_assessment_factor_id ON response(assessment_factor_id);
CREATE INDEX IF NOT EXISTS idx_response_client_factor_id ON response(client_factor_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check if tables were created
SELECT 'assessment_kka' as table_name, COUNT(*) as row_count FROM assessment_kka
UNION ALL
SELECT 'assessment_aspect' as table_name, COUNT(*) as row_count FROM assessment_aspect
UNION ALL
SELECT 'assessment_parameter' as table_name, COUNT(*) as row_count FROM assessment_parameter
UNION ALL
SELECT 'assessment_factor' as table_name, COUNT(*) as row_count FROM assessment_factor;

-- Show table structure
\d assessment_kka;
\d assessment_aspect;
\d assessment_parameter;
\d assessment_factor;






