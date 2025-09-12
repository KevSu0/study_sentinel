# ADR-001: IndexedDB Typing & Governance (idb@7.1.1)

**Meta**
- **Title:** ADR-001: Stabilize events store typing & governance
- **Status:** Accepted
- **Date:** 2025-09-12
- **Owners/DRIs:** Storage Development Team
- **Reviewers:** Frontend Lead, QA Team
- **Related PRs/Docs:** Schema Manifest, CI Rules, Smoke Test Suite

## 1) Context & Problem

**Current state:**
- `TS2411` TypeScript error due to mismatched `DBSchema.indexes` types
- Compound queries in active use for event filtering
- No formal schema governance or documentation
- Development phase only, no production data

**Why now:**
- Unblock TypeScript compilation
- Establish guardrails for future schema changes
- Prevent drift and ensure consistency

**Constraints:**
- idb@7.1.1 library typing requirements
- TypeScript 5.x strict mode
- Offline-first architecture
- Development phase data only (no migration needed)

## 2) Goals & Non-Goals

### Goals:
- Align `indexes` to **index key types** (tuples for compound indexes)
- Preserve existing compound queries (type+time, device+time, synced+time)
- Establish data policies (synced default, timestamp rounding, JSON-safe values)
- Add human-readable **Schema Manifest** + CI drift detection
- Eliminate all TypeScript compilation errors

### Non-Goals:
- No new indexes added
- No DB version bump
- No backfill of legacy `synced` values
- No typed facade implementation (deferred to next sprint)

## 3) Decision (Summary)

### Type Fix:
- `by_timestamp`: `number`
- `by_device_timestamp`: `[string, number]`
- `by_session_id`: `string`
- `by_type_timestamp`: `[string, number]`
- `by_sync_status`: `[boolean, number]`

### Data Policies:
- **Synced policy:** default `false` for **new** writes only (legacy may be `undefined` and absent from index)
- **Timestamp policy:** normalize to whole seconds at write time (stored as ms, multiple of 1000)
- **SettingsEventData:** JSON-serializable only (guard at write boundary)

### Governance:
- Add **Schema Manifest (YAML)** + CI consistency check
- All changes follow documented checklist procedure

## 4) Detailed Design

### Store Structure:
**events store**
- **keyPath:** `id:string`
- **Value contract:** `id:string`, `timestamp:number`, `version:number`, `type:string`, `deviceId:string`, `sessionId?:string`, `data:<JSON-safe union>`, `synced?:boolean (new: false)`, `syncCheckpoint?:string`, `encrypted?:boolean`

### Indexes (with tuple order):

| Index Name | Key Path | Index Key Type | MultiEntry | Unique | Purpose |
|------------|----------|----------------|------------|---------|---------|
| `by_timestamp` | `timestamp` | `number` | false | false | Time range queries |
| `by_device_timestamp` | `[deviceId, timestamp]` | `[string, number]` | false | false | Device-specific time ranges |
| `by_session_id` | `sessionId` | `string` | false | false | Session-based queries |
| `by_type_timestamp` | `[type, timestamp]` | `[string, number]` | false | false | Type-specific time ranges |
| `by_sync_status` | `[synced, timestamp]` | `[boolean, number]` | false | false | Sync status time ranges |

### Query Patterns:
- **Compound queries:** Fix first tuple element, bound second element
- **Range queries:** Use `IDBKeyRange.bound()` with proper tuple ordering
- **Exact matches:** Use `IDBKeyRange.only()` for single keys

### Invariants:
- Timestamps are multiples of 1000 (whole seconds)
- New events have `synced: false` by default
- All values are JSON-serializable (no functions, classes, Map, Set, BigInt)
- Compound key order is strict and must be preserved in queries

## 5) Alternatives Considered

### Option 1: Type Suppression (`any`/@ts-ignore)
- **Pros:** Fastest implementation
- **Cons:** Brittle, defeats type system purpose
- **Decision:** Rejected

