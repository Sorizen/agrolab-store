import { readFile } from 'node:fs/promises';
import { getPool } from '../lib/db.js';
import { runSupplierSync, importAndLog, refreshSupplierService } from '../lib/supplier-sync.js';

const args = process.argv.slice(2);
const full = args.includes('--full');
const fileIdx = args.indexOf('--file');
const file = fileIdx >= 0 ? args[fileIdx + 1] : null;
const refreshArg = args.find((a) => a === '--refresh' || a.startsWith('--refresh='));
const refreshMode = refreshArg ? refreshArg.split('=')[1] || 'prices' : null;

const started = Date.now();
try {
  let result;
  if (file) {
    const data = JSON.parse(await readFile(file, 'utf8'));
    const items = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(items)) throw new Error('File must contain an array of items or { "items": [...] }');
    console.log(`Importing ${items.length} items from ${file}${full ? ' (full: hide missing)' : ''}…`);
    result = await importAndLog(items, { mode: 'file', full });
  } else {
    if (refreshMode) {
      await refreshSupplierService({ mode: refreshMode, log: (...m) => console.log(...m) });
      if (refreshMode === 'full') await refreshSupplierService({ mode: 'images', log: (...m) => console.log(...m) });
    }
    result = await runSupplierSync({ mode: full ? 'full' : 'updates', log: (m) => console.log(m) });
  }
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s:`, result);
} catch (error) {
  console.error('Sync failed:', error.message);
  process.exitCode = 1;
} finally {
  await getPool()?.end();
}
