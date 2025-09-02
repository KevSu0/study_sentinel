# Dashboard Optimization & De‑duplication Plan (AI Aging Development)

This plan outlines a complete, staged optimization and cleanup strategy for the Dashboard and shared Stats experiences. It includes a deduplication roadmap, performance goals, architectural decisions, and a milestone‑based rollout. The approach embraces “AI aging development”: continuous instrumentation, automated analysis, and iterative improvements guided by metrics rather than one‑off refactors.

## Objectives & KPIs
- JS payload: reduce dashboard route JS by ≥25%.
- Interactivity: cut Total Blocking Time ≥40%; LCP ≤2.2s on mid‑tier devices.
- Stability: unrelated state updates do not re‑render widgets.
- Memory: no growth after 10x dashboard↔stats navigation.
- Maintainability: remove duplicate implementations and converge on a single optimized path.

### Performance Budgets (CI‑enforced)
- Route JS/Images budgets
  - dashboard: −25% JS vs baseline, <180 KB gzip; <80 KB images above fold.
  - Chunk count: ≤12 on first interaction; max 1 vendor chart chunk.
- Web Vitals gates: LCP ≤2.2s, FID/INP <100 ms, TBT −40%, CLS <0.05.
- Render budgets (per widget): first paint ≤2 renders; interaction re‑render ≤1.
- Memory guardrail: no retained heap growth after 10× dashboard↔stats; ≤+5% delta.

Documentation: add these to docs/perf-budgets.md and fail CI if exceeded.

## Findings (Current Hotspots)
- Duplicate/parallel widget implementations:
  - `src/components/dashboard/widgets/stats-overview-widget.tsx`
  - `src/components/dashboard/widgets/optimized/stats-overview-widget-optimized.tsx`
  - `src/components/dashboard/productivity-pie-chart.tsx`
  - `src/components/dashboard/optimized/productivity-pie-chart-optimized.tsx`
  - `src/components/dashboard/optimized/task-list-widget-optimized.tsx`
  - `src/components/dashboard/optimized/routine-tracker-widget-optimized.tsx`
- State provider duplication and leak risk:
  - `src/state/providers/AppStateProvider.tsx` (custom context + core state)
  - `src/hooks/state/AppStateProvider.tsx` (composed domain providers)
  - `src/state/core/use-app-state.tsx` appears to contain an unrelated `'use client'` provider snippet appended near the end (file contamination/duplication that must be removed).
- Shared UI/logic scattered across dashboard and stats with inconsistent patterns; common shells and selectors are missing.
- Lazy loaders exist but not standardized for all heavy widgets (`src/components/lazy/*.tsx`).

## Architecture Decisions (ADRs)
1. Single optimized widget path: keep optimized implementations and migrate/remap imports. Remove legacy duplicates.
2. Selector‑first data wiring: use stable, memoized selectors from `src/hooks/use-global-state-optimized.tsx` and `src/hooks/use-stats-optimized.tsx` to feed presentational views.
3. Shared widget primitives: introduce a reusable `WidgetShell` with slots (header/body/footer/error/skeleton) and a `WidgetErrorBoundary` + `WidgetSuspense` wrapper.
4. Client/server boundaries: default to Server Components for static layout; client‑only dynamic charts via `next/dynamic` with SSR disabled.
5. Virtualization by default for long lists via `src/components/ui/virtual-list.tsx`.
6. Continuous perf loop: instrument, record, enforce budgets in CI, iterate.

## Work Plan (Phases)

### Phase 1 — Instrument & Baseline
- Add perf marks to dashboard and each widget using `src/utils/performance-monitor.ts` and render in `src/components/debug/performance-dashboard.tsx`.
- Run bundle analyzer (`webpack-bundle-analyzer.config.js`, `tree-shaking.config.js`) and record current route payloads.
- Define budgets (size, render counts) as acceptance gates.

Deliverables:
- Baseline report committed to `docs/perf-baseline.md`.
- CI budget thresholds.

### Phase 0 — Kill Switch & Codemod (pre‑work)
- Add feature flags: `NEXT_PUBLIC_FLAGS={"optimizedWidgets":true,"optimizedSelectors":true}` (or equivalent flag system).
- Create a compat layer: `src/compat/widgets/*` re‑export optimized widgets under legacy names to enable one‑switch rollback.
- Add a jscodeshift codemod `scripts/codemods/optimize-widgets.ts` to rewrite imports to the compat layer; run once, then soak.

### Phase 2 — Shared Primitives
- Add shared components:
  - `src/components/widgets/shared/WidgetShell.tsx`
  - `src/components/widgets/shared/WidgetErrorBoundary.tsx`
  - `src/components/widgets/shared/WidgetSuspense.tsx`
