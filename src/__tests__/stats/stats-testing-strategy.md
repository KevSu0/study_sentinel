# Stats Page Testing Strategy

## Overview
This document outlines the comprehensive testing approach for the hardened Stats Page implementation, covering correctness, performance, accessibility, and edge cases.

## Test Matrix

### 1. Unit Tests

#### Core Statistics
```typescript
// tests/unit/stats-calculations.test.ts
describe('Statistics Calculations', () => {
  test('correctly calculates total hours from sessions', () => {
    const sessions = [
      { duration: 1800 }, // 30 minutes
      { duration: 3600 }, // 1 hour
      { duration: 5400 }  // 1.5 hours
    ];
    expect(calculateTotalHours(sessions)).toBe('3.0');
  });

  test('handles empty session list', () => {
    expect(calculateTotalHours([])).toBe('0.0');
  });

  test('calculates completion rate correctly', () => {
    const tasks = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'pending' }
    ];
    expect(calculateCompletionRate(tasks)).toBe(67);
  });

  test('handles streak calculation with grace period', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-04'];
    expect(calculateStreak(dates)).toBe(2); // Grace of 0
  });
});
```

#### Daily Rollups
```typescript
// tests/unit/daily-rollups.test.ts
describe('Daily Rollups', () => {
  test('correctly buckets events by IST day boundary', () => {
    const events = [
      { timestamp: '2024-01-01T03:30:00Z' }, // Before 04:00 IST → previous day
      { timestamp: '2024-01-01T04:30:00Z' }, // After 04:00 IST → current day
    ];
    const rollups = createDailyRollups(events);
    expect(rollups['2024-01-01']).toBeDefined();
    expect(rollups['2023-12-31']).toBeDefined();
  });

  test('aggregates routine data correctly', () => {
    const events = [
      {
        type: 'study_session_created',
        data: { routineName: 'Pomodoro', duration: 1500, subject: 'Math' }
      },
      {
        type: 'study_session_created',
        data: { routineName: 'Pomodoro', duration: 1500, subject: 'Math' }
      }
    ];
    const rollup = computeDailyRollup('2024-01-01', events);
    expect(rollup.by_routine['Pomodoro'].minutes).toBe(50);
    expect(rollup.by_subject['Math'].minutes).toBe(50);
  });
});
```

#### Badge Evaluation
```typescript
// tests/unit/badge-evaluation.test.ts
describe('Badge Evaluation', () => {
  test('evaluates streak badges correctly', () => {
    const context = { current_streak: 7 };
    const result = evaluateBadgeCondition(
      { type: 'DAY_STREAK', target: 7 },
      context
    );
    expect(result).toBe(100);
  });

  test('progress caps at 100%', () => {
    const context = { total_sessions: 50 };
    const result = evaluateBadgeCondition(
      { type: 'TOTAL_SESSIONS', target: 10 },
      context
    );
    expect(result).toBe(100);
  });
});
```

### 2. Integration Tests

#### Web Worker Communication
```typescript
// tests/integration/stats-worker.test.ts
describe('Stats Worker Integration', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker(new URL('@/workers/stats.worker.ts', import.meta.url));
  });

  test('worker computes stats correctly', async () => {
    const payload = {
      work: mockSessions,
      tasks: mockTasks,
      timeRange: 'weekly'
    };

    const result = await sendWorkerRequest(worker, 'COMPUTE_STATS', payload);
    expect(result.totalHours).toBeDefined();
    expect(result.completionRate).toBeGreaterThan(0);
  });

  test('worker handles timeouts gracefully', async () => {
    // Mock slow computation
    const slowPayload = {
      work: generateLargeDataset(10000),
      tasks: [],
      timeRange: 'overall'
    };

    await expect(
      sendWorkerRequest(worker, 'COMPUTE_STATS', slowPayload, 100)
    ).rejects.toThrow('timeout');
  });
});
```

#### Storage Migration
```typescript
// tests/integration/storage-migration.test.ts
describe('Storage Migration', () => {
  beforeEach(() => {
    // Clear all stores
    await clearAllStores();
  });

  test('migrates localStorage to IDB correctly', async () => {
    // Set up localStorage data
    localStorage.setItem('study-sentinel-stats', JSON.stringify({
      completedWork: mockLegacyData
    }));

    await migrateFromLocalStorage();

    const rollups = await getDailyRollupsInRange('2024-01-01', '2024-01-31');
    expect(rollups.length).toBeGreaterThan(0);
  });

  test('preserves data integrity during migration', () => {
    // Compare before and after totals
    const before = calculateLegacyTotals();
    await migrateFromLocalStorage();
    const after = await getAggregatedStats('2024-01-01', '2024-01-31');

    expect(after.totalMinutes).toBe(before.totalMinutes);
    expect(after.totalPoints).toBe(before.totalPoints);
  });
});
```

