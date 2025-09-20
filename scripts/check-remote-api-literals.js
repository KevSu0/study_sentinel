#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'remote-api-allowlist.json');

function readAllowlist() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    exact: new Set((parsed.exact ?? []).map(normalizePattern)),
    prefix: (parsed.prefix ?? []).map(normalizePattern),
    contains: (parsed.contains ?? []).map(normalizeFragment),
  };
}

function normalizePattern(input) {
  return toPosix(path.normalize(input));
}

function normalizeFragment(input) {
  return input.replace(/\\/g, '/');
}

function toPosix(value) {
  return value.replace(/[\\]+/g, '/');
}

const ALLOWLIST = readAllowlist();
const SCOPE_PREFIXES = ['src/', 'scripts/'];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SCRIPT_KIND_LOOKUP = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
};

const args = process.argv.slice(2);
let candidatePaths = [];
if (args.length > 0) {
  if (args[0] !== '--files') {
    console.error('[remote-api-scan] Unknown CLI arguments. Use `--files <list>` or no arguments.');
    process.exit(1);
  }
  candidatePaths = args.slice(1);
} else {
  candidatePaths = gatherDefaultFiles();
}

const findings = [];
for (const candidate of candidatePaths) {
  const absolutePath = path.isAbsolute(candidate) ? candidate : path.resolve(ROOT, candidate);
  if (!fs.existsSync(absolutePath)) {
    continue;
  }
  if (!fs.statSync(absolutePath).isFile()) {
    continue;
  }
  const relativePosix = toPosix(path.relative(ROOT, absolutePath));
  if (!isWithinScope(relativePosix)) {
    continue;
  }
  if (!ALLOWED_EXTENSIONS.has(path.extname(relativePosix))) {
    continue;
  }
  if (isAllowlisted(relativePosix)) {
    continue;
  }

  const fileFindings = scanFile(absolutePath, relativePosix);
  findings.push(...fileFindings);
}

if (findings.length > 0) {
  console.error('\n[remote-api-scan] Found disallowed `/api/` literals:');
  for (const finding of findings) {
    console.error(`  - ${finding.file}:${finding.line}:${finding.column} → ${finding.snippet}`);
  }
  console.error('\nIf this path needs direct API literals, update `scripts/remote-api-allowlist.json` with justification.');
  process.exit(1);
}

function gatherDefaultFiles() {
  const collected = [];
  for (const entry of ['src', 'scripts']) {
    const target = path.join(ROOT, entry);
    if (fs.existsSync(target)) {
      walk(target, collected);
    }
  }
  const jestSetup = path.join(ROOT, 'jest.setup.js');
  if (fs.existsSync(jestSetup)) {
    collected.push(jestSetup);
  }
  return collected;
}

function walk(currentPath, collection) {
  const stats = fs.statSync(currentPath);
  if (stats.isDirectory()) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(path.join(currentPath, entry.name), collection);
      } else {
        collection.push(path.join(currentPath, entry.name));
      }
    }
    return;
  }
  if (stats.isFile()) {
    collection.push(currentPath);
  }
}

function isWithinScope(relativePosix) {
  if (relativePosix === 'jest.setup.js') {
    return true;
  }
  return SCOPE_PREFIXES.some(prefix => relativePosix.startsWith(prefix));
}

function isAllowlisted(relativePosix) {
  if (ALLOWLIST.exact.has(relativePosix)) {
    return true;
  }
  if (ALLOWLIST.prefix.some(prefix => relativePosix.startsWith(prefix))) {
    return true;
  }
  return ALLOWLIST.contains.some(fragment => relativePosix.includes(fragment));
}

function scanFile(absolutePath, relativePosix) {
  const content = fs.readFileSync(absolutePath, 'utf8');
  if (!content.includes('/api/')) {
    return [];
  }
  const ext = path.extname(relativePosix);
  const scriptKind = SCRIPT_KIND_LOOKUP[ext] ?? ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(relativePosix, content, ts.ScriptTarget.ES2022, true, scriptKind);
  const matches = [];

  const pushFinding = (node) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const lineText = getLineText(content, line);
    matches.push({
      file: relativePosix,
      line: line + 1,
      column: character + 1,
      snippet: lineText.trim(),
    });
  };

  const visit = (node) => {
    if (ts.isStringLiteralLike(node)) {
      if (node.text.includes('/api/')) {
        pushFinding(node);
      }
    } else if (ts.isTemplateExpression(node)) {
      if (node.head.text.includes('/api/')) {
        pushFinding(node.head);
      }
      for (const span of node.templateSpans) {
        if (span.literal.text.includes('/api/')) {
          pushFinding(span.literal);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return matches;
}

function getLineText(content, zeroBasedLine) {
  const lines = content.split(/\r?\n/);
  return lines[zeroBasedLine] ?? '';
}
