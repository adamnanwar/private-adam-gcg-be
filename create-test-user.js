const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin123',
    database: 'gcg'
  }
});

const bcrypt = require('bcrypt');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await knex('users').insert({
      email: 'adminit@plnbatam.com',
      name: 'Admin IT',
      password_hash: hashedPassword,
      role: 'admin',
      auth_provider: 'local'
    }).returning('*');
    
    console.log('User created:', user[0].email);
    console.log('Password: password123');
    
    await knex.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await knex.destroy();
    process.exit(1);
  }
}

createTestUser();
