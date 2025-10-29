const { getConnection } = require('./src/config/database');

async function checkUserRole() {
  try {
    const db = getConnection();
    
    // Check user Adam Nanwar Test
    const user = await db('users')
      .where('email', 'adamnanwar1201@gmail.com')
      .orWhere('name', 'Adam Nanwar Test')
      .first();
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user.id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Auth Provider:', user.auth_provider);
      console.log('Is Active:', user.is_active);
      console.log('Created At:', user.created_at);
    } else {
      console.log('User not found');
    }
    
    // Check all users
    const allUsers = await db('users')
      .select('id', 'name', 'email', 'role', 'auth_provider', 'is_active')
      .orderBy('created_at', 'desc')
      .limit(10);
    
    console.log('\nAll users:');
    allUsers.forEach(u => {
      console.log(`${u.name} (${u.email}) - Role: ${u.role} - Auth: ${u.auth_provider} - Active: ${u.is_active}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserRole();
