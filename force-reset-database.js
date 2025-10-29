#!/usr/bin/env node

/**
 * Force Reset Database Script
 * This script will forcefully drop all tables and constraints
 */

const knex = require('knex');
const knexConfig = require('./knexfile.js');

async function forceResetDatabase() {
  const db = knex(knexConfig.development);
  
  try {
    console.log('🔄 Starting FORCE database reset...');
    
    // First, drop all foreign key constraints
    console.log('🔗 Dropping all foreign key constraints...');
    const constraints = await db.raw(`
      SELECT 
        tc.constraint_name, 
        tc.table_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `);
    
    for (const constraint of constraints.rows) {
      try {
        await db.raw(`ALTER TABLE "${constraint.table_name}" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}" CASCADE`);
        console.log(`   ✓ Dropped constraint: ${constraint.constraint_name} from ${constraint.table_name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop constraint ${constraint.constraint_name}: ${error.message}`);
      }
    }
    
    // Get all tables in public schema
    console.log('🗑️  Dropping all tables...');
    const tables = await db.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const table of tables.rows) {
      try {
        await db.raw(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
        console.log(`   ✓ Dropped table: ${table.tablename}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop table ${table.tablename}: ${error.message}`);
      }
    }
    
    // Drop sequences
    console.log('🔢 Dropping sequences...');
    const sequences = await db.raw(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequences.rows) {
      try {
        await db.raw(`DROP SEQUENCE IF EXISTS "${seq.sequence_name}" CASCADE`);
        console.log(`   ✓ Dropped sequence: ${seq.sequence_name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop sequence ${seq.sequence_name}: ${error.message}`);
      }
    }
    
    // Drop functions
    console.log('⚙️  Dropping functions...');
    const functions = await db.raw(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
    `);
    
    for (const func of functions.rows) {
      try {
        await db.raw(`DROP FUNCTION IF EXISTS "${func.routine_name}" CASCADE`);
        console.log(`   ✓ Dropped function: ${func.routine_name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop function ${func.routine_name}: ${error.message}`);
      }
    }
    
    // Drop UUID extension
    try {
      await db.raw('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE');
      console.log('   ✓ Dropped UUID extension');
    } catch (error) {
      console.log('   ⚠️  Could not drop UUID extension');
    }
    
    // Clear migration lock
    try {
      await db.raw('DROP TABLE IF EXISTS knex_migrations_lock CASCADE');
      await db.raw('DROP TABLE IF EXISTS knex_migrations CASCADE');
      console.log('   ✓ Cleared migration tables');
    } catch (error) {
      console.log('   ⚠️  Could not clear migration tables');
    }
    
    console.log('🏗️  Running fresh migrations...');
    
    // Run migrations
    await db.migrate.latest();
    console.log('   ✓ Migrations completed');
    
    console.log('🌱 Running seeds...');
    
    // Run seeds
    await db.seed.run();
    console.log('   ✓ Seeds completed');
    
    console.log('✅ Database FORCE reset completed successfully!');
    
    // Verify tables were created
    console.log('\n📊 Verifying database structure...');
    const newTables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Created tables:');
    newTables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Show counts
    console.log('\n📈 Data verification:');
    try {
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
      console.log('   ⚠️  Could not verify data counts');
    }
    
  } catch (error) {
    console.error('❌ Database FORCE reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the reset
forceResetDatabase();
