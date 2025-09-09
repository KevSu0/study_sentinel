# Bundle Hygiene — Before/After Snapshot (Local)

Note: Values are from local analyzed builds; use CI artifacts for canonical numbers.

## Budgets Summary (current thresholds)
- Default routes: 200 KB
- Heavy routes: 300 KB (/stats, /timer)
- Status: PASSED (no heavy libs in shared chunks; delta within guardrails)

## Top Client Chunks (post-refactor)
- 8562-ef430eacb1a9d4f1.js ~535 KB (motion/lucide/zod, not in initial shared for non-animated routes)
- 9094.faa6d2827596f3bc.js ~516 KB
- 2977.3573439232e495e3.js ~446 KB (react-day-picker)
- 9897-ecfcb5fee372677a.js ~341 KB
- 7005-422cfbd861bc68fa.js ~251 KB (recharts)

(See analyzer HTMLs for module breakdowns: `.next/analyze/client.html`)

## Route Payloads (from build-manifest)
- Within budgets at 200/300 KB (exact per-route bytes available in CI `bundle-budgets.txt`)

## Artifacts
- Analyzer reports: `.next/analyze/client.html`, `edge.html`, `nodejs.html`
- Logs: `analyzer-artifacts/<timestamp>/{typecheck.txt, imports-check.txt, build-analyze.txt, bundle-budgets.txt}`
