# Dashboard & Stats Optimization Plan

Owner: Codex CLI
Status: Draft for review
Scope: Optimize functionality, data flow, and performance for Dashboard (`src/app/page.tsx`) and Stats (`src/app/stats/page.tsx`) pages including their widgets/components and underlying data mechanisms.

---

## 1) Goals & Success Criteria

- Performance: <200ms average render for simple widgets; <16ms re-render cost on interaction; charts lazy-load with skeletons; no jank during DnD or tab switches.
- Data Correctness: All metrics align across Dashboard/Stats for the same study day; “study day” (4am–3:59am) consistently applied.
- Stability: Eliminate redundant re-computations; ensure hooks are resilient to missing sessions and rely on backfilled logs when needed.
- Maintainability: Centralize stat calculations into pure selectors with unit tests; clear cache/invalidations; minimal coupling to UI.
- Offline-first: Use Dexie indexes effectively; minimize liveQuery fan-out; pre-aggregate daily stats for weekly/monthly views.
- UX: Predictable loading states; smooth navigation between daily/weekly/monthly; consistent empty/error states.

---

## 2) Current State Summary (as observed)

- Pages
  - `src/app/page.tsx` (Dashboard): Uses `useGlobalState` + `useDashboardLayout` + `useStats({ timeRange: 'weekly' })`. Provides a map of widgets. Some widgets also call `useStats` internally (for daily), which is okay but can duplicate work across multiple renders.
  - `src/app/stats/page.tsx` (Stats): Heavily relies on `useStats` for time-range dependent data; charts are lazy/dynamic in places; includes date navigation and a range of derived data.

- Data Mechanism
  - Dexie tables with indexes: `plans(date,status)`, `sessions(date)`, `logs(timestamp,type)`, `stats_daily(date)`.
  - `use-stats.tsx` mixes live queries, data shape derivations, and visualization prep. It also backfills sessions from logs if sessions are missing.

- Potential Issues
  - Redundant computation: Multiple heavy `useMemo` blocks recompute on broad deps. Some computations (e.g., weekly/monthly aggregates) can be pre-aggregated.
  - Coupling: `use-stats` couples data access, transformation, and chart mapping; harder to test/memoize.
  - Re-render pressure: Dashboard page constructs widget maps in render; many props/closures change on each render; `useGlobalState` provides a large object causing downstream re-renders.
  - Console noise and dev-only logs in `use-stats`.
  - Backfill work from logs occurs in hook on every mount instead of a background consolidation job.

---

## 3) Target Architecture

- Data Layers
  - Repositories (Dexie): Keep as-is; confirm indexes on `date`, `timestamp`, `type`.
  - Stats selectors (new): Pure, deterministic functions in `src/lib/stats/selectors.ts` taking normalized inputs (sessions, tasks, profile, range, selectedDate) and returning metrics. Thoroughly unit-tested.
  - Stats cache (new): Lightweight in-memory cache keyed by `{timeRange}|{selectedDate|range}`. TTL-based (e.g., 15–30s) plus event-driven invalidation on `logs`, `sessions`, `plans` mutations.
  - Pre-aggregation (enhanced): Maintain `stats_daily` rows for each study day. Aggregate on writes (task complete, routine complete, manual log) and on backfill. Weekly/monthly views then query `stats_daily` instead of recomputing from raw logs/sessions.
  - AI/Gamification integration: Provide selector-derived, ready-to-consume DTOs for the Daily Briefing and Achievement widgets so UI/AI layers don’t implement business rules.

- Hook Layer
  - `useStats` becomes a coordinator:
    - Queries Dexie via `liveQuery` for required source data (tasks, sessions, profile, badges) and for `stats_daily` aggregates for wide ranges.
    - Normalizes the “study day” window for selectedDate and ranges.
    - Delegates calculations to selectors with strict inputs.
    - Uses the stats cache to avoid recomputes while inputs are unchanged and within TTL.
    - Exposes a stable, minimal API for both pages.

