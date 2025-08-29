/**
 * Add KKA fields to Assessment table
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema.alterTable('assessment', function(table) {
    // Add KKA fields
    table.string('kka_number').notNullable().defaultTo('KKA-001');
    table.string('kka_name').notNullable().defaultTo('Tata Kelola Perusahaan');
    
    // Add indexes for new fields
    table.index(['kka_number']);
    table.index(['kka_name']);
  });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema.alterTable('assessment', function(table) {
    table.dropColumn('kka_number');
    table.dropColumn('kka_name');
  });
};
