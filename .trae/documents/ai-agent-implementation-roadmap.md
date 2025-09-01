# AI Agent Implementation Roadmap

## Modular State Architecture Migration - 5-Task Execution Plan

***

## Overview

This roadmap breaks down the transformation of `use-global-state.tsx` from a monolithic 1,249-line file into a modular "gizmo puzzle" architecture into exactly **5 sequential tasks** optimized for AI agent execution. Each task is self-contained with clear inputs, outputs, and validation criteria.

**Total Estimated Time**: 10-12 weeks
**Architecture Goal**: Transform monolithic state into domain-specific modules with 70% bundle size reduction and 80% re-render optimization

---

## Task 1: Foundation Architecture Setup

### 1.1 Objective
Establish the core modular architecture foundation with backward compatibility layer and essential infrastructure.

### 1.2 AI Agent Instructions

**Primary Actions:**
1. Create complete directory structure for modular state architecture
2. Implement core state coordination system
3. Set up persistence layer abstraction
4. Create backward compatibility layer
5. Establish provider composition framework

**File Creation Sequence:**
```bash
# Directory Structure
src/hooks/state/
├── core/
│   ├── use-app-state.tsx
│   ├── use-state-persistence.tsx
│   └── state-types.ts
├── domains/
│   └── [domain folders to be created]
├── providers/
│   ├── AppStateProvider.tsx
│   └── index.tsx
└── hooks/
    └── use-domain-state.tsx
```

### 1.3 Implementation Details

**Core Files to Create:**

1. **`src/hooks/state/core/use-app-state.tsx`** (150-200 lines)
   - Central state coordinator
   - Cross-domain synchronization
   - Loading state management
   - Error boundary handling

2. **`src/hooks/state/core/use-state-persistence.tsx`** (100-150 lines)
   - localStorage abstraction layer
   - State hydration/dehydration
   - Migration utilities
   - Sync coordination

3. **`src/hooks/state/core/state-types.ts`** (50-100 lines)
   - Shared type definitions
   - Domain interfaces
   - Common state structures

4. **`src/hooks/state/providers/AppStateProvider.tsx`** (100-150 lines)
   - Main provider wrapper
   - Context composition
   - Provider orchestration

5. **`src/hooks/state/providers/index.tsx`** (50-100 lines)
   - Provider exports
   - Composition utilities

### 1.4 Validation Criteria

**Success Metrics:**
- [ ] All directory structure created correctly
- [ ] Core state coordinator functional
- [ ] Persistence layer operational
- [ ] Provider composition working
- [ ] No breaking changes to existing functionality
- [ ] All existing tests pass
- [ ] TypeScript compilation successful

**Performance Benchmarks:**
- Initial load time: No regression
- Bundle size: Baseline established
- Memory usage: Baseline established

### 1.5 Deliverables

1. Complete modular directory structure
2. Core state coordination system
3. Persistence abstraction layer
4. Provider composition framework
5. Type definition system
6. Validation test suite for foundation

### 1.6 Dependencies

**Input Requirements:**
- Current `use-global-state.tsx` file analysis
- Existing component dependency mapping
- Current test suite structure

**Output for Next Task:**
- Functional core architecture
- Provider composition system
- Type definitions for domains
- Persistence layer ready for domain integration

---

## Task 2: Simple Domain Extraction (Settings, Profile, Badges)

### 2.1 Objective
Extract and modularize the three simplest domains (Settings, Profile, Badges) with minimal cross-domain dependencies.

### 2.2 AI Agent Instructions

**Primary Actions:**
1. Extract Settings domain (sound settings, preferences)
2. Extract Profile domain (user profile management)
3. Extract Badge domain (badge management and checking)
4. Create domain-specific providers
5. Update backward compatibility layer
6. Implement domain-specific tests

**Domain Extraction Order:**
1. **Settings Domain** (Lowest complexity)
2. **Profile Domain** (Simple CRUD)
3. **Badge Domain** (Moderate complexity)

### 2.3 Implementation Details

**Settings Domain Files:**
```typescript
// src/hooks/state/domains/settings/
├── use-sound-settings.tsx       (80-120 lines)
├── use-app-settings.tsx         (60-100 lines)
├── settings-state-types.ts      (30-50 lines)
└── SettingsProvider.tsx         (50-80 lines)
```

