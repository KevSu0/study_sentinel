# Use-Global-State.tsx Optimization Plan

## 1. Current State Analysis

### 1.1 Problems with Current Monolithic Architecture

**File Statistics:**
- **Size**: 1,249 lines of code
- **Dependencies**: 50+ components across the application
- **Functions**: 25+ callback functions and state management operations
- **Responsibilities**: Timer management, task operations, routine handling, badge system, profile management, logging, sound settings, and more

**Critical Issues:**
1. **Maintainability Crisis**: Single file handles 8+ distinct domains (tasks, routines, timers, badges, profiles, logs, sounds, sync)
2. **Testing Complexity**: Monolithic structure makes unit testing individual features extremely difficult
3. **Performance Issues**: Entire state re-renders on any change, causing unnecessary re-computations
4. **Code Coupling**: Business logic tightly coupled with state management
5. **Developer Experience**: 1,249 lines in a single file is overwhelming for new developers
6. **Memory Usage**: All state loaded simultaneously regardless of feature usage
7. **Bundle Size**: No code splitting opportunities for different feature domains

### 1.2 Current Dependencies Analysis

**High-Impact Components (Direct Dependencies):**
- `src/hooks/use-plan-data.ts` - Planning and scheduling
- `src/components/routines/routine-log-dialog.tsx` - Routine management
- `src/components/tasks/__tests__/manual-log-dialog.test.tsx` - Task operations
- `src/app/briefing/__tests__/briefing.test.tsx` - Daily briefing
- All page components (tasks, routines, stats, profile, logs, archive)

**Testing Dependencies:**
- 15+ test files mock `useGlobalState`
- Mock implementations in `__mocks__` directory
- Integration tests depend on full state structure

## 2. Proposed Modular Architecture: "Gizmo Puzzle" Design

### 2.1 Architecture Philosophy

Transform the monolithic state manager into a **modular ecosystem** where each "gizmo" (module) has:
- **Single Responsibility**: Each module handles one domain
- **Clear Interfaces**: Well-defined APIs between modules
- **Independent Testing**: Each module can be tested in isolation
- **Lazy Loading**: Modules load only when needed
- **Backward Compatibility**: Existing components continue to work during migration

### 2.2 Core Module Structure

```
src/hooks/state/
├── core/
│   ├── use-app-state.tsx           # Central state coordinator
│   ├── use-state-persistence.tsx   # localStorage management
│   └── state-types.ts              # Shared type definitions
├── domains/
│   ├── tasks/
│   │   ├── use-task-state.tsx       # Task CRUD operations
│   │   ├── use-task-timer.tsx       # Task timing functionality
│   │   └── task-state-types.ts      # Task-specific types
│   ├── routines/
│   │   ├── use-routine-state.tsx    # Routine management
│   │   ├── use-routine-timer.tsx    # Routine timing
│   │   └── routine-state-types.ts   # Routine-specific types
│   ├── timer/
│   │   ├── use-timer-core.tsx       # Core timer logic
│   │   ├── use-timer-persistence.tsx # Timer state persistence
│   │   └── timer-state-types.ts     # Timer-specific types
│   ├── badges/
│   │   ├── use-badge-state.tsx      # Badge management
│   │   ├── use-badge-checker.tsx    # Badge validation logic
│   │   └── badge-state-types.ts     # Badge-specific types
│   ├── profile/
│   │   ├── use-profile-state.tsx    # Profile management
│   │   └── profile-state-types.ts   # Profile-specific types
│   ├── logs/
│   │   ├── use-activity-logs.tsx    # Activity logging
│   │   ├── use-log-persistence.tsx  # Log storage
│   │   └── log-state-types.ts       # Log-specific types
│   └── settings/
│       ├── use-sound-settings.tsx   # Sound configuration
│       └── settings-state-types.ts  # Settings-specific types
├── providers/
│   ├── AppStateProvider.tsx         # Main provider wrapper
│   ├── TaskStateProvider.tsx        # Task domain provider
│   ├── RoutineStateProvider.tsx     # Routine domain provider
│   ├── TimerStateProvider.tsx       # Timer domain provider
│   └── index.tsx                    # Provider composition
└── hooks/
    ├── use-global-state.tsx         # Backward compatibility layer
    └── use-domain-state.tsx         # Domain-specific state access
```

