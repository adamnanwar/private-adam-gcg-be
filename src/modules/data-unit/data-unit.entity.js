/**
 * Data Unit Entity
 */
class DataUnit {
  constructor(data) {
    this.id = data.id;
    this.kode = data.kode;
    this.nama = data.nama;
    this.deskripsi = data.deskripsi;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromDatabase(data) {
    return new DataUnit(data);
  }

  toDatabase() {
    return {
      id: this.id,
      kode: this.kode,
      nama: this.nama,
      deskripsi: this.deskripsi,
      is_active: this.is_active
    };
  }

  toResponse() {
    return {
      id: this.id,
      kode: this.kode,
      nama: this.nama,
      deskripsi: this.deskripsi,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = DataUnit;






