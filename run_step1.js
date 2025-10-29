const { Client } = require('pg');

const dbConfig = {
  host: '10.28.0.113',
  database: 'gcg',
  user: 'gcg',
  password: 'P@ssw0rdBrightGCG',
  port: 5432,
};

async function runStep1() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');

    console.log('📝 Adding assessment_id columns...');
    
    // Add assessment_id to kka
    await client.query('ALTER TABLE kka ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessment(id) ON DELETE CASCADE');
    console.log('✅ Added assessment_id to kka table');
    
    // Add assessment_id to aspect
    await client.query('ALTER TABLE aspect ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessment(id) ON DELETE CASCADE');
    console.log('✅ Added assessment_id to aspect table');
    
    // Add assessment_id to parameter
    await client.query('ALTER TABLE parameter ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessment(id) ON DELETE CASCADE');
    console.log('✅ Added assessment_id to parameter table');
    
    // Add assessment_id to factor
    await client.query('ALTER TABLE factor ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessment(id) ON DELETE CASCADE');
    console.log('✅ Added assessment_id to factor table');
    
    console.log('\n🎉 Step 1 completed! Assessment_id columns added to all tables.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runStep1().catch(console.error);
