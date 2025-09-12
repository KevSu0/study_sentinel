# Storage Smoke Test Matrix

## Test Dataset Configuration

### Seed Data Strategy
- **Total records:** ~200 events
- **Time span:** 3 contiguous days with second-level granularity
- **Devices:** 3 devices (devA, devB, devC)
- **Event types:** study_session_created, task_completed, badge_earned
- **Sessions:** 2 sessions (session-alpha, session-beta)
- **Sync status:** Mixed (new: synced=false, legacy: synced=undefined)

### Data Distribution
| Device | Type | Count | Session | Sync Status | Time Range |
|--------|------|-------|---------|-------------|------------|
| devA | study_session_created | 50 | session-alpha | Mixed | Day 1-2 |
| devA | task_completed | 30 | session-alpha | Mixed | Day 1-2 |
| devB | study_session_created | 40 | session-beta | New only | Day 2-3 |
| devB | badge_earned | 20 | session-beta | New only | Day 2-3 |
| devC | task_completed | 60 | mixed | Legacy only | Day 1-3 |

## Test Cases

### C1: Basic Time Range Query
**Purpose:** Verify time-based filtering works correctly
- **Index:** `by_timestamp`
- **Query:** `[day1:12:00:00, day1:14:00:00]`
- **Expected:** Events within that 2-hour window
- **Order:** Ascending by timestamp
- **Edge:** Exact boundary inclusion

### C2: Empty Time Window
**Purpose:** Verify empty result handling
- **Index:** `by_timestamp`
- **Query:** `[gapStart, gapEnd]` (no events in gap)
- **Expected:** 0 results
- **Edge:** Query stability

### C3: Device-Specific Time Range
**Purpose:** Verify compound index ordering and filtering
- **Index:** `by_device_timestamp`
- **Query:** `[[devA, day1:10:00:00], [devA, day1:18:00:00]]`
- **Expected:** Only devA events in time window
- **Order:** Ascending by timestamp (device fixed)
- **Edge:** Device filtering correctness

### C4: Device Boundary Testing
**Purpose:** Verify inclusive boundary behavior
- **Index:** `by_device_timestamp`
- **Query:** Include events at exact boundary timestamps
- **Expected:** Boundary events included
- **Edge:** Lower/upper bound inclusivity

### C5: Type-Specific Time Range
**Purpose:** Verify type filtering with time ranges
- **Index:** `by_type_timestamp`
- **Query:** `[[study_session_created, day2:00:00:00], [study_session_created, day2:23:59:59]]`
- **Expected:** Only study events on day 2
- **Order:** Ascending by timestamp (type fixed)
- **Edge:** Type enum filtering

### C6: Type Ordering Verification
**Purpose:** Verify compound index type separation
- **Index:** `by_type_timestamp`
- **Query:** Filter for specific type with interleaved data
- **Expected:** Only requested type returned
- **Edge:** Type discrimination correctness

### C7: Sync Status - New Data
**Purpose:** Verify synced status filtering (new writes)
- **Index:** `by_sync_status`
- **Query:** `[[false, day2:00:00:00], [false, day2:23:59:59]]`
- **Expected:** Only unsynced events (synced=false)
- **Order:** Ascending by timestamp
- **Edge:** Default policy enforcement

### C8: Sync Status - Manual Sync
**Purpose:** Verify synced status changes are reflected
- **Index:** `by_sync_status`
- **Setup:** Mark some events as synced=true
- **Query:** `[[true, startTime], [true, endTime]]`
- **Expected:** Only manually synced events
- **Edge:** Status update visibility

### C9: Sync Status - Legacy Sparsity
**Purpose:** Verify legacy events (synced=undefined) are excluded
- **Index:** `by_sync_status`
- **Query:** Any range covering legacy events
- **Expected:** 0 legacy events returned
- **Edge:** Undefined value handling

### C10: Session Exact Match
**Purpose:** Verify exact key matching
- **Index:** `by_session_id`
- **Query:** Exact session ID match
- **Expected:** All events for that session
- **Order:** Store order (not specified)
- **Edge:** Missing session handling

### C11: Day Boundary Rollover
**Purpose:** Verify queries spanning midnight
- **Index:** `by_timestamp`
- **Query:** Range spanning day boundary
- **Expected:** Correct count across both days
- **Edge:** Date boundary handling

### C12: Large Timestamp Values
**Purpose:** Verify future/far-past timestamp handling
- **Index:** `by_timestamp`
- **Setup:** Include events with extreme timestamps
- **Query:** Normal range excluding extremes
- **Expected:** Extreme values excluded
- **Edge:** Number range validation

### C13: Ordering Stability
**Purpose:** Verify consistent ordering with same-minute events
- **Index:** `by_type_timestamp`
- **Setup:** Multiple events same type, same minute
- **Query:** Range covering those events
- **Expected:** Stable, deterministic ordering
- **Edge:** Tie-breaking behavior

### C14: Lower-Bound Only
**Purpose:** Verify open-ended range queries
- **Index:** `by_timestamp`
- **Query:** Lower bound only (no upper bound)
- **Expected:** All events ≥ lower bound
- **Edge:** Unbounded query support

