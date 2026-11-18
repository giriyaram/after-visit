import 'server-only';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import * as schema from './schema';

// Keep one pool across dev reloads so they do not leak connections.
const globalForDb = globalThis as unknown as {pgPool?: Pool};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }
  return new Pool({connectionString});
}

const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

export const db = drizzle(pool, {schema});
