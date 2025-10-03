/*
  Measure API latency for your Next.js App Router endpoints.
  - Discovers src/app/api/**/route.ts paths without dynamic segments
  - Sends GET requests (HEAD if configured later) with optional cookie
  - Outputs a compact JSON report sorted by latency

  Usage:
    # Basic (no auth cookie)
    node scripts/measure-api-speed.js

    # With session cookie (do not paste secrets in shell history; prefer env files)
    set API_BASE=http://localhost:3000
    set API_COOKIE=__Secure-next-auth.session-token={{SESSION_TOKEN}}
    node scripts/measure-api-speed.js
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const COOKIE = process.env.API_COOKIE || '';
const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'src', 'app', 'api');

function discoverRoutes(dir) {
  const routes = [];
  function walk(d, prefix) {
    const items = fs.readdirSync(d, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(d, it.name);
      if (it.isDirectory()) {
        walk(full, path.join(prefix, it.name));
      } else if (it.isFile() && it.name === 'route.ts') {
        const rel = path.join(prefix);
        const p = '/' + rel.replace(/\\/g, '/');
        // skip dynamic segments
        if (p.includes('[')) continue;
        routes.push(p);
      }
    }
  }
  walk(dir, '');
  return routes.sort((a, b) => a.localeCompare(b));
}

async function measureOnce(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: COOKIE ? { cookie: COOKIE } : undefined,
      signal: controller.signal,
    });
    const elapsed = Date.now() - started;
    const ct = res.headers.get('content-type') || '';
    let len = Number(res.headers.get('content-length') || 0);
    if (!len) {
      try { const txt = await res.clone().text(); len = Buffer.byteLength(txt); } catch {}
    }
    clearTimeout(timeout);
    return { url, status: res.status, timeMs: elapsed, contentType: ct, size: len };
  } catch (err) {
    clearTimeout(timeout);
    return { url, status: 'ERR', timeMs: Date.now() - started, error: String(err) };
  }
}

async function main() {
  if (!fs.existsSync(API_DIR)) {
    console.error('No src/app/api directory found');
    process.exit(1);
  }
  const discovered = discoverRoutes(API_DIR);
  // Prefer some common endpoints first (if they exist)
  const preferred = [
    '/api/dashboard/summary',
    '/api/dashboard/stats',
    '/api/system-settings',
    '/api/site-settings',
    '/api/products',
    '/api/users',
    '/api/clinics',
  ];
  const set = new Set(discovered);
  const ordered = [...preferred.filter(p => set.has(p)), ...discovered.filter(p => !preferred.includes(p))];

  const limit = 5; // concurrency
  const queue = [...ordered.map(p => API_BASE + p)];
  const results = [];

  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      if (!u) break;
      const r = await measureOnce(u);
      results.push(r);
      // brief delay to avoid overwhelming dev server
      await new Promise(r => setTimeout(r, 50));
    }
  }

  const workers = Array.from({ length: limit }, worker);
  await Promise.all(workers);

  results.sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));
  const slow = results.slice(0, 10);

  const summary = {
    base: API_BASE,
    totalEndpoints: results.length,
    slowest: slow,
    avgMs: Math.round(results.reduce((s, r) => s + (r.timeMs || 0), 0) / Math.max(1, results.length)),
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
