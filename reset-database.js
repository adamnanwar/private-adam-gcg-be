#!/usr/bin/env node

/**
 * Reset Database Script
 * This script will drop all tables and run fresh migrations
 */

const knex = require('knex');
const knexConfig = require('./knexfile.js');

async function resetDatabase() {
  const db = knex(knexConfig.development);
  
  try {
    console.log('🔄 Starting database reset...');
    
    // Drop all tables in correct order (reverse dependency)
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
    
    console.log('🗑️  Dropping existing tables...');
    for (const table of tables) {
      try {
        await db.schema.dropTableIfExists(table);
        console.log(`   ✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }
    
    // Drop UUID extension to ensure clean state
    try {
      await db.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
      console.log('   ✓ Dropped UUID extension');
    } catch (error) {
      console.log('   ⚠️  Could not drop UUID extension');
    }
    
    console.log('🏗️  Running fresh migrations...');
    
    // Run migrations
    await db.migrate.latest();
    console.log('   ✓ Migrations completed');
    
    console.log('🌱 Running seeds...');
    
    // Run seeds
    await db.seed.run();
    console.log('   ✓ Seeds completed');
    
    console.log('✅ Database reset completed successfully!');
    
    // Verify tables were created
    console.log('\n📊 Verifying database structure...');
    const tableNames = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Created tables:');
    tableNames.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Show counts
    console.log('\n📈 Data verification:');
    const counts = await Promise.all([
      db('unit_bidang').count('* as count').first(),
      db('users').count('* as count').first(),
      db('kka').count('* as count').first(),
      db('aspect').count('* as count').first(),
      db('parameter').count('* as count').first(),
      db('factor').count('* as count').first(),
      db('assessment').count('* as count').first(),
      db('response').count('* as count').first()
    ]);
    
    const [unitCount, userCount, kkaCount, aspectCount, paramCount, factorCount, assessmentCount, responseCount] = counts;
    
    console.log(`   Unit Bidang: ${unitCount.count}`);
    console.log(`   Users: ${userCount.count}`);
    console.log(`   KKA: ${kkaCount.count}`);
    console.log(`   Aspects: ${aspectCount.count}`);
    console.log(`   Parameters: ${paramCount.count}`);
    console.log(`   Factors: ${factorCount.count}`);
    console.log(`   Assessments: ${assessmentCount.count}`);
    console.log(`   Responses: ${responseCount.count}`);
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the reset
resetDatabase();
