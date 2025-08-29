const http = require('http');

console.log('Testing API endpoints...\n');

// Test health endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Health endpoint:', JSON.parse(data));
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Health endpoint error:', err.message);
      reject(err);
    });
    
    req.end();
  });
};

// Test data units endpoint
const testDataUnits = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/data-units',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Data Units endpoint:', JSON.parse(data));
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Data Units endpoint error:', err.message);
      reject(err);
    });
    
    req.end();
  });
};

// Test assessments endpoint
const testAssessments = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/assessments',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Assessments endpoint:', JSON.parse(data));
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Assessments endpoint error:', err.message);
      reject(err);
    });
    
    req.end();
  });
};

// Run all tests
const runTests = async () => {
  try {
    await testHealth();
    await testDataUnits();
    await testAssessments();
    console.log('\n🎉 All API tests completed successfully!');
  } catch (error) {
    console.log('\n❌ Some tests failed:', error.message);
  }
};

runTests();

