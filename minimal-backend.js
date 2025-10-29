const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message: 'GCG Maturity Assessment Backend is running'
  });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const knex = require('knex');
    const config = require('./knexfile');
    const environment = process.env.NODE_ENV || 'production';
    const db = knex(config[environment]);
    
    await db.raw('SELECT 1');
    await db.destroy();
    
    res.json({ 
      status: 'success', 
      message: 'Database connection successful',
      environment: environment
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test email service
app.get('/test-email', (req, res) => {
  try {
    const EmailService = require('./src/services/email.service');
    res.json({ 
      status: 'success', 
      message: 'Email service loaded successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Email service failed',
      error: error.message
    });
  }
});

// Test pic_map table
app.get('/test-pic-map', async (req, res) => {
  try {
    const knex = require('knex');
    const config = require('./knexfile');
    const environment = process.env.NODE_ENV || 'production';
    const db = knex(config[environment]);
    
    // Check if pic_map table exists
    const tableExists = await db.schema.hasTable('pic_map');
    
    if (tableExists) {
      // Get table structure
      const columns = await db('information_schema.columns')
        .where('table_name', 'pic_map')
        .where('table_schema', 'public')
        .select('column_name', 'data_type', 'is_nullable');
      
      await db.destroy();
      
      res.json({ 
        status: 'success', 
        message: 'pic_map table exists',
        tableExists: true,
        columns: columns
      });
    } else {
      await db.destroy();
      
      res.json({ 
        status: 'error', 
        message: 'pic_map table does not exist',
        tableExists: false
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Error checking pic_map table',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GCG Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/test-db`);
  console.log(`📧 Email test: http://localhost:${PORT}/test-email`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
