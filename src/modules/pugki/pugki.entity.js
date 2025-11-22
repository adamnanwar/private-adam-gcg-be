/**
 * PUGKI Entity
 */

class PugkiTemplate {
  constructor(data) {
    this.id = data.id;
    this.kode = data.kode;
    this.parent_kode = data.parent_kode;
    this.level = data.level;
    this.nama = data.nama;
    this.jumlah_rekomendasi = data.jumlah_rekomendasi;
    this.sort = data.sort;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new PugkiTemplate(data);
  }
}

class PugkiAssessment {
  constructor(data) {
    this.id = data.id;
    this.assessment_id = data.assessment_id;
    this.title = data.title;
    this.assessment_year = data.assessment_year;
    this.status = data.status;
    this.overall_score = data.overall_score;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Additional fields from joins
    this.created_by_name = data.created_by_name;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new PugkiAssessment(data);
  }
}

class PugkiResponse {
  constructor(data) {
    this.id = data.id;
    this.pugki_assessment_id = data.pugki_assessment_id;
    this.template_id = data.template_id;
    this.comply_explain = data.comply_explain;
    this.referensi = data.referensi;
    this.score = data.score;
    this.comment = data.comment;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Template fields from joins
    this.kode = data.kode;
    this.nama = data.nama;
    this.level = data.level;
  }

  static fromDatabase(data) {
    if (!data) return null;
    return new PugkiResponse(data);
  }
}

const PUGKI_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

module.exports = {
  PugkiTemplate,
  PugkiAssessment,
  PugkiResponse,
  PUGKI_STATUS
};