### 2.3 Module Responsibilities

#### Core Modules
1. **use-app-state.tsx** (150-200 lines)
   - Central state coordination
   - Cross-domain state synchronization
   - Loading state management
   - Error boundary handling

2. **use-state-persistence.tsx** (100-150 lines)
   - localStorage abstraction
   - State hydration/dehydration
   - Migration utilities
   - Sync coordination

#### Domain Modules (Each 100-200 lines)
1. **Task Domain**
   - `use-task-state.tsx`: CRUD operations, status management
   - `use-task-timer.tsx`: Task-specific timer logic

2. **Routine Domain**
   - `use-routine-state.tsx`: Routine management, scheduling
   - `use-routine-timer.tsx`: Routine-specific timer logic

3. **Timer Domain**
   - `use-timer-core.tsx`: Core timer functionality
   - `use-timer-persistence.tsx`: Timer state persistence

4. **Badge Domain**
   - `use-badge-state.tsx`: Badge CRUD, earned badges
   - `use-badge-checker.tsx`: Achievement validation

5. **Profile Domain**
   - `use-profile-state.tsx`: User profile management

6. **Logs Domain**
   - `use-activity-logs.tsx`: Activity tracking
   - `use-log-persistence.tsx`: Log storage and retrieval

7. **Settings Domain**
   - `use-sound-settings.tsx`: Sound configuration

## 3. Performance Optimizations

### 3.1 Selective Re-rendering Strategy

```typescript
// Current: Single context causes full re-renders
// Problem: Any state change triggers all consumers to re-render

// Solution: Domain-specific contexts with selective subscriptions
const TaskStateContext = createContext<TaskState>();
const TimerStateContext = createContext<TimerState>();
const BadgeStateContext = createContext<BadgeState>();

// Components subscribe only to relevant state domains
function TaskList() {
  const { tasks, updateTask } = useTaskState(); // Only re-renders on task changes
  // ...
}

function TimerDisplay() {
  const { activeTimer, timeDisplay } = useTimerState(); // Only re-renders on timer changes
  // ...
}
```

### 3.2 Memoization Strategy

```typescript
// Expensive computations memoized per domain
const useTaskStats = () => {
  const { tasks } = useTaskState();
  
  return useMemo(() => ({
    completedCount: tasks.filter(t => t.status === 'completed').length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.points || 0), 0),
    // ... other expensive calculations
  }), [tasks]);
};

// Cross-domain computations optimized
const useTodaysActivity = () => {
  const { tasks } = useTaskState();
  const { routines } = useRoutineState();
  const { logs } = useActivityLogs();
  
  return useMemo(() => {
    // Combine data from multiple domains efficiently
    return computeTodaysActivity(tasks, routines, logs);
  }, [tasks, routines, logs]);
};
```

### 3.3 Lazy Loading Implementation

```typescript
// Domain modules loaded on-demand
const useBadgeState = () => {
  const [badgeState, setBadgeState] = useState(null);
  
  useEffect(() => {
    // Load badge module only when first accessed
    import('./domains/badges/use-badge-state').then(module => {
      setBadgeState(module.createBadgeState());
    });
  }, []);
  
  return badgeState;
};
```

### 3.4 State Normalization

```typescript
// Current: Nested objects cause deep equality issues
// Solution: Normalized state structure
interface NormalizedState {
  tasks: {
    byId: Record<string, StudyTask>;
    allIds: string[];
    byStatus: Record<TaskStatus, string[]>;
  };
  routines: {
    byId: Record<string, Routine>;
    allIds: string[];
    byDay: Record<number, string[]>;
  };
}
```

## 4. Testing Improvements

### 4.1 Unit Testing Strategy

```typescript
// Each domain module can be tested independently
describe('useTaskState', () => {
  it('should add task correctly', () => {
    const { result } = renderHook(() => useTaskState(), {
      wrapper: TaskStateProvider
    });
    
    act(() => {
      result.current.addTask(mockTask);
    });
    
    expect(result.current.tasks).toContain(mockTask);
  });
});

// Integration tests for cross-domain interactions
describe('Task-Timer Integration', () => {
  it('should start timer for task', () => {
    const { result: taskResult } = renderHook(() => useTaskState());
    const { result: timerResult } = renderHook(() => useTimerState());
    
    // Test cross-domain functionality
  });
});
```

