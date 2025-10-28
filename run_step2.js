const { Client } = require('pg');

const dbConfig = {
  host: '10.28.0.113',
  database: 'gcg',
  user: 'gcg',
  password: 'P@ssw0rdBrightGCG',
  port: 5432,
};

async function runStep2() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Step 2a: Create assessment_kka junction table
    console.log('📝 Creating assessment_kka junction table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessment_kka (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
        kka_id UUID NOT NULL REFERENCES kka(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assessment_id, kka_id)
      )
    `);
    console.log('✅ Created assessment_kka table');

    // Step 2b: Create indexes
    console.log('📝 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kka_assessment_id ON kka(assessment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_aspect_assessment_id ON aspect(assessment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parameter_assessment_id ON parameter(assessment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_factor_assessment_id ON factor(assessment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assessment_kka_assessment_id ON assessment_kka(assessment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assessment_kka_kka_id ON assessment_kka(kka_id)');
    console.log('✅ Created indexes');

    // Step 2c: Assign assessment_id to existing data
    console.log('📝 Assigning assessment_id to existing data...');
    
    // Get the first assessment
    const assessmentResult = await client.query('SELECT id, organization_name FROM assessment ORDER BY created_at DESC LIMIT 1');
    if (assessmentResult.rows.length === 0) {
      console.log('❌ No assessments found');
      return;
    }
    
    const assessmentId = assessmentResult.rows[0].id;
    const assessmentName = assessmentResult.rows[0].organization_name;
    console.log(`   Using assessment: ${assessmentName} (${assessmentId})`);

    // Assign assessment_id to first 5 KKAs
    const kkaResult = await client.query(`
      UPDATE kka 
      SET assessment_id = $1 
      WHERE assessment_id IS NULL 
      ORDER BY created_at 
      LIMIT 5
      RETURNING id, kode, nama
    `, [assessmentId]);
    
    console.log(`✅ Assigned assessment_id to ${kkaResult.rows.length} KKAs:`);
    kkaResult.rows.forEach(row => {
      console.log(`   - ${row.kode}: ${row.nama}`);
    });

    // Update aspects
    const aspectResult = await client.query(`
      UPDATE aspect 
      SET assessment_id = k.assessment_id 
      FROM kka k 
      WHERE aspect.kka_id = k.id AND aspect.assessment_id IS NULL
      RETURNING aspect.id, aspect.kode, aspect.nama
    `);
    console.log(`✅ Updated ${aspectResult.rows.length} aspects`);

    // Update parameters
    const parameterResult = await client.query(`
      UPDATE parameter 
      SET assessment_id = a.assessment_id 
      FROM aspect a 
      WHERE parameter.aspect_id = a.id AND parameter.assessment_id IS NULL
      RETURNING parameter.id, parameter.kode, parameter.nama
    `);
    console.log(`✅ Updated ${parameterResult.rows.length} parameters`);

    // Update factors
    const factorResult = await client.query(`
      UPDATE factor 
      SET assessment_id = p.assessment_id 
      FROM parameter p 
      WHERE factor.parameter_id = p.id AND factor.assessment_id IS NULL
      RETURNING factor.id, factor.kode, factor.nama
    `);
    console.log(`✅ Updated ${factorResult.rows.length} factors`);

    // Insert into assessment_kka junction table
    const junctionResult = await client.query(`
      INSERT INTO assessment_kka (assessment_id, kka_id)
      SELECT DISTINCT k.assessment_id, k.id
      FROM kka k
      WHERE k.assessment_id = $1
      ON CONFLICT (assessment_id, kka_id) DO NOTHING
      RETURNING kka_id
    `, [assessmentId]);
    
    console.log(`✅ Inserted ${junctionResult.rows.length} records into assessment_kka junction table`);

    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    
    const verifyResult = await client.query(`
      SELECT 
        'Assessment' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM assessment
      UNION ALL
      SELECT 
        'KKA' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM kka
      UNION ALL
      SELECT 
        'Aspect' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM aspect
      UNION ALL
      SELECT 
        'Parameter' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM parameter
      UNION ALL
      SELECT 
        'Factor' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM factor
      UNION ALL
      SELECT 
        'Assessment_KKA' as table_name,
        COUNT(*) as total_records,
        COUNT(assessment_id) as with_assessment_id
      FROM assessment_kka
    `);
    
    console.log('\n📊 Database Status:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.with_assessment_id}/${row.total_records} records with assessment_id`);
    });
    
    console.log('\n🎉 Step 2 completed! Database structure fixed.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runStep2().catch(console.error);
