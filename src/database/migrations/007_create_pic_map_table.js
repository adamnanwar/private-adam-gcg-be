/**
 * Create pic_map table for PIC assignments
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('pic_map', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.uuid('pic_user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('status', ['assigned', 'in_progress', 'completed', 'overdue']).defaultTo('assigned');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
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
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('pic_map');
};