### 4.2 Mock Strategy Improvements

```typescript
// Domain-specific mocks
export const mockTaskState = {
  tasks: [],
  addTask: jest.fn(),
  updateTask: jest.fn(),
  // ... other task operations
};

export const mockTimerState = {
  activeTimer: null,
  startTimer: jest.fn(),
  stopTimer: jest.fn(),
  // ... other timer operations
};

// Composed mock for backward compatibility
export const mockGlobalState = {
  ...mockTaskState,
  ...mockTimerState,
  ...mockBadgeState,
  // ... other domain mocks
};
```

## 5. Migration Strategy

### 5.1 Phase 1: Foundation (Week 1-2)

**Objectives:**
- Set up modular architecture foundation
- Create backward compatibility layer
- Implement core state coordination

**Tasks:**
1. Create `src/hooks/state/` directory structure
2. Implement `use-app-state.tsx` as central coordinator
3. Create `use-state-persistence.tsx` for localStorage management
4. Set up provider composition in `providers/index.tsx`
5. Create backward compatibility layer in `use-global-state.tsx`

**Success Criteria:**
- All existing tests pass
- No breaking changes to existing components
- Foundation architecture is testable

### 5.2 Phase 2: Domain Extraction (Week 3-6)

**Objectives:**
- Extract domain modules one by one
- Maintain full backward compatibility
- Implement performance optimizations

**Migration Order (by complexity and dependencies):**
1. **Settings Domain** (Week 3)
   - Extract `use-sound-settings.tsx`
   - Lowest complexity, minimal dependencies
   
2. **Profile Domain** (Week 3)
   - Extract `use-profile-state.tsx`
   - Simple CRUD operations
   
3. **Badge Domain** (Week 4)
   - Extract `use-badge-state.tsx` and `use-badge-checker.tsx`
   - Moderate complexity, some cross-domain dependencies
   
4. **Logs Domain** (Week 4)
   - Extract `use-activity-logs.tsx` and `use-log-persistence.tsx`
   - Cross-domain dependencies with tasks and routines
   
5. **Task Domain** (Week 5)
   - Extract `use-task-state.tsx` and `use-task-timer.tsx`
   - High complexity, many dependencies
   
6. **Routine Domain** (Week 5)
   - Extract `use-routine-state.tsx` and `use-routine-timer.tsx`
   - High complexity, timer dependencies
   
7. **Timer Domain** (Week 6)
   - Extract `use-timer-core.tsx` and `use-timer-persistence.tsx`
   - Highest complexity, used by tasks and routines

**Per-Domain Migration Process:**
1. Create domain module with identical API
2. Update domain provider to use new module
3. Run full test suite to ensure compatibility
4. Update domain-specific tests
5. Performance test to ensure no regressions

### 5.3 Phase 3: Optimization (Week 7-8)

**Objectives:**
- Implement performance optimizations
- Add lazy loading for non-critical domains
- Optimize state normalization

**Tasks:**
1. Implement selective re-rendering for each domain
2. Add memoization for expensive computations
3. Implement lazy loading for badge and settings domains
4. Normalize state structure for better performance
5. Add performance monitoring and metrics

### 5.4 Phase 4: Testing & Documentation (Week 9-10)

**Objectives:**
- Comprehensive testing of modular architecture
- Update documentation and migration guides
- Performance benchmarking

**Tasks:**
1. Write comprehensive unit tests for each domain
2. Create integration tests for cross-domain interactions
3. Update component documentation with new usage patterns
4. Create migration guide for future developers
5. Performance benchmarking and optimization report

## 6. Backward Compatibility Strategy

### 6.1 Compatibility Layer Implementation

```typescript
// src/hooks/use-global-state.tsx (Compatibility Layer)
export const useGlobalState = () => {
  // Aggregate all domain states
  const taskState = useTaskState();
  const routineState = useRoutineState();
  const timerState = useTimerState();
  const badgeState = useBadgeState();
  const profileState = useProfileState();
  const logState = useActivityLogs();
  const settingsState = useSoundSettings();
  
  // Return combined state with identical API
  return useMemo(() => ({
    state: {
      ...taskState,
      ...routineState,
      ...timerState,
      ...badgeState,
      ...profileState,
      ...logState,
      ...settingsState,
    },
    // All existing functions remain available
    addTask: taskState.addTask,
    updateTask: taskState.updateTask,
    startTimer: timerState.startTimer,
    // ... all other existing functions
  }), [taskState, routineState, timerState, badgeState, profileState, logState, settingsState]);
};
```

