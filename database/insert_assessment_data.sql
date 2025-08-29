-- =====================================================
-- Insert Assessment Data with KKA Information
-- Database: gcg
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- INSERT ASSESSMENT DATA
-- =====================================================

-- Clear existing assessment data (optional - uncomment if you want to start fresh)
-- DELETE FROM assessment;

-- Insert new assessment records with KKA information
INSERT INTO assessment (id, organization_name, assessment_date, assessor_id, status, kka_number, kka_name, created_at, updated_at) VALUES
-- Assessment 1
('550e8400-e29b-41d4-a716-446655440080', 'PT GCG Indonesia', '2025-02-20', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 2  
('550e8400-e29b-41d4-a716-446655440081', 'PT GCG Indonesia', '2025-02-18', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 3
('550e8400-e29b-41d4-a716-446655440082', 'PT GCG Indonesia', '2025-02-15', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 4
('550e8400-e29b-41d4-a716-446655440083', 'PT GCG Indonesia', '2025-02-12', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 5
('550e8400-e29b-41d4-a716-446655440084', 'PT GCG Indonesia', '2025-02-10', '550e8400-e29b-41d4-a716-446655440003', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW()),

-- Assessment 6
('550e8400-e29b-41d4-a716-446655440085', 'PT GCG Indonesia', '2025-02-08', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 7
('550e8400-e29b-41d4-a716-446655440086', 'PT GCG Indonesia', '2025-02-05', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 8
('550e8400-e29b-41d4-a716-446655440087', 'PT GCG Indonesia', '2025-02-03', '550e8400-e29b-41d4-a716-446655440002', 'proses_tindak_lanjut', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 9
('550e8400-e29b-41d4-a716-446655440088', 'PT GCG Indonesia', '2025-02-01', '550e8400-e29b-41d4-a716-446655440003', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 10
('550e8400-e29b-41d4-a716-446655440089', 'PT GCG Indonesia', '2025-01-30', '550e8400-e29b-41d4-a716-446655440002', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW()),

-- Additional assessments for more variety
-- Assessment 11
('550e8400-e29b-41d4-a716-446655440090', 'PT GCG Indonesia', '2025-01-25', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 12
('550e8400-e29b-41d4-a716-446655440091', 'PT GCG Indonesia', '2025-01-20', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 13
('550e8400-e29b-41d4-a716-446655440092', 'PT GCG Indonesia', '2025-01-15', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 14
('550e8400-e29b-41d4-a716-446655440093', 'PT GCG Indonesia', '2025-01-10', '550e8400-e29b-41d4-a716-446655440003', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 15
('550e8400-e29b-41d4-a716-446655440094', 'PT GCG Indonesia', '2025-01-05', '550e8400-e29b-41d4-a716-446655440002', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count total assessments
SELECT 'Total Assessments' as info, COUNT(*) as count FROM assessment;

-- Show all assessments with KKA info
SELECT 
    id,
    kka_number,
    kka_name,
    organization_name,
    assessment_date,
    status,
    created_at
FROM assessment
ORDER BY assessment_date DESC;

-- Count by KKA
SELECT 
    kka_number,
    kka_name,
    COUNT(*) as assessment_count
FROM assessment
GROUP BY kka_number, kka_name
ORDER BY kka_number;

-- Count by status
SELECT 
    status,
    COUNT(*) as count
FROM assessment
GROUP BY status
ORDER BY count DESC;

-- Show recent assessments (last 5)
SELECT 
    kka_number,
    kka_name,
    assessment_date,
    status
FROM assessment
ORDER BY assessment_date DESC
LIMIT 5;