### Option 2: Full Migration to v3
- **Pros:** Clean state, deterministic
- **Cons:** Unnecessary for dev phase, adds complexity
- **Decision:** Deferred until actually needed

### Option 3: Immediate Typed Facade
- **Pros:** Better developer experience
- **Cons:** Out of scope for current timeline
- **Decision:** Scheduled for next sprint

## 6) Impact & Compatibility

### Compilation:
- Clean TypeScript compilation with strict typing
- Stronger type inference for index operations
- No more `any` type suppressions in schema code

### Runtime:
- No functional changes to existing behavior
- Legacy `synced:undefined` events absent from `by_sync_status` index
- All existing queries continue to work unchanged

### Consumer Impact:
- No breaking changes to public API
- Future consumers benefit from stronger typing
- Documentation prevents misuse of compound indexes

## 7) Rollout Plan

### Day 1: Type Fix + Audit
- Fix schema typing to match idb@7.1.1 requirements
- Audit all index usage sites for correct tuple ordering
- Verify compilation is clean

### Day 2: Policy Implementation
- Implement `synced: false` default for new writes
- Add timestamp normalization (floor to seconds)
- Add JSON validation for SettingsEventData

### Day 3: Schema Manifest + CI
- Create human-readable Schema Manifest
- Implement CI consistency checks
- Add change procedure checklist

### Day 4-5: Testing
- Implement comprehensive smoke test suite
- Cross-browser testing (Chromium, Firefox)
- Performance baseline establishment

### Day 6-7: Finalization
- Add dev-only observability
- Create release notes
- Final documentation updates

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tuple mis-ordering in queries | Comprehensive audit + test coverage + reviewer checklist |
| Misuse of legacy `synced` behavior | Clear documentation + test cases validating sparsity |
| Future millisecond precision needs | Document constraint; allow additional field later |
| CI false positives | Gradual rollout (warning → blocking) + manual override |
| Performance regression | Baseline metrics + continuous monitoring |

## 9) Testing Strategy

### Compile-time Tests:
- Negative tests for incorrect tuple shapes
- Type inference validation
- Interface compliance verification

### Functional Tests:
- Seeded dataset with ~200 events covering all scenarios
- Index-specific query validation
- Compound key ordering verification
- Edge case handling (missing fields, boundary values)

### Cross-browser Testing:
- Chromium and Firefox compatibility
- IndexedDB behavior consistency
- Performance benchmarking

## 10) Observability

### Dev-only Metrics:
- Sampled timing for DB open operations
- Index query performance sampling
- Error rate monitoring (DataCloneError, ConstraintError)
- Storage usage tracking

### Privacy:
- No payload logging whatsoever
- Only timing data and error codes collected
- Sampling rate throttled to prevent noise

## 11) Open Questions

- None at this time

## 12) Acceptance Criteria

- [ ] `tsc --noEmit` completes with 0 errors
- [ ] No `any` or `@ts-ignore` suppressions in schema code
- [ ] Schema Manifest present and accurate
- [ ] CI consistency checks active and passing
- [ ] Smoke test suite passes on Chromium and Firefox
- [ ] All compound queries verified for correct tuple ordering
- [ ] Write policies implemented (synced default, timestamp rounding)
- [ ] Performance baselines established within acceptable ranges
- [ ] Release notes published and team notified

## 13) Governance

### Change Procedure Checklist:
1. Update `upgrade()` function (index add/remove/change)
2. Update schema typing (index key types)
3. Update Schema Manifest (keyPath arrays + tuple types)
4. DB version bump **only if** value shape changes or index set changes
5. Add/Update smoke tests & compile-time tuple checks
6. Reviewer verifies tuple order & query patterns
7. CI checks pass

### Contacts:
- **DRI:** Storage Development Team
- **Reviewers:** Frontend Lead, QA Team
- **Last Reviewed:** 2025-09-12

---

*This ADR is locked and will be updated only through the formal change procedure.*