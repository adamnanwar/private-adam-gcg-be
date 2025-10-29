/**
 * Final fix for is_active column - handle both cases
 * @param {import('knex').Knex} knex
 */
exports.up = async function(knex) {
  try {
    // Check if column exists
    const hasColumn = await knex.schema.hasColumn('users', 'is_active');
    
    if (!hasColumn) {
      console.log('Adding is_active column...');
      await knex.schema.alterTable('users', function(table) {
        table.boolean('is_active').defaultTo(true).notNullable();
        table.index(['is_active']);
      });
      
      // Update all existing users to be active
      console.log('Updating all users to be active...');
      await knex('users').update({ is_active: true });
    } else {
      console.log('is_active column already exists');
      
      // Update any null values
      await knex('users').whereNull('is_active').update({ is_active: true });
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = async function(knex) {
  try {
    const hasColumn = await knex.schema.hasColumn('users', 'is_active');
    if (hasColumn) {
      await knex.schema.alterTable('users', function(table) {
        table.dropIndex(['is_active']);
        table.dropColumn('is_active');
      });
    }
  } catch (error) {
    console.error('Rollback error:', error);
    throw error;
  }
};



