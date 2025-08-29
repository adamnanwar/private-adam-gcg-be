require('dotenv').config();
const { testConnection, getConnection } = require('./src/config/database');

async function testDB() {
  try {
    console.log('Testing database connection...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('DB Host:', process.env.DB_HOST);
    console.log('DB Port:', process.env.DB_PORT);
    console.log('DB Name:', process.env.DB_NAME);
    console.log('DB User:', process.env.DB_USER);
    
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('✅ Database connection successful!');
      
      // Test a simple query
      const db = getConnection();
      const result = await db.raw('SELECT NOW() as current_time');
      console.log('✅ Database query successful:', result.rows[0]);
      
      // Test users table
      const users = await db('users').select('id', 'name', 'email', 'role').limit(5);
      console.log('✅ Users table accessible:', users.length, 'users found');
      
    } else {
      console.log('❌ Database connection failed!');
    }
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDB();