- Standardize props: `title`, `toolbar`, `skeleton`, `error`, `children`.

Deliverables:
- New shared primitives with story/usage examples.

Tests:
- Contract tests for WidgetShell (skeleton dimensions, heading levels, error slot short‑circuit) and basic a11y roles.

### Phase 3 — Selector Unification
- Adopt optimized selectors everywhere:
  - `src/hooks/use-global-state-optimized.tsx`
  - `src/hooks/use-stats-optimized.tsx`
  - `src/hooks/use-plan-data-optimized.ts`
- Ensure stable identities (`useMemo`/`useCallback`) and shallow equality to prevent prop churn.

Deliverables:
- Updated widgets to read through selectors; render counts drop confirmed.

Tests:
- Selector “shape” contract tests (snapshot only the output shape) and P95 selector cost using React Profiler.

### Phase 4 — Widget Refactors (Pure + Memo)
- Convert each widget to: selector hook (data) + pure view (render) + thin container.
- Wrap views with `React.memo`; avoid inline objects/functions.
- Use `startTransition` and `useDeferredValue` where appropriate.

Targets:
- `stats-overview-widget` (dashboard + stats page usage)
- `productivity-pie-chart`
- `task-list` and `routine-tracker` widgets

Dev ergonomics:
- Enable Why‑Did‑You‑Render in dev for these widgets with a whitelist.

### Phase 5 — Virtualization & Deferral
- Use `src/components/ui/virtual-list.tsx` for long lists in task/routine widgets.
- Defer low‑priority effects with `requestIdleCallback` fallback.

### Phase 6 — Code‑Splitting & Libraries
- Ensure all heavy charts/icons imported via `next/dynamic` with granular chunks.
- Audit `src/components/lazy/dashboard-components.tsx`, `src/components/lazy/page-components.tsx`, `src/components/lazy/library-components.tsx` for consistency and fallbacks.
- Avoid barrel imports that defeat tree‑shaking.

CI:
- Ensure single vendor chart chunk and record module size map in `perf/bundle-map.json` for PR diffs.

### Phase 7 — Server/Client Boundary Audit
- Keep page/layout as Server Components by default.
- Client‑only charts: `dynamic(() => import(...), { ssr: false })`.
- Move pure transforms to server where possible to reduce client JS.

Further:
- RSC precomputation for day‑range normalization and view‑model shaping.
- Prefetch selector inputs at the edge with `revalidate: 60` for above‑the‑fold.

### Phase 8 — Assets & Sounds
- Route images through `src/components/ui/optimized-image.tsx`; set explicit sizes to prevent CLS.
- Lazy load sounds in `src/providers/sound-provider.ts` when a setting toggles a sound feature.

### Phase 9 — Offscreen Pause & Memory Hygiene
- IntersectionObserver wrappers to pause timers/polling when widgets offscreen.
- Integrate with `src/utils/memory-manager.ts` to release caches and throttle background syncing.

### Phase 10 — Tests, Telemetry & Budgets
- Add render/perf regression tests for selectors and key widgets:
  - `src/hooks/__tests__/use-global-state-optimized.test.tsx`
  - `src/hooks/__tests__/use-plan-data-optimized.test.tsx`
- Add CI checks for route bundle sizes and render counts.

CI guardrails (practical & low‑noise):
- Three fast checks (≤60s):
  1) Bundle budgets (webpack plugin + baseline JSON)
  2) Render count test (Jest + React Profiler tracing)
  3) Synthetic Web‑Vitals (Lighthouse CI, throttled mid‑tier)
- Quarantine lane: auto‑label `perf-regression` and require perf owner approval on fail.

## Realtime Data & DB Flow (DB‑In)

This project already ships an offline‑first IndexedDB layer using Dexie, repositories, and an Outbox for deferred sync. We will formalize a realtime data flow and wire widgets to DB events for instant UI updates.

Overview of current building blocks:
- DB Core: `src/lib/db.ts:1` (Dexie schema + tables: tasks/plans, routines, logs, sessions, badges, stats_daily, outbox, syncConflicts, cachedAIResponses, userPreferences)
- Repositories: `src/lib/repositories/*.ts:1` (BaseRepository with local‑first writes + outbox queuing)
- DB Init: `src/lib/db-init.ts:1` (opens Dexie; populate/migration handled in `db.ts`)
- Sync: `src/utils/sync-engine.ts:1` and `src/lib/sync.ts:1` (sync engine surface and status)
- Live queries: `dexie-react-hooks` already used in `src/hooks/use-stats-optimized.tsx:1`

