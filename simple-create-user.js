const knex = require('knex');
const knexfile = require('./knexfile');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function createUser() {
  const db = knex(knexfile.development);
  
  try {
    console.log('=== Creating User Rizky Test ===\n');
    
    // 1. Create test unit if not exists
    let testUnit = await db('unit_bidang').where('kode', 'TEST').first();
    if (!testUnit) {
      console.log('Creating test unit...');
      testUnit = {
        id: uuidv4(),
        kode: 'TEST',
        nama: 'Unit Bidang Test',
        deskripsi: 'Unit bidang untuk testing',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('unit_bidang').insert(testUnit);
      console.log('✅ Test unit created');
    } else {
      console.log('✅ Test unit found:', testUnit.nama);
    }
    
    // 2. Create or update user
    const existingUser = await db('users').where('email', 'furysurggt2@gmail.com').first();
    if (existingUser) {
      console.log('User exists, updating...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db('users').where('id', existingUser.id).update({
        name: 'Rizky Test',
        password_hash: hashedPassword,
        role: 'pic',
        unit_bidang_id: testUnit.id,
        updated_at: new Date()
      });
      console.log('✅ User updated successfully');
    } else {
      console.log('Creating new user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = {
        id: uuidv4(),
        name: 'Rizky Test',
        email: 'furysurggt2@gmail.com',
        password_hash: hashedPassword,
        role: 'pic',
        auth_provider: 'local',
        unit_bidang_id: testUnit.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('users').insert(newUser);
      console.log('✅ User created successfully');
    }
    
    // 3. Get all users
    const users = await db('users')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select(
        'users.name', 
        'users.email', 
        'users.role', 
        'users.auth_provider',
        'unit_bidang.nama as unit_nama',
        'unit_bidang.kode as unit_kode'
      )
      .where('users.is_active', true);
    
    console.log(`\n✅ Found ${users.length} active users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - Unit: ${user.unit_nama || 'No unit'}`);
    });
    
    console.log('\n=== User Creation Complete ===');
    console.log('✅ User Rizky Test created/updated successfully');
    console.log('✅ User mapped to Unit Bidang Test');
    console.log('✅ Password: password123');
    console.log('✅ Role: pic');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

createUser();
