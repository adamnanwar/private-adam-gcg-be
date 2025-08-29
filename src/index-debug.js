require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test endpoint working'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

