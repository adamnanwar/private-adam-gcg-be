/**
 * Seed data for Data Unit (PIC)
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Clear existing data unit data
  await knex('data_unit').del();

  // Insert Data Unit
  const dataUnits = [
    {
      id: uuidv4(),
      kode: 'KSPI',
      nama: 'KSPI',
      deskripsi: 'Kepala Satuan Pengawasan Internal',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'SEKPER',
      nama: 'SEKPER',
      deskripsi: 'Sekretaris Perusahaan',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_RENKAN',
      nama: 'VP RENKAN',
      deskripsi: 'Vice President Perencanaan dan Pengembangan',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_OPS',
      nama: 'VP OPS',
      deskripsi: 'Vice President Operasi',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_MANPRO',
      nama: 'VP MANPRO',
      deskripsi: 'Vice President Manajemen Proyek',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'SM_UB_KITRANS',
      nama: 'SM UB KITRANS',
      deskripsi: 'Senior Manager Unit Bisnis KITRANS',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'SM_UB_BES',
      nama: 'SM UB BES',
      deskripsi: 'Senior Manager Unit Bisnis BES',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_BIS',
      nama: 'VP BIS',
      deskripsi: 'Vice President Bisnis',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_AGA',
      nama: 'VP AGA',
      deskripsi: 'Vice President AGA',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'SM_UB_DISYAN',
      nama: 'SM UB DISYAN',
      deskripsi: 'Senior Manager Unit Bisnis DISYAN',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'SM_UB_INFRA',
      nama: 'SM UB INFRA',
      deskripsi: 'Senior Manager Unit Bisnis INFRA',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_KEU',
      nama: 'VP KEU',
      deskripsi: 'Vice President Keuangan',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_HCGA',
      nama: 'VP HCGA',
      deskripsi: 'Vice President Human Capital dan General Affairs',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_STRADA',
      nama: 'VP STRADA',
      deskripsi: 'Vice President STRADA',
      is_active: true
    },
    {
      id: uuidv4(),
      kode: 'VP_MRK',
      nama: 'VP MRK',
      deskripsi: 'Vice President Marketing',
      is_active: true
    }
  ];

  await knex('data_unit').insert(dataUnits);

  console.log('Data Unit seed data inserted successfully');
};






