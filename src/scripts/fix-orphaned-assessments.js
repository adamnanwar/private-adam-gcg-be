/**
 * Fix Orphaned Completed Assessments
 *
 * This script finds completed assessments (status = 'selesai') that don't have
 * a corresponding master data copy and triggers auto-save for them.
 *
 * Usage:
 *   node src/scripts/fix-orphaned-assessments.js
 */

const { db } = require('../config/database');
const logger = require('../utils/logger-simple');

async function fixOrphanedACGS() {
  console.log('\n=== Checking ACGS Orphaned Assessments ===');

  try {
    // Find completed ACGS assessments that are not master data
    const orphanedACGS = await db('acgs_assessment')
      .where('status', 'selesai')
      .where('is_master_data', false)
      .whereNull('deleted_at');

    console.log(`Found ${orphanedACGS.length} completed ACGS assessments (not master data)`);

    if (orphanedACGS.length === 0) {
      console.log('✅ No orphaned ACGS assessments found');
      return;
    }

    // Trigger auto-save for each
    const acgsService = require('../modules/acgs/acgs.service');

    for (const assessment of orphanedACGS) {
      console.log(`\nProcessing: ${assessment.title} (${assessment.id})`);

      try {
        await acgsService.autoSaveToMasterData(assessment.id);
        console.log(`✅ Auto-save triggered for: ${assessment.title}`);
      } catch (error) {
        console.error(`❌ Failed to auto-save ${assessment.title}:`, error.message);
      }
    }

    console.log('\n✅ ACGS orphaned assessments processing completed');
  } catch (error) {
    console.error('Error processing ACGS orphaned assessments:', error);
  }
}

async function fixOrphanedPUGKI() {
  console.log('\n=== Checking PUGKI Orphaned Assessments ===');

  try {
    // Find completed PUGKI assessments that are not master data
    const orphanedPUGKI = await db('pugki_assessment')
      .where('status', 'selesai')
      .where('is_master_data', false)
      .whereNull('deleted_at');

    console.log(`Found ${orphanedPUGKI.length} completed PUGKI assessments (not master data)`);

    if (orphanedPUGKI.length === 0) {
      console.log('✅ No orphaned PUGKI assessments found');
      return;
    }

    // Trigger auto-save for each
    const pugkiService = require('../modules/pugki/pugki.service');

    for (const assessment of orphanedPUGKI) {
      console.log(`\nProcessing: ${assessment.title} (${assessment.id})`);

      try {
        await pugkiService.autoSaveToMasterData(assessment.id);
        console.log(`✅ Auto-save triggered for: ${assessment.title}`);
      } catch (error) {
        console.error(`❌ Failed to auto-save ${assessment.title}:`, error.message);
      }
    }

    console.log('\n✅ PUGKI orphaned assessments processing completed');
  } catch (error) {
    console.error('Error processing PUGKI orphaned assessments:', error);
  }
}

async function fixOrphanedSK16() {
  console.log('\n=== Checking SK16 Orphaned Assessments ===');

  try {
    // Find completed SK16 assessments that are not master data (notes doesn't start with [SK16])
    const orphanedSK16 = await db('assessment')
      .where('status', 'selesai')
      .where('assessment_type', 'SK16')
      .where(function() {
        this.whereNull('notes')
          .orWhereNot('notes', 'like', '[SK16]%');
      })
      .whereNull('deleted_at');

    console.log(`Found ${orphanedSK16.length} completed SK16 assessments (not master data)`);

    if (orphanedSK16.length === 0) {
      console.log('✅ No orphaned SK16 assessments found');
      return;
    }

    // Trigger auto-save for each
    const manualAssessmentService = require('../modules/assessment/manual-assessment.service');

    for (const assessment of orphanedSK16) {
      console.log(`\nProcessing: ${assessment.title} (${assessment.id})`);

      try {
        await manualAssessmentService.autoSaveToMasterDataSK16(assessment.id);
        console.log(`✅ Auto-save triggered for: ${assessment.title}`);
      } catch (error) {
        console.error(`❌ Failed to auto-save ${assessment.title}:`, error.message);
      }
    }

    console.log('\n✅ SK16 orphaned assessments processing completed');
  } catch (error) {
    console.error('Error processing SK16 orphaned assessments:', error);
  }
}

async function main() {
  console.log('========================================');
  console.log('  Fix Orphaned Completed Assessments');
  console.log('========================================');
  console.log('This script will trigger auto-save for completed assessments');
  console.log('that don\'t have a corresponding master data copy.\n');

  try {
    await fixOrphanedACGS();
    await fixOrphanedPUGKI();
    await fixOrphanedSK16();

    console.log('\n========================================');
    console.log('  All Processing Completed');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.destroy();
    process.exit(0);
  }
}

// Run the script
main();
