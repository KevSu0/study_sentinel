# Implement Event-Sourced Activity Attempts (No `IN_PROGRESS` status)

**Context (Next.js + Dexie, offline-first):**
We are migrating from `LogEvent`/`CompletedWork` to `ActivityAttempt`/`ActivityEvent`. We **do not use `IN_PROGRESS`**. Instead, **`NOT_STARTED` means “non-terminal”** (before completion). Running/paused are inferred from the event stream (`START`, `PAUSE`, `RESUME`). Undo/Retry/Hard-Undo/Manual Logging must follow the rules below and preserve history correctly.

## Data Model

### AttemptStatus (no `IN_PROGRESS`)

```ts
export type AttemptStatus =
  | 'NOT_STARTED'   // any non-terminal attempt (pre-completion)
  | 'COMPLETED'
  | 'CANCELLED'
  | 'INVALIDATED';  // hard-undo tombstone
```

### ActivityAttempt

```ts
export interface ActivityAttempt {
  id: string;
  entityId: string;             // StudyTask or Routine id
  entityType: 'task' | 'routine';
  ordinal: number;              // 1..n per entityId (historical order)
  status: AttemptStatus;        // authoritative; no IN_PROGRESS exists
  startTime?: number;           // first START time (derived/projection)
  endTime?: number;             // COMPLETE time (derived/projection)

  // Projections (derived from events; persisted for fast reads):
  duration?: number;            // active time (excludes pauses)
  pausedDuration?: number;
  pointsEarned?: number;

  // Soft-delete marker for sync safety:
  deletedAt?: number;

  // Optimization-only (projection); source of truth is status:
  isActive?: boolean;           // computed: status === 'NOT_STARTED'

  // One-active-attempt invariant key (see below):
  activeKey?: string | null;    // `${entityId}` when status === 'NOT_STARTED', else null

  createdAt: number;
  updatedAt: number;
}
```

### ActivityEvent

```ts
export type ActivityEventType =
  | 'CREATE' | 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE'
  | 'UNDO_NORMAL' | 'RETRY' | 'HARD_UNDO'
  | 'MANUAL_LOG'  | 'POINTS_AWARDED' | 'BADGE_AWARDED'
  | 'SNAPSHOT'    | 'MIGRATED' | 'CANCEL_DUPLICATE';

export interface ActivityEvent {
  id: string;
  attemptId: string;
  type: ActivityEventType;
  payload?: Record<string, any>;
  source: 'system' | 'user' | 'manual' | 'migration';
  occurredAt: number;   // client clock (timeline sort primary)
  createdAt: number;    // db insert time (timeline sort secondary)
  idempotencyKey?: string; // dedup replays/offline retries
}
```

**Key principle:** We intentionally do **not** represent “in progress” with a status. The **event stream** says whether the timer is currently running or paused. The **only terminal status** is `COMPLETED` (or `CANCELLED`/`INVALIDATED`).

## State Rules (no `IN_PROGRESS`)

* Status starts at **`NOT_STARTED`**, stays `NOT_STARTED` through any number of `START/PAUSE/RESUME` cycles.
* On `COMPLETE`, status becomes **`COMPLETED`** (terminal).
* **Undo/Retry** does **not** change the old attempt; it **spawns a new attempt** at `NOT_STARTED`.
* **Hard Undo** targets only one attempt → set to **`INVALIDATED`**, purge its events.
* Conflict resolver may mark an extra active attempt as **`CANCELLED`**.

### State Transitions (event-driven)

```
NOT_STARTED --START/PAUSE/RESUME events--> NOT_STARTED
NOT_STARTED --COMPLETE--> COMPLETED
COMPLETED --UNDO_NORMAL/RETRY--> (spawn NEW attempt: NOT_STARTED)
ANY --HARD_UNDO--> INVALIDATED     (that attempt only)
ANY --CANCEL_DUPLICATE--> CANCELLED
```

## One-Active-Attempt Invariant (even offline)

* We must have **at most one** non-terminal attempt per `entityId`.
* Implement via **activeKey**:

  * When `status === 'NOT_STARTED'`, set `activeKey = entityId`.
  * Otherwise set `activeKey = null`.
* Enforce uniqueness in write paths (and server, if syncing).
* Add a **conflict resolver**: if two attempts end up with `activeKey=entityId`, demote the newest to `CANCELLED`, clear its `activeKey`, and emit `CANCEL_DUPLICATE`.

## Commands (each is a Dexie transaction)

> All commands follow: (1) append event → (2) run reducer to recompute projections → (3) persist attempt updates.
> Durations/points are **computed by the reducer** from events; projections are persisted for fast reads.

1. **createAttempt(entityId)**

