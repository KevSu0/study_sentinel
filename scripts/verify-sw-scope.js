#!/usr/bin/env node

const { URL } = require('url');

async function verifyServiceWorkerScope({ baseUrl, workerPath = '/sw.js', expectedScope = '/' }) {
  if (!baseUrl) {
    throw new Error('Missing required baseUrl');
  }

  const normalized = normalizeUrl(baseUrl, workerPath);
  const response = await fetch(normalized, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Request to ${normalized} failed with status ${response.status}`);
  }

  const header = response.headers.get('service-worker-allowed');

  if (!header) {
    throw new Error(`Header \'Service-Worker-Allowed\' missing on ${normalized}`);
  }

  if (!scopesMatch(header, expectedScope)) {
    throw new Error(`Expected scope ${expectedScope}, but received ${header}`);
  }

  return { url: normalized, scope: header };
}

function scopesMatch(actual, expected) {
  const normalize = (input) => (input.endsWith('/') ? input : `${input}/`).replace(/\/+$/, '/');
  return normalize(actual) === normalize(expected);
}

function normalizeUrl(baseUrl, workerPath) {
  const url = new URL(workerPath, ensureTrailingSlash(baseUrl));
  return url.toString();
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

async function main() {
  const { baseUrl, expectedScope, workerPath } = parseArgs(process.argv.slice(2));

  try {
    const result = await verifyServiceWorkerScope({ baseUrl, workerPath, expectedScope });
    console.log(`Service worker at ${result.url} exposes Service-Worker-Allowed: ${result.scope}`);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case '--url':
      case '--base-url':
        options.baseUrl = args[i + 1];
        i += 1;
        break;
      case '--expected-scope':
        options.expectedScope = args[i + 1];
        i += 1;
        break;
      case '--worker-path':
        options.workerPath = args[i + 1];
        i += 1;
        break;
      default:
        if (!arg.startsWith('--')) {
          options.baseUrl = arg;
        }
        break;
    }
  }

  return options;
}

if (require.main === module) {
  main();
}

module.exports = {
  verifyServiceWorkerScope,
  normalizeUrl,
  scopesMatch,
  parseArgs,
};
