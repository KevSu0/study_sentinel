# Stats Page Hardening Runbook

## Overview
This runbook outlines the implementation plan for hardening the Stats Page and use-stats pipeline for correctness, performance, UX/accessibility, and maintainability.

## Timeline: T-7 → T-0 (7-day rollout)

### Key Assumptions
- Feature flags available
- Consent UI acceptable for minimal telemetry
- Storage v2 migration continues with rollback capability
- Web Worker allowed
- E2EE (AES-256-GCM) already shipped

### Unknowns (To Confirm)
- [x] Telemetry sampling rate: **5%** ✅
- [x] Canary cohort size: **5-10%** ✅
- [ ] Idle "legacy drain" approval needed

## Success Metrics (Leading)
- use-stats p95 (30-day) ≤ 50 ms
- Worker RTT p95 ≤ 80 ms
- Heap delta ≤ +30 MB
- Re-renders per switch ≤ 3
- CLS ≤ 0.03
- AA contrast 100%
- Canary error rate < 0.5%

## Success Metrics (Lagging)
- Weekly Stats viewers +15%
- % users meeting daily goal after Coach +10%
- "Stats wrong" tickets -50%
- Crash-free sessions (Stats route) ≥ 99.8%

## Dependency Map
### People & Roles
- FE Lead: Performance + a11y implementation
- QA Lead: Test matrix
- Product Manager: Metric semantics
- Data Steward: Schema/rollup versions
- Release Manager: Flags, gates
- Support Lead: User comms

### Process & Governance
- Metric Dictionary + metrics_semver
- Change log
- Monthly audits
- Incident playbook
- Release tags when metrics change

## Implementation Plan

### T-7 to T-5: Stabilize & Measure

#### 1. Governance & Semantics (A)
**Owner**: Product Manager + Data Steward
```typescript
// metrics-semver: 1.0.0
interface MetricDictionaryV1 {
  // 7 stat cards
  totalHours: { source: 'events', formula: 'sum(duration)/3600', rounding: 1 };
  totalPoints: { source: 'events', formula: 'sum(points)', rounding: 0 };
  completionRate: { source: 'tasks', formula: 'completed/total*100', rounding: 0 };
  studyStreak: { source: 'events', formula: 'consecutive_days', grace: 0 };
  // ... more metrics
}
```

#### 2. Budgets + Telemetry (E)
**Owner**: FE Lead
```typescript
// Budgets in README.md
## Performance Budgets
- use-stats(30-day) p95 ≤ 50ms
- worker RTT p95 ≤ 80ms
- Route JS ≤ 180 KB gz
- Heap delta ≤ +30 MB
- CLS ≤ 0.03
```

#### 3. Performance Audit
**Actions**:
- Profile current use-stats hook with 30-day data
- Identify hotspots in calculations
- Measure memory usage during stat calculations
- Document baseline metrics

### T-5 to T-3: Canary (5-10%)

#### 4. Worker Implementation (B)
**Owner**: FE Lead
```typescript
// stats.worker.ts
interface WorkerRequest {
  type: 'COMPUTE_STATS';
  range: 'daily' | 'weekly' | 'monthly' | 'overall';
  bucketDay: string;
  data: CompletedWork[];
}

interface WorkerResponse {
  stats: TimeRangeStats;
  computeTime: number;
  metricsVersion: string;
}
```

**Implementation Steps**:
1. Create stats worker with typed interfaces
2. Move 7/30/overall transforms to worker
3. Add 250ms debounce on range/date changes
4. Gate charts on "dataReady" state
5. Add worker timeout & fallback

#### 5. Daily Rollups (B)
**Owner**: FE Lead + Data Steward
```typescript
// New store: daily_rollups
interface DailyRollup {
  bucket_day: string; // IST
  total_minutes: number;
  total_points: number;
  by_routine: Record<string, { minutes: number; points: number }>;
  session_count: number;
  version: string; // rollup_version
  created_at: number;
}
```

**Implementation Steps**:
1. Create daily_rollups store in IDB
2. Materialize rollups on write/sync
3. Normalize using 04:00 IST boundary
4. Add rollup_version to handle schema changes
5. Flag: `stats.rollup.v2` (write-path only)

### T-3 to T-1: Rollouts & Validation

#### 6. Storage Read Policy (B)
**Implementation**:
```typescript
// Read policy: IDB → localStorage fallback
async function getStatsData(): Promise<StatsData> {
  try {
    // Try IDB v2 first
    const data = await idb.get('stats');
    if (data) return data;

    // Fallback to localStorage
    console.warn('Using localStorage fallback');
    telemetry.count('legacy_read_used', 1);
    return localStorage.get('stats');
  } catch (error) {
    telemetry.error('stats_read_failed', error);
    throw error;
  }
}
```