### C15: Upper-Bound Only
**Purpose:** Verify open-ended range queries
- **Index:** `by_timestamp`
- **Query:** Upper bound only (no lower bound)
- **Expected:** All events ≤ upper bound
- **Edge:** Unbounded query support

### C16: Missing Session ID
**Purpose:** Verify handling of optional fields
- **Index:** `by_session_id`
- **Setup:** Events with and without sessionId
- **Query:** Query by session ID
- **Expected:** Only events with that sessionId
- **Edge:** Optional field filtering

### C17: Timestamp Normalization
**Purpose:** Verify timestamp policy compliance
- **Index:** `by_timestamp`
- **Setup:** Check new event timestamps
- **Expected:** All `timestamp % 1000 === 0`
- **Edge:** Policy enforcement

### C18: Cross-Browser Parity
**Purpose:** Verify consistent behavior across browsers
- **Indexes:** All indexes
- **Queries:** Subset of C3, C5, C7, C10
- **Expected:** Identical results across browsers
- **Edge:** Implementation consistency

### C19: Compile-Time Type Safety
**Purpose:** Verify TypeScript type checking
- **Setup:** Deliberately incorrect tuple shapes
- **Expected:** Compile-time errors
- **Edge:** Type system enforcement

### C20: Performance Baseline
**Purpose:** Establish performance expectations
- **Indexes:** All indexes
- **Queries:** Representative query patterns
- **Expected:** p95 latency within acceptable range
- **Edge:** Performance regression detection

## Browser Test Matrix

| Browser | Version | Test Cases | Priority | Notes |
|---------|---------|------------|----------|-------|
| Chromium | Latest | All | Critical | Primary target |
| Firefox | Latest | C1-C10, C18 | High | Secondary target |
| Safari | Latest | C1-C5 | Medium | If supported |

## Test Automation

### Unit Tests (Compile-Time)
```typescript
// Negative type tests
expectCompileError(() => {
  db.getAllFromIndex('events', 'by_type_timestamp', [123, 'wrong']);
});

// Policy validation tests
expect(() => validateJsonSerializable(function() {})).toThrow();
expect(normalizeTimestamp() % 1000).toBe(0);
```

### Integration Tests (Functional)
```typescript
// Seed data test
const testData = generateTestDataset();
await storage.importData(testData);

// Compound query test
const results = await storage.getEvents({
  type: 'study_session_created',
  startTime: day2Start,
  endTime: day2End
});

expect(results.length).toBe(expectedStudyCount);
```

### Performance Tests
```typescript
// Baseline establishment
const timing = await measureQueryPerformance('by_device_timestamp', {
  device: 'devA',
  timeWindow: [start, end]
});

expect(timing.p95).toBeLessThan(MAX_ACCEPTABLE_LATENCY);
```

## Test Data Generation

### Timestamp Generation
```javascript
function generateTimestamp(dayOffset, hour, minute, second) {
  const base = new Date(2025, 8, 12 + dayOffset); // Sept 12-14, 2025
  base.setHours(hour, minute, second, 0);
  return base.getTime(); // Normalized to seconds in implementation
}
```

### Event Generation
```javascript
function generateEvent(type, device, session, timestamp, synced) {
  return {
    id: `event-${Date.now()}-${Math.random()}`,
    type,
    deviceId: device,
    sessionId: session,
    timestamp,
    synced: synced !== undefined ? synced : (Math.random() > 0.5 ? false : undefined),
    data: generateEventData(type),
    version: 1
  };
}
```

## Acceptance Criteria

### Functional
- [ ] All 20 test cases pass on Chromium
- [ ] Critical test cases (C1-C10) pass on Firefox  
- [ ] Compile-time type errors caught correctly
- [ ] Policy violations throw appropriate errors

### Performance  
- [ ] p95 query latency < 100ms for all index types
- [ ] No memory leaks during repeated queries
- ] Database open time < 500ms

### Consistency
- [ ] Same results across browser runs
- [ ] Deterministic ordering for compound queries
- [ ] Boundary conditions handled consistently

### Governance
- [ ] Schema manifest validation passes
- [ ] CI checks run successfully
- [ ] Documentation matches implementation

## Test Execution

### Local Development
```bash
# Run full test suite
npm run test:storage

# Run specific browser tests
npm run test:storage:chrome
npm run test:storage:firefox

# Validate manifest
npm run validate:manifest
```

### CI/CD Pipeline
1. Build and type check
2. Schema manifest validation
3. Unit tests (compile-time)
4. Integration tests (Chromium headless)
5. Performance regression tests
6. Documentation generation

## Test Reporting

### Output Format
```json
{
  "testRun": {
    "timestamp": "2025-09-12T10:00:00Z",
    "browser": "Chromium 129",
    "results": {
      "passed": 19,
      "failed": 1,
      "skipped": 0
    },
    "performance": {
      "p95Latency": 45.2,
      "maxLatency": 89.1,
      "throughput": 1250
    }
  }
}
```

### Failure Analysis
For each failure, capture:
- Test case ID and description
- Expected vs actual results
- Browser/environment information
- Relevant logs and stack traces
- Screenshot for UI-related failures