### 3. Performance Tests

#### Large Dataset Handling
```typescript
// tests/performance/large-dataset.test.ts
describe('Large Dataset Performance', () => {
  test('use-stats stays within 50ms budget', async () => {
    const largeDataset = generateYearlyDataset(365);

    const startTime = performance.now();
    const stats = await computeStatsForRange(largeDataset, 'monthly');
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(50);
    console.log(`Monthly stats: ${duration}ms`);
  });

  test('worker performance under load', async () => {
    const worker = new StatsWorker();
    const results = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await worker.computeStats(generateTestDataset());
      results.push(performance.now() - start);
    }

    const p95 = calculatePercentile(results, 95);
    expect(p95).toBeLessThan(80);
    console.log(`Worker P95: ${p95}ms`);
  });
});
```

#### Memory Usage
```typescript
// tests/performance/memory.test.ts
describe('Memory Usage', () => {
  test('heap delta stays within budget', async () => {
    if (!('memory' in performance)) return; // Skip if not available

    const initialMemory = performance.memory.usedJSHeapSize;

    // Perform intensive operations
    await computeStatsForRange(generateLargeDataset(), 'overall');
    await evaluateAllBadges();

    const finalMemory = performance.memory.usedJSHeapSize;
    const deltaMB = (finalMemory - initialMemory) / 1024 / 1024;

    expect(deltaMB).toBeLessThan(30);
    console.log(`Memory delta: ${deltaMB.toFixed(2)}MB`);
  });
});
```

### 4. Accessibility Tests

#### Keyboard Navigation
```typescript
// tests/a11y/keyboard-navigation.test.ts
describe('Keyboard Navigation', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = render(<StatsPage />).container;
  });

  test('all interactive elements are keyboard reachable', () => {
    const interactiveElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((element) => {
      element.setAttribute('tabindex', '-1'); // Remove from tab order
      const nextTab = getNextTabbable(element);
      expect(nextTab).not.toBe(element);
    });
  });

  test('keyboard shortcuts work', async () => {
    fireEvent.keyDown(container, { key: '1' });
    expect(screen.getByText('Daily View')).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(container, { key: 'ArrowRight', ctrlKey: true });
    expect(screen.getByText('Weekly View')).toHaveAttribute('aria-checked', 'true');
  });
});
```

#### Screen Reader Support
```typescript
// tests/a11y/screen-reader.test.ts
describe('Screen Reader Support', () => {
  test('announces dynamic updates', () => {
    const { container } = render(<StatsPage />);

    // Simulate stats update
    act(() => {
      updateStats({ totalHours: '5.5' });
    });

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Updated to 5.5 hours');
  });

  test('charts have proper ARIA labels', () => {
    const { container } = render(<StatsChart />);

    const chart = container.querySelector('[role="img"]');
    expect(chart).toHaveAttribute('aria-label', 'Study Activity Chart');

    const dataTable = container.querySelector('[role="table"]');
    expect(dataTable).toBeInTheDocument();
  });
});
```

### 5. Cross-Browser Tests

#### Browser Matrix
- Chrome (latest, latest-1)
- Firefox (latest, latest-1)
- Safari (latest, latest-1)
- Edge (latest)

#### Mobile Tests
- iOS Safari (iPhone SE, iPhone 13)
- Chrome Android (low-end device)
- Samsung Internet

```typescript
// tests/cross-browser/timezones.test.ts
describe('Timezone Handling', () => {
  const timezones = [
    'Asia/Kolkata', // IST
    'UTC',
    'Asia/Tokyo',   // UTC+9
    'America/Los_Angeles' // UTC-8
  ];

  timezones.forEach((tz) => {
    test(`handles ${tz} timezone correctly`, () => {
      // Mock timezone
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
        return new Intl.DateTimeFormat('en-US', { ...args[1], timeZone: tz });
      });

      const date = new Date('2024-01-01T03:30:00Z');
      const bucketDay = getBucketDay(date);

      expect(bucketDay).toMatchSnapshot(`${tz}-bucket-day`);
    });
  });
});
```

### 6. Property-Based Tests

#### Statistics Properties
```typescript
// tests/property/stats-properties.test.ts
describe('Statistics Properties', () => {
  test('streak calculation is monotonic', () => {
    fc.assert(
      fc.property(
        fc.array(fc.date(), { minLength: 1, maxLength: 100 }),
        (dates) => {
          const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
          const streak1 = calculateStreak(sortedDates);
          const streak2 = calculateStreak(sortedDates.slice(0, -1));

          expect(streak1).toBeGreaterThanOrEqual(streak2 - 1);
        }
      )
    );
  });

  test('rollups are additive', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(1, 480), { minLength: 1 }), // Session durations in minutes
        (durations) => {
          const rollup = createRollupFromDurations(durations);
          const manualTotal = durations.reduce((sum, d) => sum + d, 0);

          expect(rollup.total_minutes).toBe(manualTotal);
        }
      )
    );
  });
});
```

