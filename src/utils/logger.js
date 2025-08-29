let logger;

try {
  const winston = require('winston');
  const path = require('path');

  // Create logs directory if it doesn't exist
  const fs = require('fs');
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      return log;
    })
  );

  // Create logger instance
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logDir, 'application.log'),
        level: 'info'
      }),
      
      // File transport for error logs
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error'
      })
    ]
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    // Log and keep server running in development
    logger.error('Uncaught Exception:', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    // Log and keep server running in development
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

} catch (error) {
  // Fallback to console logger for testing
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  };
}

module.exports = logger;

