const knex = require('knex');
const config = require('./knexfile');

// Create database connection
const db = knex(config.development);

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Close database connection
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
};

// Health check
const healthCheck = async () => {
  try {
    const result = await db.raw('SELECT NOW() as current_time');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      database: 'PostgreSQL'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      database: 'PostgreSQL'
    };
  }
};

module.exports = {
  db,
  testConnection,
  closeConnection,
  healthCheck
};
