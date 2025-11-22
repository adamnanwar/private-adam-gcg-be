/**
 * Migration: Create PUGKI (Pedoman Umum Governansi Korporat Indonesia) Tables
 */

exports.up = async function(knex) {
  // 1. pugki_template - Master template hierarki PUGKI
  await knex.schema.createTable('pugki_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('kode', 20).notNullable().unique();
    table.string('parent_kode', 20);
    table.integer('level').notNullable(); // 1=Prinsip, 2=Sub-prinsip, 3=Item
    table.text('nama').notNullable(); // Bilingual description
    table.integer('jumlah_rekomendasi');
    table.integer('sort').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('kode');
    table.index('parent_kode');
    table.index('level');
  });

  // 2. pugki_assessment - Instance assessment PUGKI
  await knex.schema.createTable('pugki_assessment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
    table.string('title', 500).notNullable();
    table.integer('assessment_year').notNullable();
    table.string('status', 50).defaultTo('draft'); // draft, in_progress, completed
    table.decimal('overall_score', 5, 3);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('assessment_id');
    table.index('status');
    table.index('assessment_year');
  });

  // 3. pugki_response - Jawaban per item
  await knex.schema.createTable('pugki_response', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('pugki_assessment_id').references('id').inTable('pugki_assessment').onDelete('CASCADE');
    table.uuid('template_id').references('id').inTable('pugki_template');
    table.string('comply_explain', 20); // "Comply" or "Explain"
    table.text('referensi'); // Evidence/dokumen
    table.decimal('score', 5, 3);
    table.text('comment');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('pugki_assessment_id');
    table.index('template_id');

    // Unique constraint: one response per template per assessment
    table.unique(['pugki_assessment_id', 'template_id']);
  });

  console.log('✅ PUGKI tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('pugki_response');
  await knex.schema.dropTableIfExists('pugki_assessment');
  await knex.schema.dropTableIfExists('pugki_template');

  console.log('✅ PUGKI tables dropped successfully');
};
