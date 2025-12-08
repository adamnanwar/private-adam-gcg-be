/**
 * Check updated_by column status in database
 * Usage: node check-updated-by.js
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

async function checkUpdatedBy() {
  const client = await pool.connect();
  
  try {
    console.log('=== Checking updated_by column status ===\n');
    
    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assessment' AND column_name = 'updated_by'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ Column "updated_by" does NOT exist in assessment table');
      console.log('   Please run: node run-migration-017.js');
      return;
    }
    
    console.log('✅ Column "updated_by" exists in assessment table');
    console.log(`   Data type: ${columnCheck.rows[0].data_type}\n`);
    
    // Check assessments with updated_by values
    const assessmentsWithUpdatedBy = await client.query(`
      SELECT 
        a.id, 
        a.title, 
        a.updated_by,
        u.name as updated_by_name,
        a.updated_at
      FROM assessment a
      LEFT JOIN users u ON a.updated_by = u.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.updated_at DESC
      LIMIT 10
    `);
    
    console.log('Recent 10 assessments:');
    console.log('-'.repeat(100));
    assessmentsWithUpdatedBy.rows.forEach((row, idx) => {
      const title = (row.title || 'No Title').substring(0, 40).padEnd(40);
      const updatedBy = (row.updated_by_name || 'NULL').padEnd(20);
      const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString().substring(0, 19) : 'NULL';
      console.log(`${(idx + 1).toString().padStart(2)}. ${title} | Updated By: ${updatedBy} | Updated At: ${updatedAt}`);
    });
    
    // Count stats
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(updated_by) as with_updated_by,
        COUNT(*) - COUNT(updated_by) as without_updated_by
      FROM assessment
      WHERE deleted_at IS NULL
    `);
    
    console.log('\n=== Statistics ===');
    console.log(`Total assessments: ${stats.rows[0].total}`);
    console.log(`With updated_by: ${stats.rows[0].with_updated_by}`);
    console.log(`Without updated_by (NULL): ${stats.rows[0].without_updated_by}`);
    
    if (parseInt(stats.rows[0].without_updated_by) > 0) {
      console.log('\n💡 Note: Assessments without updated_by are those that have never been');
      console.log('   edited since the migration was run. The value will be set automatically');
      console.log('   when the assessment is updated next time.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUpdatedBy();
