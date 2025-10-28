const ExcelJS = require('exceljs');
const logger = require('../utils/logger-simple');

class ExcelService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Export assessment to Excel with GCG format
   */
  async exportAssessmentToExcel(assessmentId) {
    try {
      // Fetch assessment data
      const assessment = await this.db('assessment')
        .where('assessment.id', assessmentId)
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Fetch all KKA with hierarchy
      const kkas = await this.db('kka')
        .select('kka.*')
        .orderBy('kka.sort', 'asc');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assessment');

      // Set column widths
      worksheet.columns = [
        { width: 5 },   // NO
        { width: 50 },  // ASPEK PENGUJIAN
        { width: 12 },  // BOBOT INDIKATOR
        { width: 12 },  // NO PARAMETER
        { width: 40 },  // PARAMETER
        { width: 12 },  // BOBOT PARAMETER
        { width: 50 },  // FAKTOR-FAKTOR YANG DINILAI
        { width: 40 },  // UNSUR PEMENUHAN
        { width: 10 },  // D
        { width: 10 },  // K
        { width: 10 },  // W
        { width: 10 },  // O
        { width: 25 },  // Perolehan Data
        { width: 12 },  // Nilai UIP
        { width: 12 },  // Nilai FUK
        { width: 12 },  // Konversi Nilai FUK
        { width: 12 },  // Nilai Prtnr
        { width: 12 },  // Capaian
        { width: 25 },  // PIC
      ];

      // Title row (row 3)
      worksheet.mergeCells('A3:S3');
      const titleCell = worksheet.getCell('A3');
      titleCell.value = `{judul_assessment}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Header row 1 (row 5) - Main headers with merges
      const headerRow5 = worksheet.getRow(5);
      headerRow5.height = 60;

      // Merge cells for main headers
      worksheet.mergeCells('A5:A6');
      worksheet.mergeCells('B5:B6');
      worksheet.mergeCells('C5:C6');
      worksheet.mergeCells('D5:D6');
      worksheet.mergeCells('E5:E6');
      worksheet.mergeCells('F5:F6');
      worksheet.mergeCells('G5:G6');
      worksheet.mergeCells('H5:H6');
      worksheet.mergeCells('I5:L5'); // Perolehan Data
      worksheet.mergeCells('M5:M6'); // Penilaian Faktor
      worksheet.mergeCells('N5:Q5'); // Konversi Nilai FUK
      worksheet.mergeCells('R5:R6'); // Nilai Prtnr
      worksheet.mergeCells('S5:S6'); // PIC

      // Set header row 5 values
      worksheet.getCell('A5').value = 'NO';
      worksheet.getCell('B5').value = 'ASPEK PENGUJIAN / INDIKATOR yang TERPENGARUH';
      worksheet.getCell('C5').value = 'BOBOT INDIKATOR';
      worksheet.getCell('D5').value = 'NO PARAME-TER';
      worksheet.getCell('E5').value = 'PARAMETER';
      worksheet.getCell('F5').value = 'BOBOT PARAMETER';
      worksheet.getCell('G5').value = 'FAKTOR-FAKTOR YANG DINILAI KESESUAIANNYA (FUK)';
      worksheet.getCell('H5').value = 'UNSUR PEMENUHAN (UP)';
      worksheet.getCell('I5').value = 'Perolehan Data';
      worksheet.getCell('M5').value = 'Penilaian Faktor Uji Kesesuaian';
      worksheet.getCell('N5').value = 'Konversi Nilai FUK';
      worksheet.getCell('R5').value = 'Nilai Prtnr (Indiv)';
      worksheet.getCell('S5').value = 'PIC';

      // Header row 2 (row 6) - Sub headers
      const headerRow6 = worksheet.getRow(6);
      headerRow6.height = 60;

      worksheet.getCell('I6').value = 'D';
      worksheet.getCell('J6').value = 'K';
      worksheet.getCell('K6').value = 'W';
      worksheet.getCell('L6').value = 'O';

      worksheet.getCell('M6').value = 'D = Dokumen\nK = Kuesioner\nW= wawancara\nO = Observasi';

      worksheet.getCell('N6').value = 'Penilaian Tahun Sebelumnya';
      worksheet.getCell('O6').value = 'Nilai UIP';
      worksheet.getCell('P6').value = 'Nilai FUK';
      worksheet.getCell('Q6').value = 'nilai > 0,65 (nilai ini > 0,65 a.d. 0,85\nNilai 0,5 = rata-rata < 0,85';

      // Column numbering row (row 8)
      const numberRow = worksheet.getRow(8);
      for (let i = 1; i <= 19; i++) {
        const cell = numberRow.getCell(i);
        cell.value = i;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' } // Orange
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      // Style all header cells
      for (let row = 5; row <= 6; row++) {
        for (let col = 1; col <= 19; col++) {
          const cell = worksheet.getRow(row).getCell(col);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF40E0D0' } // Turquoise
          };
          cell.font = { bold: true, size: 10 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }

      // Data rows - Start from row 9
      let currentRow = 9;
      let rowNumber = 1;

      for (const kka of kkas) {
        // Get aspects for this KKA
        const aspects = await this.db('aspect')
          .where('kka_id', kka.id)
          .orderBy('sort', 'asc');

        if (aspects.length === 0) continue;

        // KKA row
        const kkaRow = worksheet.getRow(currentRow);
        kkaRow.height = 25;

        worksheet.mergeCells(`B${currentRow}:S${currentRow}`);
        const kkaCell = worksheet.getCell(`B${currentRow}`);
        kkaCell.value = `{nama_kka}`;
        kkaCell.font = { bold: true, size: 11 };
        kkaCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' } // Light green
        };
        kkaCell.alignment = { vertical: 'middle', horizontal: 'left' };
        kkaCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        currentRow++;

        // Process each aspect
        for (const aspect of aspects) {
          const parameters = await this.db('parameter')
            .where('aspect_id', aspect.id)
            .orderBy('sort', 'asc');

          for (let paramIdx = 0; paramIdx < parameters.length; paramIdx++) {
            const parameter = parameters[paramIdx];

            const factors = await this.db('factor')
              .where('parameter_id', parameter.id)
              .orderBy('sort', 'asc');

            // Get responses for factors
            const factorIds = factors.map(f => f.id);
            const responses = await this.db('response')
              .whereIn('factor_id', factorIds)
              .where('assessment_id', assessmentId);

            const responseMap = {};
            responses.forEach(r => {
              responseMap[r.factor_id] = r;
            });

            for (let factorIdx = 0; factorIdx < factors.length; factorIdx++) {
              const factor = factors[factorIdx];
              const response = responseMap[factor.id];

              const dataRow = worksheet.getRow(currentRow);
              dataRow.height = 20;

              // NO
              if (paramIdx === 0 && factorIdx === 0) {
                worksheet.getCell(`A${currentRow}`).value = rowNumber++;
              }

              // ASPEK - merge cells for all factors in this parameter
              if (factorIdx === 0) {
                const startRow = currentRow;
                const endRow = currentRow + factors.length - 1;
                if (factors.length > 1) {
                  worksheet.mergeCells(`B${startRow}:B${endRow}`);
                }
                worksheet.getCell(`B${currentRow}`).value = aspect.nama;
              }

              // BOBOT INDIKATOR
              if (factorIdx === 0) {
                const startRow = currentRow;
                const endRow = currentRow + factors.length - 1;
                if (factors.length > 1) {
                  worksheet.mergeCells(`C${startRow}:C${endRow}`);
                }
                worksheet.getCell(`C${currentRow}`).value = aspect.weight || 1;
              }

              // NO PARAMETER
              if (factorIdx === 0) {
                const startRow = currentRow;
                const endRow = currentRow + factors.length - 1;
                if (factors.length > 1) {
                  worksheet.mergeCells(`D${startRow}:D${endRow}`);
                }
                worksheet.getCell(`D${currentRow}`).value = parameter.kode;
              }

              // PARAMETER NAME
              if (factorIdx === 0) {
                const startRow = currentRow;
                const endRow = currentRow + factors.length - 1;
                if (factors.length > 1) {
                  worksheet.mergeCells(`E${startRow}:E${endRow}`);
                }
                worksheet.getCell(`E${currentRow}`).value = parameter.nama;
              }

              // BOBOT PARAMETER
              if (factorIdx === 0) {
                const startRow = currentRow;
                const endRow = currentRow + factors.length - 1;
                if (factors.length > 1) {
                  worksheet.mergeCells(`F${startRow}:F${endRow}`);
                }
                worksheet.getCell(`F${currentRow}`).value = parameter.weight || 1;
              }

              // FACTOR
              worksheet.getCell(`G${currentRow}`).value = factor.nama;

              // UNSUR PEMENUHAN
              worksheet.getCell(`H${currentRow}`).value = factor.deskripsi || '';

              // Perolehan Data - Empty cells for user to fill
              worksheet.getCell(`I${currentRow}`).value = ''; // D
              worksheet.getCell(`J${currentRow}`).value = ''; // K
              worksheet.getCell(`K${currentRow}`).value = ''; // W
              worksheet.getCell(`L${currentRow}`).value = ''; // O

              // Penilaian
              worksheet.getCell(`M${currentRow}`).value = '11.000'; // Default

              // Nilai UIP
              worksheet.getCell(`N${currentRow}`).value = '12.000'; // Default

              // Nilai FUK
              worksheet.getCell(`O${currentRow}`).value = response ? response.score : '';

              // Konversi
              worksheet.getCell(`P${currentRow}`).value = ''; // Formula column

              // Nilai Prtnr
              worksheet.getCell(`Q${currentRow}`).value = ''; // Formula column

              // Capaian
              worksheet.getCell(`R${currentRow}`).value = ''; // Formula column

              // PIC - Get from pic_map table
              const picAssignment = await this.db('pic_map')
                .select('unit_bidang.nama as unit_nama')
                .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
                .where('pic_map.assessment_id', assessmentId)
                .where('pic_map.target_type', 'factor')
                .where('pic_map.target_id', factor.id)
                .first();
              worksheet.getCell(`S${currentRow}`).value = picAssignment ? picAssignment.unit_nama : '';

              // Apply borders to all cells
              for (let col = 1; col <= 19; col++) {
                const cell = dataRow.getCell(col);
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: 'center',
                  wrapText: true
                };
              }

              // Left align for text columns
              worksheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              worksheet.getCell(`E${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              worksheet.getCell(`G${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              worksheet.getCell(`H${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              worksheet.getCell(`S${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

              currentRow++;
            }
          }
        }
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;

    } catch (error) {
      logger.error('Error exporting assessment to Excel:', error);
      throw error;
    }
  }
}

module.exports = ExcelService;
