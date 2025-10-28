/**
 * Safely add is_active column to users table if it doesn't exist
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema.hasColumn('users', 'is_active').then(function(exists) {
    if (!exists) {
      return knex.schema.alterTable('users', function(table) {
        table.boolean('is_active').defaultTo(true).notNullable();
        table.index(['is_active']);
      }).then(function() {
        // Update all existing users to be active
        return knex('users').update({ is_active: true });
      });
    }
  });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema.hasColumn('users', 'is_active').then(function(exists) {
    if (exists) {
      return knex.schema.alterTable('users', function(table) {
        table.dropIndex(['is_active']);
        table.dropColumn('is_active');
      });
    }
  });
};

