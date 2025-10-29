-- Add user furysurggt2@gmail.com and map to unit bidang test

-- First, create test unit if it doesn't exist
INSERT INTO unit_bidang (id, kode, nama, deskripsi, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440999',
    'TEST',
    'Unit Bidang Test',
    'Unit bidang untuk testing',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (kode) DO NOTHING;

-- Add user and map to test unit
INSERT INTO users (id, name, email, role, auth_provider, unit_bidang_id, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440998',
    'Fury Surggt',
    'furysurggt2@gmail.com',
    'pic',
    'local',
    '550e8400-e29b-41d4-a716-446655440999',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    unit_bidang_id = '550e8400-e29b-41d4-a716-446655440999',
    updated_at = NOW();

-- Verify the assignment
SELECT 
    u.name,
    u.email,
    u.role,
    ub.nama as unit_nama,
    ub.kode as unit_kode
FROM users u
LEFT JOIN unit_bidang ub ON u.unit_bidang_id = ub.id
WHERE u.email = 'furysurggt2@gmail.com';
