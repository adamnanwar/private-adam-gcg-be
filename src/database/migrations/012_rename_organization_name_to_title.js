exports.up = async function(knex) {
  // Check if organization_name column exists
  const hasOrgName = await knex.schema.hasColumn('assessment', 'organization_name');
  const hasTitle = await knex.schema.hasColumn('assessment', 'title');
  
  if (hasOrgName && !hasTitle) {
    return knex.schema.alterTable('assessment', function(table) {
      table.renameColumn('organization_name', 'title');
    });
  }
};

exports.down = async function(knex) {
  // Check if title column exists
  const hasTitle = await knex.schema.hasColumn('assessment', 'title');
  const hasOrgName = await knex.schema.hasColumn('assessment', 'organization_name');
  
  if (hasTitle && !hasOrgName) {
    return knex.schema.alterTable('assessment', function(table) {
      table.renameColumn('title', 'organization_name');
    });
  }
};
