#!/usr/bin/env node

/**
 * Run Database Migrations
 * This script runs all pending migrations
 */

const knex = require('knex');
const config = require('./knexfile');

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'production';
  const db = knex(config[environment]);
  
  try {
    console.log('🔄 Running database migrations...');
    
    // Run migrations
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Migrations completed successfully!`);
      console.log(`📦 Batch: ${batchNo}`);
      console.log('📋 Migrations run:');
      log.forEach(migration => {
        console.log(`   - ${migration}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
