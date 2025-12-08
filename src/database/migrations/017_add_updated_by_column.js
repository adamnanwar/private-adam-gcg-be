/**
 * Migration: Add updated_by column to track who last updated records
 * Applies to: assessment, acgs_assessment, pugki_assessment, aoi_monitoring
 */

exports.up = async function(knex) {
  // Add updated_by to assessment table
  const hasAssessmentUpdatedBy = await knex.schema.hasColumn('assessment', 'updated_by');
  if (!hasAssessmentUpdatedBy) {
    await knex.schema.alterTable('assessment', (table) => {
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    });
    console.log('✅ Added updated_by to assessment table');
  }

  // Add updated_by to acgs_assessment table
  const hasAcgsUpdatedBy = await knex.schema.hasColumn('acgs_assessment', 'updated_by');
  if (!hasAcgsUpdatedBy) {
    await knex.schema.alterTable('acgs_assessment', (table) => {
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    });
    console.log('✅ Added updated_by to acgs_assessment table');
  }

  // Add updated_by to pugki_assessment table
  const hasPugkiUpdatedBy = await knex.schema.hasColumn('pugki_assessment', 'updated_by');
  if (!hasPugkiUpdatedBy) {
    await knex.schema.alterTable('pugki_assessment', (table) => {
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    });
    console.log('✅ Added updated_by to pugki_assessment table');
  }

  // Add updated_by to aoi_monitoring table
  const hasAoiUpdatedBy = await knex.schema.hasColumn('aoi_monitoring', 'updated_by');
  if (!hasAoiUpdatedBy) {
    await knex.schema.alterTable('aoi_monitoring', (table) => {
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    });
    console.log('✅ Added updated_by to aoi_monitoring table');
  }

  console.log('✅ Migration completed: added updated_by columns');
};

exports.down = async function(knex) {
  // Remove updated_by from all tables
  await knex.schema.alterTable('assessment', (table) => {
    table.dropColumn('updated_by');
  });
  
  await knex.schema.alterTable('acgs_assessment', (table) => {
    table.dropColumn('updated_by');
  });
  
  await knex.schema.alterTable('pugki_assessment', (table) => {
    table.dropColumn('updated_by');
  });
  
  await knex.schema.alterTable('aoi_monitoring', (table) => {
    table.dropColumn('updated_by');
  });

  console.log('✅ Rolled back: removed updated_by columns');
};
