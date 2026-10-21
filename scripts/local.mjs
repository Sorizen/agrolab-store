import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const devDir = path.join(appDir, '.dev-db');
const DB_PORT = Number(process.env.LOCAL_DB_PORT) || 54329;
const WEB_PORT = Number(process.env.PORT) || 3000;

await mkdir(devDir, { recursive: true });

const secretFile = path.join(devDir, 'auth-secret');
if (!existsSync(secretFile)) await writeFile(secretFile, randomBytes(32).toString('base64url'));
const authSecret = (await readFile(secretFile, 'utf8')).trim();

console.log('Starting local database…');
const db = await PGlite.create({ dataDir: path.join(devDir, 'pgdata'), extensions: { pg_trgm } });
await db.exec(await readFile(path.join(appDir, 'db', 'schema.sql'), 'utf8'));
const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: DB_PORT, maxConnections: 100 });
await server.start();

process.env.DATABASE_URL = `postgres://postgres@127.0.0.1:${DB_PORT}/postgres`;
process.env.UPLOAD_DIR ||= path.join(devDir, 'uploads');

const { seedDemo, DEMO_ADMIN, DEMO_CUSTOMER } = await import('./seed-demo.mjs');
const { rows } = await db.query('select count(*)::int as n from products');
if (rows[0].n === 0) {
  console.log('Empty database: adding demo data…');
  await seedDemo();
  const { getPool } = await import('../lib/db.js');
  await getPool()?.end();
}

const env = {
  ...process.env,
  AUTH_SECRET: process.env.AUTH_SECRET || authSecret,
  SITE_URL: process.env.SITE_URL || `http://localhost:${WEB_PORT}`,
  PG_POOL_MAX: '5',
  NEXT_TELEMETRY_DISABLED: '1',
};
if (process.env.LOCAL_LIVE_KEYS !== '1') {

  Object.assign(env, { TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', MONOBANK_API_TOKEN: '' });
}

console.log(`
  ┌───────────────────────────────────────────────────────────
  │  Agrolab, local:  http://localhost:${WEB_PORT}
  │  Admin:           ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}   → /admin
  │  Customer:        ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}
  │  Telegram + Monobank: ${process.env.LOCAL_LIVE_KEYS === '1' ? 'LIVE keys from .env.local' : 'off (LOCAL_LIVE_KEYS=1 to enable)'}
  │  Reset everything: stop, delete .dev-db, run again
  └───────────────────────────────────────────────────────────
`);

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const next = spawn(process.execPath, [nextBin, 'dev', '-p', String(WEB_PORT)], { cwd: appDir, env, stdio: 'inherit' });

async function shutdown(code = 0) {
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(code);
}
next.on('exit', (code) => shutdown(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => next.kill(signal));
}
