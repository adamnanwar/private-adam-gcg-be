const knex = require('knex');
const config = require('../knexfile');

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  const db = knex(config.development);
  
  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Run migrations
    console.log('📦 Running migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed');

    // Run seeds
    console.log('🌱 Running seeds...');
    await db.seed.run();
    console.log('✅ Seeds completed');

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

setupDatabase();
