/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add soft delete columns to pugki_assessment
  await knex.schema.table('pugki_assessment', (table) => {
    table.timestamp('deleted_at').nullable();
    table.uuid('deleted_by').nullable();

    // Add foreign key for deleted_by
    table.foreign('deleted_by').references('id').inTable('users');

    // Add index for deleted_at for faster queries
    table.index('deleted_at', 'idx_pugki_assessment_deleted_at');
  });

  // Add soft delete columns to acgs_assessment
  await knex.schema.table('acgs_assessment', (table) => {
    table.timestamp('deleted_at').nullable();
    table.uuid('deleted_by').nullable();

    // Add foreign key for deleted_by
    table.foreign('deleted_by').references('id').inTable('users');

    // Add index for deleted_at for faster queries
    table.index('deleted_at', 'idx_acgs_assessment_deleted_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove soft delete columns from pugki_assessment
  await knex.schema.table('pugki_assessment', (table) => {
    table.dropIndex('deleted_at', 'idx_pugki_assessment_deleted_at');
    table.dropForeign('deleted_by');
    table.dropColumn('deleted_at');
    table.dropColumn('deleted_by');
  });

  // Remove soft delete columns from acgs_assessment
  await knex.schema.table('acgs_assessment', (table) => {
    table.dropIndex('deleted_at', 'idx_acgs_assessment_deleted_at');
    table.dropForeign('deleted_by');
    table.dropColumn('deleted_at');
    table.dropColumn('deleted_by');
  });
};
