const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    host: '10.28.0.113',
    database: 'gcg',
    user: 'gcg',
    password: 'P@ssw0rdBrightGCG',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check current structure
    console.log('\n=== Current Assessment Table Structure ===');
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'assessment' 
      ORDER BY ordinal_position;
    `);
    console.table(structureResult.rows);

    // Remove unnecessary columns
    console.log('\n=== Removing unnecessary columns ===');
    try {
      await client.query('ALTER TABLE assessment DROP COLUMN IF EXISTS kka_name;');
      console.log('✓ Removed kka_name column');
    } catch (error) {
      console.log('⚠ kka_name column may not exist:', error.message);
    }

    try {
      await client.query('ALTER TABLE assessment DROP COLUMN IF EXISTS kka_number;');
      console.log('✓ Removed kka_number column');
    } catch (error) {
      console.log('⚠ kka_number column may not exist:', error.message);
    }

    // Verify the structure
    console.log('\n=== Updated Assessment Table Structure ===');
    const updatedStructureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'assessment' 
      ORDER BY ordinal_position;
    `);
    console.table(updatedStructureResult.rows);

    // Check if there are any responses for the assessment
    console.log('\n=== Checking Assessment Responses ===');
    const responseResult = await client.query(`
      SELECT a.id, a.organization_name, COUNT(r.id) as response_count
      FROM assessment a
      LEFT JOIN response r ON a.id = r.assessment_id
      WHERE a.id = 'acc64b07-cd34-4ffc-bebc-22443df4c568'
      GROUP BY a.id, a.organization_name;
    `);
    console.table(responseResult.rows);

    console.log('\n✅ Database fix completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

fixDatabase();
