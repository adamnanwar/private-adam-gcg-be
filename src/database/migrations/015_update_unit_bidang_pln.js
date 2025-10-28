/**
 * Migration: Update Unit Bidang PLN Batam
 *
 * Menambahkan/update unit bidang sesuai struktur LDAP PLN Batam
 * Berdasarkan OU structure dari Active Directory
 */

exports.up = async function(knex) {
  console.log('📦 Updating Unit Bidang PLN Batam...');

  // Unit Bidang PLN Batam sesuai struktur LDAP
  const units = [
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'UB-IT',
      nama: 'UB INFRASTRUKTUR TEKNOLOGI INFORMASI',
      deskripsi: 'Unit Bidang Infrastruktur Teknologi Informasi - Mengelola sistem IT dan infrastruktur teknologi PLN Batam',
      parent_id: null,
      ldap_dn: 'OU=UB INFRASTRUKTUR TEKNOLOGI INFORMASI,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-NIAGA',
      nama: 'Bidang Niaga',
      deskripsi: 'Bidang Niaga - Mengelola pelayanan pelanggan dan transaksi komersial',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-NIAGA,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-PROCUREMENT',
      nama: 'Bidang Pengadaan',
      deskripsi: 'Bidang Pengadaan - Mengelola procurement dan supply chain',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-PROCUREMENT,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-PLANNING',
      nama: 'Bidang Perencanaan',
      deskripsi: 'Bidang Perencanaan - Mengelola perencanaan strategis dan pengembangan',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-PLANNING,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-SDM',
      nama: 'Bidang Sumber Daya Manusia',
      deskripsi: 'Bidang SDM - Mengelola sumber daya manusia dan pengembangan karyawan',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-SDM,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-TEKNIK',
      nama: 'Bidang Teknik',
      deskripsi: 'Bidang Teknik - Mengelola operasional dan maintenance teknis',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-TEKNIK,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'BIDANG-IT',
      nama: 'Bidang Teknologi Informasi',
      deskripsi: 'Bidang IT - Mengelola sistem informasi dan aplikasi',
      parent_id: null,
      ldap_dn: 'OU=BIDANG-IT,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'DIREKSI',
      nama: 'Direksi',
      deskripsi: 'Direksi - Manajemen tingkat puncak PLN Batam',
      parent_id: null,
      ldap_dn: 'OU=DIREKSI,OU=BATAM,DC=plnbatam,DC=com',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      kode: 'TEST-UNIT',
      nama: 'Unit Bidang Test',
      deskripsi: 'Unit Bidang untuk testing dan user non-LDAP',
      parent_id: null,
      ldap_dn: null,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ];

  // Check if table exists and has data
  const tableExists = await knex.schema.hasTable('unit_bidang');

  if (!tableExists) {
    console.log('⚠️  Table unit_bidang does not exist. Please run complete schema migration first.');
    return;
  }

  // Clear existing data (optional - comment out if you want to keep existing data)
  // await knex('unit_bidang').del();
  // console.log('🗑️  Cleared existing unit_bidang data');

  // Insert or update units
  for (const unit of units) {
    // Check if unit exists by kode
    const existing = await knex('unit_bidang')
      .where('kode', unit.kode)
      .first();

    if (existing) {
      // Update existing unit
      await knex('unit_bidang')
        .where('kode', unit.kode)
        .update({
          nama: unit.nama,
          deskripsi: unit.deskripsi,
          ldap_dn: unit.ldap_dn,
          is_active: unit.is_active,
          updated_at: knex.fn.now()
        });
      console.log(`✅ Updated: ${unit.kode} - ${unit.nama}`);
    } else {
      // Insert new unit
      await knex('unit_bidang').insert(unit);
      console.log(`➕ Inserted: ${unit.kode} - ${unit.nama}`);
    }
  }

  console.log('✅ Unit Bidang PLN Batam updated successfully!');
  console.log('📊 Total units: ' + units.length);
};

exports.down = async function(knex) {
  console.log('⏪ Rolling back Unit Bidang PLN Batam...');

  // List of kode to remove
  const kodesToRemove = [
    'UB-IT',
    'BIDANG-NIAGA',
    'BIDANG-PROCUREMENT',
    'BIDANG-PLANNING',
    'BIDANG-SDM',
    'BIDANG-TEKNIK',
    'BIDANG-IT',
    'DIREKSI',
    'TEST-UNIT'
  ];

  await knex('unit_bidang')
    .whereIn('kode', kodesToRemove)
    .del();

  console.log('✅ Unit Bidang rollback completed');
};
