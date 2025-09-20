#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function loadHosts() {
  const hostsPath = path.join(__dirname, '..', 'src', 'lib', 'third-party', 'hosts.json');
  const raw = fs.readFileSync(hostsPath, 'utf8');
  const hosts = JSON.parse(raw);
  return hosts.map(h => (h.startsWith('https://') || h.startsWith('http://')) ? new URL(h).origin : `https://${h}`).sort();
}

function buildConnectSrc(hosts, env) {
  if (env === 'development') {
    return ["'self'", 'http://localhost:*', 'ws://localhost:*'];
  }
  const uniq = Array.from(new Set(["'self'", ...hosts]));
  return uniq;
}

function buildCspValue(connectSrc) {
  const base = `connect-src ${connectSrc.join(' ')}; img-src 'self' data:; font-src 'self'; media-src 'self' https://actions.google.com; worker-src 'self'`;
  return `${base}; report-uri /api/csp-report`;
}

function main() {
  const env = process.env.NODE_ENV || 'development';
  const hosts = loadHosts();
  const connectSrc = buildConnectSrc(hosts, env);
  const value = buildCspValue(connectSrc);
  if (process.argv.includes('--print')) {
    console.log(value);
    return;
  }
  const outPath = path.join(__dirname, '..', 'generated-csp.json');
  fs.writeFileSync(outPath, JSON.stringify({ env, connectSrc, value }, null, 2));
  console.log(`Wrote ${outPath}`);
}

if (require.main === module) {
  main();
}
