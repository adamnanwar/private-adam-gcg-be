/**
 * Fix AOI tables and add Data Unit tables (skip problematic migration 003)
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    // Drop existing AOI related tables if they exist
    .dropTableIfExists('evidence')
    .dropTableIfExists('pic_map')
    .dropTableIfExists('aoi')
    .dropTableIfExists('response')
    
    // Create Data Unit table (PIC)
    .createTable('data_unit', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('kode').unique().notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['kode']);
      table.index(['is_active']);
    })
    
    // Create AOI table with assessment_* references
    .createTable('aoi', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['assessment_aspect', 'assessment_parameter', 'assessment_factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.text('recommendation').notNullable();
      table.date('due_date');
      table.enum('status', ['open', 'in_progress', 'completed', 'overdue']).defaultTo('open');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['target_type', 'target_id']);
      table.index(['status']);
      table.index(['due_date']);
      table.index(['created_by']);
    })
    
    // Create PIC mapping table with assessment_* references
    .createTable('pic_map', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['assessment_aspect', 'assessment_parameter', 'assessment_factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.uuid('data_unit_id').references('id').inTable('data_unit');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['target_type', 'target_id']);
      table.index(['data_unit_id']);
      table.unique(['assessment_id', 'target_type', 'target_id']);
    })
    
    // Create Evidence table with assessment_* references
    .createTable('evidence', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['assessment_aspect', 'assessment_parameter', 'assessment_factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.string('kind').notNullable(); // document, image, video, etc.
      table.string('uri').notNullable();
      table.text('note');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['target_type', 'target_id']);
      table.index(['kind']);
    })
    
    // Create Response table for assessment factors
    .createTable('response', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('assessment_factor_id').references('id').inTable('assessment_factor').onDelete('CASCADE');
      table.decimal('score', 3, 2).notNullable();
      table.text('comment');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['assessment_factor_id']);
      table.index(['created_by']);
      table.unique(['assessment_id', 'assessment_factor_id']);
    });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('response')
    .dropTableIfExists('evidence')
    .dropTableIfExists('pic_map')
    .dropTableIfExists('aoi')
    .dropTableIfExists('data_unit');
};