Data lifecycle (write path):
- UI event → action → repository.add/update/delete → Dexie write → notify LiveQuery subscribers
- If offline or remote write fails → enqueue in `outbox` with metadata → background sync later

Data lifecycle (read path):
- Widget/container hooks subscribe via LiveQuery to specific tables/indexed queries
- Selectors derive memoized view‑models → pure components render with React.memo

Realtime subscriptions
- Adopt `useLiveQuery` across dashboard widgets for DB‑backed data where applicable (tasks, logs, routines, daily stats):
  - Replace ad‑hoc state copies with table‑scoped queries (e.g., today’s tasks by `date` and non‑archived)
  - Keep lightweight selector wrappers that normalize records to widget props

Offline‑first + Outbox
- Continue using BaseRepository’s outbox queuing on add/update/delete
- Add a periodic sync task (visibility‑aware) that flushes `outbox` and writes to the remote API (pluggable transport)
- Record conflicts in `syncConflicts` and expose a resolve API for UI

Background sync design
- Triggers:
  - On `online` event
  - On app focus (staggered)
  - On interval with exponential backoff
- Pipeline:
  1) Read N items from `outbox`
  2) POST/PATCH/DELETE to remote endpoint
  3) On success: remove outbox item; possibly write remote timestamps/versions
 4) On 409/412: create `syncConflicts` entry with local+remote payload

Conflict resolution
- Policy: default `remote_wins` for immutable history (logs/sessions); `local_wins` for user preferences; manual for tasks/routines with timestamp skew
- Repository API: `resolveConflict(id, choice)` applies chosen payload and clears conflict

Backpressure and memory hygiene
- Scope LiveQuery selectors to minimal fields/indexes; avoid full table scans
- Use `useDeferredValue` or `startTransition` when mapping large query results
- Release observers on unmount via `useMemoryManager` hooks

Instrumentation & budgets
- Counters: outbox length, conflicts count, last sync time, query durations
- Surface in `src/components/debug/performance-dashboard.tsx:1` under a “DB” tab
- Budgets: keep outbox < 100 items for >95% sessions; conflicts resolved < 24h

Implementation steps
1) Add `realtime` hooks:
   - `useTasksLiveQuery(filter)`
   - `useRoutinesLiveQuery(filter)`
   - `useLogsLiveQuery(range)`
   - `useDailyStatsLiveQuery(date)`
2) Wire dashboard widgets to these hooks (replace ad‑hoc state where safe)
3) Implement `syncEngine.start()` to schedule background flushes and listen to `online`/visibility events
4) Add conflict UI (minimal list + resolve buttons) in a dev/debug panel, then optional production dialog if conflicts occur
5) Add tests for live query updates and outbox flushing

Acceptance criteria (DB‑In)
- UI reflects DB writes within 100ms in the same tab
- Outbox flushes automatically when online, with exponential backoff; manual sync available in debug
- Conflict entries created on server version mismatch; resolution API works and updates UI via LiveQuery
- No memory growth under repeated LiveQuery mount/unmount (10x) and scrolling lists are virtualized

Dexie performance & correctness
- Add/upgrade compound indexes for hot queries (e.g., tasks [date+status], logs [timestamp+type]); write explicit migrations.
- Query shaping: select minimal columns and avoid full table scans in LiveQuery.
- Debounce LiveQuery invalidations (16–32ms) and use deferred mapping for large arrays.
- Sync safety: use updatedAt/version to avoid ping‑pong; persist policy in `conflicts.ts`.

## Deduplication Roadmap (Delete/Converge)

Canonical choices are optimized implementations unless otherwise stated.

1) Widgets
- Keep: `src/components/dashboard/widgets/optimized/stats-overview-widget-optimized.tsx`
  - Action: Update `src/components/lazy/dashboard-components.tsx` to import the optimized component under `LazyStatsOverviewWidget`.
  - Delete after migration: `src/components/dashboard/widgets/stats-overview-widget.tsx`.

- Keep: `src/components/dashboard/optimized/productivity-pie-chart-optimized.tsx`
  - Action: Replace imports of `src/components/dashboard/productivity-pie-chart.tsx`.
  - Delete after migration: `src/components/dashboard/productivity-pie-chart.tsx`.

- Keep: `src/components/dashboard/optimized/task-list-widget-optimized.tsx` and `src/components/dashboard/optimized/routine-tracker-widget-optimized.tsx`
  - Action: Ensure dashboard/stats use these; remove any older equivalents if present.

