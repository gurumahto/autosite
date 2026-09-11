import { Pool } from 'pg';

const globalForDatabase = globalThis;

export const databasePool = globalForDatabase.databasePool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.databasePool = databasePool;
}

export async function withTransaction(callback) {
  const client = await databasePool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
