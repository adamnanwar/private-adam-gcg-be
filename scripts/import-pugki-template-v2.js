/**
 * Import PUGKI Template from Excel (V2 - with correct parsing)
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

  // Level 1: Just number (e.g., "1.1", "1.2")
  if (/^\d+\.\d+$/.test(kodeStr)) return 1;

  // Level 2: Number with one decimal (e.g., "1.1.1", "1.2.1")
  if (/^\d+\.\d+\.\d+$/.test(kodeStr)) return 2;

  // Level 3: Number with two decimals (e.g., "1.1.1.1")
  if (/^\d+\.\d+\.\d+\.\d+$/.test(kodeStr)) return 3;

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

async function importPugkiTemplate() {
  const client = await pool.connect();

  try {
    console.log('📖 Reading PUGKI.xlsx file...');

    // Read Excel file
    const workbook = XLSX.readFile(path.join(__dirname, '../../PUGKI.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Found ${rawData.length} rows in Excel file`);

    // Start transaction
    await client.query('BEGIN');

    // Clear existing templates
    console.log('🗑️  Clearing existing PUGKI templates...');
    await client.query('DELETE FROM pugki_template');

    console.log('💾 Inserting PUGKI templates...');
    let insertedCount = 0;

    // Parse data starting from row 8 (index 8)
    for (let i = 8; i < rawData.length; i++) {
      const row = rawData[i];

      // Column mapping (0-indexed):
      // 0: Empty
      // 1: Kode/Index
      // 2: Nama/Rekomendasi
      // 3: Jumlah Rekomendasi
      // 4: Comply/Explain (skip)
      // 5: Referensi (skip)
      // 6: Score (skip)

      const kode = row[1] ? String(row[1]).trim() : null;
      const nama = row[2] ? String(row[2]).trim() : null;
      const jumlahRekomendasi = row[3] && !isNaN(row[3]) ? parseInt(row[3]) : null;

      // Skip rows without kode or nama, or rows with "Jumlah Rekomendasi" text
      if (!kode || !nama || nama.includes('Jumlah Rekomendasi') || nama.includes('Principle') || kode.toString().length > 20) {
        continue;
      }

      // Determine level based on kode pattern
      const level = determineLevel(kode);
      const parentKode = getParentKode(kode, level);

      try {
        await client.query(`
          INSERT INTO pugki_template (kode, parent_kode, level, nama, jumlah_rekomendasi, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (kode) DO UPDATE
          SET parent_kode = EXCLUDED.parent_kode,
              level = EXCLUDED.level,
              nama = EXCLUDED.nama,
              jumlah_rekomendasi = EXCLUDED.jumlah_rekomendasi,
              is_active = true,
              updated_at = now()
        `, [kode, parentKode, level, nama, jumlahRekomendasi]);

        insertedCount++;
        console.log(`✓ Inserted: ${kode} - ${nama.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`⚠️  Error inserting row ${i}: ${kode} - ${error.message}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log(`\n✅ Successfully imported ${insertedCount} PUGKI templates!`);

    // Verify import
    const result = await client.query('SELECT COUNT(*) as count FROM pugki_template WHERE is_active = true');
    console.log(`📊 Total active templates in database: ${result.rows[0].count}`);

    // Show sample by level
    const byLevel = await client.query(`
      SELECT level, COUNT(*) as count
      FROM pugki_template
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
    console.error('❌ Error importing PUGKI templates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run import
importPugkiTemplate()
  .then(() => {
    console.log('\n✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