- UI Layer
  - Widgets/components accept minimal props and are wrapped in `React.memo` where appropriate.
  - Charts are code-split (existing) and gated with Suspense/Skeleton.
  - Dashboard widget map and props map created via `useMemo` to avoid churn.
  - Use `VirtualList` for any long lists (activity, routines) where applicable.

---

## 4) Data Contracts (proposed)

- `useStats({ timeRange, selectedDate })` returns:
  - `timeRangeStats`: { totalHours, totalPoints, completedCount, completionRate, avgSessionDuration, focusScore }
  - `studyStreak`: number
  - `badgeStats`: { earnedCount, totalCount }
  - `categorizedBadges`: Record<BadgeCategory, Badge[]>
  - `barChartData`: array for weekly/monthly/overall (from `stats_daily` aggregates)
  - `chartDetails`: { title, description }
  - `dailyPieChartData`: breakdown for the selected study day; supports grouping by `task|routine` or `subject`
  - `dailyComparisonStats`: { today, yesterday, dailyAverage, last3DaysAverage, weeklyAverage, monthlyAverage }
  - `dailyActivityTimelineData`: Activity[] for selected day (already normalized to study-day window)
  - `performanceCoachStats`: { selectedDateSession, week: { avgStart, avgEnd } }
  - `routineStats`: Array<{ name, totalSeconds, sessionCount, points }>
  - `peakProductivityData`: Array<{ hour, totalSeconds }>
  - `realProductivityData`: 7-day trend [{ day, productivity }]
  - `activeProductivityData`: 7-day trend [{ day, productivity }]
  - `dailyRealProductivity`: number
  - `dailyActiveProductivity`: number
  - `subjectPerformanceTrends`: Array<{ subject: string, totalSeconds: number, points: number }> for the current timeRange
  - `newlyUnlockedBadges`: Badge[] (derived from aggregates + definitions)
  - `achievementProgress`: { nextBadge: Badge | null, progress: number } — normalized (0–1) proximity to the nearest unlock

Note: The current shape mostly matches this; the goal is to source weekly/monthly from `stats_daily` and to ensure consistent study-day boundaries in all selectors.

---

## 5) Detailed Changes by Layer

### 5.1 Repositories / Dexie

- Confirm/ensure indexes:
  - `sessions`: `id, date` (OK)
  - `logs`: `id, timestamp, type` (OK)
  - `stats_daily`: `date` (OK); add aggregate fields if needed (totalProductiveSeconds, totalPausedSeconds, points, sessionsCount, focusScore, etc.).

- Subjects alignment (new):
  - `plans` (tasks): add `subject?: string` (e.g., "Calculus", "History Paper"). Consider secondary index on `subject` if future queries need it.
  - `routines`: add `subject?: string`.
  - `sessions`: persist `subject` from originating task/routine when backfilling or writing new sessions.
  - `stats_daily`: include per-subject rollups: `{ date, totals: {...}, subjects?: Record<string, { totalSeconds: number; points: number; sessionsCount: number }> }`.

- Add a background backfill job:
  - On app boot and when new logs arrive, convert logs into sessions if missing (persistently) using `buildSessionFromLog` and write/update `sessions` + `stats_daily` for that day.
  - Ensure idempotency via deterministic IDs (`session-${log.id}`) and upserts.

- Write utilities:
  - `src/lib/stats/aggregate-daily.ts`: produce `DailyAggregate` from sessions/logs for a given study day and persist to `stats_daily`.
  - Trigger on: session add/update, log add/update (via existing state actions), manual logs, and undo actions.

### 5.2 Selectors & Cache

