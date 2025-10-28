/**
 * AOI Service - Using only assessment_* tables
 */
const AOIRepository = require('./aoi.repository');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../../services/email.service');
const { getConnection } = require('../../config/database');
const logger = require('../../utils/logger');

class AOIService {
  constructor() {
    this.db = getConnection();
    this.repository = new AOIRepository(this.db);
  }

  async getAllAOI(options = {}) {
    try {
      return await this.repository.findAllAOI(options);
    } catch (error) {
      throw new Error(`Failed to get AOIs: ${error.message}`);
    }
  }

  async getAOIById(id, user) {
    try {
      const aoi = await this.repository.findAOIById(id);
      if (!aoi) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin' && aoi.assessment_id) {
        const isAllowed = await this._canAccessAOI(user, aoi.assessment_id, aoi.id);
        if (!isAllowed) {
          throw new Error('Access denied to AOI');
        }
      }

      return aoi;
    } catch (error) {
      throw new Error(`Failed to get AOI: ${error.message}`);
    }
  }

  async getAOIByAssessment(assessmentId, user) {
    try {
      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAssessment(user, assessmentId);
        if (!isAllowed) {
          throw new Error('Access denied to assessment AOIs');
        }
      }

      return await this.repository.findAOIByAssessment(assessmentId, user);
    } catch (error) {
      throw new Error(`Failed to get AOIs by assessment: ${error.message}`);
    }
  }

  async createAOI(aoiData, user) {
    try {
      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAssessment(user, aoiData.assessment_id);
        if (!isAllowed) {
          throw new Error('Access denied to create AOI for this assessment');
        }
      }

      if (!aoiData.assessment_id || !aoiData.target_type || !aoiData.target_id || !aoiData.recommendation) {
        throw new Error('Assessment ID, target type, target ID, and recommendation are required');
      }

      const validTargetTypes = ['parameter', 'factor'];
      if (!validTargetTypes.includes(aoiData.target_type)) {
        throw new Error('Invalid target type. Must be one of: parameter, factor');
      }

      const isValidTarget = await this.repository.validateTargetId(
        aoiData.assessment_id,
        aoiData.target_type,
        aoiData.target_id
      );

      if (!isValidTarget) {
        throw new Error('Target ID does not exist in the specified assessment');
      }

      const aoiToCreate = {
        id: uuidv4(),
        assessment_id: aoiData.assessment_id,
        target_type: aoiData.target_type,
        target_id: aoiData.target_id,
        recommendation: aoiData.recommendation,
        due_date: aoiData.due_date || null,
        status: aoiData.status || 'open',
        created_by: user.id,
        pic_user_id: aoiData.pic_user_id || null
      };

      const createdAOI = await this.repository.createAOI(aoiToCreate);

      if (aoiData.pic_user_id) {
        await this.sendPICNotification(createdAOI.id, aoiData.pic_user_id, 'assignment');
      }

      return createdAOI;
    } catch (error) {
      throw new Error(`Failed to create AOI: ${error.message}`);
    }
  }

  async updateAOI(id, aoiData, user) {
    try {
      const existingAOI = await this.repository.findAOIById(id);
      if (!existingAOI) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAOI(user, existingAOI.assessment_id, id);
        if (!isAllowed) {
          throw new Error('Access denied to update AOI');
        }
      }

      if (aoiData.target_type || aoiData.target_id) {
        const targetType = aoiData.target_type || existingAOI.target_type;
        const targetId = aoiData.target_id || existingAOI.target_id;
        const assessmentId = aoiData.assessment_id || existingAOI.assessment_id;

        const isValidTarget = await this.repository.validateTargetId(
          assessmentId,
          targetType,
          targetId
        );

        if (!isValidTarget) {
          throw new Error('Target ID does not exist in the specified assessment');
        }
      }

      const updateData = {};
      if (aoiData.recommendation !== undefined) updateData.recommendation = aoiData.recommendation;
      if (aoiData.due_date !== undefined) updateData.due_date = aoiData.due_date;
      if (aoiData.status !== undefined) updateData.status = aoiData.status;
      if (aoiData.target_type !== undefined) updateData.target_type = aoiData.target_type;
      if (aoiData.target_id !== undefined) updateData.target_id = aoiData.target_id;
      if (aoiData.pic_user_id !== undefined) updateData.pic_user_id = aoiData.pic_user_id;

      return await this.repository.updateAOI(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update AOI: ${error.message}`);
    }
  }

  async deleteAOI(id, user) {
    try {
      const existingAOI = await this.repository.findAOIById(id);
      if (!existingAOI) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAOI(user, existingAOI.assessment_id, id);
        if (!isAllowed) {
          throw new Error('Access denied to delete AOI');
        }
      }

      return await this.repository.deleteAOI(id);
    } catch (error) {
      throw new Error(`Failed to delete AOI: ${error.message}`);
    }
  }

  async getAOIStats(user) {
    try {
      return await this.repository.getAOIStats(user);
    } catch (error) {
      throw new Error(`Failed to get AOI stats: ${error.message}`);
    }
  }

  async getAOIWithTargetDetails(id, user) {
    try {
      const aoi = await this.repository.getAOIWithTargetDetails(id);
      if (!aoi) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAOI(user, aoi.assessment_id, id);
        if (!isAllowed) {
          throw new Error('Access denied to AOI');
        }
      }

      return aoi;
    } catch (error) {
      throw new Error(`Failed to get AOI with target details: ${error.message}`);
    }
  }

  /**
   * Get assessment structure for AOI target selection
   */
  async getAssessmentStructure(assessmentId) {
    try {
      // Get aspects from master data (not assessment-specific)
      const aspects = await this.repository.db('aspect')
        .select('aspect.id', 'aspect.kode', 'aspect.nama', 'kka.nama as kka_nama')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .where('aspect.is_active', true)
        .orderBy('aspect.sort', 'asc');

      // Get parameters for each aspect from master data
      const parameters = await this.repository.db('parameter')
        .select('parameter.id', 'parameter.kode', 'parameter.nama', 'parameter.aspect_id')
        .whereIn('parameter.aspect_id', aspects.map(a => a.id))
        .where('parameter.is_active', true)
        .orderBy('parameter.sort', 'asc');

      // Get factors for each parameter from master data
      const factors = await this.repository.db('factor')
        .select('factor.id', 'factor.kode', 'factor.nama', 'factor.parameter_id')
        .whereIn('factor.parameter_id', parameters.map(p => p.id))
        .where('factor.is_active', true)
        .orderBy('factor.sort', 'asc');

      // Group by hierarchy - only return parameters and factors as valid AOI targets
      const structure = [];
      
      // Add parameters as targets
      parameters.forEach(parameter => {
        structure.push({
          id: parameter.id,
          kode: parameter.kode,
          nama: parameter.nama,
          type: 'parameter',
          label: `Parameter: ${parameter.nama}`
        });
      });
      
      // Add factors as targets
      factors.forEach(factor => {
        structure.push({
          id: factor.id,
          kode: factor.kode,
          nama: factor.nama,
          type: 'factor',
          label: `Faktor: ${factor.nama}`
        });
      });

      return structure;
    } catch (error) {
      // this.logger.error('Error getting assessment structure:', error); // Assuming logger is available
      throw new Error('Failed to get assessment structure');
    }
  }

  async getTargetOptions(assessmentId, user) {
    try {
      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAssessment(user, assessmentId);
        if (!isAllowed) {
          throw new Error('Access denied to assessment');
        }
      }

      const structure = await this.getAssessmentStructure(assessmentId);
      return structure;
    } catch (error) {
      throw new Error('Failed to get target options');
    }
  }

  /**
   * Assign PIC to AOI and send notification
   */
  async assignPICToAOI(aoiId, picUserId, user) {
    try {
      const aoi = await this.repository.findAOIById(aoiId);
      if (!aoi) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAOI(user, aoi.assessment_id, aoiId);
        if (!isAllowed) {
          throw new Error('Access denied to assign PIC');
        }
      }

      const picUser = await this.repository.db('users')
        .select('id', 'name', 'email')
        .where('id', picUserId)
        .first();

      if (!picUser) {
        throw new Error('PIC user not found');
      }

      const existingPIC = await this.repository.db('pic_map')
        .where({
          assessment_id: aoi.assessment_id,
          target_type: 'aoi',
          target_id: aoiId
        })
        .first();

      if (existingPIC) {
        await this.repository.db('pic_map')
          .where('id', existingPIC.id)
          .update({
            pic_user_id: picUserId,
            updated_at: new Date()
          });
      } else {
        await this.repository.db('pic_map').insert({
          id: uuidv4(),
          assessment_id: aoi.assessment_id,
          target_type: 'aoi',
          target_id: aoiId,
          unit_bidang_id: null,
          pic_user_id: picUserId,
          created_by: user.id,
          status: 'assigned',
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      try {
        await emailService.sendAOIAssignmentNotification(
          picUser.email,
          picUser.name,
          `AOI-${aoiId.substring(0, 8)}`,
          aoi.recommendation,
          aoi.due_date
        );
      } catch (emailError) {
        logger.warn('Failed to send email notification:', emailError);
      }

      return {
        success: true,
        message: 'PIC assigned successfully',
        pic_user: picUser
      };
    } catch (error) {
      throw new Error(`Failed to assign PIC: ${error.message}`);
    }
  }

  /**
   * Get PIC assignments for AOI
   */
  async getPICAssignments(aoiId, user) {
    try {
      const aoi = await this.repository.findAOIById(aoiId);
      if (!aoi) {
        throw new Error('AOI not found');
      }

      if (user.role !== 'admin') {
        const isAllowed = await this._canAccessAOI(user, aoi.assessment_id, aoiId);
        if (!isAllowed) {
          throw new Error('Access denied to AOI');
        }
      }

      const picAssignments = await this.repository.db('pic_map')
        .select(
          'pic_map.*',
          'users.name as pic_name',
          'users.email as pic_email'
        )
        .leftJoin('users', 'pic_map.pic_user_id', 'users.id')
        .where({
          'pic_map.assessment_id': aoi.assessment_id,
          'pic_map.target_type': 'aoi',
          'pic_map.target_id': aoiId
        });

      return picAssignments;
    } catch (error) {
      throw new Error(`Failed to get PIC assignments: ${error.message}`);
    }
  }

  /**
   * Send notification to PIC
   */
  async sendPICNotification(aoiId, picUserId, type, additionalData = null) {
    try {
      // Get AOI details
      const aoi = await this.repository.findAOIById(aoiId);
      if (!aoi) {
        throw new Error('AOI not found');
      }

      // Get PIC details
      const pic = await this.repository.db('users')
        .select('name', 'email')
        .where('id', picUserId)
        .first();

      if (!pic || !pic.email) {
        logger.warn(`No email found for PIC user ${picUserId}`);
        return;
      }

      // Get assessment details
      const assessment = await this.repository.db('assessment')
        .select('title', 'assessment_date')
        .where('id', aoi.assessment_id)
        .first();

      let subject, message;

      switch (type) {
        case 'assignment':
          subject = `Assignment AOI - ${assessment?.title || 'Assessment'}`;
          message = `
            <h2>Assignment Area of Improvement (AOI)</h2>
            <p>Halo ${pic.name},</p>
            <p>Anda telah ditugaskan sebagai PIC untuk Area of Improvement (AOI) dengan detail sebagai berikut:</p>
            <ul>
              <li><strong>Assessment Title:</strong> ${assessment?.title || 'N/A'}</li>
              <li><strong>Tanggal Assessment:</strong> ${assessment?.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString('id-ID') : 'N/A'}</li>
              <li><strong>Rekomendasi:</strong> ${aoi.recommendation}</li>
              <li><strong>Due Date:</strong> ${aoi.due_date ? new Date(aoi.due_date).toLocaleDateString('id-ID') : 'Belum ditentukan'}</li>
            </ul>
            <p>Silakan login ke sistem untuk melihat detail AOI dan melakukan tindak lanjut yang diperlukan.</p>
            <p>Terima kasih.</p>
          `;
          break;

        case 'status_change':
          subject = `Update Status AOI - ${assessment?.title || 'Assessment'}`;
          message = `
            <h2>Update Status Area of Improvement (AOI)</h2>
            <p>Halo ${pic.name},</p>
            <p>Status AOI yang Anda tangani telah diubah:</p>
            <ul>
              <li><strong>Rekomendasi:</strong> ${aoi.recommendation}</li>
              <li><strong>Status Baru:</strong> ${aoi.status}</li>
              <li><strong>Due Date:</strong> ${aoi.due_date ? new Date(aoi.due_date).toLocaleDateString('id-ID') : 'Belum ditentukan'}</li>
            </ul>
            <p>Silakan login ke sistem untuk melihat detail lengkap.</p>
            <p>Terima kasih.</p>
          `;
          break;

        case 'due_date_reminder':
          subject = `Reminder Due Date AOI - ${assessment?.title || 'Assessment'}`;
          message = `
            <h2>Reminder Due Date Area of Improvement (AOI)</h2>
            <p>Halo ${pic.name},</p>
            <p>Ini adalah reminder bahwa AOI yang Anda tangani akan segera jatuh tempo:</p>
            <ul>
              <li><strong>Rekomendasi:</strong> ${aoi.recommendation}</li>
              <li><strong>Due Date:</strong> ${aoi.due_date ? new Date(aoi.due_date).toLocaleDateString('id-ID') : 'Belum ditentukan'}</li>
              <li><strong>Status:</strong> ${aoi.status}</li>
            </ul>
            <p>Silakan segera menyelesaikan tindak lanjut yang diperlukan.</p>
            <p>Terima kasih.</p>
          `;
          break;

        default:
          logger.warn(`Unknown notification type: ${type}`);
          return;
      }

      // Send email
      await emailService.sendEmail({
        to: pic.email,
        subject: subject,
        html: message
      });

      // Store notification in database
      await this.repository.db('aoi_notification')
        .insert({
          id: uuidv4(),
          aoi_id: aoiId,
          user_id: picUserId,
          type: type,
          message: message,
          is_read: false,
          created_at: new Date(),
          updated_at: new Date()
        });

      logger.info(`Notification sent to PIC ${pic.email} for AOI ${aoiId}`);
    } catch (error) {
      logger.error('Error in sendPICNotification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(userId, limit = 10, offset = 0) {
    try {
      const notifications = await this.repository.db('aoi_notification')
        .select(
          'aoi_notification.*',
          'aoi.recommendation',
          'assessment.title'
        )
        .leftJoin('aoi', 'aoi_notification.aoi_id', 'aoi.id')
        .leftJoin('assessment', 'aoi.assessment_id', 'assessment.id')
        .where('aoi_notification.user_id', userId)
        .orderBy('aoi_notification.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return notifications;
    } catch (error) {
      logger.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      await this.repository.db('aoi_notification')
        .where('id', notificationId)
        .where('user_id', userId)
        .update({ is_read: true, updated_at: new Date() });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  async getAOISummary(userId) {
    try {
      const assignments = await this.db('pic_map')
        .select(
          'pic_map.id',
          'pic_map.assessment_id',
          'pic_map.target_id',
          'pic_map.target_type',
          'pic_map.status',
          'pic_map.assigned_at',
          'assessment.title as assessment_title',
          'assessment.assessment_date',
          'unit_bidang.nama as unit_nama',
          'unit_bidang.kode as unit_kode',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'parameter.kode as parameter_kode',
          'parameter.nama as parameter_nama',
          'aspect.kode as aspect_kode',
          'aspect.nama as aspect_nama',
          'kka.kode as kka_kode',
          'kka.nama as kka_nama',
          this.db.raw('COALESCE(responses.total_responses, 0) as total_responses'),
          this.db.raw('COALESCE(evidence_counts.total_evidence, 0) as total_evidence')
        )
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .leftJoin('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .leftJoin('factor', function() {
          this.on('pic_map.target_id', '=', 'factor.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['factor']));
        })
        .leftJoin('parameter', function() {
          this.on('pic_map.target_id', '=', 'parameter.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['parameter']))
            .orOn('factor.parameter_id', '=', 'parameter.id');
        })
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .leftJoin(
          this.db('response')
            .select('factor_id')
            .count({ total_responses: '*' })
            .groupBy('factor_id')
            .as('responses'),
          function() {
            this.on('responses.factor_id', '=', 'factor.id');
          }
        )
        .leftJoin(
          this.db('evidence')
            .select('target_id')
            .count({ total_evidence: '*' })
            .groupBy('target_id')
            .as('evidence_counts'),
          function() {
            this.on('evidence_counts.target_id', '=', 'factor.id');
          }
        )
        .whereExists(function() {
          this.select('*')
            .from('users')
            .where('users.id', userId)
            .andWhere('users.unit_bidang_id', '=', this.ref('pic_map.unit_bidang_id'));
        })
        .orderBy('assessment.assessment_date', 'desc')
        .orderBy('kka.kode')
        .orderBy('aspect.kode')
        .orderBy('parameter.kode')
        .orderBy('factor.kode');

      return assignments;
    } catch (error) {
      logger.error('Error in getAOISummary:', error);
      throw error;
    }
  }

  async getAOIDetail(assessmentId, unitBidangId) {
    try {
      const assignments = await this.db('pic_map')
        .select(
          'pic_map.id',
          'pic_map.assessment_id',
          'pic_map.target_id',
          'pic_map.target_type',
          'pic_map.status',
          'pic_map.assigned_at',
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
          'kka.nama as kka_nama',
          this.db.raw('COALESCE(responses.total_responses, 0) as total_responses'),
          this.db.raw('COALESCE(evidence_counts.total_evidence, 0) as total_evidence')
        )
        .leftJoin('factor', function() {
          this.on('pic_map.target_id', '=', 'factor.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['factor']));
        })
        .leftJoin('parameter', function() {
          this.on('pic_map.target_id', '=', 'parameter.id')
            .andOn('pic_map.target_type', '=', this.db.raw('?', ['parameter']))
            .orOn('factor.parameter_id', '=', 'parameter.id');
        })
        .leftJoin('aspect', 'parameter.aspect_id', 'aspect.id')
        .leftJoin('kka', 'aspect.kka_id', 'kka.id')
        .leftJoin(
          this.db('response')
            .select('factor_id')
            .count({ total_responses: '*' })
            .where('assessment_id', assessmentId)
            .groupBy('factor_id')
            .as('responses'),
          function() {
            this.on('responses.factor_id', '=', 'factor.id');
          }
        )
        .leftJoin(
          this.db('evidence')
            .select('target_id')
            .count({ total_evidence: '*' })
            .where('assessment_id', assessmentId)
            .groupBy('target_id')
            .as('evidence_counts'),
          function() {
            this.on('evidence_counts.target_id', '=', 'factor.id');
          }
        )
        .where('pic_map.assessment_id', assessmentId)
        .where('pic_map.unit_bidang_id', unitBidangId)
        .orderBy('kka.kode')
        .orderBy('aspect.kode')
        .orderBy('parameter.kode')
        .orderBy('factor.kode');

      return assignments;
    } catch (error) {
      logger.error('Error in getAOIDetail:', error);
      throw error;
    }
  }

  async _canAccessAssessment(user, assessmentId) {
    if (!assessmentId) return false;

    if (user.role === 'admin') return true;

    const assignment = await this.db('assessment')
      .select('assessment.id')
      .leftJoin('pic_map', function() {
        this.on('pic_map.assessment_id', '=', 'assessment.id')
          .andOn('pic_map.target_type', '=', this.db.raw('?', ['factor']));
      })
      .where('assessment.id', assessmentId)
      .where(builder => {
        builder
          .where('assessment.created_by', user.id)
          .orWhere('assessment.assessor_id', user.id)
          .orWhere('pic_map.pic_user_id', user.id)
          .orWhere('pic_map.unit_bidang_id', user.unit_bidang_id || null);
      })
      .first();

    return Boolean(assignment);
  }

  async _canAccessAOI(user, assessmentId, aoiId) {
    if (user.role === 'admin') return true;

    const assignment = await this.db('pic_map')
      .select('pic_map.id')
      .where('pic_map.assessment_id', assessmentId)
      .where(builder => {
        builder
          .where('pic_map.target_type', 'aoi')
          .andWhere('pic_map.target_id', aoiId)
          .andWhere(inner => {
            inner
              .where('pic_map.pic_user_id', user.id)
              .orWhere('pic_map.unit_bidang_id', user.unit_bidang_id || null);
          });
      })
      .first();

    if (assignment) {
      return true;
    }

    return this._canAccessAssessment(user, assessmentId);
  }
}

module.exports = new AOIService();

