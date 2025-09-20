#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const forbiddenMatchers = [
  {
    label: 'service worker entry point',
    match: (name) => name === 'sw.js'
  },
  {
    label: 'workbox runtime bundles',
    match: (name) => /^workbox-.*\.(js|js\.map)$/.test(name)
  },
  {
    label: 'hashed worker chunks',
    match: (name) => /^worker-.*\.(js|js\.map)$/.test(name)
  },
];

function scanForArtifacts(root = publicDir) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const offenders = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const matcher = forbiddenMatchers.find(({ match }) => match(entry.name));
    if (matcher) {
      offenders.push({
        path: path.join('public', entry.name),
        reason: matcher.label,
      });
    }
  }

  return offenders;
}

function formatMessage(offendingArtifacts) {
  return offendingArtifacts
    .map((artifact) => ` - ${artifact.path} (${artifact.reason})`)
    .join('\n');
}

function main() {
  const offenders = scanForArtifacts();

  if (offenders.length === 0) {
    process.exit(0);
  }

  const header = [
    'Detected generated service worker artifacts under public/.',
    'Remove them from source control and ensure next-pwa runs during the build instead.',
    'Files:',
  ].join('\n');

  console.error(`${header}\n${formatMessage(offenders)}`);
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  scanForArtifacts,
};
