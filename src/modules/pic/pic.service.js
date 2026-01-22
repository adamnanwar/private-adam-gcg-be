/**
 * PIC (Person In Charge) Service
 * Manages PIC assignments for factors and parameters
 */
const { getConnection } = require('../../config/database');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class PICService {
  constructor() {
    this.db = getConnection();
  }

  async assignPIC(assessmentId, targetType, targetId, unitBidangId, userId) {
    const trx = await this.db.transaction();
    try {
      if (!['factor', 'parameter'].includes(targetType)) {
        throw new Error('Invalid target type. Must be "factor" or "parameter"');
      }

      const target = await trx(targetType).where('id', targetId).first();
      if (!target) {
        throw new Error(`${targetType} not found`);
      }

      const unitBidang = await trx('unit_bidang')
        .where('id', unitBidangId)
        .where('is_active', true)
        .first();
      if (!unitBidang) {
        throw new Error('Unit bidang not found or inactive');
      }

      const [existingAssignment] = await trx('pic_map')
        .where({ assessment_id: assessmentId, target_type: targetType, target_id: targetId })
        .limit(1);

      if (existingAssignment) {
        await trx('pic_map')
          .where('id', existingAssignment.id)
          .update({
            unit_bidang_id: unitBidangId,
            updated_at: new Date(),
            created_by: userId
          });
        logger.info(`PIC assignment updated: assessment ${assessmentId} ${targetType} ${targetId} -> unit ${unitBidangId}`);
      } else {
        await trx('pic_map').insert({
          id: uuidv4(),
          assessment_id: assessmentId,
          target_type: targetType,
          target_id: targetId,
          unit_bidang_id: unitBidangId,
          pic_user_id: null,
          created_by: userId,
          status: 'assigned',
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
        logger.info(`PIC assignment created: assessment ${assessmentId} ${targetType} ${targetId} -> unit ${unitBidangId}`);
      }

      await trx.commit();
      return this.getPICAssignment(assessmentId, targetType, targetId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error in assignPIC:', error);
      throw error;
    }
  }

  async removePIC(assessmentId, targetType, targetId) {
    try {
      const deletedRows = await this.db('pic_map')
        .where({ assessment_id: assessmentId, target_type: targetType, target_id: targetId })
        .del();

      if (deletedRows === 0) {
        throw new Error('PIC assignment not found');
      }

      logger.info(`PIC assignment removed: assessment ${assessmentId} ${targetType} ${targetId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error in removePIC:', error);
      throw error;
    }
  }

  async getPICAssignment(assessmentId, targetType, targetId) {
    try {
      return await this.db('pic_map')
        .select(
          'pic_map.*',
          'unit_bidang.kode as unit_kode',
          'unit_bidang.nama as unit_nama',
          'unit_bidang.deskripsi as unit_deskripsi'
        )
        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .where({
          'pic_map.assessment_id': assessmentId,
          'pic_map.target_type': targetType,
          'pic_map.target_id': targetId
        })
        .first();
    } catch (error) {
      logger.error('Error in getPICAssignment:', error);
      throw error;
    }
  }

  async getUserPICAssignments(userId) {
    try {
      const assignments = await this.db('pic_map')
        .select(
          'pic_map.*',
          'unit_bidang.kode as unit_kode',
          'unit_bidang.nama as unit_nama',
          'assessment.id as assessment_id',
          'assessment.title as assessment_title',
          'assessment.assessment_date',
          'assessment.status as assessment_status',
          'factor.id as factor_id',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.id as parameter_id',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'aspect.id as aspect_id',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'kka.id as kka_id',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama'
        )
        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .leftJoin({ factor: 'factor' }, function () {
          this.on('pic_map.target_type', '=', this.db.raw('?', ['factor']))
            .andOn('pic_map.target_id', '=', 'factor.id');
        })
        .leftJoin({ parameter: 'parameter' }, function () {
          this.on('pic_map.target_type', '=', this.db.raw('?', ['parameter']))
            .andOn('pic_map.target_id', '=', 'parameter.id');
        })
        .leftJoin({ factor_parameter: 'parameter' }, 'factor.parameter_id', 'factor_parameter.id')
        .leftJoin('aspect', function () {
          this.on('parameter.aspect_id', '=', 'aspect.id')
            .orOn('factor_parameter.aspect_id', '=', 'aspect.id');
        })
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .whereExists(function () {
          this.select('*')
            .from('users')
            .where('users.unit_bidang_id', this.ref('pic_map.unit_bidang_id'))
            .andWhere('users.id', userId);
        })
        .orderBy('assessment.assessment_date', 'desc')
        .orderBy('kka.kode')
        .orderBy('aspect.kode')
        .orderBy('parameter.kode')
        .orderBy('factor.kode');

      return assignments;
    } catch (error) {
      logger.error('Error in getUserPICAssignments:', error);
      throw error;
    }
  }

  async getPICAssignmentsByAssessment(assessmentId) {
    try {
      const db = this.db; // Capture db reference for use in closures
      const assignments = await this.db('pic_map')
        .select(
          'pic_map.*',
          'unit_bidang.kode as unit_kode',
          'unit_bidang.nama as unit_nama',
          'unit_bidang.deskripsi as unit_deskripsi',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama'
        )
        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .leftJoin('factor', function () {
          this.on('pic_map.target_id', '=', 'factor.id')
            .andOn('pic_map.target_type', '=', db.raw('?', ['factor']));
        })
        .leftJoin('parameter', function () {
          this.on('pic_map.target_id', '=', 'parameter.id')
            .andOn('pic_map.target_type', '=', db.raw('?', ['parameter']))
            .orOn('factor.parameter_id', '=', 'parameter.id');
        })
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .where('pic_map.assessment_id', assessmentId) // Filter by assessment ID
        .orderBy('kka.sort')
        .orderBy('aspect.sort')
        .orderBy('parameter.sort')
        .orderBy('factor.sort');

      return assignments;
    } catch (error) {
      logger.error('Error in getPICAssignmentsByAssessment:', error);
      throw error;
    }
  }

  async getPICAssignmentsByUnit(unitBidangId) {
    try {
      const assignments = await this.db('pic_map')
        .select(
          'pic_map.*',
          'unit_bidang.kode as unit_kode',
          'unit_bidang.nama as unit_nama',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama'
        )
        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .leftJoin('factor', function () {
          this.on('pic_map.target_id', '=', 'factor.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['factor']));
        })
        .leftJoin('parameter', function () {
          this.on('pic_map.target_id', '=', 'parameter.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['parameter']));
        })
        .where('pic_map.unit_bidang_id', unitBidangId)
        .orderBy('pic_map.created_at', 'desc');

      return assignments;

    } catch (error) {
      logger.error('Error in getPICAssignmentsByUnit:', error);
      throw error;
    }
  }

  async bulkAssignPICs(assessmentId, assignments, userId) {
    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 BULK PIC ASSIGNMENT STARTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Assessment ID: ${assessmentId}`);
      console.log(`👥 Assignments Count: ${assignments.length}`);
      console.log(`📅 Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const results = [];

      // Create all assignments first (without transaction nesting issues)
      for (const assignment of assignments) {
        const { target_type, target_id, unit_bidang_id } = assignment;
        console.log(`   📌 Assigning ${target_type} ${target_id} to unit ${unit_bidang_id}`);
        const result = await this.assignPIC(assessmentId, target_type, target_id, unit_bidang_id, userId);
        results.push(result);
      }

      console.log(`\n✅ All ${results.length} assignments created successfully`);

      // Now trigger email notification
      console.log('\n📧 Preparing email notifications...');

      // Import email service and pic-assignment service
      const picAssignmentService = require('../assessment/pic-assignment.service');

      // Get assessment details
      const assessment = await this.db('assessment')
        .where('id', assessmentId)
        .first();

      if (!assessment) {
        console.log('⚠️  Assessment not found, skipping email');
        return results;
      }

      // Get factor IDs from assignments
      const factorIds = assignments
        .filter(a => a.target_type === 'factor')
        .map(a => a.target_id);

      if (factorIds.length === 0) {
        console.log('⚠️  No factor assignments, skipping email');
        return results;
      }

      // Get factors
      const factors = await this.db('factor')
        .select('factor.*')
        .whereIn('factor.id', factorIds);

      console.log(`   Retrieved ${factors.length} factors`);

      // Group by unit to get users
      const unitGroups = {};
      for (const assignment of assignments.filter(a => a.target_type === 'factor')) {
        const unitId = assignment.unit_bidang_id;
        if (unitId) {
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
      }

      console.log(`   Grouped into ${Object.keys(unitGroups).length} units`);

      // Get users for each unit
      const picUsers = [];
      for (const unitId of Object.keys(unitGroups)) {
        const users = await this.db('users')
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

      console.log(`   Total users to notify: ${picUsers.length}`);

      // Send emails
      if (picUsers.length > 0) {
        const emailService = require('../../services/email.service');

        try {
          await emailService.sendAssessmentNotification(assessment, picUsers, factors);
          console.log('\n✅ Email notifications sent successfully\n');
        } catch (emailError) {
          console.error('\n⚠️  Email sending failed (continuing anyway):', emailError.message, '\n');
          logger.error('Email notification failed in bulkAssignPICs:', emailError);
        }
      }

      // Update assessment status
      await this.db('assessment')
        .where('id', assessmentId)
        .update({
          status: 'in_progress',
          updated_at: new Date()
        });

      console.log('✅ Assessment status updated to "in_progress"');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ BULK PIC ASSIGNMENT COMPLETED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.info(`Bulk PIC assignment completed for assessment ${assessmentId}: ${results.length} assignments`);

      return results;

    } catch (error) {
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ BULK PIC ASSIGNMENT FAILED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ Error: ${error.message}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.error('Error in bulkAssignPICs:', error);
      throw error;
    }
  }

  async getUnitPicSummary() {
    try {
      const units = await this.db('unit_bidang as ub')
        .select(
          'ub.id',
          'ub.kode',
          'ub.nama',
          'parent.nama as parent_nama'
        )
        .leftJoin('unit_bidang as parent', 'ub.parent_id', 'parent.id')
        .where('ub.is_active', true)
        .orderBy('ub.nama', 'asc');

      const unitIds = units.map((unit) => unit.id);

      const userCounts = await this.db('users')
        .select('unit_bidang_id')
        .count({ total: '*' })
        .whereIn('unit_bidang_id', unitIds)
        .groupBy('unit_bidang_id');

      const assignmentCounts = await this.db('pic_map')
        .select('unit_bidang_id')
        .count({ total: '*' })
        .whereIn('unit_bidang_id', unitIds)
        .groupBy('unit_bidang_id');

      const userMap = userCounts.reduce((acc, row) => {
        acc[row.unit_bidang_id] = Number(row.total);
        return acc;
      }, {});

      const assignmentMap = assignmentCounts.reduce((acc, row) => {
        acc[row.unit_bidang_id] = Number(row.total);
        return acc;
      }, {});

      return units.map((unit) => ({
        ...unit,
        total_users: userMap[unit.id] || 0,
        total_pic_assignments: assignmentMap[unit.id] || 0,
      }));
    } catch (error) {
      logger.error('Error in getUnitPicSummary:', error);
      throw error;
    }
  }

  async getUsersByUnit(unitBidangId) {
    try {
      const users = await this.db('users')
        .select('id', 'name', 'email', 'role')
        .where('unit_bidang_id', unitBidangId)
        .andWhere('is_active', true)
        .orderBy('name', 'asc');

      return users;
    } catch (error) {
      logger.error('Error in getUsersByUnit:', error);
      throw error;
    }
  }

  /**
   * Get users without unit_bidang assignment (unassigned users)
   * @param {string} search - Optional search term for name or email
   */
  async getUnassignedUsers(search = '') {
    try {
      let query = this.db('users')
        .select('id', 'name', 'email', 'role')
        .where('is_active', true)
        .whereNull('unit_bidang_id')
        .orderBy('name', 'asc');

      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        query = query.where(function () {
          this.whereRaw('LOWER(name) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(email) LIKE ?', [searchTerm]);
        });
      }

      const result = await query;
      logger.info(`getUnassignedUsers: Found ${result.length} unassigned users`);
      return result;
    } catch (error) {
      logger.error('Error in getUnassignedUsers:', error);
      throw error;
    }
  }
}

module.exports = PICService;
