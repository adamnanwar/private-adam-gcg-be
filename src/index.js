const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Import database
const knex = require('knex');
const knexConfig = require('../knexfile');

// Import routes
const { createAssessmentScoringRoutes } = require('./modules/assessment/assessment-scoring.routes');
const { createEvidenceEnhancedRoutes } = require('./modules/evidence/evidence-enhanced.routes');
const { createFactorEnhancedRoutes } = require('./modules/factor/factor-enhanced.routes');

// Import existing routes
const authRoutes = require('./modules/auth/routes');
const assessmentRoutes = require('./modules/assessment/routes');
const picAssignmentRoutes = require('./modules/assessment/pic-assignment.routes');
const evidenceRoutes = require('./modules/evidence/evidence.routes');
const userRoutes = require('./modules/user/user.routes');
const dataUnitRoutes = require('./modules/data-unit/routes');
const dictionaryRoutes = require('./modules/dictionary/routes');
const picRoutes = require('./modules/pic/pic.routes');
const unitBidangRoutes = require('./modules/unit-bidang/unit-bidang.routes');
const aoiRoutes = require('./modules/aoi/aoi.routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const sk16Routes = require('./modules/master-data/sk16.routes');
const settingsRoutes = require('./modules/settings/routes');
const deletedDataRoutes = require('./modules/deleted-data/deleted-data.routes');
const pugkiRoutes = require('./modules/pugki/pugki.routes');
const acgsRoutes = require('./modules/acgs/acgs.routes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9001;

// Initialize database
const db = knex(knexConfig[process.env.NODE_ENV || 'production']);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 for dev, 100 for prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Static files - serve both at /uploads and /api/uploads for proxy compatibility
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assessments', createAssessmentScoringRoutes(db));
app.use('/api/assessments', picAssignmentRoutes);
app.use('/api/pic-assignments', picAssignmentRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/evidence', createEvidenceEnhancedRoutes(db));
app.use('/api/users', userRoutes);
app.use('/api/data-units', dataUnitRoutes(db));
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/pic', picRoutes);
app.use('/api/unit-bidang', unitBidangRoutes);
app.use('/api/aoi', aoiRoutes);
app.use('/api/factors', createFactorEnhancedRoutes(db));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email', require('./modules/email/email.routes'));
app.use('/api/master-data/sk16', sk16Routes);
app.use('/api/settings', settingsRoutes);
app.use('/api/deleted-data', deletedDataRoutes);
app.use('/api/pugki', pugkiRoutes(db));
app.use('/api/acgs', acgsRoutes(db));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;// trigger restart
