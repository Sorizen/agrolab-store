import { readFile } from 'node:fs/promises';
import { getPool } from '../lib/db.js';

const pool = getPool();
if (!pool) process.exit(1);

try {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  const { rows } = await pool.query(
    `select table_name from information_schema.tables where table_schema = 'public' order by table_name`
  );
  console.log('Schema applied. Tables:', rows.map((r) => r.table_name).join(', '));
} catch (error) {
  console.error('Schema failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
