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

  async uploadEvidenceGeneric(targetType, targetId, file, note, userId, assessmentId) {
    try {
      // Map target_type to database constraint values
      // Database only allows 'kka' or 'aoi', so map accordingly
      let dbTargetType = targetType;
      let target;

      switch (targetType) {
        case 'factor':
          target = await this.db('factor').where('id', targetId).first();
          if (!target) throw new Error('Factor not found');
          // Map 'factor' to 'kka' for database constraint
          dbTargetType = 'kka';
          break;
        case 'parameter':
          target = await this.db('parameter').where('id', targetId).first();
          if (!target) throw new Error('Parameter not found');
          // Map 'parameter' to 'kka' for database constraint
          dbTargetType = 'kka';
          break;
        case 'aoi':
          target = await this.db('aoi').where('id', targetId).first();
          if (!target) throw new Error('AOI not found');
          dbTargetType = 'aoi';
          break;
        default:
          throw new Error('Invalid target type');
      }

      // Create evidence record with correct database column names
      // Based on actual table structure:
      // - filename (stored filename)
      // - original_filename (original file name)
      // - file_path (path to file)
      // - mime_type (file MIME type)
      // - file_size (file size)
      // - note (description/note)
      // - uploaded_by (user ID)
      // - assessment_id (REQUIRED for querying)
      const evidence = {
        id: randomUUID(),
        target_type: dbTargetType,  // Use mapped value: 'kka' or 'aoi'
        target_id: targetId,
        assessment_id: assessmentId,          // CRITICAL: Link to assessment
        filename: file.filename,              // Stored filename
        original_filename: file.originalname, // Original filename
        file_path: file.path,                 // File path
        mime_type: file.mimetype,             // MIME type
        file_size: file.size,                 // File size
        note: note || '',                     // Note/description
        uploaded_by: userId,                  // Uploader user ID
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.db('evidence').insert(evidence);

      logger.info(`📎 Evidence uploaded for ${targetType} ${targetId} by user ${userId}`);

      return evidence;
    } catch (error) {
      logger.error('Error in uploadEvidenceGeneric:', error);
      throw error;
    }
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

      if (assignment.status === 'selesai') {
        throw new Error('Assessment already completed; evidence changes are locked');
      }

      // Create evidence record with correct database column names
      const evidence = {
        id: randomUUID(),
        target_type: 'kka',  // Use 'kka' instead of 'factor' for database constraint
        target_id: assignment.factor_id,
        filename: file.filename,              // Stored filename
        original_filename: file.originalname, // Original filename
        file_path: file.path,                 // File path
        mime_type: file.mimetype,             // MIME type
        file_size: file.size,                 // File size
        note: note || '',                     // Note/description
        uploaded_by: userId,                  // Uploader user ID
        assessment_id: assignment.assessment_id, // Link to assessment
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
      // Get evidence first
      const evidence = await this.db('evidence')
        .where('id', evidenceId)
        .first();

      if (!evidence) {
        throw new Error('Evidence not found');
      }

      // Check authorization - user must be either the uploader or have admin role
      // For now, we'll allow the uploader to delete their own evidence
      if (evidence.uploaded_by !== userId) {
        // If there's an assignment_id, check if user is the assignee
        if (evidence.assignment_id) {
          const assignment = await this.db('pic_map')
            .where('id', evidence.assignment_id)
            .andWhere('pic_user_id', userId)
            .first();

          if (!assignment) {
            throw new Error('Evidence not found or unauthorized');
          }

          // Check if assessment is completed
          const assessment = await this.db('assessment')
            .where('id', assignment.assessment_id)
            .first();

          if (assessment && assessment.status === 'selesai') {
            throw new Error('Assessment already completed; evidence changes are locked');
          }
        } else {
          throw new Error('Evidence not found or unauthorized');
        }
      }

      // Delete file from filesystem
      if (evidence.filename) {
        const filePath = path.join(__dirname, '../../../uploads/evidence', evidence.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
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