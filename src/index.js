require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection, closeConnection, getConnection } = require('./config/database');
const logger = require('./utils/logger-simple');
const authRoutes = require('./modules/auth/routes');
const dictionaryRoutes = require('./modules/dictionary/routes');
const assessmentRoutes = require('./modules/assessment/routes');
const aoiRoutes = require('./modules/aoi/routes');
const userRoutes = require('./modules/user/routes');
const dataUnitRoutes = require('./modules/data-unit/routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'success',
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Server health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Get database connection
const db = getConnection();

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dictionary', dictionaryRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/aoi', aoiRoutes(db));
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/data-units', dataUnitRoutes(db));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: error.details
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  }
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeConnection();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, async () => {
  try {
    await testConnection();
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
});

server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

module.exports = app;
