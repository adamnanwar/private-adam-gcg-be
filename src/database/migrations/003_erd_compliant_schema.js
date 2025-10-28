/**
 * ERD Compliant Database Schema for GCG Maturity Assessment
 * This migration creates all tables according to the new ERD structure
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema
    // Enable required extensions
    .raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Drop existing tables if they exist (in reverse order with CASCADE)
    .raw('DROP TABLE IF EXISTS assessment_revisions CASCADE')
    .raw('DROP TABLE IF EXISTS notifications CASCADE')
    .raw('DROP TABLE IF EXISTS evidence CASCADE')
    .raw('DROP TABLE IF EXISTS pic_map CASCADE')
    .raw('DROP TABLE IF EXISTS aoi CASCADE')
    .raw('DROP TABLE IF EXISTS response CASCADE')
    .raw('DROP TABLE IF EXISTS assessment_kka CASCADE')
    .raw('DROP TABLE IF EXISTS assessment CASCADE')
    .raw('DROP TABLE IF EXISTS factor CASCADE')
    .raw('DROP TABLE IF EXISTS parameter CASCADE')
    .raw('DROP TABLE IF EXISTS aspect CASCADE')
    .raw('DROP TABLE IF EXISTS kka CASCADE')
    .raw('DROP TABLE IF EXISTS users CASCADE')
    .raw('DROP TABLE IF EXISTS unit_bidang CASCADE')
    
    // Unit Bidang table (for organizational units from LDAP)
    .createTable('unit_bidang', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('kode').unique().notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.uuid('parent_id').references('id').inTable('unit_bidang').onDelete('SET NULL');
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
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('username').unique();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash');
      table.enum('role', ['admin', 'assessor', 'viewer', 'pic', 'user']).defaultTo('assessor');
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

    // Assessment table
    .createTable('assessment', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
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

    // KKA table (Kriteria Kunci Assessment)
    .createTable('kka', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
      table.unique(['assessment_id', 'kode']);
    })

    // Aspect table
    .createTable('aspect', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('bobot_indikator', 10, 3).notNullable().defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['kka_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
      table.unique(['assessment_id', 'kode']);
    })

    // Parameter table
    .createTable('parameter', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.uuid('aspect_id').references('id').inTable('aspect').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.decimal('bobot_indikator', 10, 3).notNullable().defaultTo(1.000);
      table.integer('sort').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['kka_id']);
      table.index(['aspect_id']);
      table.index(['kode']);
      table.index(['sort']);
      table.index(['is_active']);
      table.unique(['assessment_id', 'kode']);
    })

    // Factor table
    .createTable('factor', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.uuid('aspect_id').references('id').inTable('aspect').onDelete('CASCADE');
      table.uuid('parameter_id').references('id').inTable('parameter').onDelete('CASCADE');
      table.string('kode').notNullable();
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.uuid('pic_unit_bidang_id').references('id').inTable('unit_bidang').onDelete('RESTRICT');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['kka_id']);
      table.index(['aspect_id']);
      table.index(['parameter_id']);
      table.index(['kode']);
      table.index(['pic_unit_bidang_id']);
      table.unique(['assessment_id', 'kode']);
    })

    // Unsur Pemenuhan table
    .createTable('unsur_pemenuhan', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.string('nama').notNullable();
      table.text('deskripsi');
      table.decimal('nilai', 4, 3).notNullable().checkBetween([0.000, 1.000]);
      table.timestamps(true, true);
      
      table.index(['factor_id']);
      table.index(['nilai']);
    })

    // Response table (for assessment responses)
    .createTable('response', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('factor_id').references('id').inTable('factor').onDelete('CASCADE');
      table.decimal('score', 10, 3).notNullable().checkBetween([0, 1]);
      table.text('comment');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['factor_id']);
      table.index(['created_by']);
      table.unique(['assessment_id', 'factor_id']);
    })

    // Evidence table
    .createTable('evidence', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.enum('target_type', ['kka', 'aoi']).notNullable();
      table.uuid('target_id').notNullable();
      table.string('filename').notNullable();
      table.string('original_filename').notNullable();
      table.string('file_path').notNullable();
      table.string('mime_type');
      table.integer('file_size');
      table.text('note');
      table.uuid('uploaded_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['target_type', 'target_id']);
      table.index(['uploaded_by']);
    })

    // AOI table (Area of Improvement)
    .createTable('aoi', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.uuid('kka_id').references('id').inTable('kka').onDelete('CASCADE');
      table.string('nama').notNullable();
      table.text('recommendation');
      table.date('due_date');
      table.enum('status', ['open', 'in_progress', 'completed', 'overdue']).defaultTo('open');
      table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.uuid('pic_user_id').references('id').inTable('users');
      table.uuid('created_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['assessment_id']);
      table.index(['kka_id']);
      table.index(['status']);
      table.index(['priority']);
      table.index(['due_date']);
      table.index(['pic_user_id']);
      table.index(['created_by']);
    });
};

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('aoi')
    .dropTableIfExists('evidence')
    .dropTableIfExists('unsur_pemenuhan')
    .dropTableIfExists('factor')
    .dropTableIfExists('parameter')
    .dropTableIfExists('aspect')
    .dropTableIfExists('kka')
    .dropTableIfExists('assessment')
    .dropTableIfExists('users')
    .dropTableIfExists('unit_bidang');
};
