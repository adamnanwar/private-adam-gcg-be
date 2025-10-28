const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: '10.28.0.113',
  database: 'gcg',
  user: 'gcg',
  password: 'P@ssw0rdBrightGCG',
  port: 5432,
};

async function fixDatabaseStructure() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'fix_database_structure.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing database structure fix...');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
          console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
          
          const result = await client.query(statement);
          if (result.rows && result.rows.length > 0) {
            console.log(`   ✅ Result: ${result.rows.length} rows affected`);
            if (result.rows.length <= 10) {
              console.log('   📊 Data:', result.rows);
            }
          } else {
            console.log('   ✅ Statement executed successfully');
          }
        } catch (error) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          // Continue with next statement
        }
      }
    }
    
    console.log('\n🎉 Database structure fix completed!');
    
    // Verify the changes
    console.log('\n🔍 Verifying database structure...');
    
    // Check assessment_kka table
    const assessmentKkaResult = await client.query(`
      SELECT 
        ak.assessment_id,
        a.organization_name,
        COUNT(ak.kka_id) as kka_count
      FROM assessment_kka ak
      JOIN assessment a ON ak.assessment_id = a.id
      GROUP BY ak.assessment_id, a.organization_name
      ORDER BY a.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📊 Assessment-KKA Relations:');
    assessmentKkaResult.rows.forEach(row => {
      console.log(`   Assessment: ${row.organization_name} (${row.assessment_id})`);
      console.log(`   KKA Count: ${row.kka_count}`);
    });
    
    // Check if specific assessment has KKAs
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
    `);
    
    console.log('\n🎯 Specific Assessment (acc64b07-cd34-4ffc-bebc-22443df4c568):');
    if (specificAssessment.rows.length > 0) {
      specificAssessment.rows.forEach(row => {
        console.log(`   Organization: ${row.organization_name}`);
        console.log(`   KKA Count: ${row.kka_count}`);
        if (row.kode) {
          console.log(`   KKA: ${row.kode} - ${row.nama}`);
        }
      });
    } else {
      console.log('   ❌ No data found for this assessment');
    }
    
  } catch (error) {
    console.error('❌ Error fixing database structure:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixDatabaseStructure().catch(console.error);
