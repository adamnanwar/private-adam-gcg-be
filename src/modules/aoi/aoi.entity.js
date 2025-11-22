/**
 * Area of Improvement (AOI) Entity
 * Defines the data structures for AOI with assessment_* tables schema
 */

class AOI {
  constructor(data) {
    this.id = data.id;
    this.assessment_id = data.assessment_id;
    this.target_type = data.target_type; // 'parameter', 'factor'
    this.target_id = data.target_id;
    this.recommendation = data.recommendation;
    this.due_date = data.due_date;
    this.status = data.status; // 'open', 'verifikasi', 'completed', 'overdue'
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Additional fields from joins
    this.created_by_name = data.created_by_name;
    this.assessment_name = data.assessment_name;
    this.pic_unit_name = data.pic_unit_name;
    this.pic_unit_code = data.pic_unit_code;
    this.pic_name = data.pic_name;
    this.pic_email = data.pic_email;
    
    // Evidence field for multiple document uploads
    this.evidence = data.evidence || [];
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new AOI(data);
  }

  toJSON() {
    return {
      id: this.id,
      assessment_id: this.assessment_id,
      target_type: this.target_type,
      target_id: this.target_id,
      recommendation: this.recommendation,
      due_date: this.due_date,
      status: this.status,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      created_by_name: this.created_by_name,
      assessment_name: this.assessment_name,
      pic_unit_name: this.pic_unit_name,
      pic_unit_code: this.pic_unit_code,
      pic_name: this.pic_name,
      pic_email: this.pic_email,
      evidence: this.evidence
    };
  }

  validate() {
    const errors = [];

    if (!this.assessment_id) {
      errors.push('Assessment ID is required');
    }

    if (!this.target_type) {
      errors.push('Target type is required');
    } else if (!['parameter', 'factor'].includes(this.target_type)) {
      errors.push('Invalid target type');
    }

    if (!this.target_id) {
      errors.push('Target ID is required');
    }

    if (!this.recommendation) {
      errors.push('Recommendation is required');
    }

    if (this.due_date && isNaN(Date.parse(this.due_date))) {
      errors.push('Invalid due date format');
    }

    if (this.status && !['open', 'verifikasi', 'completed', 'overdue'].includes(this.status)) {
      errors.push('Invalid status');
    }

    return errors;
  }

  isOverdue() {
    if (!this.due_date || this.status === 'completed') {
      return false;
    }
    return new Date(this.due_date) < new Date();
  }

  canTransitionTo(newStatus) {
    const validTransitions = {
      'open': ['verifikasi', 'completed'],
      'verifikasi': ['completed', 'overdue'],
      'completed': [],
      'overdue': ['verifikasi', 'completed']
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }
}

// AOI Status Enum
const AOI_STATUS = {
  OPEN: 'open',
  VERIFIKASI: 'verifikasi',
  COMPLETED: 'completed',
  OVERDUE: 'overdue'
};

// Target Type Enum
const TARGET_TYPE = {
  PARAMETER: 'parameter',
  FACTOR: 'factor'
};

module.exports = AOI;
module.exports.AOI_STATUS = AOI_STATUS;
module.exports.TARGET_TYPE = TARGET_TYPE;

