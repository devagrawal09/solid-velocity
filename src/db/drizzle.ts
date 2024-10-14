import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    ca: process.env.DB_SSL_CERT
  }
});

export const db = drizzle(pool, { schema: schema, logger: true });
