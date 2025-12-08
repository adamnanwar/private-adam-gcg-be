/**
 * Run Migration 017 - Add updated_by column
 * Usage: node run-migration-017.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration 017...');
    
    // Add updated_by column to assessment table
    console.log('Adding updated_by to assessment table...');
    await client.query(`
      ALTER TABLE assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    
    // Add updated_by column to acgs_assessment table
    console.log('Adding updated_by to acgs_assessment table...');
    await client.query(`
      ALTER TABLE acgs_assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    
    // Add updated_by column to pugki_assessment table
    console.log('Adding updated_by to pugki_assessment table...');
    await client.query(`
      ALTER TABLE pugki_assessment ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    
    // Add updated_by column to aoi_monitoring table
    console.log('Adding updated_by to aoi_monitoring table...');
    await client.query(`
      ALTER TABLE aoi_monitoring ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assessment_updated_by ON assessment(updated_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_acgs_assessment_updated_by ON acgs_assessment(updated_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pugki_assessment_updated_by ON pugki_assessment(updated_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_aoi_monitoring_updated_by ON aoi_monitoring(updated_by)`);
    
    console.log('Migration 017 completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
