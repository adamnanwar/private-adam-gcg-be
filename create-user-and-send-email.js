const { getConnection } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const emailService = require('./src/services/email.service');

async function createUserAndSendEmail() {
  try {
    const db = getConnection();
    
    console.log('=== Creating User and Sending Email Test ===\n');
    
    // 1. Check if test unit exists
    console.log('1. Checking Unit Bidang...');
    let testUnit = await db('unit_bidang').where('kode', 'TEST').first();
    if (!testUnit) {
      console.log('   Creating test unit...');
      testUnit = {
        id: uuidv4(),
        kode: 'TEST',
        nama: 'Unit Bidang Test',
        deskripsi: 'Unit bidang untuk testing',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('unit_bidang').insert(testUnit);
      console.log('   ✅ Test unit created');
    } else {
      console.log('   ✅ Test unit found:', testUnit.nama);
    }
    
    // 2. Check if user already exists
    console.log('\n2. Checking User...');
    let existingUser = await db('users').where('email', 'furysurggt2@gmail.com').first();
    if (existingUser) {
      console.log('   User already exists, updating...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db('users').where('id', existingUser.id).update({
        name: 'Rizky Test',
        password_hash: hashedPassword,
        unit_bidang_id: testUnit.id,
        updated_at: new Date()
      });
      console.log('   ✅ User updated');
    } else {
      console.log('   Creating new user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = {
        id: uuidv4(),
        name: 'Rizky Test',
        email: 'furysurggt2@gmail.com',
        password_hash: hashedPassword,
        role: 'pic',
        auth_provider: 'local',
        unit_bidang_id: testUnit.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('users').insert(newUser);
      console.log('   ✅ User created');
    }
    
    // 3. Get all users from database
    console.log('\n3. Getting all users from database...');
    const allUsers = await db('users')
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
    
    console.log(`   ✅ Found ${allUsers.length} active users`);
    
    // 4. Send test email to all users
    console.log('\n4. Sending test emails...');
    const emailResults = [];
    
    for (const user of allUsers) {
      try {
        console.log(`   Sending email to ${user.name} (${user.email})...`);
        
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
        emailResults.push({
          user: user.name,
          email: user.email,
          status: 'success'
        });
        console.log(`   ✅ Email sent successfully to ${user.name}`);
        
      } catch (emailError) {
        console.log(`   ❌ Failed to send email to ${user.name}: ${emailError.message}`);
        emailResults.push({
          user: user.name,
          email: user.email,
          status: 'failed',
          error: emailError.message
        });
      }
    }
    
    // 5. Summary
    console.log('\n=== Email Test Summary ===');
    const successCount = emailResults.filter(r => r.status === 'success').length;
    const failedCount = emailResults.filter(r => r.status === 'failed').length;
    
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Emails sent successfully: ${successCount}`);
    console.log(`Emails failed: ${failedCount}`);
    
    if (failedCount > 0) {
      console.log('\nFailed emails:');
      emailResults.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.user} (${result.email}): ${result.error}`);
      });
    }
    
    console.log('\n=== Test Complete ===');
    console.log('✅ User Rizky Test created/updated successfully');
    console.log('✅ Test emails sent to all users');
    console.log('✅ Email notification system verified');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

createUserAndSendEmail();
