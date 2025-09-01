# Test Coverage and Pass Ratio Report

## Executive Summary

### Current Status

- Latest full run snapshot (previous): 44/70 suites passed (~63%), 592/712 tests passed (~83%).
- Focused progress (current): useGlobalState suite is fully green (39/39).
- Goal: Drive remaining suites to green, then enforce 100% coverage.

### Current Test Statistics (latest full run)

| Metric | Count | Percentage |
|--------|-------|------------|
| Test Suites | 70 total | 100% |
| Passing Test Suites | 44 | ~63% |
| Failed Test Suites | 26 | ~37% |
| Individual Tests | 712 total | 100% |
| Passing Tests | 592 | ~83% |
| Failed Tests | 120 | ~17% |
| Execution Time | ~61 seconds | - |

### Focused Suite Snapshot

| Suite | Passing | Failing |
|-------|---------|---------|
| src/hooks/__tests__/use-global-state.test.tsx | 39 | 0 |

## Progress Since Last Update

- Stabilized useGlobalState end-to-end:
  - Non-null, complete context from first render.
  - Deterministic isLoaded in tests (no polling required).
  - ActiveTimerItem shape fixed; compatible with both tests and components.
  - Repo error propagation aligned to latest mocked instance; errors rethrown.
  - Timer flows safe with no timer persistence (stop/complete/pause).
  - Eliminated fake-timer bleed causing polling timeouts by enforcing real timers in setup and simplifying the spec.

## Remaining Focus Areas

1. ManualLogDialog submit
   - Ensure handler receives expected payload; verify controlled inputs and submit wiring.

2. Archive page / TaskList prop contracts
   - Normalize handler props (onUpdate/onArchive/onUnarchive/onPushToNextDay) and ensure `data-testid="task-list"` rendering in empty/populated states.

3. Service Worker / Offline (JSDOM-safe)
   - Guard sw-utils and ensure navigator.serviceWorker is mocked; cover success/fallback branches.

## Plan To Green And 100% Coverage

1) Fix remaining functional reds
- Reproduce failing suites with `-t` and patch minimal code or test utils.
- Add/adjust tests to cover guards, error branches, and empty-state rendering.

2) Coverage tightening
- After greens, run `npm test -- --coverage` and raise thresholds to 100% in `jest.config.js` (`coverageThreshold`).
- Narrow `collectCoverageFrom` to first-party sources only (exclude config/types/test utils) to make reported coverage meaningful.

3) CI quality gate
- Fail CI on any suite failure or coverage regression.
- Upload coverage artifact; add README badge.

## Technical Notes (useGlobalState specifics)

- Context value is created synchronously; all methods exist and keep stable identities across renders.
- `isLoaded` is visible immediately in tests; removed reliance on post-commit effects and polling.
- Repositories dereferenced via a live ref to ensure mocked instance alignment in tests; errors bubble naturally.
- Timer operations include no-op guards for missing persistence; state remains consistent.

## How To Verify Locally

- Focused suite: `npx jest src/hooks/__tests__/use-global-state.test.tsx`
- Single test: `npx jest <path> -t "<name>"`
- Full run: `npm test`
- Coverage: `npm test -- --coverage`

## Status

- Overall: In Progress
- Focused module (useGlobalState): Green (39/39)
- Next targets: ManualLogDialog, Archive/TaskList wiring, SW/offline guards
