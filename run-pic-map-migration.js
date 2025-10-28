const knex = require('knex');
const config = require('./knexfile');

async function runPicMapMigration() {
  const environment = process.env.NODE_ENV || 'production';
  console.log(`Using environment: ${environment}`);
  
  const db = knex(config[environment]);
  
  try {
    console.log('🔄 Creating pic_map table...');
    
    // Check if table exists
    const tableExists = await db.schema.hasTable('pic_map');
    console.log(`pic_map table exists: ${tableExists}`);
    
    if (!tableExists) {
      // Create pic_map table
      await db.schema.createTable('pic_map', function(table) {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
        table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
        table.uuid('pic_user_id').references('id').inTable('users').onDelete('CASCADE');
        table.enum('status', ['assigned', 'in_progress', 'completed', 'overdue']).defaultTo('assigned');
        table.timestamp('assigned_at').defaultTo(db.fn.now());
        table.timestamp('completed_at');
        table.text('notes');
        table.timestamps(true, true);
        
        table.index(['assessment_id']);
        table.index(['factor_id']);
        table.index(['pic_user_id']);
        table.index(['status']);
        table.index(['assigned_at']);
        table.unique(['assessment_id', 'factor_id', 'pic_user_id']);
      });
      
      console.log('✅ pic_map table created successfully!');
    } else {
      console.log('✅ pic_map table already exists');
    }
    
  } catch (error) {
    console.error('❌ Error creating pic_map table:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runPicMapMigration();
