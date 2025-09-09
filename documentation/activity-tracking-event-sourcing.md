**Activity Tracking Event Sourcing Plan**

**Scope**
- **Goal:** Replace ad-hoc log mutations with append-only domain events and projections powering Plans, Dashboard, Stats, and related features. Preserve current UI behavior while making history consistent and auditable.
- **One-time Migration:** Perform a single backfill on first app update then never run migration again (guarded by a persisted flag). No ongoing dual migration.
- **Compatibility:** Keep `use-global-state` signatures and UI shapes stable to avoid broad refactors. All components (timer, retry, revoke, stats) continue to function during and after cutover.

**Design Overview**
- **Event Store:** Dexie-backed `events` table (IndexedDB) storing ordered, immutable events with indices for `timestamp`, `type`, and `dateKey`.
- **Event Schema:** `{ id, type, timestamp, payload, meta }` with Zod validation, versioned via `meta.v`. Use `crypto.randomUUID()` for `id`.
- **Ordering & Idempotency:** Add `meta.seq` (monotonic per device) and optional `meta.idempotencyKey` for command retries. Sort by `(timestamp, seq, id)`.
- **Projections:** Incrementally build materialized views: Tasks, Routines, Sessions (CompletedWork), Activity (Today’s), Timer (runtime view), Badges. Persist Sessions for fast Stats queries.
- **Undo/Redo:** Non-destructive. “Retry” emits compensating `*_RETRY`. “Delete Log” becomes “Revoke Completion” (compensating `COMPLETION_REVOKED`). Projections set `isUndone` to hide revoked sessions while keeping history.
- **Snapshots:** Persist projection snapshots with `snapshotVersion`. On version bump, discard and replay events.

**Canonical Domains & Events**
- **Timer:** `TIMER_START`, `TIMER_PAUSE`, `TIMER_RESUME`, `TIMER_STOP`, `TIMER_SESSION_COMPLETE`.
- **Task:** `TASK_ADD`, `TASK_UPDATE`, `TASK_ARCHIVE`, `TASK_UNARCHIVE`, `TASK_PUSH_NEXT_DAY`.
- **Routine:** `ROUTINE_ADD`, `ROUTINE_UPDATE`, `ROUTINE_DELETE`, `ROUTINE_SESSION_COMPLETE`.
- **Undo/Redo:** `TASK_RETRY`, `ROUTINE_RETRY`, `COMPLETION_REVOKED` (references completion eventId or subject id when historical linkage is missing).
- **Engagement (optional, preserved):** `BADGE_EARNED`, `SETTINGS_UPDATED`, `PROFILE_UPDATED` (same payloads as today).

**Projections (Materialized Views)**
- **TasksProjection:** Builds tasks array/statuses from `TASK_*` + timer side-effects. Preserves existing shape used by UI. Source of truth for `tasks` list.
- **RoutinesProjection:** Builds recurring schedule metadata; maintains `days/startTime/endTime/priority` used across UI.
- **SessionsProjection:** Emits `CompletedWork[]` from `*_SESSION_COMPLETE`. Sets `isUndone` when corresponding `*_RETRY`/`COMPLETION_REVOKED` exists. Persists to Dexie `sessions` table.
- **ActivityProjection:** Derives Today’s feed items matching `ActivityFeedItem` shape (task/routine + log + `isUndone`). Drives Dashboard and Plans “Completed Today”.
- **TimerProjection:** Runtime view (active item, paused, overtime, progress). Persists minimal timer state; remains independent from replay frequency.
- **BadgesProjection:** Computes newly earned badges from `CompletedWork` + tasks. Writes to same places current code reads from.

