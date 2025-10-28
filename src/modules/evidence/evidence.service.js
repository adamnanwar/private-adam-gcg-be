const { getConnection } = require('../../config/database');
const logger = require('../../utils/logger-simple');
const { randomUUID } = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/evidence');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `evidence-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Office documents are allowed'));
    }
  }
});

class EvidenceService {
  constructor() {
    this.db = getConnection();
    this.upload = upload;
  }

  async uploadEvidence(assignmentId, file, note, userId) {
    try {
      // Verify assignment belongs to user
      const assignment = await this.db('pic_map')
        .leftJoin('factor', 'pic_map.factor_id', 'factor.id')
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .select(
          'pic_map.*',
          'factor.kode as factor_kode',
          'factor.nama as factor_nama',
          'assessment.title',
          'assessment.status'
        )
        .where('pic_map.id', assignmentId)
        .andWhere('pic_map.pic_user_id', userId)
        .first();

      if (!assignment) {
        throw new Error('Assignment not found or unauthorized');
      }

      if (assignment.status === 'completed') {
        throw new Error('Assessment already completed; evidence changes are locked');
      }

      // Create evidence record
      const evidence = {
        id: randomUUID(),
        target_type: 'factor',
        target_id: assignment.factor_id,
        kind: file.mimetype,
        uri: `/uploads/evidence/${file.filename}`,
        note: note || '',
        uploaded_by: userId,
        assignment_id: assignmentId,
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.db('evidence').insert(evidence);

      logger.info(`📎 Evidence uploaded for assignment ${assignmentId} by user ${userId}`);

      return {
        ...evidence,
        factor_kode: assignment.factor_kode,
        factor_nama: assignment.factor_nama,
        title: assignment.title
      };
    } catch (error) {
      logger.error('Error in uploadEvidence:', error);
      throw error;
    }
  }

  async getEvidenceByAssignment(assignmentId, userId) {
    try {
      // Verify assignment belongs to user
      const assignment = await this.db('pic_map')
        .where('id', assignmentId)
        .andWhere('pic_user_id', userId)
        .first();

      if (!assignment) {
        throw new Error('Assignment not found or unauthorized');
      }

      const evidence = await this.db('evidence')
        .leftJoin('users', 'evidence.uploaded_by', 'users.id')
        .select(
          'evidence.*',
          'users.name as uploaded_by_name',
          'users.email as uploaded_by_email'
        )
        .where('evidence.assignment_id', assignmentId)
        .orderBy('evidence.created_at', 'desc');

      return evidence;
    } catch (error) {
      logger.error('Error in getEvidenceByAssignment:', error);
      throw error;
    }
  }

  async deleteEvidence(evidenceId, userId) {
    try {
      const evidence = await this.db('evidence')
        .leftJoin('pic_map', 'evidence.assignment_id', 'pic_map.id')
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .select('evidence.*', 'assessment.status')
        .where('evidence.id', evidenceId)
        .andWhere('pic_map.pic_user_id', userId)
        .first();

      if (!evidence) {
        throw new Error('Evidence not found or unauthorized');
      }

      if (evidence.status === 'completed') {
        throw new Error('Assessment already completed; evidence changes are locked');
      }

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../../../uploads/evidence', path.basename(evidence.uri));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await this.db('evidence').where('id', evidenceId).del();

      logger.info(`🗑️ Evidence deleted: ${evidenceId} by user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error in deleteEvidence:', error);
      throw error;
    }
  }

  async getEvidenceByFactor(factorId) {
    try {
      const evidence = await this.db('evidence')
        .leftJoin('users', 'evidence.uploaded_by', 'users.id')
        .leftJoin('pic_map', 'evidence.assignment_id', 'pic_map.id')
        .leftJoin('assessment', 'pic_map.assessment_id', 'assessment.id')
        .select(
          'evidence.*',
          'users.name as uploaded_by_name',
          'users.email as uploaded_by_email',
          'assessment.title'
        )
        .where('evidence.target_id', factorId)
        .andWhere('evidence.target_type', 'factor')
        .orderBy('evidence.created_at', 'desc');

      return evidence;
    } catch (error) {
      logger.error('Error in getEvidenceByFactor:', error);
      throw error;
    }
  }

  // Get multer middleware
  getUploadMiddleware() {
    return this.upload.single('file');
  }
}

module.exports = new EvidenceService();