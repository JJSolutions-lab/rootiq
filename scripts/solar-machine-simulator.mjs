const API = process.env.SIM_API_URL || 'http://localhost:4000/api';
const EMAIL = process.env.SIM_EMAIL || 'admin@rootiq.local';
const PASSWORD = process.env.SIM_PASSWORD || 'RootIQ@2026';
const INTERVAL = Number(process.env.SIM_INTERVAL_MS || 5000);
const cyclesArg = process.argv.find((x) => x.startsWith('--cycles='));
const maxCycles = cyclesArg ? Number(cyclesArg.split('=')[1]) : Infinity;

let cookie = '';
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...options.headers },
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const refs = await request('/reference');
  if (!refs.lines.length || !refs.products.length) throw new Error('Seed production lines and products first.');
  console.log(`Virtual solar machine connected to ${API}`);

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const line = refs.lines[(cycle - 1) % refs.lines.length];
    const product = refs.products[(cycle - 1) % refs.products.length];
    const produced = random(90, 120);
    const rejected = Math.random() < 0.2 ? random(7, 14) : random(0, 4);
    const downtime = Math.random() < 0.12 ? random(2, 8) : 0;
    const batch = `SIM-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${cycle}`;
    const timestamp = new Date(Date.now() + cycle).toISOString();

    await request('/operations/production', { method: 'POST', body: JSON.stringify({
      lineId: line.id, productId: product.id, recordDate: timestamp, shift: `SIM-${cycle}`,
      plannedQty: 120, producedQty: produced, rejectedQty: rejected, downtimeMinutes: downtime,
    }) });
    await request('/inspections', { method: 'POST', body: JSON.stringify({
      title: 'Virtual EL inspection', stage: 'Post-lamination', lineId: line.id,
      productId: product.id, batchNumber: batch, result: rejected > 6 ? 'FAILED' : 'PASSED',
      checked: produced, failed: rejected, inspectorName: 'Solar Machine Simulator',
    }) });
    if (rejected > 6) await request('/defects', { method: 'POST', body: JSON.stringify({
      title: 'Virtual EL: excessive cell defects', description: `Simulator detected ${rejected} failed panels in batch ${batch}.`,
      severity: rejected > 10 ? 'CRITICAL' : 'HIGH', lineId: line.id, productId: product.id,
      batchNumber: batch, quantityChecked: produced, quantityDefective: rejected,
    }) });
    console.log(`[${new Date().toLocaleTimeString()}] ${line.code}: produced=${produced}, rejected=${rejected}, downtime=${downtime}m`);
    if (cycle < maxCycles) await wait(INTERVAL);
  }
  console.log(`Simulation finished (${maxCycles} cycles). Refresh the RootIQ dashboard.`);
}

run().catch((error) => { console.error(`Simulator failed: ${error.message}`); process.exitCode = 1; });
