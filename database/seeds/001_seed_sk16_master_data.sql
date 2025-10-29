-- ========================================
-- SK16 Master Data Seeding Script
-- Purpose: Seed master data untuk assessment berulang (reusable templates)
-- ========================================

-- Insert sample master data assessments
-- These serve as templates that can be reused for new assessments

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
    'Master data template untuk assessment standar SK16. Dapat digunakan berkali-kali untuk assessment baru.',
    CURRENT_TIMESTAMP
),
(
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Template SK16 - Quick Assessment',
    CURRENT_DATE,
    'completed',
    'Master data template untuk quick assessment SK16. Template dengan struktur yang lebih sederhana.',
    CURRENT_TIMESTAMP
);

-- Note: Struktur detail assessment (aspects, parameters, factors, dll)
-- akan di-seed dari data KKA yang sudah ada
-- Master data ini hanya untuk template, nilai dan evidence tidak disimpan
-- karena akan diisi ulang saat assessment baru dibuat dari template ini

-- Create index untuk pencarian master data
CREATE INDEX IF NOT EXISTS idx_assessment_master_template
ON assessment(organization_name, status)
WHERE status = 'completed' AND notes LIKE '%Master data template%';

-- Add comment untuk dokumentasi
COMMENT ON COLUMN assessment.notes IS 'Catatan assessment. Jika berisi "Master data template" maka assessment ini adalah master data yang dapat digunakan sebagai template.';