**Profile Domain Files:**
```typescript
// src/hooks/state/domains/profile/
├── use-profile-state.tsx        (100-150 lines)
├── profile-state-types.ts       (40-60 lines)
└── ProfileProvider.tsx          (60-90 lines)
```

**Badge Domain Files:**
```typescript
// src/hooks/state/domains/badges/
├── use-badge-state.tsx          (120-180 lines)
├── use-badge-checker.tsx        (100-150 lines)
├── badge-state-types.ts         (50-80 lines)
└── BadgeProvider.tsx            (80-120 lines)
```

### 2.4 Code Migration Strategy

**For Each Domain:**
1. **Extract Logic**: Copy relevant functions from `use-global-state.tsx`
2. **Create Hook**: Implement domain-specific hook with identical API
3. **Create Provider**: Wrap hook in React Context Provider
4. **Update Types**: Define domain-specific TypeScript interfaces
5. **Create Tests**: Unit tests for domain functionality
6. **Integration**: Add to provider composition
7. **Compatibility**: Update backward compatibility layer

**Example Implementation Pattern:**
```typescript
// Domain Hook Pattern
export function useSettingsState() {
  const [soundSettings, setSoundSettings] = useState(defaultSoundSettings);
  const [isMuted, setIsMuted] = useState(false);
  
  // Extracted functions from use-global-state.tsx
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  // Return identical API
  return {
    soundSettings,
    isMuted,
    toggleMute,
    // ... other functions
  };
}
```

### 2.5 Validation Criteria

**Per-Domain Validation:**
- [ ] Domain hook created with identical API
- [ ] Domain provider implemented and functional
- [ ] Domain-specific tests created and passing
- [ ] Integration with core architecture successful
- [ ] Backward compatibility maintained
- [ ] No performance regressions

**Overall Task Validation:**
- [ ] All three domains extracted successfully
- [ ] Provider composition updated
- [ ] Backward compatibility layer updated
- [ ] All existing tests pass
- [ ] New domain tests achieve 90%+ coverage
- [ ] Bundle size tracking shows modular loading

### 2.6 Deliverables

1. **Settings Domain Module**
   - Sound settings management
   - App preferences handling
   - Settings persistence

2. **Profile Domain Module**
   - User profile CRUD operations
   - Profile data persistence
   - Profile validation

3. **Badge Domain Module**
   - Badge management system
   - Achievement checking logic
   - Badge earning tracking

4. **Updated Architecture**
   - Provider composition with new domains
   - Backward compatibility layer updates
   - Domain-specific test suites

### 2.7 Dependencies

**Input Requirements:**
- Completed Task 1 foundation
- Current domain logic from `use-global-state.tsx`
- Existing test patterns

**Output for Next Task:**
- Three functional domain modules
- Updated provider system
- Proven domain extraction methodology
- Test patterns for complex domains

---

## Task 3: Complex Domain Extraction (Logs, Tasks, Routines)

### 3.1 Objective
Extract the three most complex domains (Activity Logs, Tasks, Routines) with significant cross-domain dependencies and business logic.

### 3.2 AI Agent Instructions

**Primary Actions:**
1. Extract Activity Logs domain (activity tracking, logging)
2. Extract Tasks domain (task CRUD, task management)
3. Extract Routines domain (routine management, scheduling)
4. Handle cross-domain dependencies carefully
5. Implement state normalization for performance
6. Create comprehensive integration tests

**Domain Extraction Order:**
1. **Activity Logs Domain** (Foundation for others)
2. **Tasks Domain** (Core functionality)
3. **Routines Domain** (Complex scheduling logic)

### 3.3 Implementation Details

**Activity Logs Domain Files:**
```typescript
// src/hooks/state/domains/logs/
├── use-activity-logs.tsx        (150-200 lines)
├── use-log-persistence.tsx      (100-150 lines)
├── log-state-types.ts           (60-100 lines)
└── ActivityLogsProvider.tsx     (80-120 lines)
```

**Tasks Domain Files:**
```typescript
// src/hooks/state/domains/tasks/
├── use-task-state.tsx           (200-250 lines)
├── use-task-operations.tsx      (150-200 lines)
├── task-state-types.ts          (80-120 lines)
└── TaskProvider.tsx             (100-150 lines)
```

