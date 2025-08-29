-- =====================================================
-- GCG Maturity Assessment - Initial Data Script
-- Database: gcg
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
INSERT INTO users (id, name, email, password_hash, role, auth_provider, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Admin GCG', 'admin@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'admin', 'local', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Assessor 1', 'assessor1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'assessor', 'local', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Assessor 2', 'assessor2@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'assessor', 'local', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'PIC 1', 'pic1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'pic', 'local', NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Viewer 1', 'viewer1@gcg.com', '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ', 'viewer', 'local', NOW());

-- =====================================================
-- 2. KKA TABLE (Kriteria Kunci Assessment)
-- =====================================================
INSERT INTO kka (id, kode, nama, deskripsi, weight, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'KKA-001', 'Tata Kelola Perusahaan', 'Kriteria untuk menilai tata kelola perusahaan secara menyeluruh', 1.0, NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'KKA-002', 'Pengendalian Internal', 'Kriteria untuk menilai sistem pengendalian internal perusahaan', 1.0, NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'KKA-003', 'Manajemen Risiko', 'Kriteria untuk menilai sistem manajemen risiko perusahaan', 1.0, NOW()),
('550e8400-e29b-41d4-a716-446655440013', 'KKA-004', 'Kepatuhan', 'Kriteria untuk menilai tingkat kepatuhan perusahaan terhadap regulasi', 1.0, NOW()),
('550e8400-e29b-41d4-a716-446655440014', 'KKA-005', 'Teknologi Informasi', 'Kriteria untuk menilai pemanfaatan teknologi informasi', 1.0, NOW());

-- =====================================================
-- 3. ASPECT TABLE
-- =====================================================
INSERT INTO aspect (id, kka_id, kode, nama, weight, sort, created_at) VALUES
-- KKA-001: Tata Kelola Perusahaan
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'ASP-001', 'Struktur Organisasi', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010', 'ASP-002', 'Dewan Komisaris', 0.9, 2, NOW()),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 'ASP-003', 'Dewan Direksi', 0.9, 3, NOW()),

-- KKA-002: Pengendalian Internal
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', 'ASP-004', 'Sistem Kontrol', 0.9, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440011', 'ASP-005', 'Audit Internal', 0.8, 2, NOW()),

-- KKA-003: Manajemen Risiko
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440012', 'ASP-006', 'Identifikasi Risiko', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440012', 'ASP-007', 'Mitigasi Risiko', 0.9, 2, NOW()),

-- KKA-004: Kepatuhan
('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440013', 'ASP-008', 'Regulasi', 0.9, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440013', 'ASP-009', 'Standar Industri', 0.8, 2, NOW()),

-- KKA-005: Teknologi Informasi
('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440014', 'ASP-010', 'Infrastruktur IT', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440014', 'ASP-011', 'Keamanan IT', 0.9, 2, NOW());

-- =====================================================
-- 4. PARAMETER TABLE
-- =====================================================
INSERT INTO parameter (id, aspect_id, kode, nama, weight, sort, created_at) VALUES
-- ASP-001: Struktur Organisasi
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440020', 'PAR-001', 'Komposisi Dewan', 0.6, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440020', 'PAR-002', 'Struktur Komite', 0.7, 2, NOW()),

-- ASP-002: Dewan Komisaris
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440021', 'PAR-003', 'Independensi Komisaris', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440021', 'PAR-004', 'Kompetensi Komisaris', 0.7, 2, NOW()),

-- ASP-004: Sistem Kontrol
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440023', 'PAR-005', 'Kontrol Aktivitas', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440023', 'PAR-006', 'Kontrol Informasi', 0.7, 2, NOW()),