- `src/lib/stats/selectors.ts`
  - Pure functions:
    - `selectDailyPieData(work, selectedDate)`
    - `selectTimeline(work, selectedDate)`
    - `selectTimeRangeStats(work, tasks)`
    - `selectPerformanceCoach(work, selectedDate)`
    - `selectRoutineStats(work)`
    - `selectPeakProductivity(work)`
    - `selectProductivitySeries(work, profile)`
    - `selectDailyComparison(work, selectedDate)`
    - `selectSubjectTrends(aggregates|work, timeRange)` → `subjectPerformanceTrends`
    - `selectBadgeEligibility(dailyAggregates, allBadges)` → `newlyUnlockedBadges`
    - `selectAchievementProgress(daily|rangeAggregates, allBadges)` → `{ nextBadge, progress }`
    - `selectAiBriefingData(dailyComparisonStats, badgeStats)` → AI-ready DTO for Daily Briefing
  - Inputs: arrays of sessions/CompletedWork (already filtered), tasks, profile, selectedDate/timeRange. Outputs: serializable POJOs.
  - 100% unit-tested; deterministic; no side effects or console logs.

- `src/lib/stats/cache.ts`
  - Simple in-memory map: key = `${timeRange}|${selectedDateISO}` or `${startDate}:${endDate}`.
  - TTL per entry; invalidation events on relevant repo changes.
  - Optional: small LRU to cap memory.

### 5.3 Hook `use-stats` Refactor

- Responsibilities:
  - Build `dateRange` with study-day semantics.
  - Use `liveQuery` for tasks, sessions, badges, profile. For weekly/monthly/overall, prefer `stats_daily` read instead of raw `sessions`.
  - If `sessions` are missing, defer to logs-derived sessions only once, or schedule backfill job to persist derived sessions and aggregates, then read from Dexie.
  - Call selectors and serve results from cache where valid; recompute only on:
    - `timeRange`/`selectedDate` changes
    - relevant repo mutations (logs/sessions/tasks/profile)
  - Remove dev `console.log` calls and broad deps to reduce recompute frequency.

### 5.4 Dashboard Page (`src/app/page.tsx`)

- Stability tweaks:
  - Wrap `SortableWidget` in `React.memo`.
  - `widgetMap` and `widgetPropsMap` inside `useMemo` with tight deps to avoid re-creation each render.
  - Ensure only minimal props are passed into widgets (avoid large `state` object; pass derived slices or use dedicated hooks in each widget).
  - Keep `useStats({ timeRange: 'weekly' })` for trend widgets; avoid triggering daily stats twice in the page if a child provides its own daily stats.
  - Add Suspense boundaries for lazy widgets consistently.

- Observability:
  - Wrap heavy widgets with `withPerformanceMonitoring` (existing util) and sample render times.

### 5.5 Stats Page (`src/app/stats/page.tsx`)

- UX/Perf
  - Debounce date changes (use `useDebouncedValue`) to prevent rapid recomputes when clicking prev/next quickly.
  - Ensure all charts are dynamically imported with skeletons; maintain stable keys so React doesn’t remount unnecessarily when `timeRange` toggles.
  - Use memoized derived props; don’t pass entire objects where slices suffice.

- Data Correctness
  - Normalize all daily queries through the study-day boundary function.
  - Ensure `dailyActivityTimelineData` and pie chart use the exact same filtered work set for the selected day.

### 5.6 Widgets/Components

- General
  - Convert widgets to `React.memo` where inputs are shallow and stable.
  - For list-like UIs (activity/routines), consider `src/components/ui/virtual-list.tsx`.
  - Validate empty/error states across all widgets to avoid “nothing” renders.

- Specific (widget → primary data source)
  - `StatsOverviewWidget`: Source all numbers from a single `useStats({ timeRange: 'daily' })` instance; avoid recomputation per sub-card; ensure props are minimal.
  - Productivity widgets (daily/real/active): receive pre-computed numbers only; avoid computing trends locally.
  - Charts: limit and format domains (already implemented for real productivity); ensure consistent units/legends.
  - `UnlockedBadgesWidget` (Badges Unlocked Today): use `newlyUnlockedBadges` and `badgeStats`.
  - `AchievementCountdownWidget`: use `achievementProgress` for nearest target and progress.
  - `CompletedTodayWidget` / Today’s Activity Feed: prefer `dailyActivityTimelineData`; render long feeds with `VirtualList`.
  - `ProductivityPieChart`: accept `dailyPieChartData` and support an optional subject grouping toggle.
  - `RoutineStatsList`: use `routineStats` and display `subject` when available.

