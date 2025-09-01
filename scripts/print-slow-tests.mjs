#!/usr/bin/env node
import fs from 'node:fs';

const [,, resultsPath = '.jest-results.json', topStr = '10'] = process.argv;
const TOP = Number(topStr) || 10;

const json = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
const tests = json.testResults ?? [];

// Top slow files (by runtime)
const slowFiles = tests
  .map(t => ({ file: t.name, ms: t.perfStats?.runtime ?? 0 }))
  .sort((a, b) => b.ms - a.ms)
  .slice(0, TOP);

// Top slow individual tests (by duration if present)
const slowCases = [];
for (const t of tests) {
  for (const a of (t.assertionResults ?? [])) {
    const ms = (typeof a.duration === 'number' ? a.duration : (t.perfStats?.runtime ?? 0));
    if (ms > 0) slowCases.push({ file: t.name, test: a.fullName || a.title, ms });
  }
}
slowCases.sort((a, b) => b.ms - a.ms);
const topCases = slowCases.slice(0, TOP);

function print(title, rows) {
  console.log(`\n=== ${title} (top ${rows.length}) ===`);
  for (const r of rows) console.log(`${String(r.ms).padStart(6)} ms  ${r.file}${r.test ? '  —  ' + r.test : ''}`);
}

print('Slowest test files', slowFiles);
print('Slowest individual tests', topCases);

