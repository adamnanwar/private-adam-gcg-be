const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Minimal server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API endpoint working'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test API: http://localhost:${PORT}/api/v1/test`);
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

