#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PROJ = path.join(ROOT, 'Music', 'Copiolet', 'study_sentinel');
const NEXT_DIR = path.join(PROJ, '.next');
const SERVER_DIR = path.join(NEXT_DIR, 'server');
const STATIC_CHUNKS_DIR = path.join(NEXT_DIR, 'static', 'chunks');

const DEFAULT_BUDGET_KB = Number(process.env.DEFAULT_ROUTE_BUDGET_KB || 200);
const HEAVY_BUDGET_KB = Number(process.env.HEAVY_ROUTE_BUDGET_KB || 300);
const HEAVY_ROUTES = (process.env.HEAVY_ROUTES || '/stats,/timer').split(',').map(s => s.trim()).filter(Boolean);

const toKB = (b) => Math.round(b / 102.4) / 10; // 1 decimal

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function fileSize(p) {
  try { return fs.statSync(p).size; } catch { return 0; }
}

function sumSizes(files) {
  return files.reduce((acc, f) => acc + fileSize(path.join(NEXT_DIR, f)), 0);
}

let failed = false;

// 1) Check that heavy libs don't leak into main shared chunks
const mainCandidates = [
  ...fs.existsSync(STATIC_CHUNKS_DIR) ? fs.readdirSync(STATIC_CHUNKS_DIR) : []
].filter(n => /^(main|main-app|webpack)-.*\.js$/.test(n));

const heavyPatterns = [/recharts/i, /react-day-picker/i, /framer-motion/i];

for (const name of mainCandidates) {
  const full = path.join(STATIC_CHUNKS_DIR, name);
  const txt = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  for (const pat of heavyPatterns) {
    if (pat.test(txt)) {
      console.error(`Heavy lib reference found in shared chunk ${name}: ${pat}`);
      failed = true;
    }
  }
}

// 2) Per-route budgets using app-build-manifest if available
const appManifestPath = path.join(SERVER_DIR, 'app-build-manifest.json');
const pagesManifestPath = path.join(NEXT_DIR, 'build-manifest.json');

const appManifest = safeReadJSON(appManifestPath);
const pagesManifest = safeReadJSON(pagesManifestPath);

if (appManifest && appManifest.pages && appManifest.rootMainFiles) {
  const { pages, rootMainFiles } = appManifest;
  console.log('Using app-build-manifest for budgets');
  for (const [k, files] of Object.entries(pages)) {
    if (!k.endsWith('/page')) continue;
    const route = '/' + k.replace(/^app\//, '').replace(/\/page$/, '').replace(/\/route$/, '');
    const initialFiles = [...new Set([...rootMainFiles, ...files])];
    const bytes = sumSizes(initialFiles);
    const kb = toKB(bytes);
    const budget = HEAVY_ROUTES.includes(route) ? HEAVY_BUDGET_KB : DEFAULT_BUDGET_KB;
    const ok = kb <= budget;
    console.log(`Route ${route || '/'}: ${kb} KB (budget ${budget} KB) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failed = true;
  }
} else if (pagesManifest && pagesManifest.pages) {
  console.log('Using build-manifest for budgets');
  const mainFiles = pagesManifest.pages['/'];
  for (const [route, files] of Object.entries(pagesManifest.pages)) {
    if (!route.startsWith('/') || route.startsWith('/_')) continue; // skip Next internals
    const all = [...new Set([...(mainFiles || []), ...files])];
    const bytes = sumSizes(all);
    const kb = toKB(bytes);
    const budget = HEAVY_ROUTES.includes(route) ? HEAVY_BUDGET_KB : DEFAULT_BUDGET_KB;
    const ok = kb <= budget;
    console.log(`Route ${route}: ${kb} KB (budget ${budget} KB) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failed = true;
  }
} else {
  console.warn('No Next build manifest found to compute per-route budgets. Skipping route budgets.');
}

if (failed) {
  console.error('\nBundle budget check FAILED.');
  process.exit(1);
} else {
  console.log('\nBundle budget check PASSED.');
}
