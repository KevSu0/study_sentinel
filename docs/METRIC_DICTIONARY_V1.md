# Metric Dictionary v1.0

## Overview
This document defines all metrics used in Phase-1 of the Study Sentinel timing system. All metrics are calculated according to these specifications.

## Core Metrics

### Time Metrics

#### Total Duration (`totalMs`)
- **Definition**: Wall-clock time from session start to end
- **Unit**: Milliseconds
- **Range**: 60,000ms (1min) to 43,200,000ms (12hrs)
- **Calculation**: endTs - startTs
- **Clamping**: Enforced at session creation
- **Display**: Converted to minutes/hours for UI

#### Productive Time (`productiveMs`)
- **Definition**: Time spent actively working (excluding pauses)
- **Unit**: Milliseconds
- **Range**: 0 to totalMs
- **Calculation**: totalMs - pauseMs
- **Note**: May be undefined in some session objects

#### Pause Time (`pauseMs`)
- **Definition**: Total time spent in paused state
- **Unit**: Milliseconds
- **Range**: 0 to totalMs
- **Calculation**: Sum of all pause durations
- **Includes**: Open pauses at session stop

#### Focus Percentage (`focusPct`)
- **Definition**: Percentage of time spent productively
- **Unit**: Percentage (0-100)
- **Precision**: Rounded to 1 decimal place
- **Calculation**: (productiveMs / totalMs) × 100
- **Display**: Shows as "85.3%"

### Count Metrics

#### Session Count (`sessionCount`)
- **Definition**: Number of completed sessions
- **Unit**: Integer
- **Includes**: Timer sessions and manual entries
- **Excludes**: Incomplete sessions (no STOP event)

#### Pause Count (`pauseCount`)
- **Definition**: Number of distinct pause periods
- **Unit**: Integer
- **Includes**: Open pause at stop
- **Minimum**: 0

## Session Types

### Countdown Sessions
- Timer with predefined duration
- Shows countdown display
- Progress calculated as: (elapsed / planned) × 100
- Overtime tracked when exceeding planned time

### Infinity Sessions
- Timer without predefined duration
- Shows elapsed time
- No progress percentage (always 0)
- Used for open-ended work sessions

### Manual Sessions
- Time entries added manually
- Require productive percentage input
- Included in aggregates by default
- Display as "Manual Entry"

## Time Calculations

### Day Boundary Handling
- **Cut-off Time**: 04:00 IST
- **Date Calculation**: Sessions crossing 04:00 split across days
- **Split Logic**: Proportional distribution of pause time
- **Example**: Session 23:30-04:30 splits as:
  - Day 1: 23:30-04:00 (4.5 hours)
  - Day 2: 04:00-04:30 (0.5 hours)

### Pause Handling
- **Minimum Pause**: 5 seconds (enforced in timer rules)
- **Open Pauses**: Included when session stopped
- **Pause Distribution**: Proportional across day splits
- **Pause Impact**: Reduces focus percentage

### Rounding Rules
- **Focus Percentage**: 1 decimal place (e.g., 85.3%)
- **Display Times**: Nearest second
- **Duration Storage**: Exact milliseconds
- **Progress**: Whole percentage (0-100)

## Aggregation Rules

### Daily Rollups
- Sum all sessions for the day
- Weighted average for focus percentage
- Include all session types by default
- Date boundary at 04:00 IST

### Range Rollups
- Sum across all days in range
- Each day calculated separately first
- Maintain day-by-day breakdown
- Weighted averages preserve accuracy

### Trend Calculations
- Compare to previous day/week/month
- Direction: up/down/same
- Percentage change for significant deltas
- Based on same time period

## Invariants (Enforced in Dev)

1. **Non-negative Values**
   - totalMs ≥ 0
   - pauseMs ≥ 0
   - productiveMs ≥ 0

2. **Time Relationships**
   - pauseMs ≤ totalMs
   - productiveMs ≤ totalMs
   - productiveMs + pauseMs ≈ totalMs (±1ms for rounding)

3. **Percentage Bounds**
   - 0 ≤ focusPct ≤ 100
   - Focus percentage rounded to 1 decimal

4. **Session Constraints**
   - 60,000ms ≤ totalMs ≤ 43,200,000ms
   - pauseCount ≥ 0
   - isShortSession ↔ (totalMs < 60,000)

5. **Day Split Integrity**
   - Σ segment totals = session total
   - Σ segment pauses = session pause
   - No gaps or overlaps in segments

## Storage Format

### Event Structure
```typescript
interface Event {
  id: string;
  type: 'TIMER_START' | 'TIMER_STOP' | 'MANUAL_TIME_ENTRY' | etc.;
  payload: {
    // Type-specific fields
    timestamp: number;
  };
}
```

### Session Reconstruction
Sessions built from event pairs:
- TIMER_START + TIMER_STOP → Timer session
- MANUAL_TIME_ENTRY → Manual session
- Incomplete sessions (no STOP) ignored

### Storage Keys
- `SS_V1_LOG_YYYY-MM-DD` - Event logs
- `SS_V1_ACTIVE_TIMER` - Current state
- Namespace prefix prevents conflicts

## Display Formatting

### Duration Format
- < 60s: "45s"
- < 60m: "23m"
- ≥ 60m: "1h 23m"
- ≥ 24h: "5h 30m"

### Time Format
- UI: "1:23:45" (h:mm:ss)
- Internal: Milliseconds
- Calculations: Always use milliseconds

### Percentage Format
- Display: "85.3%"
- Internal: Float (0.853)
- Storage: Integer (853 × 10)

## Performance Metrics

### Calculation Speed
- Single day: < 1ms
- 30-day range: < 10ms
- Year view: < 100ms

### Memory Usage
- Event cache: O(n) where n = events in range
- Memoization: Prevents redundant calculations
- Garbage collection: Automatic for unused ranges

## Error Handling

### Missing Data
- Gaps in event log treated as 0
- Corrupt events logged and skipped
- Graceful degradation for edge cases

### Edge Cases
- Sessions exactly at day boundary
- Very short/long sessions
- High-frequency pause/resume
- Clock adjustments/timezone changes