/**
 * Create Assessment Tables for Manual Assessment Structure
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    // Create Assessment KKA table
    .createTable('assessment_kka', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.string('client_id').notNullable(); // Client-side ID from frontend
      table.string('kode', 50);
      table.string('nama', 255);
      table.text('deskripsi');
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['client_id']);
    })
    
    // Create Assessment Aspect table
    .createTable('assessment_aspect', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('assessment_kka_id').references('id').inTable('assessment_kka').onDelete('CASCADE');
      table.string('client_id').notNullable(); // Client-side ID from frontend
      table.string('kode', 50);
      table.string('nama', 255);
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['assessment_kka_id']);
      table.index(['client_id']);
    })
    
    // Create Assessment Parameter table
    .createTable('assessment_parameter', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('assessment_aspect_id').references('id').inTable('assessment_aspect').onDelete('CASCADE');
      table.string('client_id').notNullable(); // Client-side ID from frontend
      table.string('kode', 50);
      table.string('nama', 255);
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['assessment_aspect_id']);
      table.index(['client_id']);
    })
    
    // Create Assessment Factor table
    .createTable('assessment_factor', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('assessment_parameter_id').references('id').inTable('assessment_parameter').onDelete('CASCADE');
      table.string('client_id').notNullable(); // Client-side ID from frontend
      table.string('kode', 50);
      table.string('nama', 255);
      table.text('deskripsi');
      table.integer('max_score').defaultTo(1);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['assessment_parameter_id']);
      table.index(['client_id']);
    })
    
    // Update Response table to support assessment_factor_id
    .alterTable('response', function(table) {
      // Add assessment_factor_id column if not exists
      if (!knex.schema.hasColumn('response', 'assessment_factor_id')) {
        table.uuid('assessment_factor_id').references('id').inTable('assessment_factor').onDelete('CASCADE');
      }
      // Add client_factor_id column if not exists
      if (!knex.schema.hasColumn('response', 'client_factor_id')) {
        table.string('client_factor_id');
      }
    });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('response', function(table) {
      // Remove added columns
      if (knex.schema.hasColumn('response', 'assessment_factor_id')) {
        table.dropColumn('assessment_factor_id');
      }
      if (knex.schema.hasColumn('response', 'client_factor_id')) {
        table.dropColumn('client_factor_id');
      }
    })
    .dropTableIfExists('assessment_factor')
    .dropTableIfExists('assessment_parameter')
    .dropTableIfExists('assessment_aspect')
    .dropTableIfExists('assessment_kka');
};


