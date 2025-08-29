const jwt = require('jsonwebtoken');

// Generate a test JWT token for the test assessor
const payload = {
  userId: '550e8400-e29b-41d4-a716-446655440002',
  email: 'assessor@test.com',
  role: 'assessor'
};

const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this token in Authorization header:');
console.log(`Bearer ${token}`);



