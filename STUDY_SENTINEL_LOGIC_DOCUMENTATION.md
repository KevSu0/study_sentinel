# Study Sentinel Application Logic Documentation

## Table of Contents
1. [Core Timer Logic](#core-timer-logic)
2. [Task Timer Types](#task-timer-types)
3. [Routine Management](#routine-management)
4. [Time Metrics Calculation](#time-metrics-calculation)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Interactive Data Operations](#interactive-data-operations)
7. [Mathematical Formulas](#mathematical-formulas)
8. [Manual Time Logging](#manual-time-logging)

---

## Core Timer Logic

### Timer State Management (`src/hooks/use-global-state.tsx`)

The application uses a sophisticated timer system that tracks both countdown and infinity timers with pause functionality.

```typescript
type StoredTimer = {
  item: ActiveTimerItem;
  startTime?: number;        // When timer started (infinity mode)
  endTime?: number;          // When timer ends (countdown mode)
  isPaused: boolean;
  pausedTime: number;        // Remaining time for countdown when paused
  pausedDuration: number;    // Total accumulated pause time
  pauseCount: number;        // Number of pause events
  pauseStartTime?: number;   // When current pause started
  lastPauseDuration?: number; // Duration of last pause
  milestones: {};           // Tracking for notifications
  starCount: number;
}
```

### Timer Update Logic (Lines 394-408)

```typescript
// Update timer every second
if (savedTimer.startTime) {
  elapsed = Math.round((Date.now() - savedTimer.startTime + savedTimer.pausedDuration) / 1000);
}

// Countdown Timer Logic
if (savedTimer.item.type === 'task' && savedTimer.item.item.timerType === 'countdown') {
  const remaining = Math.round((savedTimer.endTime - Date.now()) / 1000);
  newDisplay = formatTime(remaining);
  newOvertime = remaining < 0;
  const totalDuration = (savedTimer.item.item.duration || 0) * 60;
  newProgress = totalDuration > 0 ? Math.min(100, (1 - (remaining / totalDuration)) * 100) : 0;
} else {
  // Infinity Timer Logic
  newDisplay = formatTime(elapsed);
  newProgress = null;
}
```

---

## Task Timer Types

### 1. Countdown Timer

**Definition**: Tasks with a fixed duration that counts down to zero.

**Initialization** (`src/hooks/use-global-state.tsx:736-740`):
```typescript
if (task.timerType === 'countdown' && task.duration) {
  timerData.endTime = Date.now() + task.duration * 60 * 1000;
}
```

**Progress Calculation**:
- Total Duration: `task.duration * 60` seconds
- Remaining Time: `(endTime - currentTime) / 1000`
- Progress Percentage: `(1 - (remaining / totalDuration)) * 100`
- Overtime Status: `remaining < 0`

**Display**:
- Shows negative time when in overtime
- Progress bar fills up as time counts down
- Stops at 100% or shows overtime progress

### 2. Infinity Timer

**Definition**: Tasks that run indefinitely until manually stopped.

**Time Calculation**:
- Elapsed Time: `(currentTime - startTime + pausedDuration) / 1000`
- No end time or progress bar
- Continuous time tracking

**Points Calculation** (`src/components/dashboard/activity/activity-item.tsx`):
```typescript
if (item.item.timerType === 'infinity') {
  const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
  pointsEarned = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
}
```

---

## Routine Management

### Routine Structure (`src/lib/types.ts`)

```typescript
export type Routine = {
  id: string;
  shortId: string;
  title: string;
  description?: string;
  days: number[];        // 0 = Sunday, 1 = Monday, etc.
  startTime: string;    // HH:mm format
  endTime: string;      // HH:mm format
  priority: TaskPriority;
};
```

### Routine Scheduling Logic (`src/app/plans/page.tsx:77-83`)

```typescript
// Filter routines for selected day
const selectedDayRoutines = routines.filter((r) =>
  r.days.includes(selectedDate.getDay())
);
```

### Day Processing (`src/components/timetable/routine-list-item.tsx:51-53`)

```typescript
const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday-first order

const sortedDays = dayOrder.filter(day => routine.days.includes(day));
```

---

## Time Metrics Calculation

### Core Metrics Function (`src/lib/metrics.ts:37-93`)

```typescript
export function calculateSessionMetrics(timerState: {
  startTime?: number;
  endTime?: number;
  pausedDuration: number;
  pauseCount: number;
  isPaused: boolean;
  pauseStartTime?: number;
}): SessionMetrics {
  const now = Date.now();
  let totalDuration: number;

  // Calculate total duration based on timer type
  if (timerState.endTime) {
    // Countdown timer
    totalDuration = timerState.endTime - (timerState.startTime || timerState.endTime - timerState.pausedDuration);
  } else if (timerState.startTime) {
    // Infinity timer
    totalDuration = timerState.isPaused
      ? timerState.pausedDuration
      : now - timerState.startTime + timerState.pausedDuration;
  } else {
    totalDuration = timerState.pausedDuration;
  }

  // Add any open pause duration
  if (timerState.isPaused && timerState.pauseStartTime) {
    const openPauseDuration = now - timerState.pauseStartTime;
    totalDuration += openPauseDuration;
  }

  // Apply constraints
  totalDuration = Math.min(Math.max(totalDuration, 0), MAXIMUM_SESSION_DURATION);

  // Calculate pause duration
  const pauseDuration = Math.min(timerState.pausedDuration, totalDuration);

  // Calculate productive duration
  const productiveDuration = Math.max(0, totalDuration - pauseDuration);

  // Calculate focus percentage
  const focusPercentage = totalDuration > 0
    ? Math.round((productiveDuration / totalDuration) * 1000) / 10
    : 0;

  return {
    totalDuration,
    productiveDuration,
    pauseDuration,
    pauseCount: timerState.pauseCount || 0,
    focusPercentage: Math.max(0, Math.min(100, focusPercentage)),
  };
}
```

### Pause Management Logic (`src/hooks/use-global-state.tsx:750-788`)

#### Starting a Pause:
```typescript
if (isNowPaused) {
  // Starting a pause
  newTimerState.pauseStartTime = Date.now();
  newTimerState.pauseCount = (savedTimer.pauseCount || 0) + 1;

  if (newTimerState.item.type === 'task' && newTimerState.item.item.timerType === 'countdown' && newTimerState.endTime) {
    newTimerState.pausedTime = Math.max(0, newTimerState.endTime - Date.now());
  } else if (newTimerState.startTime) {
    newTimerState.pausedDuration += Date.now() - newTimerState.startTime;
    newTimerState.startTime = 0;
  }
}
```

#### Resuming from Pause:
```typescript
// Resuming from pause
const pauseEndTime = Date.now();
const lastPauseDuration = savedTimer.pauseStartTime ?
  Math.max(5000, pauseEndTime - savedTimer.pauseStartTime) : 0; // Min 5 seconds

newTimerState.lastPauseDuration = lastPauseDuration;
newTimerState.pausedDuration += lastPauseDuration;
newTimerState.pauseStartTime = undefined;

if (newTimerState.item.type === 'task' && newTimerState.item.item.timerType === 'countdown' && newTimerState.pausedTime > 0) {
  newTimerState.endTime = Date.now() + newTimerState.pausedTime;
} else {
  newTimerState.startTime = Date.now();
}
```

### Constants (`src/lib/metrics.ts:28-32`)

```typescript
const METRICS_VERSION = '1.1.0';
const MINIMUM_SESSION_DURATION = 60 * 1000;    // 60 seconds
const MINIMUM_PAUSE_DURATION = 5 * 1000;      // 5 seconds
const MAXIMUM_SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const DAY_CUT_HOUR = 4; // 4 AM IST (day boundary)
```

---

## Data Flow Architecture

### 1. State Management Flow

```
User Action → Component → use-global-state → localStorage → API Sync
     ↓
  State Update → Re-render → UI Update
```

### 2. Data Storage Strategy

#### localStorage Keys:
- `TIMER_KEY`: Active timer state
- `TASKS_KEY`: All tasks
- `LOG_PREFIX_{date}`: Daily activity logs
- `ROUTINES_KEY`: Routine definitions
- `EARNED_BADGES_KEY`: User achievements

### 3. Data Synchronization Pattern (`src/hooks/use-global-state.tsx:528-560`)

```typescript
const addTask = useCallback(async (task: Omit<StudyTask, 'id' | 'status' | 'shortId'>) => {
  // 1. Optimistic UI Update
  const tempId = `temp_${crypto.randomUUID()}`;
  const newTask: StudyTask = { ...task, id: tempId, shortId: generateShortId('T'), status: 'todo' };

  setStateAndDerive(prev => {
    const updatedTasks = [...prev.tasks, newTask].sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
    return {tasks: updatedTasks};
  });

  try {
    // 2. API Call
    const response = await safeApiFetch(remoteApiPaths.tasksCollection(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    const savedTask = await parseJsonResponse<StudyTask>(response);

    // 3. Update with persisted data
    setStateAndDerive(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === tempId ? savedTask : t);
      localStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
      addLog('TASK_ADD', {taskId: savedTask.id, title: savedTask.title});
      return {tasks: updatedTasks};
    });
  } catch (error) {
    // 4. Offline fallback
    setStateAndDerive(prev => {
      localStorage.setItem(TASKS_KEY, JSON.stringify(prev.tasks));
      addLog('TASK_ADD_OFFLINE', {taskId: tempId, title: newTask.title});
      return {};
    });
  }
}, [addLog, setStateAndDerive]);
```

---

## Interactive Data Operations

### 1. Log Management (`src/hooks/use-global-state.tsx:489-517`)

#### Adding Logs:
```typescript
const addLog = useCallback((type: LogEvent['type'], payload: LogEvent['payload']) => {
  setStateAndDerive(prevState => {
    const newLog: LogEvent = {
      id: crypto.randomUUID(),
      timestamp: formatISO(new Date()),
      type,
      payload
    };
    const updatedLogs = [...prevState.logs, newLog];
    const logKey = `${LOG_PREFIX}${format(getSessionDate(), 'yyyy-MM-dd')}`;
    localStorage.setItem(logKey, JSON.stringify(updatedLogs));
    return {logs: updatedLogs};
  });
}, [setStateAndDerive]);
```

#### Log Structure:
```typescript
type LogEvent = {
  id: string;
  timestamp: string; // ISO format
  type: 'TASK_ADD' | 'TIMER_START' | 'TIMER_PAUSE' | 'TIMER_COMPLETE' | etc.
  payload: {
    taskId?: string;
    title: string;
    duration?: number;
    pauseCount?: number;
    focusPercentage?: number;
    // ... other type-specific fields
  };
};
```

### 2. Timer Control Operations

#### Start Timer (`src/hooks/use-global-state.tsx:721-748`):
```typescript
const startTimer = useCallback((item: StudyTask | Routine) => {
  if (state.activeItem) {
    toast.error(`Please stop or complete the timer for "${state.activeItem.item.title}" first.`);
    return;
  }

  const type = 'timerType' in item ? 'task' : 'routine';
  const timerData: StoredTimer = {
    item: {type, item} as ActiveTimerItem,
    startTime: Date.now(),
    isPaused: false,
    pausedTime: 0,
    pausedDuration: 0,
    milestones: {},
    starCount: 0,
    pauseCount: 0
  };

  // Set end time for countdown timers
  if (type === 'task') {
    const task = item as StudyTask;
    if (task.timerType === 'countdown' && task.duration) {
      timerData.endTime = Date.now() + task.duration * 60 * 1000;
    }
    addLog('TIMER_START', {taskId: task.id, title: task.title});
    updateTask({...task, status: 'in_progress'});
  } else {
    addLog('TIMER_START', { routineId: item.id, title: item.title });
  }

  localStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
  showNewQuote();
  setState(prev => ({...prev, activeItem: timerData.item, isPaused: false, starCount: 0}));
}, [state.activeItem, addLog, updateTask, showNewQuote]);
```

#### Stop Timer (`src/hooks/use-global-state.tsx:790-820`):
```typescript
const stopTimer = useCallback((reason: string, studyLog: string = '') => {
  stopSound(state.soundSettings.tick);
  const savedTimerJSON = localStorage.getItem(TIMER_KEY);
  if (!savedTimerJSON) return;
  const savedTimer: StoredTimer = JSON.parse(savedTimerJSON);

  // Handle any open pause
  let finalTimerState = { ...savedTimer };
  if (savedTimer.isPaused && savedTimer.pauseStartTime) {
    const openPauseDuration = Date.now() - savedTimer.pauseStartTime;
    finalTimerState.pausedDuration += openPauseDuration;
  }

  // Calculate final metrics
  const metrics = calculateSessionMetrics(finalTimerState);

  // Create completion log
  if (savedTimer.item.type === 'task') {
    addLog('TIMER_STOP', {
      taskId: savedTimer.item.item.id,
      title: savedTimer.item.item.title,
      reason,
      totalDuration: metrics.totalDuration,
      productiveDuration: metrics.productiveDuration,
      pauseDuration: metrics.pauseDuration,
      pauseCount: metrics.pauseCount,
      focusPercentage: metrics.focusPercentage,
      studyLog
    });

    // Update task status
    updateTask({...savedTimer.item.item, status: 'todo'});
  }

  // Clear timer
  localStorage.removeItem(TIMER_KEY);
  setState(prev => ({...prev, activeItem: null, isPaused: false}));
}, [addLog, state.soundSettings.tick, stopSound, updateTask]);
```

---

## Mathematical Formulas

### 1. Time Calculations

#### Total Duration:
- **Countdown**: `endTime - startTime`
- **Infinity**: `currentTime - startTime + pausedDuration`

#### Productive Duration:
`productiveDuration = totalDuration - pauseDuration`

#### Focus Percentage:
```
focusPercentage = (productiveDuration / totalDuration) * 100
// Clamped between 0 and 100
focusPercentage = max(0, min(100, focusPercentage))
```

#### Time-Weighted Focus (for multiple sessions):
```
totalProductiveMs = sum(session.productiveDuration for all sessions)
totalMs = sum(session.totalDuration for all sessions)
weightedFocus = (totalProductiveMs / totalMs) * 100
```

### 2. Points Calculation

#### Countdown Timer:
- **On Completion**: `task.duration * priorityMultiplier`
- **Priority Multipliers**: Low=1, Medium=1.5, High=2

#### Infinity Timer:
- **Dynamic Points**: `(minutesElapsed / 60) * priorityMultiplier`
- **Priority Multipliers**: Low=1, Medium=2, High=3

### 3. Pause Analysis

#### Average Pause Duration:
`avgPauseDuration = totalPauseDuration / pauseCount`

#### Pause Distribution Categories:
- **0-30s**: `avgPauseDuration <= 30,000ms`
- **30s-2m**: `30,000ms < avgPauseDuration <= 120,000ms`
- **2m-5m**: `120,000ms < avgPauseDuration <= 300,000ms`
- **5m+**: `avgPauseDuration > 300,000ms`

---

## Manual Time Logging

### Manual Time Entry Flow

The application supports manual time logging through activity logs:

#### 1. Adding Manual Time (`src/components/dashboard/activity/ManualTimeEntryDialog.tsx`):

```typescript
const handleAddManualTime = useCallback((data: ManualTimeEntryData) => {
  const durationMs = (data.hours * 3600 + data.minutes * 60 + data.seconds) * 1000;

  addLog('MANUAL_TIME_ENTRY', {
    taskId: data.taskId,
    title: data.title,
    duration: durationMs,
    productiveDuration: durationMs * (data.productivePercentage / 100),
    pauseDuration: durationMs * ((100 - data.productivePercentage) / 100),
    focusPercentage: data.productivePercentage,
    note: data.note
  });

  // Update task status if marked as completed
  if (data.markCompleted) {
    updateTask({...task, status: 'completed'});
  }
}, [addLog, updateTask]);
```

#### 2. Manual Time Data Structure:

```typescript
type ManualTimeEntryData = {
  taskId: string;
  title: string;
  hours: number;
  minutes: number;
  seconds: number;
  productivePercentage: number; // 0-100
  markCompleted: boolean;
  note?: string;
  date: Date;
};
```

#### 3. Metrics Extraction from Logs (`src/lib/format-metrics.ts:46-85`):

```typescript
export function extractMetricsFromLog(log: any): SessionMetrics | null {
  if (!log?.payload) return null;

  const payload = log.payload;

  // Check if metrics are available in the log
  if (typeof payload.totalDuration === 'number' &&
      typeof payload.productiveDuration === 'number' &&
      typeof payload.pauseDuration === 'number' &&
      typeof payload.pauseCount === 'number' &&
      typeof payload.focusPercentage === 'number') {
    return {
      totalDuration: payload.totalDuration,
      productiveDuration: payload.productiveDuration,
      pauseDuration: payload.pauseDuration,
      pauseCount: payload.pauseCount,
      focusPercentage: payload.focusPercentage
    };
  }

  return null;
}
```

### 4. Session Boundary Handling

For sessions that cross day boundaries (4 AM cutoff):

```typescript
export function splitSessionAcrossDays(
  session: CompletedWork,
  sessionStart: Date,
  sessionEnd: Date
): Array<{ date: string; totalMs: number; pauseMs: number }> {
  const splits: Array<{ date: string; totalMs: number; pauseMs: number }> = [];

  let currentDate = new Date(sessionStart);
  currentDate.setHours(DAY_CUT_HOUR, 0, 0, 0);

  if (currentDate > sessionStart) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentDate < sessionEnd) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const segmentStart = new Date(Math.max(sessionStart.getTime(), currentDate.getTime()));
    const segmentEnd = new Date(Math.min(sessionEnd.getTime(), nextDay.getTime()));

    const segmentDuration = segmentEnd.getTime() - segmentStart.getTime();
    const totalDuration = session.totalDuration;

    // Calculate proportional split
    const proportion = segmentDuration / totalDuration;
    const segmentTotalMs = Math.round(totalDuration * proportion);
    const segmentPauseMs = Math.round(session.pauseDuration * proportion);

    splits.push({
      date: currentDate.toISOString().split('T')[0],
      totalMs: segmentTotalMs,
      pauseMs: segmentPauseMs,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return splits;
}
```

---

## Data Optimization Strategies

### 1. Performance Optimizations

#### a. Memoization
- React.memo for component optimization
- useMemo for expensive calculations
- useCallback for stable function references

#### b. Efficient State Updates
- Batch updates with setStateAndDerive
- Optimistic UI updates for better UX
- Debounced API calls for sync operations

#### c. Data Partitioning
- Daily log files to prevent large JSON parsing
- Indexed keys for quick lookups
- Versioned metrics for backward compatibility

### 2. Data Integrity

#### a. Validation
- Zod schemas for type safety
- Runtime validation on data load
- Fallback values for corrupted data

#### b. Error Boundaries
- Try-catch for localStorage operations
- Graceful degradation for offline mode
- Data recovery mechanisms

### 3. Offline Support

#### a. Local Storage Fallback
- All data persisted locally first
- Sync queue for online operations
- Conflict resolution strategies

#### b. Background Sync
- Automatic retry on failed operations
- Exponential backoff for API calls
- Sync status indicators

---

## Summary

The Study Sentinel application implements a comprehensive time tracking system with:

1. **Dual Timer Modes**: Countdown and infinity timers with distinct logic
2. **Sophisticated Pause Tracking**: Minimum pause duration, open pause handling
3. **Routine Scheduling**: Day-based recurring tasks
4. **Rich Metrics**: Focus percentage, productivity analysis, pause distribution
5. **Manual Time Entry**: Flexible logging with productivity estimates
6. **Robust Data Flow**: Optimistic updates, offline support, and sync strategies
7. **Performance Optimized**: Memoization, data partitioning, and efficient updates

The mathematical calculations ensure accurate time tracking while the data architecture maintains consistency across online/offline scenarios.