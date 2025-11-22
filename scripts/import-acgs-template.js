/**
 * Import ACGS Template from Excel
 *
 * This script reads the ACGS.xlsx file and imports the template data
 * into the acgs_template table.
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

async function importAcgsTemplate() {
  const client = await pool.connect();

  try {
    console.log('📖 Reading ACGS.xlsx file...');

    // Read Excel file
    const workbook = XLSX.readFile(path.join(__dirname, '../../ACGS.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel file`);

    // Start transaction
    await client.query('BEGIN');

    // Clear existing templates
    console.log('🗑️  Clearing existing ACGS templates...');
    await client.query('DELETE FROM acgs_template');

    console.log('💾 Inserting ACGS templates...');
    let insertedCount = 0;

    for (const row of data) {
      // Map Excel columns to database columns
      // Adjust these field names based on your Excel structure
      const kode = row['Kode'] || row['kode'] || row['KODE'];
      const parentKode = row['Parent Kode'] || row['parent_kode'] || row['PARENT_KODE'] || null;
      const level = parseInt(row['Level'] || row['level'] || row['LEVEL'] || 1);
      const nama = row['Nama'] || row['nama'] || row['NAMA'];
      const sheetType = row['Sheet Type'] || row['sheet_type'] || row['SHEET_TYPE'] || 'PERNYATAAN';

      if (!kode || !nama) {
        console.warn(`⚠️  Skipping row with missing kode or nama:`, row);
        continue;
      }

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
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log(`✅ Successfully imported ${insertedCount} ACGS templates!`);

    // Verify import
    const result = await client.query('SELECT COUNT(*) as count FROM acgs_template WHERE is_active = true');
    console.log(`📊 Total active templates in database: ${result.rows[0].count}`);

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
    console.log('✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
