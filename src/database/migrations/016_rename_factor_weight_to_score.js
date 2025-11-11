/**
 * Migration: Rename factor.weight to factor.score
 * Purpose: Simplify score system by using single "score" field instead of confusing weight + score separation
 */

exports.up = async function(knex) {
  // Rename column weight to score in factor table
  await knex.schema.alterTable('factor', (table) => {
    table.renameColumn('weight', 'score');
  });

  console.log('✅ Renamed factor.weight to factor.score');
};

exports.down = async function(knex) {
  // Rollback: rename score back to weight
  await knex.schema.alterTable('factor', (table) => {
    table.renameColumn('score', 'weight');
  });

  console.log('✅ Rolled back: Renamed factor.score to factor.weight');
};