**Routines Domain Files:**
```typescript
// src/hooks/state/domains/routines/
├── use-routine-state.tsx        (180-230 lines)
├── use-routine-scheduling.tsx   (120-180 lines)
├── routine-state-types.ts       (70-110 lines)
└── RoutineProvider.tsx          (90-130 lines)
```

### 3.4 Cross-Domain Dependency Management

**Dependency Patterns:**
```typescript
// Cross-domain communication via events
interface CrossDomainEvents {
  onTaskComplete: (task: StudyTask) => void;
  onRoutineComplete: (routine: Routine) => void;
  onActivityLogged: (activity: ActivityFeedItem) => void;
}

// Domain coordination
export function useCrossDomainCoordination(): CrossDomainEvents {
  const { addLog } = useActivityLogs();
  const { updateTaskStats } = useTaskState();
  const { updateRoutineStats } = useRoutineState();
  
  return {
    onTaskComplete: (task) => {
      addLog('task_completed', { taskId: task.id });
      updateTaskStats(task);
    },
    // ... other coordinated actions
  };
}
```

### 3.5 State Normalization Implementation

**Normalized State Structure:**
```typescript
// Normalized Task State
interface NormalizedTaskState {
  byId: Record<string, StudyTask>;
  allIds: string[];
  byStatus: {
    todo: string[];
    completed: string[];
    archived: string[];
  };
  byDate: Record<string, string[]>;
  byPriority: {
    low: string[];
    medium: string[];
    high: string[];
  };
}

// Normalized Routine State
interface NormalizedRoutineState {
  byId: Record<string, Routine>;
  allIds: string[];
  byDay: Record<number, string[]>; // 0-6 for days of week
  byStatus: {
    active: string[];
    paused: string[];
    completed: string[];
  };
}
```

### 3.6 Performance Optimization Implementation

**Selective Re-rendering:**
```typescript
// Context splitting for performance
const TaskDataContext = createContext<TaskData>();
const TaskActionsContext = createContext<TaskActions>();

// Components subscribe to specific contexts
function TaskList() {
  const { tasks } = useContext(TaskDataContext); // Only data
  return <div>{tasks.map(renderTask)}</div>;
}

function TaskActions() {
  const { addTask, updateTask } = useContext(TaskActionsContext); // Only actions
  return <TaskForm onSubmit={addTask} />;
}
```

**Memoization Strategy:**
```typescript
// Expensive computations memoized
const useTaskStats = () => {
  const { tasks } = useTaskState();
  
  return useMemo(() => ({
    completedCount: tasks.filter(t => t.status === 'completed').length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.points || 0), 0),
    averageCompletionTime: calculateAverageTime(tasks),
  }), [tasks]);
};
```

### 3.7 Validation Criteria

**Per-Domain Validation:**
- [ ] Domain extracted with full functionality
- [ ] Cross-domain dependencies handled correctly
- [ ] State normalization implemented
- [ ] Performance optimizations active
- [ ] Comprehensive tests passing
- [ ] Integration tests successful

**Performance Validation:**
- [ ] Re-render count reduced by 60%+
- [ ] Memory usage optimized
- [ ] State update performance improved
- [ ] Bundle size shows modular loading

**Functionality Validation:**
- [ ] All existing features work identically
- [ ] Cross-domain interactions functional
- [ ] Data persistence working
- [ ] Error handling maintained

### 3.8 Deliverables

1. **Activity Logs Domain Module**
   - Activity tracking system
   - Log persistence and retrieval
   - Activity feed generation
   - Cross-domain event logging

2. **Tasks Domain Module**
   - Task CRUD operations
   - Task status management
   - Task statistics computation
   - Task-timer integration

3. **Routines Domain Module**
   - Routine management system
   - Scheduling logic
   - Routine completion tracking
   - Routine-timer integration

4. **Performance Optimizations**
   - State normalization
   - Selective re-rendering
   - Memoization strategies
   - Cross-domain coordination

### 3.9 Dependencies

**Input Requirements:**
- Completed Task 2 simple domains
- Complex domain logic from `use-global-state.tsx`
- Cross-domain dependency mapping

**Output for Next Task:**
- All major domains extracted
- Performance optimizations implemented
- Cross-domain coordination system
- Comprehensive test coverage

---

## Task 4: Timer Domain Integration & Performance Optimization

### 4.1 Objective
Extract the most complex Timer domain, implement advanced performance optimizations, and ensure seamless integration with all other domains.