* Guard: if any attempt exists with `activeKey=entityId` → throw `DUPLICATE_ACTIVE_ATTEMPT`.
* Insert attempt with `status='NOT_STARTED'`, `activeKey=entityId`, `ordinal=max+1`.
* Append `CREATE`.

2. **startAttempt / pauseAttempt / resumeAttempt (attemptId)**

* Append `START` / `PAUSE` / `RESUME`.
* Status **remains `NOT_STARTED`** (non-terminal).
* Reducer updates projections (duration/pausedDuration, startTime if first START).

3. **completeAttempt (attemptId)**

* Append `COMPLETE`.
* Set status `COMPLETED`, set `activeKey=null`, set `endTime`.
* Recompute projections; trigger points via event or projection.

4. **normalUndoOrRetry (fromAttemptId, kind: 'UNDO' | 'RETRY', reason?)**

* Look up `entityId` from `fromAttemptId`.
* Guard: if an attempt exists with `activeKey=entityId` → throw `DUPLICATE_ACTIVE_ATTEMPT`.
* Append `UNDO_NORMAL` or `RETRY` on **fromAttemptId** (no mutation to its history).
* Call `createAttempt(entityId)` and include payload `{ fromAttemptId, via: kind }` in the new attempt’s `CREATE`.

5. **hardUndo (attemptId)**

* Update attempt: `status='INVALIDATED'`, `activeKey=null`, `deletedAt=now`.
* **Purge** all events of this attempt (or mark redacted if you need legal audit).
* Do **not** touch sibling attempts.

6. **manualLog (attemptId, fields)**

* Append `MANUAL_LOG` with `source='manual'` and **typed payload** (schema-validated).
* **No status change**; if manual input implies a transition, call that command explicitly.

## Reducer (authoritative calculations)

* Deterministically replay events sorted by `(occurredAt, createdAt)` and compute:

  * `status` (terminal only at `COMPLETE`, else `NOT_STARTED`)
  * `startTime` (first START), `endTime` (COMPLETE)
  * `duration` (sum of active segments), `pausedDuration`
  * `pointsEarned` (from `POINTS_AWARDED` events or calculator on COMPLETE)
* Keep it **idempotent** and use **idempotencyKey** to ignore duplicate events.

## Indexing

* Attempts:

  * `byEntity`: `[entityId+ordinal]`
  * `byActive`: `activeKey` (fast “current attempt” lookup)
  * `byStatus`: `status`
* Events:

  * `byAttempt`: `[attemptId+occurredAt]`
  * `byType`: `type`

## Migration (legacy → new)

1. Freeze legacy writes.
2. Group legacy logs into attempts by entity and completion boundaries.
3. Create `ActivityAttempt` per group with `ordinal` and projections.
4. Emit `MIGRATED` event per attempt (checksum).
5. Backward-compat layer for Stats/Badges until green.
6. Validator to detect >1 active attempt; resolve via `CANCEL_DUPLICATE`.

## Acceptance Criteria

* **No `IN_PROGRESS` status anywhere.** All non-terminal attempts are `NOT_STARTED`.
* Timer UI uses events to reflect running/paused; **status doesn’t flip** until COMPLETE.
* **Undo/Retry** never deletes history; it **spawns a new NOT\_STARTED attempt**, blocked if an active attempt exists.
* **Hard Undo** affects **only that attempt** (set `INVALIDATED`, purge its events).
* **One-active-attempt invariant** enforced via `activeKey`, with conflict resolution.
* Projections (duration/paused/points) match reducer outputs; rebuild is possible from events.

## Tests (must pass)

* Creating when an active attempt exists → throws `DUPLICATE_ACTIVE_ATTEMPT`.
* Start/Pause/Resume sequences keep status `NOT_STARTED`; projections update correctly.
* Complete transitions to `COMPLETED`, clears `activeKey`, sets `endTime`.
* Undo/Retry → new attempt created; old attempt/events intact; blocked if active exists.
* Hard-Undo → only targeted attempt invalidated; siblings untouched; stats recompute.
* Conflict resolver demotes the newest duplicate to `CANCELLED` and clears `activeKey`.
* Idempotency: resubmitting same event (same `idempotencyKey`) has no additional effect.
* Reducer property check: total time consistency (`duration + pausedDuration ≈ end - start`).

## Deliverables

* Dexie schema + migration for `ActivityAttempt`/`ActivityEvent`.
* Reducer + command functions (transactions).
* Test suite (unit + integration + conflict/idempotency).
* Minimal UI updates: timeline per attempt, Manual Log form, Hard-Undo confirmation.

---

**Note:** By design, **running vs paused is event-derived**; status remains `NOT_STARTED` until `COMPLETE`. This satisfies the requirement to “replace `IN_PROGRESS` with `NOT_STARTED`” while keeping full timer functionality through events.