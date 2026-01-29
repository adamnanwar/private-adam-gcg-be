require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || ,
      database: process.env.DB_NAME || '',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      statement_timeout: 60000,  // 60 seconds query timeout
      query_timeout: 60000,       // 60 seconds
      connectionTimeoutMillis: 60000  // PostgreSQL connection timeout
    },
    migrations: {
      directory: ''
    },
    seeds: {
      directory: ''
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,  // 60 seconds
      createTimeoutMillis: 60000,   // 60 seconds
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || ',
      port: process.env.DB_PORT || ,
      database: process.env.DB_NAME_TEST || '',
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || ''
    },
    migrations: {
      directory: ''
    },
    seeds: {
      directory: './src/database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: ''
    },
    seeds: {
      directory: ''
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
