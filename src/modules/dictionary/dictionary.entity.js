/**
 * Dictionary Entity Definitions
 * Defines the data structures for KKA, Aspect, Parameter, and Factor
 */

// KKA (Komponen Kunci Audit) Entity
const kkaEntity = {
  id: 'uuid',
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  weight: 'number',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Aspect Entity
const aspectEntity = {
  id: 'uuid',
  kka_id: 'uuid', // Foreign key to KKA
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Parameter Entity
const parameterEntity = {
  id: 'uuid',
  aspect_id: 'uuid', // Foreign key to Aspect
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Factor Entity
const factorEntity = {
  id: 'uuid',
  parameter_id: 'uuid', // Foreign key to Parameter
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  max_score: 'integer',
  sort: 'integer',
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// DTOs for API operations
const createKKADto = {
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  weight: 'number'
};

const updateKKADto = {
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  weight: 'number'
};

const createAspectDto = {
  kka_id: 'uuid',
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer'
};

const updateAspectDto = {
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer'
};

const createParameterDto = {
  aspect_id: 'uuid',
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer'
};

const updateParameterDto = {
  kode: 'string',
  nama: 'string',
  weight: 'number',
  sort: 'integer'
};

const createFactorDto = {
  parameter_id: 'uuid',
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  max_score: 'integer',
  sort: 'integer'
};

const updateFactorDto = {
  kode: 'string',
  nama: 'string',
  deskripsi: 'string',
  max_score: 'integer',
  sort: 'integer'
};

module.exports = {
  kkaEntity,
  aspectEntity,
  parameterEntity,
  factorEntity,
  createKKADto,
  updateKKADto,
  createAspectDto,
  updateAspectDto,
  createParameterDto,
  updateParameterDto,
  createFactorDto,
  updateFactorDto
};

