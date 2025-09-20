#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MIME_MAP = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

function checkAssetIntegrity({ projectRoot = path.join(__dirname, '..'), reportDir = path.join(projectRoot, 'dist', 'reports') } = {}) {
  const manifestAssets = collectManifestAssets(projectRoot);
  const fontAssets = collectFontAssets(projectRoot);
  const browserConfigAssets = collectBrowserConfigAssets(projectRoot);

  const assets = [...manifestAssets, ...fontAssets, ...browserConfigAssets];
  const results = assets.map((asset) => inspectAsset(projectRoot, asset));
  const issues = results.flatMap((result) => result.issues);

  writeReport(reportDir, results);

  if (issues.length > 0) {
    const formatted = issues.map((issue) => ` - ${issue}`).join('\n');
    throw new Error(`Asset integrity check failed:\n${formatted}`);
  }

  return results;
}

function collectManifestAssets(projectRoot) {
  const manifestPath = path.join(projectRoot, 'public', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];

  return icons
    .filter((icon) => typeof icon.src === 'string')
    .map((icon) => {
      const cleaned = stripLeadingSlash(icon.src);
      const resolved = resolvePublicPath(cleaned);
      return {
        path: resolved,
        displayPath: resolved,
        source: 'manifest.json',
        expectedMimeType: mimeFromExtension(cleaned),
        signature: signatureForExtension(cleaned),
      };
    });
}

function collectFontAssets(projectRoot) {
  const fontCss = path.join(projectRoot, 'src', 'app', 'fonts.css');
  if (!fs.existsSync(fontCss)) {
    return [];
  }

  const css = fs.readFileSync(fontCss, 'utf8');
  const regex = /url\(['\"]?(\/[^'\")]+)['\"]?\)/g;
  const matches = new Set();
  let match;

  while ((match = regex.exec(css))) {
    matches.add(stripLeadingSlash(match[1]));
  }

  return Array.from(matches).map((relativePath) => {
    const resolved = resolvePublicPath(relativePath);
    return {
      path: resolved,
      displayPath: resolved,
      source: 'fonts.css',
      expectedMimeType: mimeFromExtension(relativePath),
      signature: signatureForExtension(relativePath),
    };
  });
}

function collectBrowserConfigAssets(projectRoot) {
  const browserConfigPath = path.join(projectRoot, 'public', 'icons', 'browserconfig.xml');
  if (!fs.existsSync(browserConfigPath)) {
    return [];
  }

  const xml = fs.readFileSync(browserConfigPath, 'utf8');
  const regex = /src="([^"]+)"/g;
  const matches = new Set();
  let match;

  while ((match = regex.exec(xml))) {
    matches.add(stripLeadingSlash(match[1]));
  }

  return Array.from(matches).map((relativePath) => {
    const resolved = resolvePublicPath(relativePath);
    return {
      path: resolved,
      displayPath: resolved,
      source: 'browserconfig.xml',
      expectedMimeType: mimeFromExtension(relativePath),
      signature: signatureForExtension(relativePath),
    };
  });
}

function inspectAsset(projectRoot, asset) {
  const absolutePath = path.join(projectRoot, ...asset.path.split('/'));
  const result = {
    path: asset.displayPath,
    source: asset.source,
    expectedMimeType: asset.expectedMimeType,
    signature: asset.signature,
    absolutePath,
    exists: fs.existsSync(absolutePath),
    size: 0,
    signatureValid: null,
    issues: [],
  };

  if (!result.exists) {
    result.issues.push(`${asset.source} references missing asset ${asset.displayPath}`);
    return result;
  }

  const stats = fs.statSync(absolutePath);
  result.size = stats.size;

  if (stats.size === 0) {
    result.issues.push(`${asset.displayPath} is empty`);
  }

  if (asset.signature) {
    const buffer = readPrefix(absolutePath, 16);
    result.signatureValid = validateSignature(buffer, asset.signature);
    if (!result.signatureValid) {
      result.issues.push(`${asset.displayPath} failed ${asset.signature} signature validation`);
    }
  }

  if (!asset.expectedMimeType) {
    result.issues.push(`Unknown mime type for ${asset.displayPath}`);
  }

  return result;
}

function readPrefix(filePath, length) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

function validateSignature(buffer, type) {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  switch (type) {
    case 'woff2':
      return buffer.slice(0, 4).toString() === 'wOF2';
    case 'png':
      return buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    default:
      return true;
  }
}

function signatureForExtension(value) {
  const ext = path.extname(value).toLowerCase();
  switch (ext) {
    case '.woff2':
      return 'woff2';
    case '.png':
      return 'png';
    default:
      return null;
  }
}

function writeReport(reportDir, results) {
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'asset-integrity-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalAssets: results.length,
      issues: results.reduce((count, result) => count + result.issues.length, 0),
    },
    assets: results.map((result) => ({
      path: result.path,
      source: result.source,
      exists: result.exists,
      size: result.size,
      expectedMimeType: result.expectedMimeType,
      signatureValid: result.signatureValid,
      issues: result.issues,
    })),
  };

  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
}

function stripLeadingSlash(value) {
  return value.replace(/^\/+/, '');
}

function resolvePublicPath(value) {
  const normalized = stripLeadingSlash(value);
  if (normalized.startsWith('public/')) {
    return normalized.replace(/\\/g, '/');
  }
  return path.join('public', normalized).replace(/\\/g, '/');
}

function mimeFromExtension(value) {
  const ext = path.extname(value).toLowerCase();
  return MIME_MAP[ext] || null;
}

function main() {
  try {
    checkAssetIntegrity();
    console.log('Asset integrity check passed');
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkAssetIntegrity,
  collectManifestAssets,
  collectFontAssets,
  collectBrowserConfigAssets,
  resolvePublicPath,
  stripLeadingSlash,
  validateSignature,
  mimeFromExtension,
};
