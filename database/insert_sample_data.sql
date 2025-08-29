-- =====================================================
-- GCG Maturity Assessment - Complete Sample Data
-- Database: gcg
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
INSERT INTO users (id, name, email, password_hash, role, auth_provider, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Admin GCG', 'admin@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'admin', 'local', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Assessor 1', 'assessor1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'assessor', 'local', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Assessor 2', 'assessor2@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'assessor', 'local', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'PIC 1', 'pic1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'pic', 'local', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Viewer 1', 'viewer1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'viewer', 'local', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. KKA TABLE (Kriteria Kunci Assessment)
-- =====================================================
INSERT INTO kka (id, kode, nama, deskripsi, weight, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'KKA-001', 'Tata Kelola Perusahaan', 'Kriteria untuk menilai tata kelola perusahaan secara menyeluruh', 1.0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'KKA-002', 'Pengendalian Internal', 'Kriteria untuk menilai sistem pengendalian internal perusahaan', 1.0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'KKA-003', 'Manajemen Risiko', 'Kriteria untuk menilai sistem manajemen risiko perusahaan', 1.0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440013', 'KKA-004', 'Kepatuhan', 'Kriteria untuk menilai tingkat kepatuhan perusahaan terhadap regulasi', 1.0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440014', 'KKA-005', 'Teknologi Informasi', 'Kriteria untuk menilai pemanfaatan teknologi informasi', 1.0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. ASSESSMENT TABLE (with KKA fields)
-- =====================================================
INSERT INTO assessment (id, organization_name, assessment_date, assessor_id, status, kka_number, kka_name, created_at, updated_at) VALUES
-- Assessment 1 - KKA-001
('550e8400-e29b-41d4-a716-446655440080', 'PT GCG Indonesia', '2025-02-20', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 2 - KKA-002  
('550e8400-e29b-41d4-a716-446655440081', 'PT GCG Indonesia', '2025-02-18', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 3 - KKA-003
('550e8400-e29b-41d4-a716-446655440082', 'PT GCG Indonesia', '2025-02-15', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 4 - KKA-004
('550e8400-e29b-41d4-a716-446655440083', 'PT GCG Indonesia', '2025-02-12', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 5 - KKA-005
('550e8400-e29b-41d4-a716-446655440084', 'PT GCG Indonesia', '2025-02-10', '550e8400-e29b-41d4-a716-446655440003', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW()),

-- Assessment 6 - KKA-001 (repeat)
('550e8400-e29b-41d4-a716-446655440085', 'PT GCG Indonesia', '2025-02-08', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 7 - KKA-002 (repeat)
('550e8400-e29b-41d4-a716-446655440086', 'PT GCG Indonesia', '2025-02-05', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 8 - KKA-003 (repeat)
('550e8400-e29b-41d4-a716-446655440087', 'PT GCG Indonesia', '2025-02-03', '550e8400-e29b-41d4-a716-446655440002', 'proses_tindak_lanjut', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 9 - KKA-004 (repeat)
('550e8400-e29b-41d4-a716-446655440088', 'PT GCG Indonesia', '2025-02-01', '550e8400-e29b-41d4-a716-446655440003', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 10 - KKA-005 (repeat)
('550e8400-e29b-41d4-a716-446655440089', 'PT GCG Indonesia', '2025-01-30', '550e8400-e29b-41d4-a716-446655440002', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW()),

-- Additional assessments for more variety
-- Assessment 11 - KKA-001
('550e8400-e29b-41d4-a716-446655440090', 'PT GCG Indonesia', '2025-01-25', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-001', 'Tata Kelola Perusahaan', NOW(), NOW()),

-- Assessment 12 - KKA-002
('550e8400-e29b-41d4-a716-446655440091', 'PT GCG Indonesia', '2025-01-20', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', 'KKA-002', 'Pengendalian Internal', NOW(), NOW()),

-- Assessment 13 - KKA-003
('550e8400-e29b-41d4-a716-446655440092', 'PT GCG Indonesia', '2025-01-15', '550e8400-e29b-41d4-a716-446655440002', 'selesai', 'KKA-003', 'Manajemen Risiko', NOW(), NOW()),

-- Assessment 14 - KKA-004
('550e8400-e29b-41d4-a716-446655440093', 'PT GCG Indonesia', '2025-01-10', '550e8400-e29b-41d4-a716-446655440003', 'selesai', 'KKA-004', 'Kepatuhan', NOW(), NOW()),

-- Assessment 15 - KKA-005
('550e8400-e29b-41d4-a716-446655440094', 'PT GCG Indonesia', '2025-01-05', '550e8400-e29b-41d4-a716-446655440002', 'selesai_berkelanjutan', 'KKA-005', 'Teknologi Informasi', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. VERIFICATION QUERIES
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

-- Show assessments by organization
SELECT 
    organization_name,
    COUNT(*) as assessment_count
FROM assessment
GROUP BY organization_name;

-- Show assessor workload
SELECT 
    u.name as assessor_name,
    COUNT(a.id) as assessment_count
FROM assessment a
JOIN users u ON a.assessor_id = u.id
GROUP BY u.id, u.name
ORDER BY assessment_count DESC;
