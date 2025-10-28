const { z } = require('zod');

class EvidenceEnhancedService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Upload evidence for KKA
   */
  async uploadKkaEvidence(kkaId, fileData, uploadedBy) {
    // Verify KKA exists
    const kka = await this.db('kka').where('id', kkaId).first();
    if (!kka) {
      throw new Error('KKA not found');
    }

    const [evidence] = await this.db('evidence')
      .insert({
        target_type: 'kka',
        target_id: kkaId,
        filename: fileData.filename,
        original_filename: fileData.originalFilename,
        file_path: fileData.filePath,
        mime_type: fileData.mimeType,
        file_size: fileData.fileSize,
        note: fileData.note,
        uploaded_by: uploadedBy
      })
      .returning('*');

    return this.mapEvidenceData(evidence);
  }

  /**
   * Upload evidence for AOI
   */
  async uploadAoiEvidence(aoiId, fileData, uploadedBy) {
    // Verify AOI exists
    const aoi = await this.db('aoi').where('id', aoiId).first();
    if (!aoi) {
      throw new Error('AOI not found');
    }

    const [evidence] = await this.db('evidence')
      .insert({
        target_type: 'aoi',
        target_id: aoiId,
        filename: fileData.filename,
        original_filename: fileData.originalFilename,
        file_path: fileData.filePath,
        mime_type: fileData.mimeType,
        file_size: fileData.fileSize,
        note: fileData.note,
        uploaded_by: uploadedBy
      })
      .returning('*');

    return this.mapEvidenceData(evidence);
  }

  /**
   * Get evidence by target
   */
  async getEvidenceByTarget(targetType, targetId) {
    const evidence = await this.db('evidence')
      .where({ target_type: targetType, target_id: targetId })
      .orderBy('created_at', 'desc');

    return evidence.map(this.mapEvidenceData);
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(evidenceId, userId) {
    const evidence = await this.db('evidence')
      .where({ id: evidenceId, uploaded_by: userId })
      .first();

    if (!evidence) {
      throw new Error('Evidence not found or access denied');
    }

    await this.db('evidence').where('id', evidenceId).del();
  }

  mapEvidenceData(evidence) {
    return {
      id: evidence.id,
      targetType: evidence.target_type,
      targetId: evidence.target_id,
      filename: evidence.filename,
      originalFilename: evidence.original_filename,
      filePath: evidence.file_path,
      mimeType: evidence.mime_type,
      fileSize: evidence.file_size,
      note: evidence.note,
      uploadedBy: evidence.uploaded_by,
      createdAt: evidence.created_at,
      updatedAt: evidence.updated_at
    };
  }
}

// Validation schemas
const UploadKkaEvidenceSchema = z.object({
  kkaId: z.string().uuid(),
  fileData: z.object({
    filename: z.string().min(1),
    originalFilename: z.string().min(1),
    filePath: z.string().min(1),
    mimeType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    note: z.string().optional()
  }),
  uploadedBy: z.string().uuid()
});

const UploadAoiEvidenceSchema = z.object({
  aoiId: z.string().uuid(),
  fileData: z.object({
    filename: z.string().min(1),
    originalFilename: z.string().min(1),
    filePath: z.string().min(1),
    mimeType: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    note: z.string().optional()
  }),
  uploadedBy: z.string().uuid()
});

module.exports = {
  EvidenceEnhancedService,
  UploadKkaEvidenceSchema,
  UploadAoiEvidenceSchema
};
