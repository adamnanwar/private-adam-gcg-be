const { getConnection } = require('../../config/database');
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger-simple');
const { randomUUID } = require('crypto');

class PICAssignmentService {
  constructor() {
    this.db = getConnection();
  }

  async assignPICToAssessment(assessmentId, factorAssignments) {
    const trx = await this.db.transaction();

    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 STARTING PIC ASSIGNMENT PROCESS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Assessment ID: ${assessmentId}`);
      console.log(`👥 Factor Assignments Count: ${factorAssignments.length}`);
      console.log(`📅 Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Get assessment details
      const assessment = await trx('assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      console.log(`✅ Assessment found: "${assessment.title}"`);

      // Create PIC assignments in database FIRST
      const picAssignments = [];
      for (const assignment of factorAssignments) {
        picAssignments.push({
          id: randomUUID(),
          assessment_id: assessmentId,
          target_type: 'factor',
          target_id: assignment.factor_id,
          pic_user_id: assignment.pic_user_id || null,
          unit_bidang_id: assignment.unit_bidang_id || null,
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await trx('pic_map').insert(picAssignments);
      console.log(`✅ Inserted ${picAssignments.length} PIC assignments into pic_map table`);

      // Get all factors with details for email
      const factors = await trx('factor')
        .select('factor.*')
        .whereIn('factor.id', factorAssignments.map(f => f.factor_id));

      console.log(`✅ Retrieved ${factors.length} factors for email notification`);

      // Group assignments by unit_bidang_id
      const unitGroups = {};
      for (const assignment of factorAssignments) {
        const unitId = assignment.unit_bidang_id;
        if (unitId) {
          if (!unitGroups[unitId]) {
            // Get unit details
            const unit = await trx('unit_bidang')
              .where('id', unitId)
              .first();

            unitGroups[unitId] = {
              unit_id: unitId,
              unit_nama: unit?.nama || 'Unknown',
              unit_kode: unit?.kode || 'Unknown',
              factors: []
            };
          }

          // Find the factor for this assignment
          const factor = factors.find(f => f.id === assignment.factor_id);
          if (factor) {
            unitGroups[unitId].factors.push(factor);
          }
        }
      }

      console.log(`✅ Grouped assignments into ${Object.keys(unitGroups).length} units`);

      // Get users for each unit bidang
      const picUsers = [];
      for (const unitId of Object.keys(unitGroups)) {
        const users = await trx('users')
          .where('unit_bidang_id', unitId)
          .andWhere('is_active', true)
          .select('*');

        console.log(`   📌 Unit "${unitGroups[unitId].unit_nama}": Found ${users.length} active user(s)`);

        picUsers.push(...users.map(user => ({
          ...user,
          unit_nama: unitGroups[unitId].unit_nama,
          unit_kode: unitGroups[unitId].unit_kode,
          assigned_factors: unitGroups[unitId].factors
        })));
      }

      console.log(`✅ Total PIC users to notify: ${picUsers.length}`);

      // Send email notifications
      if (picUsers.length > 0) {
        console.log('\n📧 Preparing to send email notifications...');

        try {
          await emailService.sendAssessmentNotification(assessment, picUsers, factors);
          logger.info(`📧 PIC assignment notifications sent for assessment ${assessmentId}`);

          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ EMAIL NOTIFICATIONS COMPLETED');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } catch (emailError) {
          console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('⚠️  EMAIL SENDING FAILED (continuing with assignment)');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error(`❌ Error: ${emailError.message}`);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          logger.error('Email notification failed but assignment will continue:', emailError);
          // Don't throw - continue with assignment even if email fails
        }
      } else {
        console.log('\n⚠️  No active users found in assigned units - skipping email notifications');
      }

      // Update assessment status to in_progress
      await trx('assessment')
        .where('id', assessmentId)
        .update({
          status: 'in_progress',
          updated_at: new Date()
        });

      console.log(`✅ Assessment status updated to "in_progress"`);

      await trx.commit();

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PIC ASSIGNMENT COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return {
        assessment,
        picUsers,
        assignments: picAssignments
      };
    } catch (error) {
      await trx.rollback();

      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ PIC ASSIGNMENT FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ Error: ${error.message}`);
      console.error(`📅 Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.error('Error in assignPICToAssessment:', error);
      throw error;
    }
  }

  async getPICAssignments(assessmentId) {
    try {
      const assignments = await this.db('pic_map')
        .leftJoin('factor', 'pic_map.factor_id', 'factor.id')
        .leftJoin('parameter', 'factor.parameter_id', 'parameter.id')
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .leftJoin('users', 'pic_map.pic_user_id', 'users.id')
        .leftJoin('unit_bidang', 'factor.pic_unit_bidang_id', 'unit_bidang.id')
        .select(
          'pic_map.*',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama',
          'users.name as pic_name',
          'users.email as pic_email',
          'unit_bidang.nama as unit_nama'
        )
        .where('pic_map.assessment_id', assessmentId);

      return assignments;
    } catch (error) {
      logger.error('Error in getPICAssignments:', error);
      throw error;
    }
  }

  async getPICAssessments(userId) {
    try {
      const assessments = await this.db('pic_map')
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .leftJoin('factor', 'pic_map.factor_id', 'factor.id')
        .leftJoin('parameter', 'factor.parameter_id', 'parameter.id')
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .leftJoin('unit_bidang', 'factor.pic_unit_bidang_id', 'unit_bidang.id')
        .select(
          'assessment.*',
          'pic_map.id as assignment_id',
          'pic_map.status as assignment_status',
          'pic_map.assigned_at',
          'factor.id as factor_id',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama',
          'unit_bidang.nama as unit_nama'
        )
        .where('pic_map.pic_user_id', userId)
        .orderBy('assessment.created_at', 'desc');

      // Group by assessment
      const groupedAssessments = {};
      assessments.forEach(assignment => {
        const assessmentId = assignment.assessment_id;
        if (!groupedAssessments[assessmentId]) {
          groupedAssessments[assessmentId] = {
            id: assignment.id,
            title: assignment.title,
            assessment_date: assignment.assessment_date,
            status: assignment.status,
            notes: assignment.notes,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at,
            assignments: []
          };
        }
        groupedAssessments[assessmentId].assignments.push({
          assignment_id: assignment.assignment_id,
          assignment_status: assignment.assignment_status,
          assigned_at: assignment.assigned_at,
          factor_id: assignment.factor_id,
          factor_kode: assignment.factor_kode,
          factor_nama: assignment.factor_nama,
          parameter_kode: assignment.parameter_kode,
          parameter_nama: assignment.parameter_nama,
          aspect_kode: assignment.aspect_kode,
          aspect_nama: assignment.aspect_nama,
          kka_kode: assignment.kka_kode,
          kka_nama: assignment.kka_nama,
          unit_nama: assignment.unit_nama
        });
      });

      return Object.values(groupedAssessments);
    } catch (error) {
      logger.error('Error in getPICAssessments:', error);
      throw error;
    }
  }

  async updateAssignmentStatus(assignmentId, status, userId) {
    try {
      const assignment = await this.db('pic_map')
        .where('id', assignmentId)
        .andWhere('pic_user_id', userId)
        .first();

      if (!assignment) {
        throw new Error('Assignment not found or unauthorized');
      }

      // Batasi status yang boleh di-set oleh PIC
      if (!['submitted', 'needs_revision', 'in_progress'].includes(status)) {
        throw new Error('Invalid status transition by PIC');
      }

      await this.db('pic_map')
        .where('id', assignmentId)
        .update({
          status,
          updated_at: new Date()
        });

      // Jangan pernah menyentuh status assessment di sini.
      // Assessment akan berubah status saat pembuat assessment melakukan ACCEPT.

      return { success: true };
    } catch (error) {
      logger.error('Error in updateAssignmentStatus:', error);
      throw error;
    }
  }
}

module.exports = new PICAssignmentService();
