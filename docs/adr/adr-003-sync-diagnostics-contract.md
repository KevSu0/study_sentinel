# ADR-003: Sync Diagnostics Contract

## Status
Accepted – 2025-09-17

## Context
Our new sync test harness drives the consent and diagnostics surfaces with deterministic data. Multiple suites (component and page level) now rely on a shared shape for sync diagnostics that previously existed only as ad-hoc mocks.

## Decision
Standardise the diagnostics payload used in tests and fixtures to the following object shape:

`
{
  lastSyncAt: ISO string | null,
  queueDepth: number,
  failures: number,
  status: 'idle' | 'running' | 'error'
}
`

- lastSyncAt is set to the ISO timestamp of the most recent successful sync, or 
ull when unknown.
- queueDepth reflects pending items queued for uplink.
- ailures tracks consecutive sync failures since the last success.
- status reports the current sync state and drives the diagnostics banner colouring.

Mocks exposed from src/test/mocks/sync-fixtures.ts are the single source of truth and should be re-used by any new tests.

## Consequences
- Component code that consumes sync diagnostics fixtures must accept this structure and avoid private bespoke mocks.
- Changing the contract now requires updating the fixture helper and adjusting both the ADR and the affected suites in a single pull request.
- The fixtures default to deterministic timestamps so tests remain stable across reruns.
