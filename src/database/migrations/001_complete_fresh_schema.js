/**
 * Complete Fresh Database Schema for GCG Maturity Assessment
 * This migration creates all tables from scratch with proper relations
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    // Enable UUID extension first
    .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Unit Bidang table (for organizational units from LDAP)
    .createTable('unit_bidang', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('kode').unique().notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.uuid('parent_id').references('id').inTable('unit_bidang');
      table.string('ldap_dn'); // LDAP Distinguished Name
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['kode']);
      table.index(['nama']);
      table.index(['parent_id']);
      table.index(['is_active']);
    })

    // Users table
    .createTable('users', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('username').unique();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash');
      table.enum('role', ['admin', 'assessor', 'viewer', 'pic']).defaultTo('assessor');
      table.enum('auth_provider', ['ldap', 'local']).defaultTo('local');
      table.uuid('unit_bidang_id').references('id').inTable('unit_bidang');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['email']);
      table.index(['username']);
      table.index(['role']);
      table.index(['unit_bidang_id']);
      table.index(['is_active']);
    })

    // KKA table (Kriteria Kunci Assessment)
    .createTable('kka', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('kode').unique().notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.decimal('weight', 5, 3).defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
    })

    // Aspect table
    .createTable('aspect', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('weight', 5, 3).defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['kka_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
    })

    // Parameter table
    .createTable('parameter', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('aspect_id').references('id').inTable('aspect').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('weight', 5, 3).defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['aspect_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
    })

    // Factor table
    .createTable('factor', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('parameter_id').references('id').inTable('parameter').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.decimal('max_score', 5, 3).defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['parameter_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
    })

    // Assessment table
    .createTable('assessment', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('title').notNullable();
      table.date('assessment_date').notNullable();
      table.uuid('assessor_id').references('id').inTable('users');
      table.uuid('unit_bidang_id').references('id').inTable('unit_bidang');
      table.enum('status', ['draft', 'in_progress', 'verifikasi', 'selesai', 'selesai_berkelanjutan', 'proses_tindak_lanjut']).defaultTo('draft');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['title']);
      table.index(['assessment_date']);
      table.index(['assessor_id']);
      table.index(['unit_bidang_id']);
      table.index(['status']);
    })

    // Response table (scores for factors)
    .createTable('response', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.decimal('score', 5, 3).notNullable().checkBetween([0.000, 1.000]);
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
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.text('recommendation').notNullable();
      table.date('due_date');
      table.enum('status', ['open', 'in_progress', 'completed', 'overdue']).defaultTo('open');
      table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.uuid('pic_user_id').references('id').inTable('users');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['target_type', 'target_id']);
      table.index(['status']);
      table.index(['priority']);
      table.index(['due_date']);
      table.index(['pic_user_id']);
      table.index(['created_by']);
    })

    // PIC mapping table
    .createTable('pic_map', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.uuid('pic_user_id').references('id').inTable('users');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['target_type', 'target_id']);
      table.index(['pic_user_id']);
      table.index(['is_active']);
    })

    // Evidence table
    .createTable('evidence', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['parameter', 'factor']).notNullable();
      table.uuid('target_id').notNullable();
      table.string('kind').notNullable(); // document, image, video, etc.
      table.string('filename').notNullable();
      table.string('original_filename').notNullable();
      table.string('file_path').notNullable();
      table.string('mime_type');
      table.integer('file_size');
      table.text('note');
      table.uuid('uploaded_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['target_type', 'target_id']);
      table.index(['kind']);
      table.index(['uploaded_by']);
    })

    // Notifications table
    .createTable('notifications', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.enum('type', ['assessment', 'aoi', 'reminder', 'system']).notNullable();
      table.uuid('reference_id'); // Can reference assessment, aoi, etc.
      table.string('reference_type'); // 'assessment', 'aoi', etc.
      table.boolean('is_read').defaultTo(false);
      table.timestamp('read_at');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['type']);
      table.index(['is_read']);
      table.index(['reference_id', 'reference_type']);
    })

    // Assessment revisions table
    .createTable('assessment_revisions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.text('reason').notNullable();
      table.text('notes');
      table.uuid('requested_by').references('id').inTable('users');
      table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      table.timestamp('resolved_at');
      table.uuid('resolved_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['requested_by']);
      table.index(['status']);
    });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('assessment_revisions')
    .dropTableIfExists('notifications')
    .dropTableIfExists('evidence')
    .dropTableIfExists('pic_map')
    .dropTableIfExists('aoi')
    .dropTableIfExists('response')
    .dropTableIfExists('assessment')
    .dropTableIfExists('factor')
    .dropTableIfExists('parameter')
    .dropTableIfExists('aspect')
    .dropTableIfExists('kka')
    .dropTableIfExists('users')
    .dropTableIfExists('unit_bidang');
};
