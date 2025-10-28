/**
 * Migration: Add Assessment PIC Assignment and Revision Tracking
 * Adds tables for PIC assignment and revision tracking
 */

exports.up = function(knex) {
  return knex.schema
    // Add PIC assignment table
    .createTable('assessment_pic', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.uuid('pic_user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('unit_bidang').notNullable(); // Unit bidang dari LDAP
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['factor_id']);
      table.index(['pic_user_id']);
      table.unique(['assessment_id', 'factor_id', 'pic_user_id']);
    })
    
    // Add revision tracking table
    .createTable('assessment_revision', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('requested_by').references('id').inTable('users').onDelete('CASCADE'); // Assessor yang meminta revisi
      table.text('revision_reason').notNullable(); // Alasan revisi
      table.enum('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['requested_by']);
      table.index(['status']);
    })
    
    // Add notification tracking table
    .createTable('assessment_notification', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('type').notNullable(); // 'assignment', 'revision_request', 'status_change'
      table.text('message').notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['user_id']);
      table.index(['is_read']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('assessment_notification')
    .dropTableIfExists('assessment_revision')
    .dropTableIfExists('assessment_pic');
};