-- ASP-006: Identifikasi Risiko
('550e8400-e29b-41d4-a716-446655440046', '550e8400-e29b-41d4-a716-446655440025', 'PAR-007', 'Risiko Operasional', 0.8, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440047', '550e8400-e29b-41d4-a716-446655440025', 'PAR-008', 'Risiko Finansial', 0.9, 2, NOW()),

-- ASP-008: Regulasi
('550e8400-e29b-41d4-a716-446655440048', '550e8400-e29b-41d4-a716-446655440027', 'PAR-009', 'Kepatuhan Regulator', 0.9, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440049', '550e8400-e29b-41d4-a716-446655440027', 'PAR-010', 'Pelaporan', 0.8, 2, NOW()),

-- ASP-010: Infrastruktur IT
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440029', 'PAR-011', 'Hardware', 0.7, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440029', 'PAR-012', 'Software', 0.8, 2, NOW());

-- =====================================================
-- 5. FACTOR TABLE
-- =====================================================
INSERT INTO factor (id, parameter_id, kode, nama, deskripsi, max_score, sort, created_at) VALUES
-- PAR-001: Komposisi Dewan
('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440040', 'FAK-001', 'Independensi Dewan', 'Faktor independensi anggota dewan direksi', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440040', 'FAK-002', 'Diversitas Dewan', 'Faktor keberagaman komposisi dewan', 1, 2, NOW()),

-- PAR-003: Independensi Komisaris
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440042', 'FAK-003', 'Komisaris Independen', 'Faktor independensi komisaris', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440042', 'FAK-004', 'Konflik Kepentingan', 'Faktor pengelolaan konflik kepentingan', 1, 2, NOW()),

-- PAR-005: Kontrol Aktivitas
('550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440044', 'FAK-005', 'Segregasi Tugas', 'Faktor pemisahan tugas dan tanggung jawab', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440065', '550e8400-e29b-41d4-a716-446655440044', 'FAK-006', 'Otorisasi', 'Faktor sistem otorisasi transaksi', 1, 2, NOW()),

-- PAR-007: Risiko Operasional
('550e8400-e29b-41d4-a716-446655440066', '550e8400-e29b-41d4-a716-446655440046', 'FAK-007', 'Identifikasi Risiko', 'Faktor proses identifikasi risiko operasional', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440067', '550e8400-e29b-41d4-a716-446655440046', 'FAK-008', 'Monitoring Risiko', 'Faktor pemantauan risiko operasional', 1, 2, NOW()),

-- PAR-009: Kepatuhan Regulator
('550e8400-e29b-41d4-a716-446655440068', '550e8400-e29b-41d4-a716-446655440048', 'FAK-009', 'Regulasi Terkini', 'Faktor kepatuhan terhadap regulasi terbaru', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440069', '550e8400-e29b-41d4-a716-446655440048', 'FAK-010', 'Pelanggaran', 'Faktor penanganan pelanggaran regulasi', 1, 2, NOW()),

-- PAR-011: Hardware
('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440050', 'FAK-011', 'Infrastruktur', 'Faktor ketersediaan infrastruktur hardware', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440050', 'FAK-012', 'Maintenance', 'Faktor pemeliharaan hardware', 1, 2, NOW());

-- =====================================================
-- 6. ASSESSMENT TABLE
-- =====================================================
INSERT INTO assessment (id, organization_name, assessment_date, assessor_id, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440080', 'PT GCG Indonesia', '2025-02-20', '550e8400-e29b-41d4-a716-446655440002', 'selesai', NOW()),
('550e8400-e29b-41d4-a716-446655440081', 'PT GCG Indonesia', '2025-02-18', '550e8400-e29b-41d4-a716-446655440002', 'selesai', NOW()),
('550e8400-e29b-41d4-a716-446655440082', 'PT GCG Indonesia', '2025-02-15', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', NOW()),
('550e8400-e29b-41d4-a716-446655440083', 'PT GCG Indonesia', '2025-02-12', '550e8400-e29b-41d4-a716-446655440002', 'selesai', NOW()),
('550e8400-e29b-41d4-a716-446655440084', 'PT GCG Indonesia', '2025-02-10', '550e8400-e29b-41d4-a716-446655440003', 'selesai_berkelanjutan', NOW()),
('550e8400-e29b-41d4-a716-446655440085', 'PT GCG Indonesia', '2025-02-08', '550e8400-e29b-41d4-a716-446655440002', 'selesai', NOW()),
('550e8400-e29b-41d4-a716-446655440086', 'PT GCG Indonesia', '2025-02-05', '550e8400-e29b-41d4-a716-446655440003', 'verifikasi', NOW()),
('550e8400-e29b-41d4-a716-446655440087', 'PT GCG Indonesia', '2025-02-03', '550e8400-e29b-41d4-a716-446655440002', 'proses_tindak_lanjut', NOW()),
('550e8400-e29b-41d4-a716-446655440088', 'PT GCG Indonesia', '2025-02-01', '550e8400-e29b-41d4-a716-446655440003', 'selesai', NOW()),
('550e8400-e29b-41d4-a716-446655440089', 'PT GCG Indonesia', '2025-01-30', '550e8400-e29b-41d4-a716-446655440002', 'selesai_berkelanjutan', NOW());

-- =====================================================
-- 7. RESPONSE TABLE (Sample scores for factors)
-- =====================================================
INSERT INTO response (id, assessment_id, factor_id, score, comment, created_by, created_at) VALUES
-- Assessment 1 - Selesai
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440060', 0.9, 'Dewan direksi sudah independen', '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440061', 0.8, 'Komposisi dewan sudah beragam', '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440062', 0.9, 'Komisaris independen sudah sesuai', '550e8400-e29b-41d4-a716-446655440002', NOW()),

-- Assessment 2 - Selesai
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440060', 0.85, 'Independensi dewan baik', '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440061', 0.8, 'Diversitas sudah memadai', '550e8400-e29b-41d4-a716-446655440002', NOW()),

-- Assessment 3 - Verifikasi
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440060', 0.7, 'Perlu peningkatan independensi', '550e8400-e29b-41d4-a716-446655440003', NOW()),
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440061', 0.75, 'Diversitas perlu ditingkatkan', '550e8400-e29b-41d4-a716-446655440003', NOW());

-- =====================================================
-- 8. AOI TABLE (Area of Improvement)
-- =====================================================
INSERT INTO aoi (id, target_type, target_id, recommendation, due_date, status, created_by, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440120', 'factor', '550e8400-e29b-41d4-a716-446655440060', 'Tingkatkan independensi dewan direksi dengan menambah anggota independen', '2025-06-30', 'open', '550e8400-e29b-41d4-a716-446655440002', NOW()),
('550e8400-e29b-41d4-a716-446655440121', 'factor', '550e8400-e29b-41d4-a716-446655440061', 'Tingkatkan diversitas dewan dengan menambah representasi gender dan usia', '2025-07-31', 'in_progress', '550e8400-e29b-41d4-a716-446655440004', NOW()),
('550e8400-e29b-41d4-a716-446655440122', 'parameter', '550e8400-e29b-41d4-a716-446655440040', 'Perbaiki struktur komposisi dewan sesuai best practice', '2025-08-31', 'overdue', '550e8400-e29b-41d4-a716-446655440004', NOW());

-- =====================================================
-- 9. PIC_MAP TABLE
-- =====================================================
INSERT INTO pic_map (id, target_type, target_id, pic_user_id, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440140', 'factor', '550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440004', NOW()),
('550e8400-e29b-41d4-a716-446655440141', 'factor', '550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440004', NOW()),
('550e8400-e29b-41d4-a716-446655440142', 'parameter', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440004', NOW());

-- =====================================================
-- 10. EVIDENCE TABLE
-- =====================================================
INSERT INTO evidence (id, target_type, target_id, kind, uri, note, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440160', 'factor', '550e8400-e29b-41d4-a716-446655440060', 'document', '/uploads/independensi-dewan.pdf', 'Dokumen independensi dewan direksi', NOW()),
('550e8400-e29b-41d4-a716-446655440161', 'factor', '550e8400-e29b-41d4-a716-446655440061', 'image', '/uploads/struktur-dewan.jpg', 'Foto struktur organisasi dewan', NOW()),
('550e8400-e29b-41d4-a716-446655440162', 'parameter', '550e8400-e29b-41d4-a716-446655440040', 'document', '/uploads/komposisi-dewan.pdf', 'Dokumen komposisi dewan', NOW());

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Database populated successfully!' as status;

-- Count records
SELECT 
    'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'KKA', COUNT(*) FROM kka
UNION ALL
SELECT 'Aspects', COUNT(*) FROM aspect
UNION ALL
SELECT 'Parameters', COUNT(*) FROM parameter
UNION ALL
SELECT 'Factors', COUNT(*) FROM factor
UNION ALL
SELECT 'Assessments', COUNT(*) FROM assessment
UNION ALL
SELECT 'Responses', COUNT(*) FROM response
UNION ALL
SELECT 'AOI', COUNT(*) FROM aoi
UNION ALL
SELECT 'PIC Mapping', COUNT(*) FROM pic_map
UNION ALL
SELECT 'Evidence', COUNT(*) FROM evidence;
