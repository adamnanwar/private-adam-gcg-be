/**
 * Add assessment_id column to kka table for manual assessments
 * @param {import('knex').Knex} knex
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('kka', 'assessment_id');
  if (!hasColumn) {
    await knex.schema.alterTable('kka', function(table) {
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.index(['assessment_id']);
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('kka', 'assessment_id');
  if (hasColumn) {
    await knex.schema.alterTable('kka', function(table) {
      table.dropIndex(['assessment_id']);
      table.dropColumn('assessment_id');
    });
  }
};
