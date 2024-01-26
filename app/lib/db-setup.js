const { Pool } = require('pg');

const config = {
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
};

const pool = new Pool(config);

module.exports = pool;
