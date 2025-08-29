require('dotenv').config();
const express = require('express');
const { testConnection } = require('./config/database');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'success',
      message: 'Server is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Server health check failed'
    });
  }
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

// Remove error handler temporarily
// server.on('error', (error) => {
//   logger.error('Server error:', error);
//   process.exit(1);
// });

module.exports = app;

