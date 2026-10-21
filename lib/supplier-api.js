export function pullConfigured() {
  return Boolean(process.env.SUPPLIER_API_URL);
}

export function supplierHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra };
  if (process.env.SUPPLIER_API_TOKEN) headers.Authorization = `Bearer ${process.env.SUPPLIER_API_TOKEN}`;
  return headers;
}

export async function fetchSupplierPage({ page, perPage, updatedSince }) {
  const url = new URL(process.env.SUPPLIER_API_URL);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('limit', String(perPage));
  url.searchParams.set('offset', String((page - 1) * perPage));
  if (updatedSince) url.searchParams.set('updated_since', updatedSince);

  const res = await fetch(url, { headers: supplierHeaders(), signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Supplier API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || data.data || data.results;
  if (!Array.isArray(items)) throw new Error('Supplier API: response has no items array');
  return { items, pages: Number(data.pages_count ?? data.pages) || null };
}

export async function refreshSupplierService({ mode = 'prices', log = () => {}, timeoutMs = 30 * 60_000 } = {}) {
  const base = (process.env.SUPPLIER_REFRESH_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('SUPPLIER_REFRESH_URL is not set');
  const isImages = mode === 'images';
  const res = await fetch(isImages ? base.replace(/\/sync$/, '/images/sync') : base, {
    method: 'POST',
    headers: supplierHeaders({ 'Content-Type': 'application/json' }),
    body: isImages ? undefined : JSON.stringify({ mode }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 409) {
    log('Supplier refresh is already running; pulling what is there.');
    return { status: 'already_running' };
  }
  if (!res.ok) throw new Error(`Supplier refresh ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const run = await res.json();
  log(`Supplier refresh #${run.id} (${mode}) started…`);
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; ) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(`${base}/${run.id}`, { headers: supplierHeaders(), signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!r?.ok) continue;
    const state = await r.json();
    if (state.status === 'done' || state.status === 'failed') {
      log(`Supplier refresh #${run.id}: ${state.status}${state.error ? ` (${state.error})` : ''}`, state.stats || '');
      return state;
    }
  }
  log(`Supplier refresh #${run.id} is still running after ${timeoutMs / 60_000} min; pulling what is there.`);
  return { status: 'timeout', id: run.id };
}
