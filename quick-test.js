console.log('=== Quick Test ===');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

try {
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const app = express();
  console.log('✅ Express app created');
  
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful' });
  });
  
  const server = app.listen(3003, () => {
    console.log('✅ Server started on port 3003');
    console.log('✅ Test endpoint: http://localhost:3003/test');
    
    // Auto-close after 5 seconds for testing
    setTimeout(() => {
      console.log('🔄 Auto-closing server for testing...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    }, 5000);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

