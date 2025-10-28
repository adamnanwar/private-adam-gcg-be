/**
 * Migration: Fix Assessment Status Workflow
 * Updates assessment status enum to support proper workflow
 */

exports.up = function(knex) {
  return knex.schema.alterTable('assessment', function(table) {
    // Drop the old enum and create new one with proper workflow statuses
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('assessment', function(table) {
      table.enum('status', [
        'draft',           // Assessment dibuat
        'in_progress',     // PIC menerima notifikasi dan sedang mengerjakan
        'submitted',       // PIC submit assessment
        'under_review',    // Assessor mengecek assessment
        'revision_required', // Assessor meminta revisi
        'completed'        // Assessment selesai
      ]).defaultTo('draft').notNullable();
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('assessment', function(table) {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('assessment', function(table) {
      table.enum('status', ['draft', 'in_progress', 'verifikasi', 'selesai', 'selesai_berkelanjutan', 'proses_tindak_lanjut']).defaultTo('draft');
    });
  });
};