**Feature Coverage (Double-Checked)**
- **Plans Page:** Upcoming/overdue lists, manual completion, retry, revoke; respects study-day boundaries.
- **Dashboard:** Today’s Activity feed, Quick Start (redo/retry), routine tracker, productivity pie, points/streaks; consistent `isUndone` behavior.
- **Stats:** Daily/weekly/monthly, pie/timeline/series, subject trends, productivity, peak hours; all rely on SessionsProjection.
- **Timer:** Start/pause/resume/stop/complete; infinity and countdown; milestones, quotes, stars, sounds.
- **Tasks & Routines:** Add/update/archive/unarchive/push-to-next-day; routine subjects per day; editing dialogs.
- **Badges:** Detection and awarding flow; daily earned mapping preserved.
- **Misc:** Logs page, Archive view, Calendar day/week, Profile/Settings, PWA offline.

**Migration (One-Time Only)**
- **Source → Events:** Convert legacy `logs` into canonical events. Normalize manual `TASK_COMPLETE` into `TIMER_SESSION_COMPLETE` for consistency.
- **Retry/Undo Mapping:** For legacy `updateLog({isUndone:true})` and existing `*_RETRY` entries, emit compensating events to set `isUndone` in projections.
- **Flag:** Write `eventsBackfill_v1` timestamp to localStorage upon success. On subsequent app loads, skip migration entirely. Avoid conflict with existing `sessionsBackfill_v1` and `sessionsIdMigration_v1` flags.
- **Mid-Session Safety:** If a timer is active during update, finish migration but preserve `TIMER_KEY`. Post-update commands emit events only.

**API Compatibility (Hooks)**
- **Unchanged Surface:** `addTask`, `updateTask`, `archiveTask`, `unarchiveTask`, `pushTaskToNextDay`, `startTimer`, `togglePause`, `completeTimer`, `stopTimer`, `manuallyCompleteItem`, `retryItem`, `addLog`, `removeLog`, `updateLog` remain.
- **Command Adapters:** Internally, these emit events and let projections update state. `removeLog` maps to `COMPLETION_REVOKED`. `updateLog({isUndone})` maps to `*_RETRY` or revoke under the hood.

**UI/UX Adjustments**
- **Copy:** “Delete Log” → “Revoke Completion” in:
  - `src/components/plans/plan-item-card.tsx:186`
  - `src/components/plans/plan-item-list-item.tsx:130`
  - `src/components/plans/completed-plan-list-item.tsx:165`
- **Consistency:** Use “Retry” (not “Redo”); update Quick Start:
  - `src/components/dashboard/quick-start-sheet.tsx:58`
- **Indicators:** Keep strikethrough + Undo icon when `isUndone` is true. Optionally add a small “Revoked” badge on completed list rows.
- **Loading:** During first replay/snapshot build, show skeleton/spinner for Completed Today and Stats (not empty state) to avoid flicker.

**Data & Ordering Guarantees**
- **Indices:** `events(timestamp asc, type, dateKey)`, `sessions(date asc)`. Keep dateKey = `format(getStudyDateForTimestamp(ts), 'yyyy-MM-dd')`.
- **Ordering:** Use `(timestamp, meta.seq, id)` compare to stabilize replay across refreshes.
- **Idempotency:** Commands may supply an `idempotencyKey` to ignore duplicate adds on flaky networks or multi-clicks.

**Validation & Types**
- **Zod Schemas:** Validate each event payload. Upconvert old shapes by `meta.v` if needed.
- **Types First:** Run `npx tsc --noEmit` in Phase 2; fix all new/changed types.

**Observability**
- **Dev Logging:** Gate detailed projection logs behind `NODE_ENV === 'development'`.
- **Debug Panel (optional):** Tiny in-app dev panel to inspect last N events and active projections.

**Risks & Mitigations**
- **Replay Cost:** Use snapshots and incremental projection updates to avoid cold-start lag.
- **Storage Limits:** Keep payloads minimal; consider pruning snapshots. Alert user if storage quota errors occur.
- **Clock Skew:** Always compute study-day by UTC logic already used; tolerate minor clock drift.
- **Multi-tab:** Write queue with Dexie transactions; listen for `storage` events to update projections cross-tab.

**Phase 1 — Implement All Development**
- **Event Schema & Store**
  - Define Zod schemas per event type; add `meta` fields and versioning.
  - Implement Dexie `EventRepository` with indices and helpers: `add`, `getByDate`, `getByRange`, `stream`.