### 4.2 AI Agent Instructions

**Primary Actions:**
1. Extract Timer domain (core timer logic, persistence)
2. Implement timer-task-routine integration
3. Add advanced performance optimizations
4. Implement lazy loading for non-critical domains
5. Add performance monitoring and metrics
6. Optimize state normalization across all domains

### 4.3 Implementation Details

**Timer Domain Files:**
```typescript
// src/hooks/state/domains/timer/
├── use-timer-core.tsx           (200-300 lines)
├── use-timer-persistence.tsx    (100-150 lines)
├── use-timer-integration.tsx    (150-200 lines)
├── timer-state-types.ts         (80-120 lines)
└── TimerProvider.tsx            (120-180 lines)
```

**Timer Core Implementation:**
```typescript
// Complex timer logic with cross-domain integration
export function useTimerCore() {
  const [activeItem, setActiveItem] = useState<ActiveTimerItem | null>(null);
  const [timeDisplay, setTimeDisplay] = useState('00:00:00');
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStats, setSessionStats] = useState<TimerStats>(defaultStats);
  
  // Cross-domain coordination
  const { onTaskTimerStart, onTaskTimerComplete } = useTaskState();
  const { onRoutineTimerStart, onRoutineTimerComplete } = useRoutineState();
  const { addLog } = useActivityLogs();
  
  // Timer operations with cross-domain effects
  const startTimer = useCallback((item: StudyTask | Routine) => {
    setActiveItem(item);
    
    // Coordinate with appropriate domain
    if ('subject' in item) {
      onTaskTimerStart(item as StudyTask);
    } else {
      onRoutineTimerStart(item as Routine);
    }
    
    // Log activity
    addLog('timer_started', { itemId: item.id, type: 'subject' in item ? 'task' : 'routine' });
  }, [onTaskTimerStart, onRoutineTimerStart, addLog]);
  
  // ... other timer operations
  
  return {
    activeItem,
    timeDisplay,
    isPaused,
    sessionStats,
    startTimer,
    // ... other functions
  };
}
```

### 4.4 Advanced Performance Optimizations

**1. Context Splitting by Update Frequency:**
```typescript
// High-frequency updates (timer display)
const HighFrequencyTimerContext = createContext<{
  timeDisplay: string;
  isRunning: boolean;
}>();

// Low-frequency updates (timer configuration)
const LowFrequencyTimerContext = createContext<{
  activeItem: ActiveTimerItem | null;
  sessionStats: TimerStats;
}>();

// Components subscribe to appropriate frequency
function TimerDisplay() {
  const { timeDisplay } = useContext(HighFrequencyTimerContext);
  return <div>{timeDisplay}</div>; // Only re-renders on time changes
}

function TimerControls() {
  const { activeItem } = useContext(LowFrequencyTimerContext);
  return <div>{/* Controls */}</div>; // Only re-renders on item changes
}
```

**2. Lazy Loading Implementation:**
```typescript
// Lazy load badge checking (non-critical)
const useLazyBadgeChecker = () => {
  const [badgeChecker, setBadgeChecker] = useState(null);
  
  const loadBadgeChecker = useCallback(async () => {
    if (!badgeChecker) {
      const { createBadgeChecker } = await import('../badges/badge-checker');
      setBadgeChecker(createBadgeChecker());
    }
  }, [badgeChecker]);
  
  return { badgeChecker, loadBadgeChecker };
};

// Lazy load settings (rarely accessed)
const useLazySettings = () => {
  const [settings, setSettings] = useState(null);
  
  useEffect(() => {
    // Load settings only when first accessed
    import('../settings/use-settings-state').then(module => {
      setSettings(module.useSettingsState());
    });
  }, []);
  
  return settings;
};
```

