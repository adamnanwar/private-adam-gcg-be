/**
 * PIC Notification Service
 * Handles email notifications for PIC assignments
 */
const { getConnection } = require('../../config/database');
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger');

class PICNotificationService {
  constructor() {
    this.db = getConnection();
  }

  /**
   * Send email notifications for all PICs assigned to an assessment
   */
  async sendAssessmentPICNotifications(assessmentId) {
    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 SENDING PIC ASSIGNMENT NOTIFICATIONS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Assessment ID: ${assessmentId}`);
      console.log(`📅 Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Get assessment details
      const assessment = await this.db('assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        console.log('⚠️  Assessment not found');
        return { success: false, error: 'Assessment not found' };
      }

      console.log(`✅ Assessment: "${assessment.title}"`);

      // Get all PIC assignments for this assessment (only factors)
      const assignments = await this.db('pic_map')
        .where('assessment_id', assessmentId)
        .where('target_type', 'factor')
        .select('*');

      console.log(`✅ Found ${assignments.length} factor assignments`);

      if (assignments.length === 0) {
        console.log('⚠️  No factor assignments found, skipping email');
        return { success: true, sent: 0, message: 'No assignments to notify' };
      }

      // Get factor IDs
      const factorIds = assignments.map(a => a.target_id);

      // Get factor details
      const factors = await this.db('factor')
        .select('factor.*')
        .whereIn('factor.id', factorIds);

      console.log(`✅ Retrieved ${factors.length} factor details`);

      // Group by unit_bidang_id
      const unitGroups = {};
      for (const assignment of assignments) {
        const unitId = assignment.unit_bidang_id;
        if (!unitId) continue;

        if (!unitGroups[unitId]) {
          const unit = await this.db('unit_bidang')
            .where('id', unitId)
            .first();

          unitGroups[unitId] = {
            unit_id: unitId,
            unit_nama: unit?.nama || 'Unknown',
            unit_kode: unit?.kode || 'Unknown',
            factors: []
          };
        }

        const factor = factors.find(f => f.id === assignment.target_id);
        if (factor) {
          unitGroups[unitId].factors.push(factor);
        }
      }

      console.log(`✅ Grouped into ${Object.keys(unitGroups).length} units`);

      // Get users for each unit
      const picUsers = [];
      for (const unitId of Object.keys(unitGroups)) {
        const users = await this.db('users')
          .where('unit_bidang_id', unitId)
          .andWhere('is_active', true)
          .select('*');

        console.log(`   📌 Unit "${unitGroups[unitId].unit_nama}": ${users.length} active user(s)`);

        picUsers.push(...users.map(user => ({
          ...user,
          unit_nama: unitGroups[unitId].unit_nama,
          unit_kode: unitGroups[unitId].unit_kode,
          assigned_factors: unitGroups[unitId].factors
        })));
      }

      console.log(`✅ Total users to notify: ${picUsers.length}`);

      // Send emails
      if (picUsers.length > 0) {
        console.log('\n📧 Sending email notifications...\n');

        try {
          await emailService.sendAssessmentNotification(assessment, picUsers, factors);

          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ NOTIFICATIONS SENT SUCCESSFULLY');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          logger.info(`PIC notifications sent for assessment ${assessmentId} to ${picUsers.length} users`);

          return {
            success: true,
            sent: picUsers.length,
            units: Object.keys(unitGroups).length,
            recipients: picUsers.map(u => ({ email: u.email, name: u.name, unit: u.unit_nama }))
          };
        } catch (emailError) {
          console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ EMAIL SENDING FAILED');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ Error: ${emailError.message}`);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          logger.error('Failed to send PIC notifications:', emailError);
          return { success: false, error: emailError.message };
        }
      } else {
        console.log('\n⚠️  No active users in assigned units\n');
        return { success: true, sent: 0, message: 'No active users to notify' };
      }
    } catch (error) {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ NOTIFICATION SERVICE ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ Error: ${error.message}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.error('PIC notification service error:', error);
      throw error;
    }
  }
}

module.exports = new PICNotificationService();
