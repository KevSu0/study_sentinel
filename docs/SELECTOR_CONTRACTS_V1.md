# Selector Contracts v1.0

## Overview
This document defines the stable contracts for all Phase-1 selectors. These contracts are frozen and should not be modified without a major version bump.

## Core Principles
1. **Immutable Return Values**: All selectors return immutable objects/arrays
2. **Pure Functions**: Selectors have no side effects
3. **Memoization**: Performance optimized through memoization
4. **Type Safety**: Full TypeScript coverage

## Selector Contracts

### Timer View (`src/selectors/timer.view.ts`)

#### `getTimerDisplay(now: number = Date.now()): TimerDisplay`

Returns the current timer display state.

```typescript
interface TimerDisplay {
  id: string | null;           // Null when no active timer
  title: string;               // Timer title or empty string
  displayTime: string;         // Formatted as "1h 23m" or "23:45"
  progress: number;            // 0-100 for countdown, 0 for infinity
  isRunning: boolean;
  isPaused: boolean;
  isOvertime: boolean;
  pauseCount: number;
  timerType: 'COUNTDOWN' | 'INFINITY';
  state: string;               // TimerState enum value
  priority?: number;           // Task priority (1-5)
}
```

**Invariant**: When no active timer, returns default state with ID null and displayTime "0:00:00"

### Sessions Range (`src/selectors/sessions.range.ts`)

#### `getSessionsInRange(startDate: string, endDate: string, includeManual: boolean = true): Session[]`

Returns sessions within date range, sorted by start time.

```typescript
interface Session {
  id: string;                  // Unique session ID
  startTs: number;             // Start timestamp
  endTs: number;               // End timestamp
  totalMs: number;             // Total duration in milliseconds
  pauseMs: number;             // Total pause duration
  productiveMs: number;        // May be undefined (calculated as totalMs - pauseMs)
  pauseCount: number;          // Number of pause events
  focusPct: number;            // 0-100, rounded to 1 decimal
  type: 'countdown' | 'infinity' | 'manual';
  sourceId: string;            // Entity ID (task/routine ID or 'manual')
  title: string;               // Session title
  priority?: number;           // Task priority if applicable
  note?: string;               // Session notes
  isShortSession: boolean;     // true if totalMs < 60000
  entityType: 'task' | 'routine' | 'manual';
}
```

**Invariants**:
- Sessions sorted by startTs ascending
- isShortSession === (totalMs < 60000)
- focusPct is rounded to 1 decimal place
- includeManual=false excludes sessions with type='manual'

#### `getSessionsForDate(date: string, includeManual: boolean = true): Session[]`
Convenience method that calls `getSessionsInRange(date, date, includeManual)`

### Rollup Range (`src/selectors/rollup.range.ts`)

#### `getRollupInRange(startDate: string, endDate: string): RollupResult`

Returns aggregated metrics for date range.

```typescript
interface RollupResult {
  totalMs: number;             // Sum of all session durations
  productiveMs: number;       // Total productive time
  pauseMs: number;            // Total pause time
  sessionCount: number;       // Number of sessions
  focusPct: number;           // Weighted average focus percentage
  dateRange: {                // Actual date range covered
    start: string;
    end: string;
  };
  byDate: {                    // Breakdown by date
    [date: string]: {
      totalMs: number;
      productiveMs: number;
      pauseMs: number;
      sessionCount: number;
      focusPct: number;
    };
  };
}
```

**Invariants**:
- productiveMs + pauseMs ≤ totalMs
- focusPct is weighted by session duration
- byDate keys are in YYYY-MM-DD format
- All values ≥ 0

### Today Cards (`src/selectors/today.cards.ts`)

#### `getTodayCards(date: string): TodayCards`

Returns today's productivity metrics in card format.

```typescript
interface TodayCards {
  totalDuration: {            // Total time card
    value: number;            // Duration in minutes
    display: string;          // "2h 30m" format
    trend: 'up' | 'down' | 'same'; // vs yesterday
  };
  productiveTime: {           // Productive time card
    value: number;            // Minutes
    display: string;
    trend: 'up' | 'down' | 'same';
  };
  focusPercentage: {          // Focus percentage card
    value: number;            // 0-100
    display: string;          // "85.3%"
    trend: 'up' | 'down' | 'same';
  };
  sessionCount: {             // Session count card
    value: number;
    display: string;
    trend: 'up' | 'down' | 'same';
  };
  pauseCount: {               // Pause count card
    value: number;
    display: string;
    trend: 'up' | 'down' | 'same';
  };
}
```

**Invariants**:
- All display values use human-readable format
- Trend calculated against previous day
- Values include all session types unless filtered

### Plans Routines (`src/selectors/plans.routines.ts`)

#### `getRoutinesForDay(date: string): Routine[]`

Returns routines scheduled for the given day.

```typescript
interface Routine {
  id: string;
  title: string;
  description?: string;
  weekdays: number[];         // 0-6 where 0 = Sunday
  startTime: string;         // HH:mm format
  endTime: string;           // HH:mm format
  isActive: boolean;
  estimatedDuration: number; // In minutes
  priority?: number;
}
```

**Invariants**:
- Only routines for active weekdays returned
- startTime/endTime in 24-hour format
- Routines sorted by startTime

## Data Flow Contract

### Event Types Consumed
All timer-related selectors consume these event types from `SS_V1_LOG_*` keys:
- `TIMER_START`
- `TIMER_PAUSE`
- `TIMER_RESUME`
- `TIMER_STOP`
- `MANUAL_TIME_ENTRY`

### Storage Keys
- `SS_V1_LOG_YYYY-MM-DD` - Event logs for each day
- `SS_V1_ACTIVE_TIMER` - Current timer state (ephemeral)
- `SS_V1_ROUTINES` - Routine definitions
- `SS_V1_TASKS` - Task definitions

### Performance Guarantees
- All selectors complete in < 10ms on mid-tier hardware
- Memoization prevents unnecessary recalculations
- No network I/O within selectors

## Version Compatibility
- **v1.0** - Initial release with Phase-1 features
- Compatible with Study Sentinel v2.0.0+

## Migration Notes
- Previous versions used different storage keys and event formats
- Legacy migration is out of scope for Phase-1
- Fresh install recommended