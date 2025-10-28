/**
 * Migration: Add PIC Assignment and Notifications for AOI
 * Adds PIC assignment and notification tracking for AOI
 */

exports.up = function(knex) {
  return knex.schema
    // Add PIC assignment to AOI table
    .alterTable('aoi', function(table) {
      table.uuid('pic_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('unit_bidang'); // Unit bidang dari LDAP
      table.text('notes'); // Additional notes for PIC
    })
    
    // Add AOI notification tracking table
    .createTable('aoi_notification', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('aoi_id').references('id').inTable('aoi').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('type').notNullable(); // 'assignment', 'status_change', 'due_date_reminder'
      table.text('message').notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['aoi_id']);
      table.index(['user_id']);
      table.index(['is_read']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('aoi_notification')
    .alterTable('aoi', function(table) {
      table.dropColumn('pic_user_id');
      table.dropColumn('unit_bidang');
      table.dropColumn('notes');
    });
};