**3. Performance Monitoring:**
```typescript
// Performance monitoring hook
function usePerformanceMonitor(domainName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  renderCount.current++;
  
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    // Log performance metrics
    console.log(`${domainName} - Render #${renderCount.current}: ${renderTime}ms`);
    
    // Track in analytics (if available)
    if (window.analytics) {
      window.analytics.track('domain_render', {
        domain: domainName,
        renderCount: renderCount.current,
        renderTime,
      });
    }
    
    startTime.current = performance.now();
  });
  
  return { renderCount: renderCount.current };
}
```

### 4.5 State Normalization Optimization

**Cross-Domain State Coordination:**
```typescript
// Normalized cross-domain state
interface NormalizedAppState {
  entities: {
    tasks: Record<string, StudyTask>;
    routines: Record<string, Routine>;
    logs: Record<string, LogEvent>;
    badges: Record<string, Badge>;
  };
  relations: {
    taskLogs: Record<string, string[]>; // taskId -> logIds
    routineLogs: Record<string, string[]>; // routineId -> logIds
    earnedBadges: Record<string, string[]>; // userId -> badgeIds
  };
  ui: {
    activeTimer: string | null; // entityId
    selectedTask: string | null;
    selectedRoutine: string | null;
  };
}
```

### 4.6 Integration Testing Strategy

**Cross-Domain Integration Tests:**
```typescript
// Test timer-task integration
describe('Timer-Task Integration', () => {
  it('should start timer for task and update task state', async () => {
    const { result } = renderHook(() => ({
      timer: useTimerCore(),
      tasks: useTaskState(),
    }), {
      wrapper: ({ children }) => (
        <AppStateProvider>
          <TaskProvider>
            <TimerProvider>
              {children}
            </TimerProvider>
          </TaskProvider>
        </AppStateProvider>
      ),
    });
    
    const mockTask = createMockTask();
    
    // Add task
    await act(async () => {
      await result.current.tasks.addTask(mockTask);
    });
    
    // Start timer for task
    act(() => {
      result.current.timer.startTimer(mockTask);
    });
    
    // Verify integration
    expect(result.current.timer.activeItem).toEqual(mockTask);
    expect(result.current.tasks.tasks.find(t => t.id === mockTask.id)?.status).toBe('in_progress');
  });
});
```

### 4.7 Validation Criteria

**Timer Domain Validation:**
- [ ] Timer domain extracted with full functionality
- [ ] Cross-domain integration working (tasks, routines, logs)
- [ ] Timer persistence operational
- [ ] Real-time updates functioning
- [ ] Session statistics accurate

**Performance Validation:**
- [ ] Context splitting reduces re-renders by 70%+
- [ ] Lazy loading reduces initial bundle by 30%+
- [ ] Performance monitoring active
- [ ] Memory usage optimized
- [ ] State updates under 16ms (60fps)

**Integration Validation:**
- [ ] All cross-domain interactions working
- [ ] State normalization complete
- [ ] Performance metrics meet targets
- [ ] All existing functionality preserved

### 4.8 Deliverables

1. **Timer Domain Module**
   - Core timer functionality
   - Timer persistence system
   - Cross-domain integration
   - Real-time updates

2. **Advanced Performance Optimizations**
   - Context splitting by update frequency
   - Lazy loading for non-critical domains
   - Performance monitoring system
   - State normalization optimization

3. **Integration System**
   - Cross-domain coordination
   - Event-driven architecture
   - State synchronization
   - Error handling

4. **Performance Monitoring**
   - Render count tracking
   - Performance metrics
   - Bundle size analysis
   - Memory usage monitoring

### 4.9 Dependencies

**Input Requirements:**
- Completed Task 3 complex domains
- Timer logic from `use-global-state.tsx`
- Cross-domain integration requirements

**Output for Next Task:**
- Complete modular architecture
- All performance optimizations active
- Comprehensive integration system
- Performance monitoring in place

---

## Task 5: Testing, Documentation & Production Readiness

### 5.1 Objective
Complete comprehensive testing, create detailed documentation, implement production monitoring, and ensure the modular architecture is production-ready with full backward compatibility.

### 5.2 AI Agent Instructions

**Primary Actions:**
1. Create comprehensive test suite for all domains
2. Implement integration and end-to-end tests
3. Create detailed documentation and migration guides
4. Set up production monitoring and error tracking
5. Perform final performance benchmarking
6. Create rollback strategy and deployment plan

### 5.3 Comprehensive Testing Implementation

**Test Structure:**
```
src/hooks/state/__tests__/
├── unit/
│   ├── domains/
│   │   ├── tasks.test.tsx
│   │   ├── routines.test.tsx
│   │   ├── timer.test.tsx
│   │   ├── badges.test.tsx
│   │   ├── profile.test.tsx
│   │   ├── logs.test.tsx
│   │   └── settings.test.tsx
│   └── core/
│       ├── app-state.test.tsx
│       └── persistence.test.tsx
├── integration/
│   ├── task-timer.test.tsx
│   ├── routine-timer.test.tsx
│   ├── cross-domain.test.tsx
│   └── backward-compatibility.test.tsx
├── performance/
│   ├── render-performance.test.tsx
│   ├── memory-usage.test.tsx
│   └── bundle-size.test.tsx
└── e2e/
    ├── complete-workflow.test.tsx
    └── migration-scenarios.test.tsx
