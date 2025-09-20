/**
 * ESLint custom rule: no-raw-fetch
 * - Forbids raw fetch/Request/XMLHttpRequest in product code
 * - Autofix replaces with internalApiGate.safeApiFetch or thirdPartyGate.fetchRaw
 * - Inserts import if missing and adds a TODO about fetchJson when ambiguous
 */

'use strict';

const path = require('path');

function isAllowedFile(filename) {
  const rel = filename.replace(/\\/g, '/');
  return (
    rel.includes('/__tests__/') ||
    /\.test\.(ts|tsx|js|jsx)$/.test(rel) ||
    rel.includes('/src/test/') ||
    rel.includes('/scripts/') ||
    rel.endsWith('/jest.setup.js') ||
    rel.endsWith('/jest.setup.ts') ||
    rel.includes('/src/worker/') ||
    rel.endsWith('/src/lib/remote-api-gate.ts') ||
    rel.endsWith('/src/lib/remote-api-paths.ts') ||
    rel.endsWith('/src/lib/third-party/third-party-gate.ts')
  );
}

function getArgKind(node, context) {
  if (!node.arguments || node.arguments.length === 0) return 'none';
  const arg = node.arguments[0];
  if (arg.type === 'Literal' && typeof arg.value === 'string') {
    const s = arg.value;
    if (s.startsWith('/api/')) return 'internal';
    if (/^https?:\/\//.test(s)) return 'thirdParty';
    if (s.startsWith('/')) return 'local';
  }
  if (arg.type === 'TemplateLiteral') {
    const raw = context.getSourceCode().getText(arg);
    if (raw.includes('/api/')) return 'internal';
    if (raw.includes('http://') || raw.includes('https://')) return 'thirdParty';
  }
  if (arg.type === 'NewExpression' && arg.callee.name === 'URL') {
    return 'thirdParty';
  }

  // Heuristic: remoteApiPaths helper indicates internal API
  const src = context.getSourceCode().getText(arg);
  if (src.includes('remoteApiPaths')) return 'internal';

  return 'thirdParty'; // default safer choice
}

function ensureImport(fixer, context, mod, name, isDefault, alias) {
  const sourceCode = context.getSourceCode();
  const text = sourceCode.getText();
  const already = new RegExp(`import\\s+.*from\\s+['\"]${mod}['\"]`);
  if (already.test(text)) return [];
  const spec = isDefault
    ? `import ${alias || name} from '${mod}';\n`
    : `import { ${alias ? name + ' as ' + alias : name} } from '${mod}';\n`;
  return [fixer.insertTextBeforeRange([0, 0], spec)];
}

module.exports = {
  rules: {
    'no-raw-fetch': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow raw fetch/Request/XMLHttpRequest in product code; use gates',
          recommended: false
        },
        fixable: 'code',
        schema: []
      },
      create(context) {
        const filename = context.getFilename();
        if (isAllowedFile(filename)) {
          return {};
        }

        function reportAndFix(node, kind) {
          const sourceCode = context.getSourceCode();
          const callee = node.callee;
          const replacement =
            kind === 'internal'
              ? 'safeApiFetch'
              : 'thirdPartyGate.fetchRaw';

          return context.report({
            node,
            message: 'Use the network gates (internalApiGate or thirdPartyGate) instead of raw fetch/Request/XMLHttpRequest',
            fix(fixer) {
              const fixes = [];
              // Replace callee
              fixes.push(fixer.replaceText(callee, replacement));

              // Add import(s)
              if (kind === 'internal') {
                fixes.push(
                  ...ensureImport(
                    fixer,
                    context,
                    "@/lib/remote-api-gate",
                    'safeApiFetch',
                    false
                  )
                );
              } else {
                fixes.push(
                  ...ensureImport(
                    fixer,
                    context,
                    "@/lib/third-party/third-party-gate",
                    'thirdPartyGate',
                    false
                  )
                );
                // Add TODO after the call site
                fixes.push(
                  fixer.insertTextAfter(
                    node,
                    ' /* TODO: consider thirdPartyGate.fetchJson if response is JSON */'
                  )
                );
              }

              return fixes;
            }
          });
        }

        return {
          CallExpression(node) {
            // fetch(...), window.fetch(...), global.fetch(...)
            const isFetch =
              (node.callee.type === 'Identifier' && node.callee.name === 'fetch') ||
              (node.callee.type === 'MemberExpression' && node.callee.property && node.callee.property.name === 'fetch');
            if (!isFetch) return;
            const kind = getArgKind(node, context);
            if (kind === 'local') return;
            reportAndFix(node, kind);
          },
          NewExpression(node) {
            // new Request(...) or new XMLHttpRequest()
            if (
              (node.callee.type === 'Identifier' && node.callee.name === 'Request') ||
              (node.callee.type === 'Identifier' && node.callee.name === 'XMLHttpRequest')
            ) {
              const kind = getArgKind(node, context);
              reportAndFix(node, kind);
            }
          }
        };
      }
    }
  }
};
