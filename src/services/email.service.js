const nodemailer = require('nodemailer');
const logger = require('../utils/logger-simple');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USERNAME || 'your-email@gmail.com',
          pass: process.env.MAIL_PASSWORD || 'your-app-password'
        },
        tls: {
          rejectUnauthorized: process.env.MAIL_TLS_REJECT_UNAUTHORIZED === 'true'
        }
      });

      logger.info('✅ Email transporter initialized successfully');
    } catch (error) {
      logger.error('❌ Email transporter initialization failed:', error);
    }
  }

  async sendAssessmentNotification(assessment, picUsers, factorDetails) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      console.log('\n📧 sendAssessmentNotification called');
      console.log(`   Recipients: ${picUsers.length} users`);
      console.log(`   Factors: ${factorDetails.length} total`);

      const promises = picUsers.map(picUser => {
        // Use the assigned_factors array that was prepared in pic-assignment.service
        const userFactors = picUser.assigned_factors || [];

        console.log(`   📨 Preparing email for: ${picUser.email} (${picUser.name})`);
        console.log(`      Unit: ${picUser.unit_nama}`);
        console.log(`      Assigned factors: ${userFactors.length}`);

        if (userFactors.length === 0) {
          console.log(`      ⚠️  Skipping - no factors assigned`);
          return Promise.resolve();
        }

        return this.sendEmail({
          to: picUser.email,
          subject: `Penugasan Assessment GCG - ${assessment.title}`,
          html: this.generateAssessmentEmailHTML(assessment, picUser, userFactors)
        });
      });

      await Promise.all(promises);
      logger.info(`📧 Assessment notification sent to ${picUsers.length} PIC users`);
    } catch (error) {
      logger.error('❌ Error sending assessment notification:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html }) {
    try {
      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || 'PLN Batam Assessment'}" <${process.env.MAIL_FROM_ADDRESS || 'noreply@plnbatam.com'}>`,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Enhanced logging for console and PM2
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 EMAIL SENT SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 To:         ${to}`);
      console.log(`📝 Subject:    ${subject}`);
      console.log(`📅 Timestamp:  ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`✅ Message ID: ${result.messageId || 'N/A'}`);
      console.log(`📡 Response:   ${result.response || 'OK'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.info(`[EMAIL-SUCCESS] To: ${to} | Subject: ${subject} | MessageID: ${result.messageId || 'N/A'}`);
      return result;
    } catch (error) {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ EMAIL SEND FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`📨 To:        ${to}`);
      console.error(`📝 Subject:   ${subject}`);
      console.error(`❌ Error:     ${error.message}`);
      console.error(`📅 Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      if (error.code) console.error(`🔢 Code:      ${error.code}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.error(`[EMAIL-FAILED] To: ${to} | Subject: ${subject} | Error: ${error.message}`);
      throw error;
    }
  }

  async sendAOIAssignmentNotification(email, name, aoiCode, recommendation, dueDate) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const dueDateFormatted = dueDate
        ? new Date(dueDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Belum ditentukan';

      const html = this.generateAOIEmailHTML(name, aoiCode, recommendation, dueDateFormatted);

      await this.sendEmail({
        to: email,
        subject: `Penugasan Area of Improvement - ${aoiCode}`,
        html
      });

      logger.info(`📧 AOI assignment notification sent to ${email}`);
    } catch (error) {
      logger.error('❌ Error sending AOI assignment notification:', error);
      throw error;
    }
  }

  generateAOIEmailHTML(name, aoiCode, recommendation, dueDate) {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penugasan AOI</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #37C3D9;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #37C3D9;
            margin-bottom: 10px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .aoi-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .info-row {
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #333;
            margin-top: 5px;
        }
        .cta-button {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            background-color: #37C3D9;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PLN Batam Assessment</div>
            <div class="greeting">Halo ${name},</div>
        </div>

        <p>Anda telah ditugaskan sebagai PIC untuk Area of Improvement (AOI) dengan detail sebagai berikut:</p>

        <div class="aoi-info">
            <div class="info-row">
                <div class="info-label">Kode AOI:</div>
                <div class="info-value">${aoiCode}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Rekomendasi:</div>
                <div class="info-value">${recommendation}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Due Date:</div>
                <div class="info-value">${dueDate}</div>
            </div>
        </div>

        <p>Silakan login ke sistem untuk melihat detail AOI dan melakukan tindak lanjut yang diperlukan.</p>

        <div class="cta-button">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/aoi" class="btn">Akses Sistem</a>
        </div>

        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem PLN Batam Assessment.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateAssessmentEmailHTML(assessment, picUser, userFactors) {
    const assessmentDate = new Date(assessment.assessment_date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const factorList = userFactors.map(factor =>
      `<li><strong>${factor.kode}</strong> - ${factor.nama}</li>`
    ).join('');

    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penugasan Assessment GCG</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #37C3D9;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #37C3D9;
            margin-bottom: 10px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .assessment-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .assessment-title {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            width: 120px;
            color: #555;
        }
        .info-value {
            flex: 1;
            color: #333;
        }
        .features {
            margin: 30px 0;
        }
        .features h3 {
            color: #37C3D9;
            margin-bottom: 15px;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .features li:before {
            content: "✓ ";
            color: #27ae60;
            font-weight: bold;
        }
        .factor-list {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .factor-list h4 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .factor-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .cta-button {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            background-color: #37C3D9;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #2ba3c7;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            background-color: #f39c12;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PLN Batam Assessment</div>
            <div class="greeting">Halo ${picUser.name},</div>
        </div>

        <div class="assessment-info">
            <div class="assessment-title">${assessment.title}</div>
            <div class="info-row">
                <div class="info-label">Tanggal:</div>
                <div class="info-value">${assessmentDate}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Status:</div>
                <div class="info-value">
                    <span class="status-badge">${assessment.status}</span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-label">Unit Bidang:</div>
                <div class="info-value">${picUser.unit_nama || 'Tidak ditentukan'}</div>
            </div>
        </div>

        <div class="factor-list">
            <h4>Faktor yang Ditugaskan kepada Anda:</h4>
            <ul>
                ${factorList}
            </ul>
        </div>

        <div class="features">
            <h3>Fitur Sistem:</h3>
            <ul>
                <li><strong>Assessment KKA (Kerangka Kerja Assessment):</strong> Menunjukkan bahwa sistem mendukung proses penilaian berdasarkan Kerangka Kerja Assessment.</li>
                <li><strong>Penilaian Aspek, Parameter, dan Faktor:</strong> Merinci komponen-komponen yang dinilai dalam assessment.</li>
                <li><strong>Penugasan PIC (Person In Charge) per Unit Bidang:</strong> Menjelaskan kemampuan sistem untuk menugaskan penanggung jawab (PIC) untuk setiap unit bidang.</li>
                <li><strong>Area of Improvement (AOI) Management:</strong> Menunjukkan adanya fitur untuk mengelola Area Peningkatan.</li>
                <li><strong>Evidence Upload dan Management:</strong> Menjelaskan kemampuan untuk mengunggah dan mengelola bukti-bukti.</li>
                <li><strong>Reporting dan Export:</strong> Menunjukkan adanya fitur pelaporan dan ekspor data.</li>
            </ul>
        </div>

        <div class="cta-button">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pic/assessments" class="btn">Akses Sistem</a>
        </div>

        <div class="footer">
            <p><strong>Konfirmasi Konfigurasi Email:</strong></p>
            <p>Jika Anda menerima email ini, berarti konfigurasi email sistem sudah berfungsi dengan baik dan siap digunakan untuk notifikasi assessment.</p>
            <br>
            <p>Email ini dikirim secara otomatis oleh sistem PLN Batam Assessment. Jika Anda tidak seharusnya menerima email ini, silakan hubungi administrator sistem.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();