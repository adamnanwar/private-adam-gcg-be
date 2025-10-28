const { getConnection } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function addUserAndCheck() {
  try {
    const db = getConnection();
    
    console.log('=== Checking and Adding User ===');
    
    // Check existing units
    const units = await db('unit_bidang').select('*').where('is_active', true);
    console.log('\nAvailable units:');
    units.forEach(unit => console.log(`- ${unit.kode}: ${unit.nama} (ID: ${unit.id})`));
    
    // Find or create test unit
    let testUnit = await db('unit_bidang').where('kode', 'TEST').orWhere('nama', 'ilike', '%test%').first();
    if (!testUnit) {
      console.log('\nCreating test unit...');
      const newUnit = {
        id: uuidv4(),
        kode: 'TEST',
        nama: 'Unit Bidang Test',
        deskripsi: 'Unit bidang untuk testing',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('unit_bidang').insert(newUnit);
      testUnit = newUnit;
      console.log('Test unit created:', newUnit);
    } else {
      console.log('\nTest unit found:', testUnit);
    }
    
    // Check if user already exists
    const existingUser = await db('users').where('email', 'furysurggt2@gmail.com').first();
    if (existingUser) {
      console.log('\nUser already exists:', existingUser);
      // Update user to assign to test unit
      await db('users').where('id', existingUser.id).update({
        unit_bidang_id: testUnit.id,
        updated_at: new Date()
      });
      console.log('User updated with test unit assignment');
    } else {
      console.log('\nCreating new user...');
      const newUser = {
        id: uuidv4(),
        name: 'Fury Surggt',
        email: 'furysurggt2@gmail.com',
        role: 'pic',
        auth_provider: 'local',
        unit_bidang_id: testUnit.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('users').insert(newUser);
      console.log('New user created:', newUser);
    }
    
    // Verify the assignment
    const userWithUnit = await db('users')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select('users.*', 'unit_bidang.nama as unit_nama', 'unit_bidang.kode as unit_kode')
      .where('users.email', 'furysurggt2@gmail.com')
      .first();
    
    console.log('\nFinal user with unit assignment:', userWithUnit);
    
    // Check PIC mapping functionality
    console.log('\n=== Checking PIC Mapping ===');
    const picMappings = await db('pic_map')
      .leftJoin('users', 'pic_map.pic_user_id', 'users.id')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select('pic_map.*', 'users.name as user_name', 'users.email', 'unit_bidang.nama as unit_nama')
      .limit(5);
    
    console.log('Recent PIC mappings:');
    picMappings.forEach(mapping => {
      console.log(`- Target: ${mapping.target_type}:${mapping.target_id}, User: ${mapping.user_name} (${mapping.unit_nama})`);
    });
    
    // Check AOI functionality
    console.log('\n=== Checking AOI ===');
    const aoiCount = await db('aoi').count('* as count').first();
    console.log(`Total AOI records: ${aoiCount.count}`);
    
    const aoiWithUnits = await db('aoi')
      .leftJoin('users', 'aoi.created_by', 'users.id')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select('aoi.*', 'users.name as created_by_name', 'unit_bidang.nama as unit_nama')
      .limit(3);
    
    console.log('Recent AOI records:');
    aoiWithUnits.forEach(aoi => {
      console.log(`- ${aoi.target_type}:${aoi.target_id}, Created by: ${aoi.created_by_name} (${aoi.unit_nama})`);
    });
    
    console.log('\n=== User Access Check ===');
    // Check what this user can see
    const userAssessments = await db('assessment')
      .leftJoin('users', 'assessment.assessor_id', 'users.id')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select('assessment.*', 'users.name as assessor_name', 'unit_bidang.nama as assessor_unit')
      .where('users.unit_bidang_id', testUnit.id)
      .limit(5);
    
    console.log(`Assessments visible to user in unit ${testUnit.nama}:`);
    userAssessments.forEach(assessment => {
      console.log(`- ${assessment.kka_name} (${assessment.organization_name}) - ${assessment.status}`);
    });
    
    console.log('\n=== System Check Complete ===');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

addUserAndCheck();
