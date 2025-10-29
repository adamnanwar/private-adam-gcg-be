#!/usr/bin/env node

/**
 * Fresh Database Reset Script
 * - Drop all tables
 * - Run migrations
 * - Seed with minimal data: 2 users + unit bidang from LDAP
 */

const knex = require('knex');
const knexConfig = require('./knexfile.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const ldap = require('ldapjs');

async function fetchUnitsFromLDAP() {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: process.env.LDAP_URL || 'ldap://10.28.0.113:389',
      timeout: 5000,
      connectTimeout: 5000
    });

    const units = [];

    client.bind(
      process.env.LDAP_BIND_DN || 'cn=admin,dc=plnbatam,dc=co,dc=id',
      process.env.LDAP_BIND_PASSWORD || 'P@ssw0rdLDAP',
      (err) => {
        if (err) {
          console.log('⚠️  LDAP bind failed, using fallback units');
          client.unbind();
          // Fallback units
          resolve([
            { kode: 'TEST', nama: 'Bidang Test', deskripsi: 'Unit Bidang untuk Testing' },
            { kode: 'IT', nama: 'Bidang IT', deskripsi: 'Teknologi Informasi' },
            { kode: 'SDM', nama: 'Bidang SDM', deskripsi: 'Sumber Daya Manusia' }
          ]);
          return;
        }

        const searchBase = process.env.LDAP_SEARCH_BASE || 'ou=people,dc=plnbatam,dc=co,dc=id';
        const opts = {
          filter: '(objectClass=organizationalUnit)',
          scope: 'sub',
          attributes: ['ou', 'description']
        };

        client.search(searchBase, opts, (err, res) => {
          if (err) {
            console.log('⚠️  LDAP search failed, using fallback');
            client.unbind();
            resolve([
              { kode: 'TEST', nama: 'Bidang Test', deskripsi: 'Unit Bidang untuk Testing' },
              { kode: 'IT', nama: 'Bidang IT', deskripsi: 'Teknologi Informasi' }
            ]);
            return;
          }

          res.on('searchEntry', (entry) => {
            const obj = entry.object;
            if (obj.ou && obj.ou !== 'people') {
              units.push({
                kode: obj.ou.toUpperCase(),
                nama: `Bidang ${obj.ou}`,
                deskripsi: obj.description || `Unit ${obj.ou}`
              });
            }
          });

          res.on('end', () => {
            client.unbind();
            // Always add TEST unit
            if (!units.find(u => u.kode === 'TEST')) {
              units.unshift({ kode: 'TEST', nama: 'Bidang Test', deskripsi: 'Unit Bidang untuk Testing' });
            }
            resolve(units);
          });

          res.on('error', () => {
            client.unbind();
            resolve([
              { kode: 'TEST', nama: 'Bidang Test', deskripsi: 'Unit Bidang untuk Testing' }
            ]);
          });
        });
      }
    );

    // Timeout fallback
    setTimeout(() => {
      try {
        client.unbind();
      } catch (e) {}
      if (units.length === 0) {
        resolve([
          { kode: 'TEST', nama: 'Bidang Test', deskripsi: 'Unit Bidang untuk Testing' }
        ]);
      }
    }, 5000);
  });
}

