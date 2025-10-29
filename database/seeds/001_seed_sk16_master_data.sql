-- ========================================
-- SK16 Master Data Seeding Script
-- Purpose: Seed master data untuk assessment berulang (reusable templates)
-- ========================================

-- Insert sample master data assessments
-- These serve as templates that can be reused for new assessments

-- VERSION 1: If your table has 'organization_name' column (NEW schema)
-- Uncomment this if table structure matches migration file
/*
INSERT INTO assessment (
    id,
    organization_name,
    assessment_date,
    status,
    notes,
    created_at
) VALUES
(
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Template SK16 - Standard Assessment',
    CURRENT_DATE,
    'completed',
    '[SK16] Master data template untuk assessment standar SK16. Dapat digunakan berkali-kali untuk assessment baru.',
    CURRENT_TIMESTAMP
),
(
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Template SK16 - Quick Assessment',
    CURRENT_DATE,
    'completed',
    '[SK16] Master data template untuk quick assessment SK16. Template dengan struktur yang lebih sederhana.',
    CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_master_template
ON assessment(organization_name, status)
WHERE status = 'completed' AND notes LIKE '%Master data template%';
*/

-- VERSION 2: If your table has 'title' column instead (OLD schema)
-- Use this version if you get error "column organization_name does not exist"

-- First, delete if exists to avoid duplicates
DELETE FROM assessment WHERE id IN (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
);

-- Insert master data templates
-- Note: Try different status values if you get constraint error
-- Common status values: 'draft', 'selesai', 'verifikasi', 'in_progress'
INSERT INTO assessment (
    id,
    title,
    assessment_date,
    status,
    notes,
    created_at
) VALUES
(
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Template SK16 - Standard Assessment',
    CURRENT_DATE,
    'selesai',  -- Changed from 'completed' to 'selesai' (Indonesian)
    '[SK16] Master data template untuk assessment standar SK16. Dapat digunakan berkali-kali untuk assessment baru.',
    CURRENT_TIMESTAMP
),
(
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Template SK16 - Quick Assessment',
    CURRENT_DATE,
    'selesai',  -- Changed from 'completed' to 'selesai'
    '[SK16] Master data template untuk quick assessment SK16. Template dengan struktur yang lebih sederhana.',
    CURRENT_TIMESTAMP
);

-- Create index for searching master data templates
DROP INDEX IF EXISTS idx_assessment_master_template;
CREATE INDEX idx_assessment_master_template
ON assessment(title, status)
WHERE status = 'selesai' AND notes LIKE '%[SK16]%';

-- Add comment for documentation
COMMENT ON COLUMN assessment.notes IS 'Catatan assessment. Jika berisi "Master data template" atau prefix [SK16] maka assessment ini adalah master data yang dapat digunakan sebagai template.';

