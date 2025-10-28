const { getConnection } = require('./src/config/database');
const emailService = require('./src/services/email.service');

async function sendTestEmailToAllUsers() {
  try {
    const db = getConnection();
    
    console.log('=== Sending Test Email to All Users ===\n');
    
    // Get all active users
    const users = await db('users')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select(
        'users.id',
        'users.name',
        'users.email',
        'users.role',
        'users.auth_provider',
        'unit_bidang.nama as unit_nama',
        'unit_bidang.kode as unit_kode'
      )
      .where('users.is_active', true);
    
    console.log(`Found ${users.length} active users to send email to:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - Unit: ${user.unit_nama || 'No unit'}`);
    });
    
    console.log('\n=== Sending Emails ===\n');
    
    const results = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`[${i + 1}/${users.length}] Sending email to ${user.name} (${user.email})...`);
      
      try {
        const emailData = {
          to: user.email,
          subject: 'Test Email - GCG Maturity Assessment System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #37C3D9; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; text-align: center;">GCG Maturity Assessment System</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
                <h3 style="color: #333; margin-top: 0;">Halo ${user.name}!</h3>
                
                <p>Ini adalah email test dari sistem GCG Maturity Assessment. Email ini dikirim untuk memverifikasi bahwa sistem notifikasi email berfungsi dengan baik.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #37C3D9; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #37C3D9;">Detail User:</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Nama:</strong> ${user.name}</li>
                    <li><strong>Email:</strong> ${user.email}</li>
                    <li><strong>Role:</strong> ${user.role}</li>
                    <li><strong>Auth Provider:</strong> ${user.auth_provider}</li>
                    <li><strong>Unit:</strong> ${user.unit_nama || 'Tidak ada unit'} (${user.unit_kode || 'N/A'})</li>
                  </ul>
                </div>
                
                <p>Jika Anda menerima email ini, berarti sistem email notification berfungsi dengan baik.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:3000" 
                     style="background-color: #37C3D9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Akses Sistem
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6c757d; text-align: center;">
                  Email ini dikirim secara otomatis dari sistem GCG Maturity Assessment.<br>
                  Jika Anda tidak seharusnya menerima email ini, silakan hubungi administrator.
                </p>
              </div>
            </div>
          `
        };
        
        await emailService.sendEmail(emailData);
        results.push({ user: user.name, email: user.email, status: 'success' });
        console.log(`✅ Email sent successfully to ${user.name}`);
        
      } catch (emailError) {
        console.log(`❌ Failed to send email to ${user.name}: ${emailError.message}`);
        results.push({ user: user.name, email: user.email, status: 'failed', error: emailError.message });
      }
    }
    
    // Summary
    console.log('\n=== Email Test Summary ===');
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    console.log(`Total users: ${users.length}`);
    console.log(`Emails sent successfully: ${successCount}`);
    console.log(`Emails failed: ${failedCount}`);
    
    if (failedCount > 0) {
      console.log('\nFailed emails:');
      results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.user} (${result.email}): ${result.error}`);
      });
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

sendTestEmailToAllUsers();
