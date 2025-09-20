# ADR-002: Performance Monitor Thresholds

## Status
Accepted – 2025-09-17

## Context
The new performance monitor component reads live metrics from the PWA harness and our Jest suites now exercise those metrics. To keep tests and visual alerts deterministic we needed a single source of truth for how frame rate, long tasks, and heap usage are classified.

## Decision
We standardise the thresholds and labels below. The limits are inclusive on the boundary indicated.

| Metric | Good | Warning | Critical |
| --- | --- | --- | --- |
| Frame rate (average FPS over 5s) | = 55 | 40 – 54 | < 40 |
| Long tasks per second (5s window) | = 1.0 | > 1.0 – = 4.0 | > 4.0 |
| Heap used (%) | = 60% | > 60% – = 75% | > 75% |

Labels remain good, warning, critical, or unknown when data is unavailable. These values are reflected in src/components/pwa/performance-monitor.tsx and enforced by performance-monitor.test.tsx boundary assertions.

## Consequences
- Any future tweaks to the thresholds require updating this ADR and the shared constants before touching tests.
- Components or dashboards that visualise the metrics must map statuses via these rules; avoid hard-coding alternative breakpoints.
- Tooling (e.g. regression alerts) should treat "unknown" as neutral and never downgrade the other metrics.
