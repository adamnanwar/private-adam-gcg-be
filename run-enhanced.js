const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Enhanced Backend Server...');
console.log('📁 Working directory:', __dirname);

const serverProcess = spawn('node', ['enhanced-backend.js'], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down server...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Server startup script completed');
console.log('📊 Server process ID:', serverProcess.pid);

