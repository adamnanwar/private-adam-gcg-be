/**
 * Initial Database Schema for GCG Maturity Assessment
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    // Enable UUID extension first
    .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Users table
    .createTable('users', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash');
      table.enum('role', ['admin', 'assessor', 'viewer', 'pic']).defaultTo('viewer');
      table.enum('auth_provider', ['ldap', 'local']).defaultTo('local');
      table.timestamps(true, true);
      
      table.index(['email']);
      table.index(['role']);
    })

    // KKA table (Kriteria Kunci Assessment)
    .createTable('kka', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('kode').unique().notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.timestamps(true, true);
      
      table.index(['kode']);
    })

    // Aspect table
    .createTable('aspect', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['kka_id']);
      table.index(['kode']);
      table.index(['sort']);
    })

    // Parameter table
    .createTable('parameter', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('aspect_id').references('id').inTable('aspect').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('weight', 3, 2).defaultTo(1.00);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['aspect_id']);
      table.index(['kode']);
      table.index(['sort']);
    })

    // Factor table
    .createTable('factor', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('parameter_id').references('id').inTable('parameter').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.integer('max_score').defaultTo(1);
      table.integer('sort').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['parameter_id']);
      table.index(['kode']);
      table.index(['sort']);
    })

    // Assessment table
    .createTable('assessment', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('organization_name').notNullable();
      table.date('assessment_date').notNullable();
      table.uuid('assessor_id').references('id').inTable('users');
      table.enum('status', ['draft', 'in_progress', 'verifikasi', 'selesai', 'selesai_berkelanjutan', 'proses_tindak_lanjut']).defaultTo('draft');
      table.timestamps(true, true);
      
      table.index(['organization_name']);
      table.index(['assessment_date']);
      table.index(['assessor_id']);
      table.index(['status']);
    })

    // Response table (scores for factors)
    .createTable('response', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.decimal('score', 3, 2).notNullable();
      table.text('comment');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['factor_id']);
      table.index(['created_by']);
      table.unique(['assessment_id', 'factor_id']);
    })

    // AOI table (Area of Improvement)
    .createTable('aoi', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.text('recommendation').notNullable();
      table.date('due_date');
      table.enum('status', ['open', 'in_progress', 'completed', 'overdue']).defaultTo('open');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['target_type', 'target_id']);
      table.index(['status']);
      table.index(['due_date']);
      table.index(['created_by']);
    })

    // PIC mapping table
    .createTable('pic_map', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.uuid('pic_user_id').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['target_type', 'target_id']);
      table.index(['pic_user_id']);
      table.unique(['target_type', 'target_id']);
    })

    // Evidence table
    .createTable('evidence', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.string('kind').notNullable(); // document, image, video, etc.
      table.string('uri').notNullable();
      table.text('note');
      table.timestamps(true, true);
      
      table.index(['target_type', 'target_id']);
      table.index(['kind']);
    });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('evidence')
    .dropTableIfExists('pic_map')
    .dropTableIfExists('aoi')
    .dropTableIfExists('response')
    .dropTableIfExists('assessment')
    .dropTableIfExists('factor')
    .dropTableIfExists('parameter')
    .dropTableIfExists('aspect')
    .dropTableIfExists('kka')
    .dropTableIfExists('users');
};