Compat & flags
- Add `src/compat/widgets/*.tsx` re‑exporting optimized implementations under legacy names.
- Gate each widget behind flags in `NEXT_PUBLIC_FLAGS` for canary rollout (5–10%) before 100%.

2) State Providers
- Choose single provider composition to avoid duplication:
  - Preferred: `src/hooks/state/AppStateProvider.tsx` (composed domain providers; aligns with tests under `src/hooks/state/domains/*`).
  - Actions:
    - Fix contamination in `src/state/core/use-app-state.tsx` by removing the appended `'use client'` provider block (it belongs to hooks provider) and keep only the core hook logic there.
    - Deprecate `src/state/providers/AppStateProvider.tsx` in favor of the hooks version. Add a transitional re‑export if needed, then remove usages and delete the file.

3) Lazy Modules
- Ensure only one set of lazy wrappers exists per purpose. Standardize fallbacks and naming in:
  - `src/components/lazy/dashboard-components.tsx`
  - `src/components/lazy/page-components.tsx`
  - `src/components/lazy/library-components.tsx`
- Remove redundant/unused lazy wrappers; prevent accidental duplication across files.

4) Selectors & Hooks
- Keep optimized hooks:
  - `src/hooks/use-global-state-optimized.tsx`
  - `src/hooks/use-stats-optimized.tsx`
- Migrate widgets to these selectors; avoid direct context reads where not necessary.
- Keep legacy hooks only behind a compatibility layer for non‑refactored code.

## File‑by‑File Actions (Initial Sprint)
- Update imports and lazy loaders to optimized widgets:
  - `src/components/lazy/dashboard-components.tsx`
- Migrate dashboard page usage:
  - `src/app/page.tsx` → ensure `LazyStatsOverviewWidget` points to optimized.
- Fix state contamination:
  - Clean `src/state/core/use-app-state.tsx` by removing the appended provider code.
  - Replace usages of `src/state/providers/AppStateProvider.tsx` with `src/hooks/state/AppStateProvider.tsx` and remove the former after usage audit.
- Create shared primitives:
  - `src/components/widgets/shared/WidgetShell.tsx`
  - `src/components/widgets/shared/WidgetErrorBoundary.tsx`
  - `src/components/widgets/shared/WidgetSuspense.tsx`
- Virtualize long lists in relevant widgets using `src/components/ui/virtual-list.tsx`.

Additional file‑level To‑Dos
- `scripts/codemods/optimize-widgets.ts`: rewrite duplicate imports → compat layer.
- `src/compat/widgets/*.tsx`: temporary re‑exports of optimized widgets.
- `src/workers/stats.worker.ts` + `src/hooks/use-worker-query.ts`: Workerize heavy aggregations.
- `src/state/events.ts`: minimal domain event bus for cross‑hook signals.
- `perf/lighthouse.config.cjs` + `scripts/check-budgets.mjs`: CI budgets.
- Dexie migrations for new compound indexes.

## Acceptance Criteria
- Route JS reduced by ≥25% for dashboard and budgets respected.
- LCP ≤ 2.2s; TBT reduced by ≥40%.
- No unnecessary re‑renders on unrelated state updates (verified via perf dashboard).
- Duplicated files removed or replaced with single canonical versions.
- All tests green; add 2–3 perf‑focused tests.

Definition of Done (expanded)
- Budgets pass in CI (bundle, vitals, renders, memory).
- Dupes removed with a one‑switch flag to revert.
- No SSR/CSR mismatch (e2e smoke).
- Selector contracts stable (shape snapshots green).
- 10× nav shows ≤5% heap delta; no listener leaks.
- Docs: perf-baseline.md, perf-budgets.md, and a perf‑runbook.

## Rollout & AI Aging Loop
1. Implement Phase 1–4 changes in small PRs; measure before/after.
2. Enable perf dashboard during development and record weekly snapshots.
3. Add CI budgets; block regressions.
4. Schedule monthly “AI aging” passes to:
   - Re‑run analyzer, review telemetry.
   - Auto‑open issues for new hotspots (large modules, slow renders, memory drift).
   - Apply codemods (e.g., import narrowing, memoization hints, dynamic import hints).

## Risks & Mitigations
- Behavior drift from selector swaps → Comprehensive widget tests and fallback to legacy hook per‑widget if needed.
- SSR/CSR mismatch with new boundaries → Add e2e sanity check for dashboard mount.
- Chart loading shifts LCP → Keep above‑the‑fold skeletons and defer heavy charts via dynamic imports.

---

If you want, I can begin by:
- Creating the shared `WidgetShell` primitives.
- Updating lazy imports to target optimized widgets.
- Cleaning `src/state/core/use-app-state.tsx` and deprecating the duplicate provider.