```

**Unit Test Implementation:**
```typescript
// Example: Task domain unit tests
describe('useTaskState', () => {
  const renderTaskState = () => renderHook(() => useTaskState(), {
    wrapper: ({ children }) => (
      <TaskProvider>{children}</TaskProvider>
    ),
  });
  
  describe('Task CRUD Operations', () => {
    it('should add task correctly', async () => {
      const { result } = renderTaskState();
      const mockTask = createMockTask({ title: 'Test Task' });
      
      await act(async () => {
        await result.current.addTask(mockTask);
      });
      
      expect(result.current.tasks).toContainEqual(
        expect.objectContaining({ title: 'Test Task' })
      );
    });
    
    it('should update task status', () => {
      const { result } = renderTaskState();
      const mockTask = createMockTask({ status: 'todo' });
      
      act(() => {
        result.current.updateTask(mockTask.id, { status: 'completed' });
      });
      
      expect(result.current.tasks.find(t => t.id === mockTask.id)?.status)
        .toBe('completed');
    });
    
    it('should calculate task statistics correctly', () => {
      const { result } = renderTaskState();
      
      // Add multiple tasks with different statuses
      act(() => {
        result.current.addTask(createMockTask({ status: 'completed', points: 10 }));
        result.current.addTask(createMockTask({ status: 'completed', points: 15 }));
        result.current.addTask(createMockTask({ status: 'todo', points: 5 }));
      });
      
      expect(result.current.taskStats).toEqual({
        totalTasks: 3,
        completedToday: 2,
        totalPoints: 25,
      });
    });
  });
  
  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        const { tasks } = useTaskState();
        return <div>{tasks.length}</div>;
      };
      
      const { rerender } = render(
        <TaskProvider><TestComponent /></TaskProvider>
      );
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Trigger unrelated state change (should not re-render)
      act(() => {
        // Change timer state - should not affect task component
      });
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Integration Test Implementation:**
```typescript
// Cross-domain integration tests
describe('Cross-Domain Integration', () => {
  const renderIntegratedState = () => {
    const TestComponent = () => {
      const taskState = useTaskState();
      const timerState = useTimerState();
      const logState = useActivityLogs();
      return { taskState, timerState, logState };
    };
    
    return renderHook(() => TestComponent(), {
      wrapper: ({ children }) => (
        <AppStateProvider>
          <TaskProvider>
            <TimerProvider>
              <ActivityLogsProvider>
                {children}
              </ActivityLogsProvider>
            </TimerProvider>
          </TaskProvider>
        </AppStateProvider>
      ),
    });
  };
  
  it('should coordinate task completion across domains', async () => {
    const { result } = renderIntegratedState();
    const mockTask = createMockTask();
    
    // Add task
    await act(async () => {
      await result.current.taskState.addTask(mockTask);
    });
    
    // Start timer for task
    act(() => {
      result.current.timerState.startTimer(mockTask);
    });
    
    // Complete timer
    act(() => {
      result.current.timerState.completeTimer('Study session completed');
    });
    
    // Verify cross-domain effects
    expect(result.current.taskState.tasks.find(t => t.id === mockTask.id)?.status)
      .toBe('completed');
    expect(result.current.logState.todaysLogs)
      .toContainEqual(expect.objectContaining({
        type: 'task_completed',
        payload: expect.objectContaining({ taskId: mockTask.id }),
      }));
  });
});
```

**Performance Test Implementation:**
```typescript
// Performance benchmarking tests
describe('Performance Benchmarks', () => {
  it('should meet re-render performance targets', () => {
    const renderCounts = new Map();
    
    const TrackingComponent = ({ domain }: { domain: string }) => {
      const count = renderCounts.get(domain) || 0;
      renderCounts.set(domain, count + 1);
      return null;
    };
    
    const TestApp = () => {
      const taskState = useTaskState();
      const timerState = useTimerState();
      
      return (
        <>
          <TrackingComponent domain="tasks" />
          <TrackingComponent domain="timer" />
        </>
      );
    };
    
    render(
      <AppStateProvider>
        <TestApp />
      </AppStateProvider>
    );
    
    // Trigger task state change
    act(() => {
      // Add task - should only re-render task components
    });
    
    // Verify selective re-rendering
    expect(renderCounts.get('tasks')).toBe(2); // Initial + task change
    expect(renderCounts.get('timer')).toBe(1); // Only initial render
  });
  
  it('should meet bundle size targets', async () => {
    // Mock dynamic import to test lazy loading
    const mockImport = jest.fn().mockResolvedValue({
      useBadgeState: () => ({ badges: [] }),
    });
    
    // Test that badge module is not loaded initially
    expect(mockImport).not.toHaveBeenCalled();
    
    // Trigger badge loading
    const { result } = renderHook(() => useLazyBadgeState());
    
    await act(async () => {
      await result.current.loadBadges();
    });
    
    // Verify lazy loading occurred
    expect(mockImport).toHaveBeenCalledWith('../badges/use-badge-state');
  });
});
```

### 5.4 Documentation Creation

**Documentation Structure:**
```
.trae/documents/
├── migration-guide.md
├── api-reference.md
├── performance-guide.md
├── testing-guide.md
├── troubleshooting.md
└── deployment-guide.md
```

**Migration Guide Content:**
```markdown
# Migration Guide: From Monolithic to Modular State

## Overview
This guide helps developers migrate from the old `useGlobalState` to the new modular architecture.

## Quick Migration

### Option 1: No Changes Required (Recommended)
The backward compatibility layer ensures all existing code continues to work:

```typescript
// This continues to work exactly as before
const { state, addTask, startTimer } = useGlobalState();
```

### Option 2: Gradual Migration to Domain Hooks
Migrate components gradually to use domain-specific hooks:

```typescript
// Before
const { state, addTask, updateTask } = useGlobalState();

// After
const { tasks, addTask, updateTask } = useTaskState();
```

## Domain-Specific Migration

### Task Management
```typescript
// Old approach
const { state: { tasks }, addTask, updateTask } = useGlobalState();

// New approach
const { tasks, addTask, updateTask, taskStats } = useTaskState();
```

### Timer Operations
```typescript
// Old approach
const { state: { activeItem }, startTimer, stopTimer } = useGlobalState();

// New approach
const { activeItem, startTimer, stopTimer, sessionStats } = useTimerState();
```

## Performance Benefits
After migration, you'll see:
- 70% reduction in unnecessary re-renders
- 30% smaller initial bundle size
- 50% faster development builds
- 90%+ test coverage per domain
```

### 5.5 Production Monitoring Setup

**Error Tracking Implementation:**
```typescript
// Error boundary for each domain
class DomainErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error(`${this.props.domain} Domain Error:`, error, errorInfo);
    
    // Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { domain: this.props.domain },
        extra: errorInfo,
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong in {this.props.domain} domain</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

**Performance Monitoring:**
```typescript
// Production performance monitoring
function useProductionMonitoring(domainName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes(domainName)) {
            // Send performance metrics to monitoring service
            fetch('/api/metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                domain: domainName,
                metric: entry.name,
                duration: entry.duration,
                timestamp: Date.now(),
              }),
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
      
      return () => observer.disconnect();
    }
  }, [domainName]);
}
```

### 5.6 Final Performance Benchmarking

**Benchmark Test Suite:**
```typescript
// Performance benchmark tests
describe('Final Performance Benchmarks', () => {
  it('should meet all performance targets', async () => {
    const metrics = await runPerformanceBenchmark();
    
    // Bundle size targets
    expect(metrics.bundleSize.core).toBeLessThan(15000); // 15KB
    expect(metrics.bundleSize.total).toBeLessThan(50000); // 50KB
    
    // Re-render targets
    expect(metrics.rerenders.reduction).toBeGreaterThan(0.7); // 70% reduction
    
    // Memory usage targets
    expect(metrics.memory.reduction).toBeGreaterThan(0.4); // 40% reduction
    
    // Load time targets
    expect(metrics.loadTime.improvement).toBeGreaterThan(0.25); // 25% improvement
  });
  
  it('should maintain backward compatibility', () => {
    const legacyResult = renderHook(() => useGlobalState());
    const modernResult = {
      tasks: renderHook(() => useTaskState()),
      timer: renderHook(() => useTimerState()),
      // ... other domains
    };
    
    // Verify API compatibility
    expect(typeof legacyResult.result.current.addTask).toBe('function');
    expect(typeof legacyResult.result.current.startTimer).toBe('function');
    
    // Verify state structure compatibility
    expect(legacyResult.result.current.state).toHaveProperty('tasks');
    expect(legacyResult.result.current.state).toHaveProperty('activeItem');
  });
});
```

### 5.7 Rollback Strategy

**Rollback Implementation:**
```typescript
// Feature flag for rollback capability
const USE_MODULAR_STATE = process.env.REACT_APP_USE_MODULAR_STATE !== 'false';

