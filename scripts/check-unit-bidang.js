/**
 * Script to check Unit Bidang data in database
 */

const { getConnection } = require('../src/config/database');

async function checkUnitBidang() {
  try {
    const db = getConnection();

    console.log('\n📊 UNIT BIDANG DATA IN DATABASE\n');
    console.log('═'.repeat(100));

    const units = await db('unit_bidang')
      .select('kode', 'nama', 'ldap_dn', 'is_active')
      .where('is_active', true)
      .orderBy('kode', 'asc');

    if (units.length === 0) {
      console.log('❌ No unit bidang found in database!');
      process.exit(1);
    }

    console.log(`\n✅ Found ${units.length} active unit bidang:\n`);

    units.forEach((unit, index) => {
      console.log(`${index + 1}. [${unit.kode}] ${unit.nama}`);
      if (unit.ldap_dn) {
        console.log(`   LDAP DN: ${unit.ldap_dn}`);
      } else {
        console.log(`   LDAP DN: (none - non-LDAP unit)`);
      }
      console.log('');
    });

    console.log('═'.repeat(100));
    console.log('✅ Unit Bidang check completed!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking unit bidang:', error);
    process.exit(1);
  }
}

checkUnitBidang();