### 6.2 Gradual Migration Path

**Option 1: Keep Existing API (Recommended)**
- All existing components continue to work unchanged
- New components can use domain-specific hooks
- Gradual migration as components are updated

**Option 2: Deprecation Warnings**
- Add console warnings for deprecated `useGlobalState` usage
- Provide migration suggestions in warnings
- Set timeline for complete migration

## 7. Performance Benchmarks & Success Metrics

### 7.1 Performance Targets

**Bundle Size Reduction:**
- Current: ~50KB for full state management
- Target: ~15KB for core + lazy-loaded domains
- Improvement: 70% reduction in initial bundle size

**Re-render Optimization:**
- Current: All components re-render on any state change
- Target: Only relevant components re-render
- Improvement: 80% reduction in unnecessary re-renders

**Memory Usage:**
- Current: All state loaded simultaneously
- Target: Domain-specific state loading
- Improvement: 40% reduction in memory usage

### 7.2 Success Metrics

**Developer Experience:**
- File size: From 1,249 lines to <200 lines per module
- Test coverage: From 60% to 90%+ per domain
- Build time: 30% improvement due to better tree-shaking

**Runtime Performance:**
- Initial load time: 25% improvement
- State update performance: 50% improvement
- Memory usage: 40% reduction

**Maintainability:**
- New feature development time: 50% reduction
- Bug fix time: 60% reduction
- Code review time: 40% reduction

## 8. Risk Mitigation

### 8.1 Technical Risks

**Risk: Breaking Changes During Migration**
- Mitigation: Comprehensive test suite, backward compatibility layer
- Rollback Plan: Keep original file until migration is 100% complete

**Risk: Performance Regressions**
- Mitigation: Performance monitoring, benchmarking at each phase
- Rollback Plan: Feature flags to switch between old and new implementations

**Risk: Cross-Domain Dependencies**
- Mitigation: Careful dependency mapping, gradual extraction
- Rollback Plan: Temporary coupling until dependencies are resolved

### 8.2 Team Risks

**Risk: Developer Learning Curve**
- Mitigation: Comprehensive documentation, pair programming sessions
- Support: Migration workshops, code review guidelines

**Risk: Parallel Development Conflicts**
- Mitigation: Feature branches, clear communication protocols
- Support: Migration coordination meetings, conflict resolution process

## 9. Implementation Timeline

```
Week 1-2:  Foundation Setup
├── Architecture planning
├── Core state coordinator
├── Persistence layer
└── Backward compatibility

Week 3-4:  Simple Domains
├── Settings domain
├── Profile domain
├── Badge domain
└── Logs domain

Week 5-6:  Complex Domains
├── Task domain
├── Routine domain
└── Timer domain

Week 7-8:  Optimization
├── Performance tuning
├── Lazy loading
├── State normalization
└── Memory optimization

Week 9-10: Testing & Documentation
├── Comprehensive testing
├── Performance benchmarking
├── Documentation updates
└── Migration guide
```

## 10. Conclusion

This optimization plan transforms the monolithic `use-global-state.tsx` into a modular, maintainable, and performant architecture. The "gizmo puzzle" approach ensures:

- **Maintainability**: Each domain is self-contained and testable
- **Performance**: Selective re-rendering and lazy loading
- **Developer Experience**: Smaller, focused modules
- **Backward Compatibility**: Existing code continues to work
- **Future-Proof**: Easy to add new domains and features

The phased migration approach minimizes risk while delivering incremental improvements. By the end of the migration, the application will have a robust, scalable state management architecture that can grow with the product's needs.

**Next Steps:**
1. Review and approve this optimization plan
2. Set up development environment for modular architecture
3. Begin Phase 1: Foundation setup
4. Establish performance monitoring and success metrics
5. Create migration timeline and assign responsibilities

This transformation will position the Study Sentinel application for long-term success with improved maintainability, performance, and developer experience.