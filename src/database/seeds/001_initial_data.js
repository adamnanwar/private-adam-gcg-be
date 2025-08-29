/**
 * Initial seed data for GCG Maturity Assessment
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('evidence').del();
  await knex('pic_map').del();
  await knex('aoi').del();
  await knex('response').del();
  await knex('assessment').del();
  await knex('factor').del();
  await knex('parameter').del();
  await knex('aspect').del();
  await knex('kka').del();
  await knex('users').del();

  // Insert users
  const users = [
    {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@gcg.com',
      password_hash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      auth_provider: 'local'
    },
    {
      id: uuidv4(),
      name: 'Assessor User',
      email: 'assessor@gcg.com',
      password_hash: await bcrypt.hash('assessor123', 10),
      role: 'assessor',
      auth_provider: 'local'
    },
    {
      id: uuidv4(),
      name: 'Viewer User',
      email: 'viewer@gcg.com',
      password_hash: await bcrypt.hash('viewer123', 10),
      role: 'viewer',
      auth_provider: 'local'
    },
    {
      id: uuidv4(),
      name: 'PIC User',
      email: 'pic@gcg.com',
      password_hash: await bcrypt.hash('pic123', 10),
      role: 'pic',
      auth_provider: 'local'
    }
  ];

  await knex('users').insert(users);

  // Insert KKA
  const kka = [
    {
      id: uuidv4(),
      kode: 'KKA001',
      nama: 'Komitmen',
      deskripsi: 'Komitmen terhadap tata kelola perusahaan yang baik',
      weight: 1.00
    },
    {
      id: uuidv4(),
      kode: 'KKA002',
      nama: 'Peran',
      deskripsi: 'Peran dan tanggung jawab dalam tata kelola',
      weight: 1.00
    },
    {
      id: uuidv4(),
      kode: 'KKA003',
      nama: 'Kinerja',
      deskripsi: 'Kinerja dan pencapaian target',
      weight: 1.00
    }
  ];

  await knex('kka').insert(kka);

  // Get KKA IDs for reference
  const kkaData = await knex('kka').select('id', 'kode');

  // Insert Aspects
  const aspects = [];
  kkaData.forEach(kka => {
    if (kka.kode === 'KKA001') {
      aspects.push(
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP001',
          nama: 'Komitmen Manajemen',
          weight: 1.00,
          sort: 1
        },
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP002',
          nama: 'Budaya Perusahaan',
          weight: 1.00,
          sort: 2
        }
      );
    } else if (kka.kode === 'KKA002') {
      aspects.push(
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP003',
          nama: 'Struktur Organisasi',
          weight: 1.00,
          sort: 1
        },
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP004',
          nama: 'Tanggung Jawab',
          weight: 1.00,
          sort: 2
        }
      );
    } else if (kka.kode === 'KKA003') {
      aspects.push(
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP005',
          nama: 'Indikator Kinerja',
          weight: 1.00,
          sort: 1
        },
        {
          id: uuidv4(),
          kka_id: kka.id,
          kode: 'ASP006',
          nama: 'Evaluasi',
          weight: 1.00,
          sort: 2
        }
      );
    }
  });

  await knex('aspect').insert(aspects);

  // Get Aspect IDs for reference
  const aspectData = await knex('aspect').select('id', 'kode');

  // Insert Parameters
  const parameters = [];
  aspectData.forEach(aspect => {
    if (aspect.kode === 'ASP001') {
      parameters.push(
        {
          id: uuidv4(),
          aspect_id: aspect.id,
          kode: 'PAR001',
          nama: 'Kebijakan GCG',
          weight: 1.00,
          sort: 1
        },
        {
          id: uuidv4(),
          aspect_id: aspect.id,
          kode: 'PAR002',
          nama: 'Implementasi Kebijakan',
          weight: 1.00,
          sort: 2
        }
      );
    } else if (aspect.kode === 'ASP002') {
      parameters.push(
        {
          id: uuidv4(),
          aspect_id: aspect.id,
          kode: 'PAR003',
          nama: 'Nilai Perusahaan',
          weight: 1.00,
          sort: 1
        },
        {
          id: uuidv4(),
          aspect_id: aspect.id,
          kode: 'PAR004',
          nama: 'Komunikasi',
          weight: 1.00,
          sort: 2
        }
      );
    }
    // Add more parameters for other aspects...
  });

  await knex('parameter').insert(parameters);

  // Get Parameter IDs for reference
  const parameterData = await knex('parameter').select('id', 'kode');

  // Insert Factors
  const factors = [];
  parameterData.forEach(parameter => {
    if (parameter.kode === 'PAR001') {
      factors.push(
        {
          id: uuidv4(),
          parameter_id: parameter.id,
          kode: 'FAK001',
          nama: 'Dokumen Kebijakan',
          deskripsi: 'Kebijakan GCG terdokumentasi dengan baik',
          max_score: 1,
          sort: 1
        },
        {
          id: uuidv4(),
          parameter_id: parameter.id,
          kode: 'FAK002',
          nama: 'Sosialisasi Kebijakan',
          deskripsi: 'Kebijakan disosialisasikan ke seluruh karyawan',
          max_score: 1,
          sort: 2
        }
      );
    } else if (parameter.kode === 'PAR002') {
      factors.push(
        {
          id: uuidv4(),
          parameter_id: parameter.id,
          kode: 'FAK003',
          nama: 'Monitoring Implementasi',
          deskripsi: 'Implementasi kebijakan dimonitor secara berkala',
          max_score: 1,
          sort: 1
        },
        {
          id: uuidv4(),
          parameter_id: parameter.id,
          kode: 'FAK004',
          nama: 'Evaluasi Hasil',
          deskripsi: 'Hasil implementasi dievaluasi dan ditindaklanjuti',
          max_score: 1,
          sort: 2
        }
      );
    }
    // Add more factors for other parameters...
  });

  await knex('factor').insert(factors);

  // Insert sample assessment
  const adminUser = await knex('users').where('role', 'admin').first();
  const assessment = {
    id: uuidv4(),
    organization_name: 'PT Contoh Indonesia',
    assessment_date: new Date(),
    assessor_id: adminUser.id,
    status: 'draft'
  };

  await knex('assessment').insert(assessment);

  console.log('Seed data inserted successfully');
};

