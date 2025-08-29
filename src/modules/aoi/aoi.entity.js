/**
 * Area of Improvement (AOI) Entity
 * Defines the data structures for AOI with assessment_* tables schema
 */

class AOI {
  constructor(data) {
    this.id = data.id;
    this.assessment_id = data.assessment_id;
    this.target_type = data.target_type; // 'assessment_aspect', 'assessment_parameter', 'assessment_factor'
    this.target_id = data.target_id;
    this.recommendation = data.recommendation;
    this.due_date = data.due_date;
    this.status = data.status; // 'open', 'in_progress', 'completed', 'overdue'
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Additional fields from joins
    this.created_by_name = data.created_by_name;
    this.assessment_name = data.assessment_name;
    this.pic_name = data.pic_name;
    this.pic_email = data.pic_email;
  }

  static fromDatabase(data) {
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
      pic_name: this.pic_name,
      pic_email: this.pic_email
    };
  }

  validate() {
    const errors = [];

    if (!this.assessment_id) {
      errors.push('Assessment ID is required');
    }

    if (!this.target_type) {
      errors.push('Target type is required');
    } else if (!['assessment_aspect', 'assessment_parameter', 'assessment_factor'].includes(this.target_type)) {
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

    if (this.status && !['open', 'in_progress', 'completed', 'overdue'].includes(this.status)) {
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
      'open': ['in_progress', 'completed'],
      'in_progress': ['completed', 'overdue'],
      'completed': [],
      'overdue': ['in_progress', 'completed']
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }
}

// AOI Status Enum
const AOI_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue'
};

// Target Type Enum
const TARGET_TYPE = {
  ASSESSMENT_ASPECT: 'assessment_aspect',
  ASSESSMENT_PARAMETER: 'assessment_parameter',
  ASSESSMENT_FACTOR: 'assessment_factor'
};

module.exports = {
  AOI,
  AOI_STATUS,
  TARGET_TYPE
};

