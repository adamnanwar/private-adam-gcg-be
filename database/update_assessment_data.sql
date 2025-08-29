-- =====================================================
-- Update Assessment Data with KKA Information
-- =====================================================

-- Update existing assessments with KKA data
UPDATE assessment SET 
  kka_number = 'KKA-001',
  kka_name = 'Tata Kelola Perusahaan'
WHERE id = '550e8400-e29b-41d4-a716-446655440080';

UPDATE assessment SET 
  kka_number = 'KKA-002',
  kka_name = 'Pengendalian Internal'
WHERE id = '550e8400-e29b-41d4-a716-446655440081';

UPDATE assessment SET 
  kka_number = 'KKA-003',
  kka_name = 'Manajemen Risiko'
WHERE id = '550e8400-e29b-41d4-a716-446655440082';

UPDATE assessment SET 
  kka_number = 'KKA-004',
  kka_name = 'Kepatuhan'
WHERE id = '550e8400-e29b-41d4-a716-446655440083';

UPDATE assessment SET 
  kka_number = 'KKA-005',
  kka_name = 'Teknologi Informasi'
WHERE id = '550e8400-e29b-41d4-a716-446655440084';

UPDATE assessment SET 
  kka_number = 'KKA-001',
  kka_name = 'Tata Kelola Perusahaan'
WHERE id = '550e8400-e29b-41d4-a716-446655440085';

UPDATE assessment SET 
  kka_number = 'KKA-002',
  kka_name = 'Pengendalian Internal'
WHERE id = '550e8400-e29b-41d4-a716-446655440086';

UPDATE assessment SET 
  kka_number = 'KKA-003',
  kka_name = 'Manajemen Risiko'
WHERE id = '550e8400-e29b-41d4-a716-446655440087';

UPDATE assessment SET 
  kka_number = 'KKA-004',
  kka_name = 'Kepatuhan'
WHERE id = '550e8400-e29b-41d4-a716-446655440088';

UPDATE assessment SET 
  kka_number = 'KKA-005',
  kka_name = 'Teknologi Informasi'
WHERE id = '550e8400-e29b-41d4-a716-446655440089';

-- Verify the updates
SELECT 
  id,
  kka_number,
  kka_name,
  organization_name,
  assessment_date,
  status
FROM assessment
ORDER BY assessment_date DESC;
