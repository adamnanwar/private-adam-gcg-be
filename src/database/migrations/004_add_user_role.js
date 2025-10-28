exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Drop existing constraint and add new one with 'user' role
    table.dropColumn('role');
  }).then(() => {
    return knex.schema.alterTable('users', function(table) {
      table.enum('role', ['admin', 'assessor', 'viewer', 'pic', 'user']).defaultTo('assessor');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Revert to original constraint
    table.dropColumn('role');
  }).then(() => {
    return knex.schema.alterTable('users', function(table) {
      table.enum('role', ['admin', 'assessor', 'viewer', 'pic']).defaultTo('assessor');
    });
  });
};
