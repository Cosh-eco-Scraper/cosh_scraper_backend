import { Pool } from 'pg';

const databasePool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true',
});

export default databasePool;
