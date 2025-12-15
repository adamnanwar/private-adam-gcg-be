/**
 * Migration: Add ACGS Scoring Detail Columns
 *
 * This migration adds columns to support proper ACGS scoring with:
 * - Bobot (weight) per section (A=20%, B=15%, C=25%, D=40%)
 * - Score breakdown per section and parameter
 * - Level 1 score detail
 */

exports.up = async function(knex) {
  // 1. Add scoring columns to acgs_section
  const hasSectionBobot = await knex.schema.hasColumn('acgs_section', 'bobot');
  if (!hasSectionBobot) {
    await knex.schema.alterTable('acgs_section', (table) => {
      table.decimal('bobot', 5, 2).nullable(); // Weight percentage (20, 15, 25, 40)
      table.integer('total_questions').nullable(); // Total questions in section
      table.integer('total_na').nullable(); // Total N/A answers
      table.integer('total_applicable').nullable(); // Total applicable (total - na)
      table.integer('total_yes').nullable(); // Total Yes answers
      table.decimal('score_percentage', 7, 4).nullable(); // Score as percentage (0-1)
      table.decimal('weighted_score', 7, 4).nullable(); // Score * bobot
    });
    console.log('✅ Added scoring columns to acgs_section');
  }

  // 2. Add scoring columns to acgs_parameter
  const hasParamScore = await knex.schema.hasColumn('acgs_parameter', 'total_questions');
  if (!hasParamScore) {
    await knex.schema.alterTable('acgs_parameter', (table) => {
      table.integer('total_questions').nullable();
      table.integer('total_na').nullable();
      table.integer('total_applicable').nullable();
      table.integer('total_yes').nullable();
      table.decimal('score_percentage', 7, 4).nullable(); // Skor Per Komponen
    });
    console.log('✅ Added scoring columns to acgs_parameter');
  }

  // 3. Add Level 1 detail columns to acgs_assessment
  const hasLevel1Score = await knex.schema.hasColumn('acgs_assessment', 'level1_score');
  if (!hasLevel1Score) {
    await knex.schema.alterTable('acgs_assessment', (table) => {
      table.decimal('level1_score', 7, 4).nullable(); // Sum of weighted scores (max 100)
      table.integer('total_questions').nullable();
      table.integer('total_na').nullable();
      table.integer('total_applicable').nullable();
      table.integer('total_yes').nullable();
    });
    console.log('✅ Added Level 1 scoring columns to acgs_assessment');
  }

  // 4. Update acgs_scoring_criteria to add Level 5
  const hasLevel5 = await knex('acgs_scoring_criteria').where('level', 5).first();
  if (!hasLevel5) {
    await knex('acgs_scoring_criteria').insert({
      level: 5,
      min_score: 100.01,
      max_score: 150.00,
      nama: 'Leadership',
      interpretasi: 'Leadership in corporate governance, melebihi standar (dengan bonus)'
    });
    console.log('✅ Added Level 5 (Leadership) to scoring criteria');
  }

  console.log('✅ ACGS scoring detail migration completed');
};

exports.down = async function(knex) {
  // Remove columns from acgs_section
  const hasSectionBobot = await knex.schema.hasColumn('acgs_section', 'bobot');
  if (hasSectionBobot) {
    await knex.schema.alterTable('acgs_section', (table) => {
      table.dropColumn('bobot');
      table.dropColumn('total_questions');
      table.dropColumn('total_na');
      table.dropColumn('total_applicable');
      table.dropColumn('total_yes');
      table.dropColumn('score_percentage');
      table.dropColumn('weighted_score');
    });
  }

  // Remove columns from acgs_parameter
  const hasParamScore = await knex.schema.hasColumn('acgs_parameter', 'total_questions');
  if (hasParamScore) {
    await knex.schema.alterTable('acgs_parameter', (table) => {
      table.dropColumn('total_questions');
      table.dropColumn('total_na');
      table.dropColumn('total_applicable');
      table.dropColumn('total_yes');
      table.dropColumn('score_percentage');
    });
  }

  // Remove columns from acgs_assessment
  const hasLevel1Score = await knex.schema.hasColumn('acgs_assessment', 'level1_score');
  if (hasLevel1Score) {
    await knex.schema.alterTable('acgs_assessment', (table) => {
      table.dropColumn('level1_score');
      table.dropColumn('total_questions');
      table.dropColumn('total_na');
      table.dropColumn('total_applicable');
      table.dropColumn('total_yes');
    });
  }

  // Remove Level 5
  await knex('acgs_scoring_criteria').where('level', 5).del();

  console.log('✅ ACGS scoring detail migration rolled back');
};
