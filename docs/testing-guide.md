# Testing Guide Addendum

This addendum captures the conventions introduced with the service-worker test harness and sync fixtures. It should be read alongside the existing component-specific playbooks.

## Selector Hierarchy
- Default to ARIA roles and accessible names when locating elements in tests (getByRole, findByRole).
- Use textual assertions only for user-visible copy that is part of the behaviour being verified.
- A single data-testid per surface is permitted when no accessible hook exists; document it in the corresponding test file.

## Shared Harness & Fixtures
- Browser/platform APIs (service worker bus, navigator.onLine, performance observers) are initialised in jest.setup.js.
- Sync-centric suites should import helpers from [src/test/mocks/sync-fixtures.ts](../src/test/mocks/sync-fixtures.ts) instead of creating bespoke mocks.
- [ServiceWorkerTestHarness](../src/test/sw-test-harness.ts) should be used for SW sequencing (simulateWaitingWorker, activateWaitingWorker).

## React Hook Dependencies
- Prefer useCallback/useMemo and explicit dependency arrays over eslint-disable comments.
- Scoped disables must carry a one-line explanation and a follow-up link.

## Pre-commit expectations
- npx lint-staged runs ESLint and related Jest checks against staged files.
- npm run lint:sw still verifies the generated service worker artefacts.

The [ADR-004](./adr/adr-004-lint-testing-policy.md) captures the policy in full; this guide summarises the developer-facing actions.

## PWA Policy Recap
- Prefer real React hooks and SW stubs over module-level mocks to preserve performance instrumentation (see [ADR-004](./adr/adr-004-lint-testing-policy.md)).
- Keep service worker scope tests on the shared harness with the global Headers polyfill to match browser behaviour.
- Performance thresholds and sync diagnostics contracts remain locked per [ADR-002](./adr/adr-002-performance-thresholds.md) and [ADR-003](./adr/adr-003-sync-diagnostics-contract.md).

## No-Ghost-Network Enforcement
- Default test posture: remote_apis=false. Jest bootstrap disables remote APIs and logs the state.
- Only suites that truly need remote behavior should opt in using:
  - `import { enableRemoteApis, disableRemoteApis, useRemoteApis, expectRemoteApisDisabled } from '@/test/remote-apis'`
  - Call `enableRemoteApis()` in `beforeEach` and `disableRemoteApis()` in `afterEach`, or just call `useRemoteApis()` to wire both.
  - Suites must still assert guard behavior on non-OK/non-JSON responses when remote is enabled.
- CI enforcement:
  - A strict static scanner fails if `'/api/'` literals appear outside allowlisted paths.
  - Allowlist lives at `scripts/remote-api-allowlist.json` and includes: gate/path files, `src/test/**`, and `scripts/**`.
  - CI sets `NEXT_PUBLIC_ENABLE_REMOTE_APIS=false` and runs the scanner before lint/typecheck/test.
- Developer workflow:
  - Pre-commit hooks run the scanner on staged files via lint-staged.
  - To justify a new allowlist entry, include a short rationale in the PR and update the allowlist JSON.

