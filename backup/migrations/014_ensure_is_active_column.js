/**
 * Ensure is_active column exists in users table
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema.hasColumn('users', 'is_active').then(function(exists) {
    if (!exists) {
      return knex.schema.alterTable('users', function(table) {
        table.boolean('is_active').defaultTo(true).notNullable();
        table.index(['is_active']);
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

