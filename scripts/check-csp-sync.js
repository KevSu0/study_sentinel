#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const genPath = path.join(__dirname, 'generated-csp.json');
if (!fs.existsSync(genPath)) {
  console.error('generated-csp.json missing. Run scripts/generate-csp.js');
  process.exit(1);
}
const { connectSrc } = JSON.parse(fs.readFileSync(genPath, 'utf8'));
if (!Array.isArray(connectSrc) || connectSrc.length === 0) {
  console.error('Invalid connect-src in generated-csp.json');
  process.exit(1);
}

const hostsPath = path.join(__dirname, '..', 'src', 'lib', 'third-party', 'hosts.json');
const hosts = JSON.parse(fs.readFileSync(hostsPath, 'utf8'));
const normalized = hosts.map(h => (h.startsWith('http') ? new URL(h).origin : `https://${h}`)).sort();

const expected = ["'self'", ...normalized];
const actual = connectSrc.slice().sort();

if (expected.join('|') !== actual.join('|')) {
  console.error('CSP connect-src drift detected!');
  console.error('Expected:', expected);
  console.error('Actual  :', actual);
  process.exit(1);
}

console.log('CSP connect-src matches hosts.json.');
