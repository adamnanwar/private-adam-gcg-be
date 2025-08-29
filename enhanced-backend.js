require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Enhanced backend is running',
    timestamp: new Date().toISOString()
  });
});

// Test API endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Mock Data Unit endpoints
app.get('/api/v1/data-units', (req, res) => {
  res.json({
    status: 'success',
    data: [
      { id: '1', kode: 'KSPI', nama: 'Kepala Satuan Pengawasan Internal', deskripsi: 'PIC untuk KSPI' },
      { id: '2', kode: 'SEKPER', nama: 'Sekretaris Perusahaan', deskripsi: 'PIC untuk Sekretaris Perusahaan' },
      { id: '3', kode: 'VP RENKAN', nama: 'Vice President Rencana dan Pengembangan', deskripsi: 'PIC untuk VP Rencana dan Pengembangan' }
    ]
  });
});

// Mock Assessment endpoints
app.get('/api/v1/assessments', (req, res) => {
  res.json({
    status: 'success',
    data: [
      { 
        id: '1', 
        organization_name: 'Test Assessment 1', 
        assessment_date: '2024-01-01',
        status: 'draft'
      }
    ]
  });
});

app.post('/api/v1/assessments', (req, res) => {
  console.log('Creating assessment:', req.body);
  res.json({
    status: 'success',
    message: 'Assessment created successfully',
    data: { id: 'new-id-' + Date.now(), ...req.body }
  });
});

// Mock AOI endpoints
app.get('/api/v1/aoi', (req, res) => {
  res.json({
    status: 'success',
    data: [
      {
        id: '1',
        assessment_id: '1',
        target_type: 'assessment_factor',
        target_id: 'factor-1',
        recommendation: 'Test recommendation',
        due_date: '2024-12-31',
        status: 'open'
      }
    ]
  });
});

app.post('/api/v1/aoi', (req, res) => {
  console.log('Creating AOI:', req.body);
  res.json({
    status: 'success',
    message: 'AOI created successfully',
    data: { id: 'aoi-' + Date.now(), ...req.body }
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Enhanced backend running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Test API: http://localhost:${PORT}/api/v1/test`);
  console.log(`✅ Data Units: http://localhost:${PORT}/api/v1/data-units`);
  console.log(`✅ Assessments: http://localhost:${PORT}/api/v1/assessments`);
  console.log(`✅ AOI: http://localhost:${PORT}/api/v1/aoi`);
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

