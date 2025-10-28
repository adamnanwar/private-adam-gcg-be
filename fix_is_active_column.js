const knex = require('knex');
const config = require('./knexfile');

async function fixIsActiveColumn() {
  const db = knex(config.production);
  
  try {
    console.log('Checking if is_active column exists...');
    
    // Check if column exists
    const hasColumn = await db.schema.hasColumn('users', 'is_active');
    
    if (!hasColumn) {
      console.log('Adding is_active column...');
      
      // Add the column
      await db.schema.alterTable('users', function(table) {
        table.boolean('is_active').defaultTo(true).notNullable();
        table.index(['is_active']);
      });
      
      console.log('Column added successfully');
      
      // Update all existing users to be active
      console.log('Updating all users to be active...');
      const result = await db('users').update({ is_active: true });
      console.log(`Updated ${result} users to be active`);
      
    } else {
      console.log('is_active column already exists');
      
      // Check if any users have null is_active
      const nullUsers = await db('users').whereNull('is_active').count('* as count');
      if (nullUsers[0].count > 0) {
        console.log(`Found ${nullUsers[0].count} users with null is_active, updating...`);
        await db('users').whereNull('is_active').update({ is_active: true });
        console.log('Updated null users to be active');
      }
    }
    
    // Verify the column
    const users = await db('users').select('id', 'email', 'is_active').limit(5);
    console.log('Sample users:');
    console.table(users);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

fixIsActiveColumn();






