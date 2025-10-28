/**
 * Evidence Entity
 * Defines the data structures for Evidence uploads
 */

class Evidence {
  constructor(data) {
    this.id = data.id;
    this.target_type = data.target_type; // 'aspect', 'parameter', 'factor', 'aoi'
    this.target_id = data.target_id;
    this.kind = data.kind; // 'document', 'image', 'other'
    this.uri = data.uri; // File path or URL
    this.original_name = data.original_name; // Original filename
    this.file_size = data.file_size; // File size in bytes
    this.mime_type = data.mime_type; // MIME type
    this.note = data.note; // Additional notes
    this.uploaded_by = data.uploaded_by; // User ID who uploaded
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Additional fields from joins
    this.uploaded_by_name = data.uploaded_by_name;
    this.uploaded_by_email = data.uploaded_by_email;
  }

  static fromDatabase(data) {
    return new Evidence(data);
  }

  toJSON() {
    return {
      id: this.id,
      target_type: this.target_type,
      target_id: this.target_id,
      kind: this.kind,
      uri: this.uri,
      original_name: this.original_name,
      file_size: this.file_size,
      mime_type: this.mime_type,
      note: this.note,
      uploaded_by: this.uploaded_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      uploaded_by_name: this.uploaded_by_name,
      uploaded_by_email: this.uploaded_by_email
    };
  }

  validate() {
    const errors = [];

    if (!this.target_type) {
      errors.push('Target type is required');
    } else if (!['aspect', 'parameter', 'factor', 'aoi'].includes(this.target_type)) {
      errors.push('Invalid target type');
    }

    if (!this.target_id) {
      errors.push('Target ID is required');
    }

    if (!this.uri) {
      errors.push('File URI is required');
    }

    if (!this.original_name) {
      errors.push('Original filename is required');
    }

    if (!this.mime_type) {
      errors.push('MIME type is required');
    }

    if (!this.uploaded_by) {
      errors.push('Uploader ID is required');
    }

    return errors;
  }

  getFileExtension() {
    if (!this.original_name) return '';
    return this.original_name.split('.').pop().toLowerCase();
  }

  isImage() {
    return this.mime_type && this.mime_type.startsWith('image/');
  }

  isDocument() {
    const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    return this.mime_type && docTypes.includes(this.mime_type);
  }

  getFileSizeInMB() {
    return (this.file_size / (1024 * 1024)).toFixed(2);
  }
}

// Evidence Kind Enum
const EVIDENCE_KIND = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  OTHER: 'other'
};

// Target Type Enum
const TARGET_TYPE = {
  ASPECT: 'aspect',
  PARAMETER: 'parameter',
  FACTOR: 'factor',
  AOI: 'aoi'
};

// DTOs for API operations
const createEvidenceDto = {
  target_type: 'string',
  target_id: 'string',
  kind: 'string',
  note: 'string'
};

const updateEvidenceDto = {
  note: 'string'
};

const bulkEvidenceDto = {
  target_type: 'string',
  target_id: 'string',
  evidences: 'array' // Array of { kind, note }
};

module.exports = {
  Evidence,
  EVIDENCE_KIND,
  TARGET_TYPE,
  createEvidenceDto,
  updateEvidenceDto,
  bulkEvidenceDto
};