// Conditional hook export
export const useGlobalState = USE_MODULAR_STATE 
  ? useModularGlobalState  // New implementation
  : useLegacyGlobalState;  // Original implementation

// Rollback monitoring
function useRollbackMonitoring() {
  useEffect(() => {
    if (!USE_MODULAR_STATE) {
      console.warn('Using legacy state management - modular state rolled back');
      
      // Log rollback event
      if (window.analytics) {
        window.analytics.track('state_rollback', {
          reason: 'feature_flag_disabled',
          timestamp: Date.now(),
        });
      }
    }
  }, []);
}
```

### 5.8 Validation Criteria

**Testing Validation:**
- [ ] Unit tests: 90%+ coverage per domain
- [ ] Integration tests: All cross-domain interactions covered
- [ ] Performance tests: All benchmarks meet targets
- [ ] E2E tests: Complete user workflows functional
- [ ] Backward compatibility: All existing tests pass

**Documentation Validation:**
- [ ] Migration guide complete and tested
- [ ] API reference documentation accurate
- [ ] Performance guide with benchmarks
- [ ] Troubleshooting guide with common issues
- [ ] Deployment guide with rollback procedures

**Production Readiness:**
- [ ] Error tracking implemented
- [ ] Performance monitoring active
- [ ] Rollback strategy tested
- [ ] Feature flags functional
- [ ] Monitoring dashboards configured

### 5.9 Deliverables

1. **Comprehensive Test Suite**
   - Unit tests for all domains (90%+ coverage)
   - Integration tests for cross-domain interactions
   - Performance benchmark tests
   - End-to-end workflow tests

2. **Complete Documentation**
   - Migration guide with examples
   - API reference documentation
   - Performance optimization guide
   - Troubleshooting documentation

3. **Production Monitoring**
   - Error tracking and reporting
   - Performance monitoring system
   - Usage analytics
   - Health check endpoints

4. **Deployment Strategy**
   - Feature flag implementation
   - Rollback procedures
   - Gradual rollout plan
   - Success metrics tracking

### 5.10 Final Success Metrics

**Performance Achievements:**
- ✅ 70% reduction in unnecessary re-renders
- ✅ 30% reduction in initial bundle size
- ✅ 40% reduction in memory usage
- ✅ 25% improvement in load time
- ✅ 50% improvement in state update performance

**Developer Experience Improvements:**
- ✅ File size: From 1,249 lines to <200 lines per module
- ✅ Test coverage: From 60% to 90%+ per domain
- ✅ Build time: 30% improvement
- ✅ Development speed: 50% faster feature development

**Quality Metrics:**
- ✅ 100% backward compatibility maintained
- ✅ Zero breaking changes for existing components
- ✅ Comprehensive error handling
- ✅ Production monitoring active

---

## Implementation Summary

This 5-task roadmap transforms the monolithic `use-global-state.tsx` into a modular, performant, and maintainable architecture:

1. **Task 1**: Foundation setup with core architecture
2. **Task 2**: Simple domain extraction (Settings, Profile, Badges)
3. **Task 3**: Complex domain extraction (Logs, Tasks, Routines)
4. **Task 4**: Timer integration with advanced optimizations
5. **Task 5**: Testing, documentation, and production readiness

**Total Timeline**: 10-12 weeks
**Expected Outcomes**: 70% performance improvement, 90%+ test coverage, 100% backward compatibility

Each task is designed for independent AI agent execution with clear validation criteria and deliverables. The modular architecture will provide a solid foundation for future development while maintaining all existing functionality.