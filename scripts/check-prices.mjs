import { getPool } from '../lib/db.js';
import { verifyPrices } from '../lib/price-check.js';

const quiet = process.argv.includes('--quiet');
try {
  const summary = await verifyPrices({ notify: !quiet, log: (m) => console.log(m) });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.drift || summary.stale) process.exitCode = 2;
} catch (error) {
  console.error('Price check failed:', error.message);
  process.exitCode = 1;
} finally {
  await getPool()?.end();
}
