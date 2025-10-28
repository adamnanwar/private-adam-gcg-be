/**
 * ERD Compliant seed data for GCG Maturity Assessment
 * @param {import('knex').Knex} knex
 */
exports.seed = async function(knex) {
  // Clear existing data in proper order (reverse of creation)
  await knex('aoi').del();
  await knex('evidence').del();
  await knex('unsur_pemenuhan').del();
  await knex('factor').del();
  await knex('parameter').del();
  await knex('aspect').del();
  await knex('kka').del();
  await knex('assessment').del();
  await knex('users').del();
  await knex('unit_bidang').del();

  // Insert unit bidang (organizational units)
  await knex('unit_bidang').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      kode: 'DIREKSI',
      nama: 'Direksi',
      deskripsi: 'Direksi PLN Batam',
      parent_id: null,
      ldap_dn: 'OU=Direksi,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      kode: 'BIDANG-NIAGA',
      nama: 'Bidang Niaga',
      deskripsi: 'Bidang Niaga dan Pelayanan Pelanggan',
      parent_id: null,
      ldap_dn: 'OU=Bidang Niaga,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      kode: 'BIDANG-TEKNIK',
      nama: 'Bidang Teknik',
      deskripsi: 'Bidang Teknik dan Operasi',
      parent_id: null,
      ldap_dn: 'OU=Bidang Teknik,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      kode: 'BIDANG-KEUANGAN',
      nama: 'Bidang Keuangan',
      deskripsi: 'Bidang Keuangan dan Akuntansi',
      parent_id: null,
      ldap_dn: 'OU=Bidang Keuangan,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      kode: 'BIDANG-SDM',
      nama: 'Bidang Sumber Daya Manusia',
      deskripsi: 'Bidang Sumber Daya Manusia dan Umum',
      parent_id: null,
      ldap_dn: 'OU=Bidang SDM,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      kode: 'BIDANG-PLANNING',
      nama: 'Bidang Perencanaan',
      deskripsi: 'Bidang Perencanaan dan Pengembangan',
      parent_id: null,
      ldap_dn: 'OU=Bidang Planning,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      kode: 'BIDANG-IT',
      nama: 'Bidang Teknologi Informasi',
      deskripsi: 'Bidang Teknologi Informasi dan Digital',
      parent_id: null,
      ldap_dn: 'OU=UB INFRASTRUKTUR TEKNOLOGI INFORMASI,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440008',
      kode: 'BIDANG-HSE',
      nama: 'Bidang HSE',
      deskripsi: 'Bidang Health, Safety, and Environment',
      parent_id: null,
      ldap_dn: 'OU=Bidang HSE,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440009',
      kode: 'BIDANG-LEGAL',
      nama: 'Bidang Hukum',
      deskripsi: 'Bidang Hukum dan Kepatuhan',
      parent_id: null,
      ldap_dn: 'OU=Bidang Legal,DC=plnbatam,DC=com',
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      kode: 'BIDANG-PROCUREMENT',
      nama: 'Bidang Pengadaan',
      deskripsi: 'Bidang Pengadaan dan Logistik',
      parent_id: null,
      ldap_dn: 'OU=Bidang Procurement,DC=plnbatam,DC=com',
      is_active: true
    }
  ]);

  // Insert initial users (admin and test users)
  await knex('users').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      username: 'admin',
      name: 'Administrator',
      email: 'admin@plnbatam.com',
      password_hash: '$2b$10$UWRvv7tWnB6vf14KLCRYJ.LCflZ63.5BtPG1n.b3JETOZaW/vYBby', // password
      role: 'admin',
      auth_provider: 'local',
      unit_bidang_id: '550e8400-e29b-41d4-a716-446655440001', // Direksi
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      username: 'assessor1',
      name: 'Assessor Test 1',
      email: 'assessor1@plnbatam.com',
      password_hash: '$2b$10$rQZ8K9X2mN3vB4cR5tY6uI7oP8qS9wE0fG1hJ2kL3mN4oP5qR6sT7uV8wX9yZ',
      role: 'assessor',
      auth_provider: 'local',
      unit_bidang_id: '550e8400-e29b-41d4-a716-446655440002', // Bidang Niaga
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      username: 'adamnanwar1201',
      name: 'Adam Nanwar',
      email: 'adamnanwar1201@gmail.com',
      password_hash: '$2b$10$SNt2TP1DaVh.zYn8htaDKe2NbVEQJafnviEOxdvU8vA3xZ5PFKJoe', // password123
      role: 'assessor',
      auth_provider: 'local',
      unit_bidang_id: '550e8400-e29b-41d4-a716-446655440001', // Direksi
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      username: 'adambisnis',
      name: 'Adam Bisnis',
      email: 'adambisnis@gmail.com',
      password_hash: '$2b$10$SNt2TP1DaVh.zYn8htaDKe2NbVEQJafnviEOxdvU8vA3xZ5PFKJoe', // password123
      role: 'assessor',
      auth_provider: 'local',
      unit_bidang_id: '550e8400-e29b-41d4-a716-446655440002', // Bidang Niaga
      is_active: true
    }
  ]);

  // Insert sample assessment
  await knex('assessment').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440060',
      title: 'PT PLN Batam',
      assessment_date: new Date('2025-01-20'),
      assessor_id: '550e8400-e29b-41d4-a716-446655440011',
      unit_bidang_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'selesai',
      notes: 'Assessment rutin tahunan'
    }
  ]);

  // Insert KKA data
  await knex('kka').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      assessment_id: '550e8400-e29b-41d4-a716-446655440060',
      kode: 'KKA-001',
      nama: 'Tata Kelola Perusahaan',
      deskripsi: 'Kriteria untuk menilai tata kelola perusahaan secara menyeluruh',
      sort: 1,
      is_active: true
    }
  ]);

  // Insert sample aspects for KKA-001
  await knex('aspect').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440030',
      assessment_id: '550e8400-e29b-41d4-a716-446655440060',
      kka_id: '550e8400-e29b-41d4-a716-446655440020',
      kode: 'ASP-001-01',
      nama: 'Struktur Organisasi',
      bobot_indikator: 1.000,
      sort: 1,
      is_active: true
    }
  ]);

  // Insert sample parameters for aspects
  await knex('parameter').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440040',
      assessment_id: '550e8400-e29b-41d4-a716-446655440060',
      kka_id: '550e8400-e29b-41d4-a716-446655440020',
      aspect_id: '550e8400-e29b-41d4-a716-446655440030',
      kode: 'PAR-001-01-01',
      nama: 'Kejelasan Struktur Organisasi',
      bobot_indikator: 1.000,
      sort: 1,
      is_active: true
    }
  ]);

  // Insert sample factors for parameters
  await knex('factor').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440050',
      assessment_id: '550e8400-e29b-41d4-a716-446655440060',
      kka_id: '550e8400-e29b-41d4-a716-446655440020',
      aspect_id: '550e8400-e29b-41d4-a716-446655440030',
      parameter_id: '550e8400-e29b-41d4-a716-446655440040',
      kode: 'FAK-001-01-01-01',
      nama: 'Ketersediaan Bagan Organisasi',
      deskripsi: 'Tersedia bagan organisasi yang jelas dan terkini',
      pic_unit_bidang_id: '550e8400-e29b-41d4-a716-446655440002' // Bidang Niaga
    }
  ]);

  // Insert sample unsur pemenuhan
  await knex('unsur_pemenuhan').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440070',
      factor_id: '550e8400-e29b-41d4-a716-446655440050',
      nama: 'Bagan Organisasi Tersedia',
      deskripsi: 'Bagan organisasi tersedia dan dapat diakses',
      nilai: 0.700
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440071',
      factor_id: '550e8400-e29b-41d4-a716-446655440050',
      nama: 'Bagan Organisasi Terkini',
      deskripsi: 'Bagan organisasi sudah diperbarui sesuai struktur terbaru',
      nilai: 0.800
    }
  ]);

  // Insert sample AOI
  await knex('aoi').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440080',
      assessment_id: '550e8400-e29b-41d4-a716-446655440060',
      kka_id: '550e8400-e29b-41d4-a716-446655440020',
      nama: 'Perbaikan Struktur Organisasi',
      recommendation: 'Perlu dilakukan sosialisasi struktur organisasi yang lebih intensif',
      due_date: new Date('2025-03-31'),
      status: 'open',
      priority: 'medium',
      pic_user_id: '550e8400-e29b-41d4-a716-446655440011',
      created_by: '550e8400-e29b-41d4-a716-446655440010'
    }
  ]);

  // Insert sample evidence for KKA
  await knex('evidence').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440090',
      target_type: 'kka',
      target_id: '550e8400-e29b-41d4-a716-446655440020',
      filename: 'kka-001-bagan-organisasi.pdf',
      original_filename: 'Bagan Organisasi PLN Batam 2025.pdf',
      file_path: '/uploads/evidence/kka-001-bagan-organisasi.pdf',
      mime_type: 'application/pdf',
      file_size: 1024000,
      note: 'Dokumen bagan organisasi resmi',
      uploaded_by: '550e8400-e29b-41d4-a716-446655440011'
    }
  ]);

  console.log('✓ ERD compliant seed data inserted successfully');
};
