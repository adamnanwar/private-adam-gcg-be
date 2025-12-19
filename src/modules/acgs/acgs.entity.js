/**
 * ACGS Entity
 */

class AcgsTemplate {
  constructor(data) {
    this.id = data.id;
    this.kode = data.kode;
    this.parent_kode = data.parent_kode;
    this.level = data.level;
    this.nama = data.nama;
    this.sheet_type = data.sheet_type;
    this.bobot = data.bobot;
    this.sort = data.sort;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new AcgsTemplate(data);
  }
}

class AcgsAssessment {
  constructor(data) {
    this.id = data.id;
    this.assessment_id = data.assessment_id;
    this.title = data.title;
    this.assessment_year = data.assessment_year;
    this.status = data.status;
    this.overall_score = data.overall_score;
    this.level_achieved = data.level_achieved;
    this.created_by = data.created_by;
    this.updated_by = data.updated_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.created_by_name = data.created_by_name;
    this.updated_by_name = data.updated_by_name;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new AcgsAssessment(data);
  }
}

class AcgsResponse {
  constructor(data) {
    this.id = data.id;
    this.acgs_assessment_id = data.acgs_assessment_id;
    this.template_id = data.template_id;
    this.answer = data.answer;
    this.referensi_panduan = data.referensi_panduan;
    this.implementasi_bukti = data.implementasi_bukti;
    this.link_dokumen = data.link_dokumen;
    this.score = data.score;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.kode = data.kode;
    this.nama = data.nama;
    this.level = data.level;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new AcgsResponse(data);
  }
}

class AcgsQuestionHeader {
  constructor(data) {
    this.id = data.id;
    this.acgs_assessment_id = data.acgs_assessment_id;
    this.acgs_section_id = data.acgs_section_id;
    this.acgs_parameter_id = data.acgs_parameter_id;
    this.kode = data.kode;
    this.nama = data.nama;
    this.sort = data.sort;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.questions = data.questions || [];
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new AcgsQuestionHeader(data);
  }
}

const ACGS_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

module.exports = {
  AcgsTemplate,
  AcgsAssessment,
  AcgsResponse,
  AcgsQuestionHeader,
  ACGS_STATUS
};
