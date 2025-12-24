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
    
    // Mapping from input target_type values to database-compatible values
    // Database CHECK constraint only allows: 'kka', 'aoi', 'factor'
    this.targetTypeMapping = {
      'factor': 'factor',
      'parameter': 'factor',  // parameter maps to factor
      'kka': 'kka',
      'aoi': 'aoi',
      'pugki_rekomendasi': 'aoi',  // AOI-related
      'acgs_question': 'aoi',       // AOI-related
      'aoi_recommendation': 'aoi'   // AOI-related
    };
  }
  
  // Map target_type to database-compatible value
  mapTargetType(targetType) {
    return this.targetTypeMapping[targetType] || targetType;
  }

  async uploadEvidenceGeneric(targetType, targetId, file, note, userId, assessmentId) {
    try {
      // Validate target exists based on type
      let target;

      switch (targetType) {
        case 'factor':
          target = await this.db('factor').where('id', targetId).first();
          if (!target) throw new Error('Factor not found');
          break;
        case 'parameter':
          target = await this.db('parameter').where('id', targetId).first();
          if (!target) throw new Error('Parameter not found');
          break;
        case 'kka':
          target = await this.db('kka').where('id', targetId).first();
          if (!target) throw new Error('KKA not found');
          break;
        case 'aoi':
          target = await this.db('aoi').where('id', targetId).first();
          if (!target) throw new Error('AOI not found');
          break;
        case 'pugki_rekomendasi':
          target = await this.db('pugki_rekomendasi').where('id', targetId).first();
          if (!target) throw new Error('PUGKI Rekomendasi not found');
          break;
        case 'acgs_question':
          target = await this.db('acgs_question').where('id', targetId).first();
          if (!target) throw new Error('ACGS Question not found');
          break;
        case 'aoi_recommendation':
          target = await this.db('aoi_monitoring_recommendation').where('id', targetId).first();
          if (!target) {
            // Try to find by aoi_monitoring_id instead - maybe the recommendation doesn't exist yet
            // but the AOI monitoring does. This handles legacy AOI records created without recommendations.
            const aoiMonitoring = await this.db('aoi_monitoring').where('id', targetId).first();
            if (aoiMonitoring) {
              // AOI monitoring exists, allow upload to aoi type instead
              logger.warn(`AOI Recommendation ${targetId} not found, but AOI Monitoring exists. Switching to aoi type.`);
              targetType = 'aoi';
              target = aoiMonitoring;
            } else {
              throw new Error('AOI Recommendation not found');
            }
          }
          break;
        default:
          throw new Error('Invalid target type');
      }

      // Generate file URL path (relative to uploads folder)
      // Store as "evidence/filename.pdf" - frontend will prepend "/api/uploads/"
      const fileUrl = `evidence/${file.filename}`;

      // Check for duplicate evidence (same target_id, target_type, and original filename)
      // This prevents accidental double-uploads
      const dbTargetTypeForCheck = this.mapTargetType(targetType);
      const existingEvidence = await this.db('evidence')
        .where('target_id', targetId)
        .where('target_type', dbTargetTypeForCheck)
        .where('original_filename', file.originalname)
        .first();

      if (existingEvidence) {
        logger.warn(`⚠️ Duplicate evidence detected: ${file.originalname} already exists for ${targetType} ${targetId}`);
        // Delete the newly uploaded file since we won't be using it
        const uploadedFilePath = path.join(__dirname, '../../../uploads/evidence', file.filename);
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        // Return existing evidence instead of creating duplicate
        return { ...existingEvidence, original_target_type: targetType, duplicate: true };
      }

      // Detect which columns exist in the database and build evidence object accordingly
      // This handles both old schema (uri, kind, original_name) and new schema (file_path, filename, etc.)
      const evidenceId = randomUUID();
      
      // Map target_type to database-compatible value
      const dbTargetType = this.mapTargetType(targetType);
      logger.info(`Mapping target_type: ${targetType} -> ${dbTargetType}`);

      // Build evidence object with ONLY columns that exist in the database
      // Based on error logs, the actual schema has:
      // - id, target_type, target_id, filename, original_filename, file_path
      // - mime_type, file_size, note, uploaded_by, created_at, updated_at
      // - assessment_id (with FK constraint to assessment table)
      // Does NOT have: kind, uri, original_name
      
      const evidence = {
        id: evidenceId,
        target_type: dbTargetType,
        target_id: targetId,
        filename: file.filename,
        original_filename: file.originalname,
        file_path: fileUrl,
        mime_type: file.mimetype,
        file_size: file.size,
        note: note || '',
        uploaded_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Try to insert with assessment_id first (for SK16 assessments which have valid FK)
      // If FK constraint fails, try without assessment_id (for PUGKI/ACGS which use different tables)
      console.log(`[EVIDENCE DEBUG] Saving evidence with:`, {
        id: evidence.id,
        target_type: evidence.target_type,
        target_id: evidence.target_id,
        filename: evidence.filename,
        original_filename: evidence.original_filename
      });
      
      try {
        if (assessmentId) {
          await this.db('evidence').insert({ ...evidence, assessment_id: assessmentId });
          logger.info(`📎 Evidence uploaded (with assessment_id) for ${targetType} ${targetId} by user ${userId}`);
          console.log(`[EVIDENCE DEBUG] Evidence saved successfully with ID: ${evidence.id}`);
        } else {
          await this.db('evidence').insert(evidence);
          logger.info(`📎 Evidence uploaded (no assessment_id) for ${targetType} ${targetId} by user ${userId}`);
        }
        return { ...evidence, assessment_id: assessmentId, original_target_type: targetType };
      } catch (insertError) {
        // If FK constraint violation on assessment_id, try without it
        if (insertError.message && insertError.message.includes('evidence_assessment_id_fkey')) {
          logger.warn('FK constraint on assessment_id, trying without it:', insertError.message);
          
          await this.db('evidence').insert(evidence);
          logger.info(`📎 Evidence uploaded (without assessment_id due to FK) for ${targetType} ${targetId} by user ${userId}`);
          return { ...evidence, original_target_type: targetType };
        }
        
        // If it's a column error, log and rethrow
        logger.error('Insert failed:', insertError.message);
        throw insertError;
      }
    } catch (error) {
      logger.error('Error in uploadEvidenceGeneric:', error);
      logger.error('Error details:', error.message, error.code, error.detail);
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

      // Generate file URL path
      // Store as "evidence/filename.pdf" - frontend will prepend "/api/uploads/"
      const fileUrl = `evidence/${file.filename}`;
      const evidenceId = randomUUID();

      // Use mapped target_type for database compatibility
      const dbTargetType = this.mapTargetType('factor');  // Maps to 'assessment_factor'
      
      // Build evidence object - use ONLY columns that exist in database
      const evidence = {
        id: evidenceId,
        target_type: dbTargetType,
        target_id: assignment.factor_id,
        filename: file.filename,
        original_filename: file.originalname,
        file_path: fileUrl,
        mime_type: file.mimetype,
        file_size: file.size,
        note: note || '',
        uploaded_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Try to insert with assessment_id first (SK16 assessments have valid FK)
      try {
        await this.db('evidence').insert({ ...evidence, assessment_id: assignment.assessment_id });
        logger.info(`📎 Evidence uploaded (with assessment_id) for assignment ${assignmentId} by user ${userId}`);
      } catch (insertError) {
        // If FK constraint violation, try without assessment_id
        if (insertError.message && insertError.message.includes('evidence_assessment_id_fkey')) {
          logger.warn('FK constraint on assessment_id in uploadEvidence, trying without it');
          await this.db('evidence').insert(evidence);
          logger.info(`📎 Evidence uploaded (without assessment_id) for assignment ${assignmentId} by user ${userId}`);
        } else {
          throw insertError;
        }
      }

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