async function resetDatabase() {
  const db = knex(knexConfig.development);

  try {
    console.log('\n🔄 Starting FRESH database reset...\n');

    // ============================================
    // 1. DROP ALL TABLES
    // ============================================
    console.log('🗑️  Dropping all tables...');
    const tables = [
      'assessment_revisions',
      'notifications',
      'evidence',
      'pic_map',
      'aoi',
      'response',
      'assessment',
      'factor',
      'parameter',
      'aspect',
      'kka',
      'users',
      'unit_bidang'
    ];

    for (const table of tables) {
      try {
        await db.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`   ✓ Dropped: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop ${table}: ${error.message}`);
      }
    }

    try {
      await db.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
      console.log('   ✓ Dropped UUID extension\n');
    } catch (error) {
      console.log('   ⚠️  Could not drop UUID extension\n');
    }

    // ============================================
    // 2. RUN MIGRATIONS
    // ============================================
    console.log('🏗️  Running migrations...');
    await db.migrate.latest();
    console.log('   ✓ Migrations completed\n');

    // ============================================
    // 3. FETCH UNITS FROM LDAP
    // ============================================
    console.log('📡 Fetching unit bidang from LDAP...');
    const ldapUnits = await fetchUnitsFromLDAP();
    console.log(`   ✓ Found ${ldapUnits.length} units from LDAP\n`);

    // ============================================
    // 4. SEED UNIT BIDANG
    // ============================================
    console.log('🌱 Seeding unit bidang...');
    const unitBidangIds = {};

    for (const unit of ldapUnits) {
      const id = uuidv4();
      await db('unit_bidang').insert({
        id,
        kode: unit.kode,
        nama: unit.nama,
        deskripsi: unit.deskripsi,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      unitBidangIds[unit.kode] = id;
      console.log(`   ✓ Created: ${unit.kode} - ${unit.nama}`);
    }
    console.log('');

    // ============================================
    // 5. SEED USERS
    // ============================================
    console.log('👥 Seeding users...');

    const testUnitId = unitBidangIds['TEST'];

    // User 1: adamnanwar1201@gmail.com (Admin)
    const adminId = uuidv4();
    await db('users').insert({
      id: adminId,
      username: 'adamnanwar1201',
      email: 'adamnanwar1201@gmail.com',
      name: 'Adam Nanwar (Admin)',
      password_hash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      auth_provider: 'local',
      unit_bidang_id: testUnitId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('   ✓ Created ADMIN: adamnanwar1201@gmail.com (Bidang Test)');

    // User 2: adamnbisnis@gmail.com (User)
    const userId = uuidv4();
    await db('users').insert({
      id: userId,
      username: 'adamnbisnis',
      email: 'adamnbisnis@gmail.com',
      name: 'Adam Bisnis (User)',
      password_hash: await bcrypt.hash('user123', 10),
      role: 'user',
      auth_provider: 'local',
      unit_bidang_id: testUnitId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('   ✓ Created USER: adamnbisnis@gmail.com (Bidang Test)');

    // User 3: adminit@plnbatam.com (LDAP placeholder)
    const adminItId = uuidv4();
    await db('users').insert({
      id: adminItId,
      username: 'adminit',
      email: 'adminit@plnbatam.com',
      name: 'Admin IT (LDAP)',
      password_hash: '', // No password for LDAP users
      role: 'admin',
      auth_provider: 'ldap',
      unit_bidang_id: testUnitId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('   ✓ Created LDAP ADMIN: adminit@plnbatam.com (Bidang Test)');
    console.log('');

    // ============================================
    // 6. VERIFY
    // ============================================
    console.log('📊 Verifying database...\n');

    const unitCount = await db('unit_bidang').count('* as count').first();
    const userCount = await db('users').count('* as count').first();

    console.log('   📋 Database Summary:');
    console.log(`      • Unit Bidang: ${unitCount.count}`);
    console.log(`      • Users: ${userCount.count}`);
    console.log('');

    // ============================================
    // 7. SHOW LOGIN INFO
    // ============================================
    console.log('✅ DATABASE RESET COMPLETED!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 ADMIN (Local):');
    console.log('   Email:    adamnanwar1201@gmail.com');
    console.log('   Password: admin123');
    console.log('   Unit:     Bidang Test\n');

    console.log('👤 USER (Local):');
    console.log('   Email:    adamnbisnis@gmail.com');
    console.log('   Password: user123');
    console.log('   Unit:     Bidang Test\n');

    console.log('👤 ADMIN IT (LDAP):');
    console.log('   Email:    adminit@plnbatam.com');
    console.log('   Password: [LDAP Password]');
    console.log('   Unit:     Bidang Test');
    console.log('   Note:     Password harus login via LDAP\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ℹ️  LDAP users (selain adminit) akan auto-create');
    console.log('   saat login pertama kali dengan unit bidang sesuai LDAP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the reset
resetDatabase();
