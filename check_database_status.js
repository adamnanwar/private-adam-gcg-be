const { Client } = require('pg');

const dbConfig = {
  host: '10.28.0.113',
  database: 'gcg',
  user: 'gcg',
  password: 'P@ssw0rdBrightGCG',
  port: 5432,
};

async function checkDatabaseStatus() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check if columns exist
    console.log('📝 Checking if assessment_id columns exist...');
    
    const kkaColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'kka' AND column_name = 'assessment_id'
    `);
    console.log(`   KKA assessment_id column: ${kkaColumns.rows.length > 0 ? 'EXISTS' : 'NOT EXISTS'}`);
    
    const aspectColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'aspect' AND column_name = 'assessment_id'
    `);
    console.log(`   Aspect assessment_id column: ${aspectColumns.rows.length > 0 ? 'EXISTS' : 'NOT EXISTS'}`);
    
    const parameterColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parameter' AND column_name = 'assessment_id'
    `);
    console.log(`   Parameter assessment_id column: ${parameterColumns.rows.length > 0 ? 'EXISTS' : 'NOT EXISTS'}`);
    
    const factorColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'factor' AND column_name = 'assessment_id'
    `);
    console.log(`   Factor assessment_id column: ${factorColumns.rows.length > 0 ? 'EXISTS' : 'NOT EXISTS'}`);

    // Check assessment_kka table
    const assessmentKkaExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assessment_kka'
      )
    `);
    console.log(`   Assessment_KKA table: ${assessmentKkaExists.rows[0].exists ? 'EXISTS' : 'NOT EXISTS'}`);

    // Check data in assessment_kka
    if (assessmentKkaExists.rows[0].exists) {
      const assessmentKkaData = await client.query(`
        SELECT 
          a.organization_name,
          COUNT(ak.kka_id) as kka_count
        FROM assessment a
        LEFT JOIN assessment_kka ak ON a.id = ak.assessment_id
        GROUP BY a.id, a.organization_name
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Assessment-KKA Relations:');
      assessmentKkaData.rows.forEach(row => {
        console.log(`   ${row.organization_name}: ${row.kka_count} KKAs`);
      });
    }

    // Check specific assessment
    const specificAssessment = await client.query(`
      SELECT 
        a.organization_name,
        COUNT(ak.kka_id) as kka_count,
        k.kode,
        k.nama
      FROM assessment a
      LEFT JOIN assessment_kka ak ON a.id = ak.assessment_id
      LEFT JOIN kka k ON ak.kka_id = k.id
      WHERE a.id = 'acc64b07-cd34-4ffc-bebc-22443df4c568'
      GROUP BY a.id, a.organization_name, k.kode, k.nama
      ORDER BY k.kode
    `);
    
    console.log('\n🎯 Specific Assessment (acc64b07-cd34-4ffc-bebc-22443df4c568):');
    if (specificAssessment.rows.length > 0) {
      const firstRow = specificAssessment.rows[0];
      console.log(`   Organization: ${firstRow.organization_name}`);
      console.log(`   Total KKAs: ${specificAssessment.rows.length}`);
      console.log('   KKAs:');
      specificAssessment.rows.forEach(row => {
        console.log(`     - ${row.kode}: ${row.nama}`);
      });
    } else {
      console.log('   ❌ No data found for this assessment');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

checkDatabaseStatus().catch(console.error);
