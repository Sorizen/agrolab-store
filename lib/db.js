import pg from 'pg';

pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const globalForPg = globalThis;

function createPool() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL is not set. See .env.local.example');
    return null;
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (err) => console.error('Postgres pool error:', err.message));
  return pool;
}

export function getPool() {
  if (globalForPg.__storePgPool === undefined) {
    globalForPg.__storePgPool = createPool();
  }
  return globalForPg.__storePgPool;
}

function requirePool() {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured. Set DATABASE_URL in .env.local');
  return pool;
}

export async function query(text, params) {
  return requirePool().query(text, params);
}

export async function transaction(fn) {
  const client = await requirePool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
