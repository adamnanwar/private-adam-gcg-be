# 🗄️ Database Setup untuk GCG Maturity Assessment

## 📋 Overview
Database ini telah diupdate untuk menambahkan field KKA (Kriteria Kunci Assessment) ke tabel assessment.

## 🔄 Perubahan Struktur Database

### Tabel Assessment - Kolom Baru:
- `kka_number` (VARCHAR) - Nomor KKA (contoh: KKA-001, KKA-002)
- `kka_name` (VARCHAR) - Nama KKA (contoh: Tata Kelola Perusahaan)

### Struktur Lengkap:
```sql
CREATE TABLE assessment (
  id UUID PRIMARY KEY,
  organization_name VARCHAR NOT NULL,
  assessment_date DATE NOT NULL,
  assessor_id UUID REFERENCES users(id),
  status ENUM(...),
  kka_number VARCHAR NOT NULL DEFAULT 'KKA-001',
  kka_name VARCHAR NOT NULL DEFAULT 'Tata Kelola Perusahaan',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🚀 Setup Database

### 1. Jalankan Migration
```bash
cd backend
npx knex migrate:latest
```

### 2. Update Data Assessment
```bash
PGPASSWORD=admin123 psql -h localhost -U postgres -d gcg -f database/update_assessment_data.sql
```

### 3. Atau Gunakan Script Otomatis

#### Windows:
```cmd
cd backend
scripts\setup_database.bat
```

#### Linux/Mac:
```bash
cd backend
chmod +x scripts/setup_database.sh
./scripts/setup_database.sh
```

## 📊 Data Sample

### Assessment dengan KKA:
- **KKA-001**: Tata Kelola Perusahaan
- **KKA-002**: Pengendalian Internal  
- **KKA-003**: Manajemen Risiko
- **KKA-004**: Kepatuhan
- **KKA-005**: Teknologi Informasi

### Contoh Record:
```sql
INSERT INTO assessment (
  kka_number, 
  kka_name, 
  organization_name, 
  assessment_date, 
  status
) VALUES (
  'KKA-001',
  'Tata Kelola Perusahaan',
  'PT GCG Indonesia',
  '2025-02-20',
  'selesai'
);
```

## 🔍 Verifikasi Setup

### 1. Cek Struktur Tabel:
```sql
\d assessment
```

### 2. Cek Data:
```sql
SELECT 
  kka_number,
  kka_name,
  organization_name,
  assessment_date,
  status
FROM assessment
ORDER BY assessment_date DESC;
```

### 3. Cek Index:
```sql
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'assessment';
```

## 🐛 Troubleshooting

### Error: "column kka_number does not exist"
- Pastikan migration sudah dijalankan: `npx knex migrate:latest`

### Error: "permission denied"
- Pastikan PostgreSQL berjalan dan user `postgres` memiliki akses

### Error: "database gcg does not exist"
- Buat database terlebih dahulu: `createdb -U postgres gcg`

## 📱 Frontend Integration

Setelah database setup, frontend akan menampilkan:
1. **Kolom NO** - Nomor urut
2. **Kolom NOMOR KKA** - KKA-001, KKA-002, dst
3. **Kolom NAMA KKA** - Nama lengkap KKA
4. **Kolom TANGGAL ASSESSMENT** - Tanggal assessment
5. **Kolom STATUS** - Status assessment
6. **Kolom AKSI** - View, Edit, Delete

## 🔄 Rollback (Jika Perlu)

### Hapus Kolom KKA:
```bash
npx knex migrate:rollback
```

### Atau Manual:
```sql
ALTER TABLE assessment DROP COLUMN kka_number;
ALTER TABLE assessment DROP COLUMN kka_name;
```

## 📞 Support
Jika ada masalah, pastikan:
1. PostgreSQL berjalan di port 5432
2. Database `gcg` sudah dibuat
3. User `postgres` dengan password `admin123` sudah ada
4. Migration file ada di `src/database/migrations/`
