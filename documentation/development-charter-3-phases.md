# Development Charter: Three Phases with Typecheck, Build, and Targeted Tests

Owner: Codex CLI
Status: Draft for review
Purpose: Deliver the Dashboard/Stats optimization in 3 phases with explicit gates for typechecking, building, and running only the newly created tests at 100% coverage and 100% pass.

---

## Conventions

- TypeCheck: `npm run typecheck` (tsc --noEmit)
- Build: `npm run build` (Next.js production build)
- Tests (scoped): Use explicit file paths or `--testPathPattern` to run only tests created in that phase. Aim for 100% coverage and all tests passing.
- Naming for new tests: end with `.dev.test.ts` or `.dev.test.tsx` to make scoping easy per phase.
- Suggested locations:
  - Phase 1 tests: `src/lib/stats/__tests__/...`
  - Phase 2 tests: `src/lib/stats/__tests__/...`
  - Phase 3 tests: `src/app/stats/__tests__/...`, `src/components/**/__tests__/...`

Note: We will write comprehensive tests that reach 100% coverage for files added/modified in each phase. Coverage will be verified by the Jest summary in each phase.

---

## Phase 1 — Selectors + Cache (Data Layer)

Scope
- Implement pure selectors: `src/lib/stats/selectors.ts`
- Implement in-memory cache: `src/lib/stats/cache.ts`
- Wire minimal usage into `use-stats` behind feature flag (optional in this phase; full integration lands in Phase 3).

Deliverables
- Deterministic, well-documented selectors for stats, subjects, AI/gamification DTOs
- Lightweight TTL cache with invalidation hooks (events to be connected in Phase 3)

Tests (100% coverage; only these tests in this phase)
- Add files:
  - `src/lib/stats/__tests__/selectors.dev.test.ts`
  - `src/lib/stats/__tests__/cache.dev.test.ts`
- Cover all branches of each selector (e.g., empty data, malformed timestamps, subject grouping, productivity series edge cases)
- Verify cache TTL and invalidation behavior

Commands
- TypeCheck: `npm run typecheck`
- Build: `npm run build`
- Tests (scoped):
  - `npx jest --coverage --maxWorkers=50% src/lib/stats/__tests__/selectors.dev.test.ts src/lib/stats/__tests__/cache.dev.test.ts`
  - or: `npx jest --coverage --maxWorkers=50% --testPathPattern="src/lib/stats/__tests__/.*\\.dev\\.test\\.(ts|tsx)$"`

Success Gate
- 100% pass and 100% coverage for the Phase 1 tests
- No type errors; build succeeds

---

## Phase 2 — Pre‑Aggregation + Historical Migration (Storage Layer)

Scope
- Implement `src/lib/stats/aggregate-daily.ts` (persist daily aggregates with per‑subject rollups)
- Background backfill on new writes (sessions/logs)
- One-time Historical Migration (Phase 2.5 in the optimization plan): backfill `stats_daily` for all prior days, idempotent/resumable (track progress in `meta`)

Deliverables
- `stats_daily` consistently populated for today and history
- Per‑subject daily bundles for weekly/monthly charts and subject trend reporting

Tests (100% coverage; only these tests in this phase)
- Add files:
  - `src/lib/stats/__tests__/aggregate-daily.dev.int.test.ts`
  - `src/lib/stats/__tests__/backfill-and-migrate.dev.int.test.ts`
- Validate: per‑subject rollups, undo/redo behavior, idempotent migration, partial resume

Commands
- TypeCheck: `npm run typecheck`
- Build: `npm run build`
- Tests (scoped):
  - `npx jest --coverage --maxWorkers=50% src/lib/stats/__tests__/aggregate-daily.dev.int.test.ts src/lib/stats/__tests__/backfill-and-migrate.dev.int.test.ts`
  - or: `npx jest --coverage --maxWorkers=50% --testPathPattern="src/lib/stats/__tests__/.*backfill.*\\.dev\\.int\\.test\\.(ts|tsx)$|src/lib/stats/__tests__/.*aggregate.*\\.dev\\.int\\.test\\.(ts|tsx)$"`

Success Gate
- 100% pass and 100% coverage for the Phase 2 tests
- No type errors; build succeeds

---

## Phase 3 — UI Integration & Widgets (App Layer)

Scope
- Refactor `src/hooks/use-stats.tsx` to use selectors + cache + `stats_daily`
- Integrate subject grouping and gamification/AI selectors
- Stabilize Dashboard and Stats pages (memoized widget maps, debounced date change, Suspense boundaries)

Deliverables
- `use-stats` returns expanded contract (subject trends, newlyUnlockedBadges, achievementProgress)
- Dashboard/Stats page render smoothly; widgets consume minimal props; subject grouping toggle in pie chart

Tests (100% coverage; only these tests in this phase)
- Add files (examples):
  - `src/app/stats/__tests__/stats-page-subjects.dev.test.tsx` (subject grouping + tabs)
  - `src/components/dashboard/widgets/optimized/__tests__/StatsOverviewWidget.dev.test.tsx`
  - `src/components/dashboard/optimized/__tests__/ProductivityPieChartSubject.dev.test.tsx`
- Validate: correctness of data displayed, loading states, memoization (no unnecessary renders), subject grouping UI

Commands
- TypeCheck: `npm run typecheck`
- Build: `npm run build`
- Tests (scoped):
  - `npx jest --coverage --maxWorkers=50% src/app/stats/__tests__/stats-page-subjects.dev.test.tsx src/components/dashboard/widgets/optimized/__tests__/StatsOverviewWidget.dev.test.tsx src/components/dashboard/optimized/__tests__/ProductivityPieChartSubject.dev.test.tsx`
  - or: `npx jest --coverage --maxWorkers=50% --testPathPattern="(src/app/stats/__tests__/.*\\.dev\\.test\\.(ts|tsx)$|src/components/.*/__tests__/.*\\.dev\\.test\\.(ts|tsx)$)"`

Success Gate
- 100% pass and 100% coverage for the Phase 3 tests
- No type errors; build succeeds

---

## Enforcing 100% Coverage on New Tests

- We will author tests to exhaustively cover branches/edges for files touched in each phase.
- Optional (if enforcement is needed): introduce temporary per-phase Jest config overrides with `coverageThreshold` for the targeted files only. Otherwise, verify via the coverage summary after each scoped test run.

## CI Notes (optional)

- Add per-phase jobs that run the three steps in order:
  1) `npm run typecheck`
  2) `npm run build`
  3) Scoped test command (as listed per phase)
- Artifact: coverage report saved under `coverage/`

---

## Rollback & Safety

- Feature flag the new `use-stats` path until parity is confirmed.
- Historical migration writes are idempotent and resumable; keep progress in `meta`.
- No destructive data operations; raw `logs` and `sessions` remain the source of truth.