### 7. Visual Regression Tests

#### Component Snapshots
```typescript
// tests/visual/stat-cards.test.ts
describe('Stat Cards Visual', () => {
  test('matches snapshot', () => {
    const { container } = render(
      <StatCardGrid
        stats={mockStats}
        loading={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  test('loading state matches snapshot', () => {
    const { container } = render(
      <StatCardGrid
        stats={null}
        loading={true}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
```

### 8. End-to-End Tests

#### User Journeys
```typescript
// tests/e2e/stats-workflow.test.ts
describe('Stats Page User Workflow', () => {
  beforeEach(() => {
    cy.visit('/stats');
    cy.injectAxe();
  });

  it('allows user to view statistics across time ranges', () => {
    // Check accessibility
    cy.checkA11y();

    // Switch time ranges
    cy.contains('Weekly').click();
    cy.url().should('include', 'range=weekly');

    // Navigate dates
    cy.get('[aria-label="Previous day"]').click();
    cy.get('[aria-label="Next day"]').click();

    // View chart details
    cy.get('[data-chart="study-breakdown"]').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('handles large datasets gracefully', () => {
    // Load with large dataset
    cy.intercept('GET', '/api/stats/*', {
      body: generateLargeResponse()
    });

    cy.visit('/stats?range=overall');

    // Should show loading state
    cy.get('[data-loading]').should('be.visible');

    // Should complete within budget
    cy.get('[data-loading]', { timeout: 5000 }).should('not.exist');
  });
});
```

## Test Data Fixtures

### Deterministic Test Data
```typescript
// tests/fixtures/deterministic-data.ts
export const DETERMINISTIC_FIXTURES = {
  timezoneBoundary: {
    // Events around 04:00 IST boundary
    beforeBoundary: '2024-01-01T03:30:00Z',
    afterBoundary: '2024-01-01T04:30:00Z',
    expectedBucketDay: '2024-01-01'
  },

  overlappingSessions: [
    { start: '2024-01-01T10:00:00Z', duration: 3600 },
    { start: '2024-01-01T10:30:00Z', duration: 1800 }, // Overlaps
    { start: '2024-01-01T11:00:00Z', duration: 3600 }
  ],

  longSession: {
    duration: 14400, // 4 hours
    expectedPoints: 240
  },

  sparseWeek: {
    // Only 2 days of activity in a week
    activeDays: ['2024-01-01', '2024-01-03'],
    expectedStreak: 1
  }
};
```

## Test Automation

### CI/CD Pipeline
```yaml
# .github/workflows/stats-tests.yml
name: Stats Page Tests

on:
  push:
    paths:
      - 'src/**/stats/**'
      - 'src/**/use-stats*'
      - 'src/workers/stats.worker.ts'
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]
        browser: [chrome, firefox]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test:stats:unit

      - name: Run integration tests
        run: npm test:stats:integration

      - name: Run performance tests
        run: npm test:stats:performance

      - name: Run accessibility tests
        run: npm test:stats:a11y

      - name: Run E2E tests
        run: npm test:stats:e2e
        if: matrix.browser == 'chrome'

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Reporting

### Performance Budget Report
```typescript
// tests/utils/performance-reporter.ts
export class PerformanceReporter {
  private results: TestResult[] = [];

  addResult(test: string, duration: number, budget: number) {
    this.results.push({ test, duration, budget });
  }

  generateReport() {
    const budgetViolations = this.results.filter(r => r.duration > r.budget);

    return {
      totalTests: this.results.length,
      violations: budgetViolations.length,
      worstOffender: budgetViolations.reduce((worst, current) =>
        current.duration > worst.duration ? current : worst,
        { duration: 0 }
      ),
      summary: budgetViolations.length > 0
        ? `⚠️ ${budgetViolations.length} budget violations detected`
        : '✅ All performance budgets met'
    };
  }
}
```

## Test Utilities

### Custom Jest Matchers
```typescript
// tests/utils/custom-matchers.ts
expect.extend({
  toBeWithinBudget(received: number, budget: number) {
    const pass = received <= budget;
    return {
      message: () =>
        pass
          ? `Expected ${received}ms not to be within budget of ${budget}ms`
          : `Expected ${received}ms to be within budget of ${budget}ms`,
      pass,
    };
  },

  toHaveValidA11y(element: HTMLElement) {
    const violations = axe.run(element).violations;
    return {
      message: () =>
        violations.length === 0
          ? 'Expected element to have accessibility violations'
          : `Found ${violations.length} accessibility violations`,
      pass: violations.length === 0,
    };
  }
});
```

This comprehensive testing strategy ensures the Stats Page is correct, performant, accessible, and maintainable across all scenarios.