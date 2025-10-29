module.exports = {
  apps: [
    {
      name: 'gcg-backend',
      script: './src/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 9001
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Watch mode (development only)
      watch: process.env.NODE_ENV === 'development' ? ['src/**/*.js'] : false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Health check
      health_check_grace_period: 3000,
      
      // Restart policy
      restart_delay: 4000,
      
      // Environment variables
      env_file: '.env',
      
      // PM2 specific
      pmx: true,
      source_map_support: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto restart on file changes (development)
      autorestart: true,
      
      // Merge logs
      merge_logs: true,
      
      // Log rotation
      log_rotate_interval: '1d',
      log_rotate_max_size: '10M',
      log_rotate_count: 10
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:username/gcg-backend.git',
      path: '/var/www/gcg-backend',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