- **Projections & Snapshots**
  - Implement Tasks/Routines/Sessions/Activity/Timer/Badges projections with deterministic reducers.
  - Add snapshot persistence with `snapshotVersion` constant; background replay to rebuild.
- **Command Adapters**
  - Refactor `src/hooks/use-global-state.tsx` commands to emit events; maintain method signatures.
  - Map `removeLog` → `COMPLETION_REVOKED`; `updateLog({isUndone})` → compensating events.
- **UI Copy & Indicators**
  - Update labels and aria text for Retry/Revoke in Plans components and Quick Start.
  - Optional: Add “Revoked” badge in completed list items.
- **One-time Migration**
  - Add `migrateLogsToEvents()` reading legacy logs and writing events.
  - Emit compensating events for existing retry/undo semantics.
  - Set `eventsBackfill_v1` flag after successful run; never run again.
- **Stats Wiring**
  - Ensure `use-stats.tsx` prefers SessionsProjection; keep legacy logs-derived fallback behind a feature flag and disable after validation.
- **Timer Integrity**
  - Ensure `start/pause/resume/stop/complete` produce identical visible outcomes; preserve milestones, quotes, star count, sounds.

**Phase 1 Status: Completed**
- Implemented event schema/store, one-time migration, dual-write adapters, and projections for sessions, activity, tasks, and routines.
- Added minimal projection engine and daily snapshots for sessions.
- Wired optional reads via feature flags to validate without breaking defaults:
  - Sessions: `localStorage.setItem('feature:eventsProjections','1')`
  - Activity: `localStorage.setItem('feature:eventsActivity','1')`
  - Tasks/Routines: `localStorage.setItem('feature:eventsEntities','1')`
- Updated UI copy to align with compensating events:
  - “Delete Log” → “Revoke Completion”; “Redo” → “Retry”.
- Kept Stats wiring backward-compatible; when `feature:eventsProjections` is enabled, Stats sources sessions from events.

Proceed to Phase 2 to typecheck and address any type errors (`npx tsc --noEmit`).

**Phase 2 — Correct Errors & Typecheck**
- **Stop on Type Errors:** Run `npx tsc --noEmit` and resolve all new type issues.
- **Schema Drifts:** Fix any payload upconversions and projection type mismatches.
- **Public API:** Verify `use-global-state` exports unchanged types for components/tests.

**Phase 3 — Build**
- **Build App:** `npm run build` (or `pnpm build`), ensure bundles compile.
- **Bundle Size:** Optional: confirm no major regressions (tree-shaking config present).

**Phase 4 — Tests (Target 100%)**
- **Unit/Integration:** Run test suite; focus on Plans, Dashboard, Stats impacted flows.
- **Stabilize:** Add tests for projections (event → state), migration (log → events), undo/redo (retry/revoke), and timer sequences.
- **Coverage:** Increase tests where missing to reach 100% for changed areas; avoid unrelated churn.

**File Touchpoints (Key)**
- `src/hooks/use-global-state.tsx`
- `src/hooks/use-plan-data.ts`
- `src/hooks/use-stats.tsx`
- `src/lib/stats/selectors.ts`
- `src/lib/repositories/*` (add `event.repository.ts`)
- `src/lib/data/backfill-sessions.ts` (reference; add `backfill-events.ts`)
- `src/components/plans/*` (labels, optional badge)
- `src/components/dashboard/widgets/completed-today-widget.tsx`
- `src/components/dashboard/quick-start-sheet.tsx`

**Acceptance Criteria**
- **Functional Parity:** All current features work as-is, including timer flows, retry/revoke, activity feed, stats, badges.
- **Migration:** Runs once on first app update, sets `eventsBackfill_v1`, and never runs again.
- **Performance:** No noticeable regressions; startup remains smooth due to snapshots.
- **Quality:** Typecheck passes, build succeeds, tests 100% (for changed surfaces) with no flakiness.

**Next Steps**
- Start with event schemas + repository scaffolding, then wire projections behind a feature flag for internal validation. After Phase 2–4 validations, remove legacy paths.
