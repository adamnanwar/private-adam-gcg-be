/**
 * Migration: Add pic_user_id column to pic_map table
 * This fixes the "column pic_map.pic_user_id does not exist" error
 */

exports.up = function(knex) {
  return knex.schema.alterTable('pic_map', function(table) {
    // Add pic_user_id column for linking to users table
    table.uuid('pic_user_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Add index for better performance
    table.index(['pic_user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('pic_map', function(table) {
    // Remove the column and index
    table.dropIndex(['pic_user_id']);
    table.dropColumn('pic_user_id');
  });
};
