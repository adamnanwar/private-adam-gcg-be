exports.up = async function(knex) {
  // Add is_active column to kka table
  const hasKkaIsActive = await knex.schema.hasColumn('kka', 'is_active');
  if (!hasKkaIsActive) {
    await knex.schema.alterTable('kka', function(table) {
      table.boolean('is_active').defaultTo(true);
    });
  }

  // Add is_active column to aspect table
  const hasAspectIsActive = await knex.schema.hasColumn('aspect', 'is_active');
  if (!hasAspectIsActive) {
    await knex.schema.alterTable('aspect', function(table) {
      table.boolean('is_active').defaultTo(true);
    });
  }

  // Add is_active column to parameter table
  const hasParameterIsActive = await knex.schema.hasColumn('parameter', 'is_active');
  if (!hasParameterIsActive) {
    await knex.schema.alterTable('parameter', function(table) {
      table.boolean('is_active').defaultTo(true);
    });
  }

  // Add is_active column to factor table
  const hasFactorIsActive = await knex.schema.hasColumn('factor', 'is_active');
  if (!hasFactorIsActive) {
    await knex.schema.alterTable('factor', function(table) {
      table.boolean('is_active').defaultTo(true);
    });
  }
};

exports.down = function(knex) {
  return knex.schema.alterTable('kka', function(table) {
    table.dropColumn('is_active');
  }).then(() => {
    return knex.schema.alterTable('aspect', function(table) {
      table.dropColumn('is_active');
    });
  }).then(() => {
    return knex.schema.alterTable('parameter', function(table) {
      table.dropColumn('is_active');
    });
  }).then(() => {
    return knex.schema.alterTable('factor', function(table) {
      table.dropColumn('is_active');
    });
  });
};
