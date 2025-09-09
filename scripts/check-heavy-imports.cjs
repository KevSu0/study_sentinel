#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'Music', 'Copiolet', 'study_sentinel', 'src');
const ALLOW_LAZY_DIR = path.join(SRC_DIR, 'components', 'lazy');

const HEAVY_LIBS = ['recharts', 'react-day-picker', 'framer-motion'];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

const files = walk(SRC_DIR).filter((f) => !f.startsWith(ALLOW_LAZY_DIR));

const offenders = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const lib of HEAVY_LIBS) {
    const re = new RegExp(`import\\s+[^;]*from\\s+["']${lib}["']`);
    if (re.test(content)) offenders.push({ file, lib });
  }
}

if (offenders.length) {
  console.error('\nDirect heavy-lib imports found (use lazy wrappers):');
  for (const o of offenders) console.error(` - ${o.lib} in ${path.relative(ROOT, o.file)}`);
  process.exit(1);
} else {
  console.log('OK: No direct heavy-lib imports found.');
}
