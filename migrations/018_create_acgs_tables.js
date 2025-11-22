/**
 * Migration: Create ACGS (ASEAN Corporate Governance Scorecard) Tables
 */

exports.up = async function(knex) {
  // 1. acgs_template - Master template hierarki ACGS
  await knex.schema.createTable('acgs_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('kode', 20).notNullable().unique();
    table.string('parent_kode', 20);
    table.integer('level').notNullable(); // 1=Prinsip (A,B,C,D), 2=Sub, 3=Parameter
    table.text('nama').notNullable();
    table.string('sheet_type', 50); // 'kks', 'bonus', 'penalty'
    table.decimal('bobot', 5, 2); // Untuk prinsip level 1
    table.integer('sort').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('kode');
    table.index('parent_kode');
    table.index('level');
    table.index('sheet_type');
  });

  // 2. acgs_assessment - Instance assessment ACGS
  await knex.schema.createTable('acgs_assessment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('assessment_id').references('id').inTable('assessment').onDelete('CASCADE');
    table.string('title', 500).notNullable();
    table.integer('assessment_year').notNullable();
    table.string('status', 50).defaultTo('draft'); // draft, in_progress, completed
    table.decimal('overall_score', 5, 3);
    table.integer('level_achieved'); // 1, 2, 3, 4
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('assessment_id');
    table.index('status');
    table.index('assessment_year');
  });

  // 3. acgs_response - Jawaban per parameter
  await knex.schema.createTable('acgs_response', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('acgs_assessment_id').references('id').inTable('acgs_assessment').onDelete('CASCADE');
    table.uuid('template_id').references('id').inTable('acgs_template');
    table.string('answer', 10); // "Yes", "No", "N/A"
    table.text('referensi_panduan'); // Guiding reference
    table.text('implementasi_bukti'); // Implementation & evidence
    table.text('link_dokumen'); // Document link
    table.decimal('score', 5, 3);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('acgs_assessment_id');
    table.index('template_id');

    // Unique constraint: one response per template per assessment
    table.unique(['acgs_assessment_id', 'template_id']);
  });

  // 4. acgs_scoring_criteria - Kriteria penilaian level
  await knex.schema.createTable('acgs_scoring_criteria', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.integer('level').notNullable().unique(); // 1, 2, 3, 4
    table.decimal('min_score', 5, 2).notNullable();
    table.decimal('max_score', 5, 2).notNullable();
    table.string('nama', 100).notNullable();
    table.text('interpretasi');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Insert default scoring criteria
  await knex('acgs_scoring_criteria').insert([
    {
      level: 1,
      min_score: 60.00,
      max_score: 69.99,
      nama: 'Minimum Requirement',
      interpretasi: 'Memenuhi standar minimum sesuai UU dan regulasi'
    },
    {
      level: 2,
      min_score: 70.00,
      max_score: 79.99,
      nama: 'Fair',
      interpretasi: 'Ada kesadaran kuat dan upaya mengadopsi standar internasional'
    },
    {
      level: 3,
      min_score: 80.00,
      max_score: 89.99,
      nama: 'Good',
      interpretasi: 'Mengadopsi sebagai standar internasional'
    },
    {
      level: 4,
      min_score: 90.00,
      max_score: 100.00,
      nama: 'Excellent',
      interpretasi: 'Best practice dalam tata kelola perusahaan'
    }
  ]);

  console.log('✅ ACGS tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('acgs_scoring_criteria');
  await knex.schema.dropTableIfExists('acgs_response');
  await knex.schema.dropTableIfExists('acgs_assessment');
  await knex.schema.dropTableIfExists('acgs_template');

  console.log('✅ ACGS tables dropped successfully');
};
