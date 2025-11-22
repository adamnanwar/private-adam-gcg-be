/**
 * Import ACGS Template from Excel (V2)
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || '10.28.0.113',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gcg',
  user: process.env.DB_USER || 'gcg',
  password: process.env.DB_PASSWORD || 'P@ssw0rdBrightGCG',
});

function determineLevel(kode) {
  if (!kode) return 1;
  const kodeStr = String(kode).trim();

  // Level 1: Single letter (A, B, C, etc.)
  if (/^[A-Z]$/.test(kodeStr)) return 1;

  // Level 2: Letter with number (A.1, B.2, etc.)
  if (/^[A-Z]\.\d+$/.test(kodeStr)) return 2;

  // Level 3: Letter with two numbers (A.1.1, B.2.3, etc.)
  if (/^[A-Z]\.\d+\.\d+$/.test(kodeStr)) return 3;

  return 1; // Default
}

function getParentKode(kode, level) {
  if (!kode || level === 1) return null;

  const kodeStr = String(kode).trim();
  const parts = kodeStr.split('.');

  if (parts.length > 1) {
    // Remove last part to get parent
    return parts.slice(0, -1).join('.');
  }

  return null;
}

async function importAcgsTemplate() {
  const client = await pool.connect();

  try {
    console.log('📖 Reading ACGS.xlsx file...');

    // Read Excel file - KKS sheet
    const workbook = XLSX.readFile(path.join(__dirname, '../../ACGS.xlsx'));
    const sheetName = 'KKS'; // Use KKS sheet
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Found ${rawData.length} rows in KKS sheet`);

    // Start transaction
    await client.query('BEGIN');

    // Clear existing templates
    console.log('🗑️  Clearing existing ACGS templates...');
    await client.query('DELETE FROM acgs_template');

    console.log('💾 Inserting ACGS templates...');
    let insertedCount = 0;

    // Parse data starting from row 9 (index 9 - after header at index 8)
    for (let i = 9; i < rawData.length; i++) {
      const row = rawData[i];

      // Column mapping (0-indexed):
      // 0: Point/Kode
      // 1: Parameter/Nama

      const kode = row[0] ? String(row[0]).trim() : null;
      const nama = row[1] ? String(row[1]).trim() : null;

      // Skip rows without kode or nama, or special rows
      if (!kode || !nama || kode.includes('TINGKAT') || nama.includes('JML Parameter')) {
        continue;
      }

      // Determine sheet type based on level
      const level = determineLevel(kode);
      const parentKode = getParentKode(kode, level);
      const sheetType = 'PERNYATAAN'; // Default - bisa disesuaikan

      try {
        await client.query(`
          INSERT INTO acgs_template (kode, parent_kode, level, nama, sheet_type, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (kode) DO UPDATE
          SET parent_kode = EXCLUDED.parent_kode,
              level = EXCLUDED.level,
              nama = EXCLUDED.nama,
              sheet_type = EXCLUDED.sheet_type,
              is_active = true,
              updated_at = now()
        `, [kode, parentKode, level, nama, sheetType]);

        insertedCount++;
        console.log(`✓ Inserted: ${kode} - ${nama.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`⚠️  Error inserting row ${i}: ${kode} - ${error.message}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log(`\n✅ Successfully imported ${insertedCount} ACGS templates!`);

    // Verify import
    const result = await client.query('SELECT COUNT(*) as count FROM acgs_template WHERE is_active = true');
    console.log(`📊 Total active templates in database: ${result.rows[0].count}`);

    // Show sample by level
    const byLevel = await client.query(`
      SELECT level, COUNT(*) as count
      FROM acgs_template
      WHERE is_active = true
      GROUP BY level
      ORDER BY level
    `);
    console.log('\n📊 Templates by level:');
    byLevel.rows.forEach(row => {
      console.log(`   Level ${row.level}: ${row.count} templates`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing ACGS templates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run import
importAcgsTemplate()
  .then(() => {
    console.log('\n✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
