/**
 * Email Test Controller
 */
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger-simple');

class EmailController {
  /**
   * Test email configuration
   */
  async testEmail(req, res) {
    try {
      const { to } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          message: 'Email recipient required'
        });
      }

      console.log('\n🔍 TESTING EMAIL CONFIGURATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Sending test email to: ${to}`);
      console.log(`📡 SMTP Host: ${process.env.MAIL_HOST}`);
      console.log(`📡 SMTP Port: ${process.env.MAIL_PORT}`);
      console.log(`📡 SMTP User: ${process.env.MAIL_USERNAME}`);
      console.log(`📡 From Name: ${process.env.MAIL_FROM_NAME}`);
      console.log(`📡 From Address: ${process.env.MAIL_FROM_ADDRESS}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const result = await emailService.sendEmail({
        to,
        subject: 'Test Email - GCG Assessment System',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; border: 2px solid #37C3D9; border-radius: 10px; padding: 30px;">
    <h1 style="color: #37C3D9;">✅ Email Configuration Test</h1>
    <p>Ini adalah test email dari GCG Assessment System.</p>
    <p>Jika Anda menerima email ini, berarti konfigurasi email sudah benar!</p>
    <hr style="border: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      <strong>Test Details:</strong><br>
      Sent at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}<br>
      From: ${process.env.MAIL_FROM_ADDRESS}<br>
      SMTP Server: ${process.env.MAIL_HOST}:${process.env.MAIL_PORT}
    </p>
  </div>
</body>
</html>
        `
      });

      console.log('✅ Test email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);

      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          messageId: result.messageId,
          response: result.response,
          to,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('\n❌ EMAIL TEST FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`Error: ${error.message}`);
      console.error(`Code: ${error.code || 'N/A'}`);
      console.error(`Stack: ${error.stack}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.error('Test email failed:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: {
          message: error.message,
          code: error.code
        }
      });
    }
  }

  /**
   * Check email configuration
   */
  async checkConfig(req, res) {
    try {
      const config = {
        host: process.env.MAIL_HOST || 'NOT SET',
        port: process.env.MAIL_PORT || 'NOT SET',
        username: process.env.MAIL_USERNAME || 'NOT SET',
        fromName: process.env.MAIL_FROM_NAME || 'NOT SET',
        fromAddress: process.env.MAIL_FROM_ADDRESS || 'NOT SET',
        encryption: process.env.MAIL_ENCRYPTION || 'NOT SET',
        tlsReject: process.env.MAIL_TLS_REJECT_UNAUTHORIZED || 'NOT SET'
      };

      // Don't expose password
      const hasPassword = !!(process.env.MAIL_PASSWORD);

      console.log('\n📋 EMAIL CONFIGURATION CHECK');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Host:         ${config.host}`);
      console.log(`📡 Port:         ${config.port}`);
      console.log(`📡 Username:     ${config.username}`);
      console.log(`📡 Password:     ${hasPassword ? '✓ SET' : '✗ NOT SET'}`);
      console.log(`📡 From Name:    ${config.fromName}`);
      console.log(`📡 From Address: ${config.fromAddress}`);
      console.log(`📡 TLS Reject:   ${config.tlsReject}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return res.status(200).json({
        success: true,
        data: {
          ...config,
          passwordSet: hasPassword
        }
      });
    } catch (error) {
      logger.error('Check email config failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check email configuration',
        error: error.message
      });
    }
  }
}

module.exports = new EmailController();
