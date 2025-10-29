-- ========================================
-- GCG Maturity Assessment System
-- Complete Database Migration Script
-- ========================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'assessor', 'viewer', 'pic')),
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('ldap', 'local')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. KKA (KERANGKA KERJA ASSESSMENT) TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kka (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    weight NUMERIC(5,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. ASPECT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS aspect (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kka_id UUID NOT NULL REFERENCES kka(id) ON DELETE CASCADE,
    kode VARCHAR(50) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    weight NUMERIC(5,2) DEFAULT 1.00,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kka_id, kode)
);

-- ========================================
-- 4. PARAMETER TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS parameter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspect_id UUID NOT NULL REFERENCES aspect(id) ON DELETE CASCADE,
    kode VARCHAR(50) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    weight NUMERIC(5,2) DEFAULT 1.00,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aspect_id, kode)
);

-- ========================================
-- 5. FACTOR TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS factor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parameter_id UUID NOT NULL REFERENCES parameter(id) ON DELETE CASCADE,
    kode VARCHAR(50) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    max_score INTEGER DEFAULT 1,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parameter_id, kode)
);

-- ========================================
-- 6. ASSESSMENT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assessment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(255) NOT NULL,
    assessment_date DATE NOT NULL,
    assessor_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'verified', 'archived')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. ASSESSMENT_ASPECT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assessment_aspect (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    aspect_id UUID NOT NULL REFERENCES aspect(id),
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, aspect_id)
);

-- ========================================
-- 8. ASSESSMENT_PARAMETER TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assessment_parameter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES parameter(id),
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, parameter_id)
);

-- ========================================
-- 9. ASSESSMENT_FACTOR TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS assessment_factor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    factor_id UUID NOT NULL REFERENCES factor(id),
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, factor_id)
);

-- ========================================
-- 10. RESPONSE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS response (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    factor_id UUID NOT NULL REFERENCES factor(id),
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 1),
    comment TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 11. AOI (AREA OF IMPROVEMENT) TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS aoi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('assessment_aspect', 'assessment_parameter', 'assessment_factor')),
    target_id UUID NOT NULL,
    recommendation TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    due_date DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 12. EVIDENCE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('assessment_aspect', 'assessment_parameter', 'assessment_factor', 'aoi')),
    target_id UUID NOT NULL,
    kind VARCHAR(100) NOT NULL,
    uri TEXT NOT NULL,
    note TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 13. PIC_MAP TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS pic_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('assessment_aspect', 'assessment_parameter', 'assessment_factor', 'aoi')),
    target_id UUID NOT NULL,
    pic_user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    UNIQUE(target_type, target_id)
);

