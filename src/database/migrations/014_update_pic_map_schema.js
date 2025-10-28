/**
 * Update pic_map schema to support assessment-level assignments
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('pic_map');
  if (!hasTable) {
    await knex.schema.createTable('pic_map', table => {
      table.uuid('id').primary();
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
      table.enum('target_type', ['factor', 'parameter']).notNullable();
      table.uuid('target_id').notNullable();
      table.uuid('unit_bidang_id').references('id').inTable('unit_bidang').onDelete('SET NULL');
      table.uuid('pic_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.enum('status', ['assigned', 'in_progress', 'submitted', 'completed']).defaultTo('assigned');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    });

    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS pic_map_unique_assessment_target ON pic_map (assessment_id, target_type, target_id)');
    await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_assessment_idx ON pic_map (assessment_id)');
    await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_target_idx ON pic_map (target_type, target_id)');
    await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_unit_idx ON pic_map (unit_bidang_id)');
    return;
  }

  await knex.transaction(async trx => {
    const ensureColumn = async (column, callback) => {
      const exists = await trx.schema.hasColumn('pic_map', column);
      if (!exists) {
        await trx.schema.alterTable('pic_map', callback);
      }
    };

    await ensureColumn('assessment_id', table => {
      table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
    });

    await ensureColumn('target_type', table => {
      table.enum('target_type', ['factor', 'parameter']).notNullable().defaultTo('factor');
    });

    await ensureColumn('target_id', table => {
      table.uuid('target_id').notNullable();
    });

    await ensureColumn('unit_bidang_id', table => {
      table.uuid('unit_bidang_id').references('id').inTable('unit_bidang').onDelete('SET NULL');
    });

    await ensureColumn('pic_user_id', table => {
      table.uuid('pic_user_id').references('id').inTable('users').onDelete('SET NULL');
    });

    await ensureColumn('created_by', table => {
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    });

    await ensureColumn('status', table => {
      table.enum('status', ['assigned', 'in_progress', 'submitted', 'completed']).defaultTo('assigned');
    });

    await ensureColumn('assigned_at', table => {
      table.timestamp('assigned_at').defaultTo(trx.fn.now());
    });

    const hasCreatedAt = await trx.schema.hasColumn('pic_map', 'created_at');
    if (!hasCreatedAt) {
      await trx.schema.alterTable('pic_map', table => {
        table.timestamps(true, true);
      });
    }

    const dropIfExists = async column => {
      const exists = await trx.schema.hasColumn('pic_map', column);
      if (exists) {
        await trx.schema.alterTable('pic_map', table => {
          table.dropColumn(column);
        });
      }
    };

    await dropIfExists('factor_id');
    await dropIfExists('is_active');
    await dropIfExists('notes');
  });

  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS pic_map_unique_assessment_target ON pic_map (assessment_id, target_type, target_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_assessment_idx ON pic_map (assessment_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_target_idx ON pic_map (target_type, target_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS pic_map_unit_idx ON pic_map (unit_bidang_id)');
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasTable('pic_map');
  if (exists) {
    await knex.schema.dropTable('pic_map');
  }
};
