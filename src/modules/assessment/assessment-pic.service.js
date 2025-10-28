const db = require('../../config/database');
const logger = require('../../utils/logger-simple');
const emailService = require('../../services/email.service');

class AssessmentPICService {
  constructor() {
    this.db = db;
  }

  // Assign PIC to assessment factors
  async assignPICToAssessment(assessmentId, factorId, picUserId, unitBidang) {
    try {
      const [assignment] = await this.db('pic_map')
        .insert({
          id: require('uuid').v4(),
          assessment_id: assessmentId,
          target_type: 'factor',
          target_id: factorId,
          pic_user_id: picUserId,
          unit_bidang_id: unitBidang,
          status: 'assigned',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Send notification email to PIC
      await this.sendPICNotification(assessmentId, picUserId, 'assignment');

      logger.info(`PIC assigned to assessment ${assessmentId}, factor ${factorId}, user ${picUserId}`);
      return assignment;
    } catch (error) {
      logger.error('Error in assignPICToAssessment:', error);
      throw error;
    }
  }

  // Get PIC assignments for an assessment
  async getPICAssignments(assessmentId) {
    try {
      // Get all factors for this assessment and their PIC assignments
      const assignments = await this.db('pic_map')
        .join('factor', 'pic_map.target_id', 'factor.id')
        .join('parameter', 'factor.parameter_id', 'parameter.id')
        .join('aspect', 'parameter.aspect_id', 'aspect.id')
        .join('unit_bidang', 'pic_map.unit_bidang_id', 'unit_bidang.id')
        .where('pic_map.target_type', 'factor')
        .select(
          'pic_map.*',
          'factor.nama as factor_nama',
          'parameter.nama as parameter_nama',
          'aspect.nama as aspect_nama',
          'unit_bidang.nama as pic_name',
          'unit_bidang.kode as pic_kode'
        );

      return assignments;
    } catch (error) {
      logger.error('Error in getPICAssignments:', error);
      throw error;
    }
  }

  // Request revision for assessment
  async requestRevision(assessmentId, requestedBy, revisionReason) {
    try {
      const [revision] = await this.db('assessment_revisions')
        .insert({
          assessment_id: assessmentId,
          requested_by: requestedBy,
          note: revisionReason,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Update assessment status
      await this.db('assessment')
        .where('id', assessmentId)
        .update({ status: 'revision_required' });

      // Get PIC assignments and send notifications
      const picAssignments = await this.getPICAssignments(assessmentId);
      for (const assignment of picAssignments) {
        await this.sendPICNotification(assessmentId, assignment.pic_user_id, 'revision_request', revisionReason);
      }

      logger.info(`Revision requested for assessment ${assessmentId} by user ${requestedBy}`);
      return revision;
    } catch (error) {
      logger.error('Error in requestRevision:', error);
      throw error;
    }
  }

  // Complete revision
  async completeRevision(revisionId, assessmentId) {
    try {
      await this.db('assessment_revisions')
        .where('id', revisionId)
        .update({
          status: 'completed',
          updated_at: new Date()
        });

      // Update assessment status back to submitted
      await this.db('assessment')
        .where('id', assessmentId)
        .update({ status: 'submitted' });

      logger.info(`Revision completed for assessment ${assessmentId}`);
    } catch (error) {
      logger.error('Error in completeRevision:', error);
      throw error;
    }
  }

  // Send notification to PIC
  async sendPICNotification(assessmentId, picUserId, type, additionalData = null) {
    try {
      // Get assessment details
      const assessment = await this.db('assessment')
        .select('title', 'assessment_date')
        .where('id', assessmentId)
        .first();

      // Get PIC details
      const pic = await this.db('users')
        .select('name', 'email')
        .where('id', picUserId)
        .first();

      if (!pic || !pic.email) {
        logger.warn(`No email found for PIC user ${picUserId}`);
        return;
      }

      let subject, message;

      switch (type) {
        case 'assignment':
          subject = `Assignment Assessment GCG - ${assessment.title}`;
          message = `
            <h2>Assignment Assessment GCG</h2>
            <p>Halo ${pic.name},</p>
            <p>Anda telah ditugaskan sebagai PIC untuk assessment GCG dengan detail sebagai berikut:</p>
            <ul>
              <li><strong>Assessment Title:</strong> ${assessment.title}</li>
              <li><strong>Tanggal Assessment:</strong> ${new Date(assessment.assessment_date).toLocaleDateString('id-ID')}</li>
            </ul>
            <p>Silakan login ke sistem untuk mengisi assessment yang telah ditugaskan kepada Anda.</p>
            <p>Terima kasih.</p>
          `;
          break;

        case 'revision_request':
          subject = `Revisi Assessment GCG - ${assessment.title}`;
          message = `
            <h2>Permintaan Revisi Assessment GCG</h2>
            <p>Halo ${pic.name},</p>
            <p>Assessment GCG yang Anda kerjakan memerlukan revisi dengan alasan sebagai berikut:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #ff9800; margin: 15px 0;">
              <strong>Alasan Revisi:</strong><br>
              ${additionalData}
            </div>
            <p>Silakan login ke sistem untuk melakukan revisi sesuai dengan permintaan di atas.</p>
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
      await this.db('assessment_notification')
        .insert({
          assessment_id: assessmentId,
          user_id: picUserId,
          type: type,
          message: message,
          is_read: false
        });

      logger.info(`Notification sent to PIC ${pic.email} for assessment ${assessmentId}`);
    } catch (error) {
      logger.error('Error in sendPICNotification:', error);
      throw error;
    }
  }

  // Get notifications for user
  async getUserNotifications(userId, limit = 10, offset = 0) {
    try {
      const notifications = await this.db('assessment_notification')
        .select(
          'assessment_notification.*',
          'assessment.title'
        )
        .leftJoin('assessment', 'assessment_notification.assessment_id', 'assessment.id')
        .where('assessment_notification.user_id', userId)
        .orderBy('assessment_notification.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return notifications;
    } catch (error) {
      logger.error('Error in getUserNotifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    try {
      await this.db('assessment_notification')
        .where('id', notificationId)
        .where('user_id', userId)
        .update({ is_read: true });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  }
}

module.exports = new AssessmentPICService();