-- ========================================
-- 14. DATA_UNIT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS data_unit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_id UUID REFERENCES data_unit(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- KKA indexes
CREATE INDEX IF NOT EXISTS idx_kka_kode ON kka(kode);

-- Aspect indexes
CREATE INDEX IF NOT EXISTS idx_aspect_kka_id ON aspect(kka_id);
CREATE INDEX IF NOT EXISTS idx_aspect_sort ON aspect(sort);

-- Parameter indexes
CREATE INDEX IF NOT EXISTS idx_parameter_aspect_id ON parameter(aspect_id);
CREATE INDEX IF NOT EXISTS idx_parameter_sort ON parameter(sort);

-- Factor indexes
CREATE INDEX IF NOT EXISTS idx_factor_parameter_id ON factor(parameter_id);
CREATE INDEX IF NOT EXISTS idx_factor_sort ON factor(sort);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_assessment_organization ON assessment(organization_name);
CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessment(status);
CREATE INDEX IF NOT EXISTS idx_assessment_date ON assessment(assessment_date);

-- Assessment relationship indexes
CREATE INDEX IF NOT EXISTS idx_assessment_aspect_assessment ON assessment_aspect(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_aspect_aspect ON assessment_aspect(aspect_id);
CREATE INDEX IF NOT EXISTS idx_assessment_parameter_assessment ON assessment_parameter(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_parameter_parameter ON assessment_parameter(parameter_id);
CREATE INDEX IF NOT EXISTS idx_assessment_factor_assessment ON assessment_factor(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_factor_factor ON assessment_factor(factor_id);

-- Response indexes
CREATE INDEX IF NOT EXISTS idx_response_assessment ON response(assessment_id);
CREATE INDEX IF NOT EXISTS idx_response_factor ON response(factor_id);
CREATE INDEX IF NOT EXISTS idx_response_created_by ON response(created_by);

-- AOI indexes
CREATE INDEX IF NOT EXISTS idx_aoi_assessment ON aoi(assessment_id);
CREATE INDEX IF NOT EXISTS idx_aoi_target ON aoi(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_aoi_status ON aoi(status);
CREATE INDEX IF NOT EXISTS idx_aoi_priority ON aoi(priority);

-- Evidence indexes
CREATE INDEX IF NOT EXISTS idx_evidence_target ON evidence(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);

-- PIC Map indexes
CREATE INDEX IF NOT EXISTS idx_pic_map_target ON pic_map(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pic_map_user ON pic_map(pic_user_id);

-- Data Unit indexes
CREATE INDEX IF NOT EXISTS idx_data_unit_code ON data_unit(code);
CREATE INDEX IF NOT EXISTS idx_data_unit_parent ON data_unit(parent_id);
CREATE INDEX IF NOT EXISTS idx_data_unit_level ON data_unit(level);

-- ========================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kka_updated_at BEFORE UPDATE ON kka FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aspect_updated_at BEFORE UPDATE ON aspect FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parameter_updated_at BEFORE UPDATE ON parameter FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_factor_updated_at BEFORE UPDATE ON factor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_updated_at BEFORE UPDATE ON assessment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_aspect_updated_at BEFORE UPDATE ON assessment_aspect FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_parameter_updated_at BEFORE UPDATE ON assessment_parameter FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_factor_updated_at BEFORE UPDATE ON assessment_factor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_updated_at BEFORE UPDATE ON response FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aoi_updated_at BEFORE UPDATE ON aoi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_unit_updated_at BEFORE UPDATE ON data_unit FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INSERT SAMPLE DATA
-- ========================================

-- Insert sample KKA
INSERT INTO kka (kode, nama, deskripsi, weight) VALUES
('KKA-001', 'Tata Kelola Perusahaan', 'Standar tata kelola perusahaan yang baik', 1.00),
('KKA-002', 'Manajemen Risiko', 'Sistem manajemen risiko perusahaan', 1.00),
('KKA-003', 'Pengendalian Internal', 'Sistem pengendalian internal yang efektif', 1.00),
('KKA-004', 'Kepatuhan', 'Kepatuhan terhadap regulasi dan kebijakan', 1.00),
('KKA-005', 'Teknologi Informasi', 'Penggunaan teknologi informasi yang efektif', 1.00)
ON CONFLICT (kode) DO NOTHING;

-- Insert sample Aspects
INSERT INTO aspect (kka_id, kode, nama, weight, sort) VALUES
((SELECT id FROM kka WHERE kode = 'KKA-001'), 'AS-001', 'Struktur Organisasi', 1.00, 1),
((SELECT id FROM kka WHERE kode = 'KKA-001'), 'AS-002', 'Kebijakan dan Prosedur', 1.00, 2),
((SELECT id FROM kka WHERE kode = 'KKA-002'), 'AS-003', 'Identifikasi Risiko', 1.00, 1),
((SELECT id FROM kka WHERE kode = 'KKA-002'), 'AS-004', 'Penilaian Risiko', 1.00, 2),
((SELECT id FROM kka WHERE kode = 'KKA-003'), 'AS-005', 'Kontrol Aktivitas', 1.00, 1)
ON CONFLICT (kka_id, kode) DO NOTHING;

-- Insert sample admin user
INSERT INTO users (name, email, role, auth_provider) VALUES
('Administrator', 'admin@gcg.com', 'admin', 'local')
ON CONFLICT (email) DO NOTHING;

-- Insert sample data units
INSERT INTO data_unit (name, code, level) VALUES
('PLN Batam', 'PLN-BTM', 1),
('Divisi Operasi', 'DIV-OPR', 2),
('Divisi Keuangan', 'DIV-FIN', 2),
('Divisi SDM', 'DIV-HRD', 2)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
SELECT 'Database migration completed successfully!' as status;