---

## 6) Implementation Phases & Milestones

Phase 0 — Baselines (0.5 day)
- Add performance sampling toggles to Dashboard/Stats pages via `withPerformanceMonitoring` where relevant.
- Capture pre-optimization metrics (DevTools Performance; FPS during DnD and tab switch).

Phase 1 — Selectors & Cache (1.5–2 days)
- Extract pure selectors to `src/lib/stats/selectors.ts` with unit tests.
- Implement `src/lib/stats/cache.ts` and wire into `use-stats`.
- Remove dev logs; tighten `useMemo` deps.

Phase 2 — Pre-aggregation (1–1.5 days)
- Implement `aggregate-daily.ts`; persist aggregates to `stats_daily`.
- Integrate into log->session backfill and on write/update operations.
- Update `use-stats` to use `stats_daily` for weekly/monthly.

Phase 2.5 — Historical Data Migration (0.5–1 day)
- One-time background job on upgrade: iterate all historical `logs`/`sessions`, backfill `sessions` where missing, and populate `stats_daily` for each past study day (including per-subject rollups).
- Idempotent and resumable (e.g., track `lastMigratedDate` in `meta`).

Phase 3 — UI Stability & Rendering (1–1.5 days)
- Memoize widget maps and props; wrap heavy widgets with `React.memo`/`withPerformanceMonitoring`.
- Debounce `selectedDate` changes in Stats page.
- Ensure all charts are lazy with stable Suspense boundaries.
- Apply `VirtualList` where a list can exceed ~40 items.

Phase 4 — QA & Polish (0.5–1 day)
- Verify data parity across Dashboard/Stats for the same day.
- Validate empty and loading states; fix any race conditions.
- Update documentation (`documentation/screens.md`) and add short developer notes.

---

## 7) Risks & Mitigations

- Risk: Cache staleness
  - Mitigation: Short TTL + explicit invalidation on repo mutations; document invalidation points.

- Risk: Aggregate drift if background jobs fail
  - Mitigation: Idempotent upserts; periodic reconciliation job scans recent days and recomputes aggregates.

- Risk: Re-render regressions from global state
  - Mitigation: Narrow props; use memoized selectors; prefer hook-local `useLiveQuery` where possible.

---

## 8) Testing Plan

- Unit tests for selectors (deterministic inputs/outputs).
- Integration tests for `use-stats`: ensures consistent results across time ranges and for study-day boundaries.
- Component snapshot/interaction tests for critical widgets.
- Perf smoke tests: assert memoized selectors call counts under repeated renders.

---

## 9) Concrete Code Changes (Proposed File Map)

- New
  - `src/lib/stats/selectors.ts` — pure computation utilities
  - `src/lib/stats/cache.ts` — in-memory cache with TTL and invalidation
  - `src/lib/stats/aggregate-daily.ts` — daily aggregates writer

- Modified
  - `src/hooks/use-stats.tsx` — refactor to use selectors/cache/aggregates
  - `src/app/page.tsx` — memoize widget map/props; wrap heavy widgets
  - `src/app/stats/page.tsx` — debounced date change; stabilized Suspense boundaries
  - Widgets using `React.memo` where appropriate
  - `documentation/screens.md` — reflect updated behaviors and loading states

---

## 10) Rollout Plan

- Feature flag the pre-aggregation path while verifying parity with legacy compute.
- Ship behind flag; compare metrics and data parity in dev/staging.
- Enable by default once verified.

---

## 11) Post-Review Notes / Open Questions

- Should we persist more detailed aggregates (e.g., hourly bins per day) to eliminate recompute for peak-productivity charts?
- Are there additional dashboard widgets planned that require new data shapes we can support in selectors now?
- Any constraints on memory for cache sizing on low-end devices?