#### 7. Accessibility & UX (D)
**Owner**: FE Lead
**Implementation Checklist**:
- [ ] Keyboard navigation (1/7/3/0; ←/→)
- [ ] Focus management on tab/date change
- [ ] aria-live summaries for headline metrics
- [ ] WCAG AA color tokens
- [ ] Reduced motion guards
- [ ] Non-visual tables behind charts
- [ ] Drill-through from charts to session list
- [ ] Confidence banners for sparse data

#### 8. Badge Engine Detangling (C)
**Owner**: FE Lead
```typescript
// New store: badge_progress
interface BadgeProgress {
  badge_id: string;
  state: 'pending' | 'evaluating' | 'earned' | 'revoked';
  last_eval_at: number;
  progress: number; // 0-100
  context: BadgeContext;
}
```

**Implementation Steps**:
1. Create badge_progress store
2. Event-driven updates on create/update/day-rollover
3. Evaluate seasonal/hidden badges during idle
4. Cap per-frame evaluation time
5. Chunk long-running rules

### T-0: Timezone Migration

#### 9. Final Rollout
**Checklist**:
- [ ] Confirm bucket_day integrity
- [ ] Tag release: `stats-semver-1.0.0`
- [ ] Publish change log
- [ ] Prepare support FAQ
- [ ] Enable canary for 100%
- [ ] Monitor all budgets

### T+1 to T+30: Ramp & Consolidate

#### 10. Post-Launch
- [ ] Expand worker to 50-100% if stable
- [ ] Enable `badges.incremental.v1`
- [ ] Evaluate localStorage fallback removal
- [ ] Monthly audit #1
- [ ] Adjust budgets based on telemetry

## Incident Playbook

### When: Numbers look wrong

1. **Immediate Actions**:
   - Toggle `stats.worker.v1` OFF
   - Check diagnostics dashboard
   - Verify metrics_semver and stats_code_version

2. **Diagnostic Steps**:
   ```typescript
   // Check rollup vs raw for sample user/day
   const rawStats = computeFromEvents(events);
   const rollupStats = await getDailyRollup(day);
   const divergence = Math.abs(rawStats.hours - rollupStats.hours);

   if (divergence > 0.01) {
     // Trigger incident
     setFlag('stats.rollup.v2', 'read-bypass');
   }
   ```

3. **Timezone Issues**:
   - Verify 04:00 IST normalization
   - Check bucket_day assignment
   - Re-ingest sample with fixed logic

4. **Communication**:
   - Update status page
   - Notify support team
   - Prepare user communication if needed

## Testing Strategy

### Must-Pass Tests
1. **Deterministic Fixtures**:
   - 04:00 boundary events
   - Overlapping sessions
   - Backdated entries
   - Long sessions (>4 hours)
   - Sparse data weeks

2. **Cross-TZ Validation**:
   - IST, UTC, +9, -8 timezones
   - Identical bucket_day outcomes

3. **Property Tests**:
   - Streak continuity under random gaps
   - Rollup accuracy after random edits
   - Badge evaluation determinism

4. **Performance Tests**:
   - Low-end Android & iPhone SE
   - Large datasets (365+ days)
   - Memory allocation tracking

5. **Accessibility Audit**:
   - Keyboard navigation coverage
   - Screen reader validation
   - Color contrast verification
   - Reduced motion compliance

## RACI Matrix

| Task | Product | FE Lead | QA | Data | Release | Support |
|------|---------|---------|----|------|---------|---------|
| Metric Dictionary | A | R | C | R | C | I |
| Worker Implementation | I | A | R | I | C | I |
| Daily Rollups | I | A | R | A | C | I |
| Badge Engine | I | A | R | I | C | I |
| Accessibility | A | A | R | I | I | C |
| Observability | I | A | R | C | C | R |
| Testing Strategy | I | R | A | C | I | C |

Legend: A=Accountable, R=Responsible, C=Consulted, I=Informed

## Rollback Plan

1. **Immediate Rollbacks**:
   - `stats.worker.v1` → OFF
   - `stats.rollup.v2` → read-bypass
   - `badges.incremental.v1` → OFF

2. **Data Recovery**:
   - Restore from last checkpoint
   - Rebuild rollups from events
   - Verify counts match

3. **Communication**:
   - Internal incident channel
   - Status page update
   - User notification if needed

## Monitoring Dashboard

Create dashboard tracking:
- [ ] Compute times (p50, p95, p99)
- [ ] Worker success rate
- [ ] Memory usage delta
- [ ] Legacy read fallback rate
- [ ] Error rates by type
- [ ] Canary vs control metrics

## Glossary

- **bucket_day**: Study day boundary at 04:00 IST
- **DRI**: Daily Rollup Incremental (materialized aggregates)
- **metrics_semver**: Versioning system for metric definitions
- **legacy drain**: Migration from localStorage to IDB v2 during idle time