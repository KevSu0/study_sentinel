// src/bugs/bug-hunt-checklist.ts
/**
 * Phase-1 Bug Hunt Checklist
 * Systematic validation of key scenarios and edge cases
 */

import { getSessionsInRange, getSessionsForDate } from '../selectors/sessions.range';
import { getRollupInRange, getRollupForDate } from '../selectors/rollup.range';
import { getDateKey } from '../metrics/day.split';
import { validateSessionMetrics, validateSessionConstraints, validateRollupResult } from '../lib/invariants';
import { LocalStore } from '../data/storage/local.store';
import { storageKeys } from '../data/storage/local.store';
import { eventAppend, createEvent } from '../data/logs/event.append';

export interface BugHuntResult {
  scenario: string;
  passed: boolean;
  details: string;
  data?: any;
}

export interface BugHuntReport {
  timestamp: string;
  buildHash: string;
  results: BugHuntResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

/**
 * Execute the 5-step bug-hunt checklist
 */
export async function executeBugHuntChecklist(): Promise<BugHuntReport> {
  const results: BugHuntResult[] = [];
  const buildHash = process.env.GIT_COMMIT || 'development';

  // Setup clean environment for testing
  setupTestEnvironment();

  console.log('🔍 Starting Phase-1 Bug Hunt Checklist...');

  // 1. Test session reconstruction from events
  results.push(await testSessionReconstruction());

  // 2. Test rollup calculations
  results.push(await testRollupCalculations());

  // 3. Test day boundary handling
  results.push(await testDayBoundaryHandling());

  // 4. Test manual entries
  results.push(await testManualEntries());

  // 5. Test invariant validation
  results.push(await testInvariantValidation());

  // 6. Test edge cases
  results.push(await testEdgeCases());

  const summary = {
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    total: results.length
  };

  const report: BugHuntReport = {
    timestamp: new Date().toISOString(),
    buildHash,
    results,
    summary
  };

  console.log(`📊 Bug Hunt Complete: ${summary.passed}/${summary.total} passed`);

  return report;
}

/**
 * Setup clean test environment
 */
function setupTestEnvironment(): void {
  const store = new LocalStore();
  const keys = store.getKeys();

  // Clear all log data
  keys.forEach(key => {
    if (key.startsWith('SS_V1_LOG_')) {
      store.remove(key);
    }
  });

  // Clear active timer
  store.remove(storageKeys.activeTimer());
}

/**
 * Test 1: Session reconstruction
 */
async function testSessionReconstruction(): Promise<BugHuntResult> {
  console.log('  Testing session reconstruction...');

  try {
    const date = getDateKey(Date.now());
    const startTs = Date.now() - 3600000; // 1 hour ago
    const stopTs = Date.now();

    // Create and store timer events
    const startEvent = createEvent('TIMER_START', {
      startTs,
      timerType: 'INFINITY',
      title: 'Test Session',
      entityId: 'task-1',
      entityType: 'TASK'
    }, startTs);

    const stopEvent = createEvent('TIMER_STOP', {
      stopTs,
      entityId: 'task-1',
      reason: 'COMPLETED',
      snapshot: {
        totalMs: 3600000,
        pauseMs: 0,
        pauseCount: 0,
        productiveMs: 3600000,
        focusPct: 100
      }
    }, stopTs);

    // Direct storage manipulation
    const logKey = storageKeys.log(date);
    const store = new LocalStore();
    store.set(logKey, [startEvent, stopEvent]);

    // Test reconstruction
    const sessions = getSessionsForDate(date);

    if (sessions.length !== 1) {
      return {
        scenario: 'Session reconstruction',
        passed: false,
        details: `Expected 1 session, got ${sessions.length}`
      };
    }

    const session = sessions[0];

    // Validate session properties
    if (session.totalMs !== 3600000) {
      return {
        scenario: 'Session reconstruction',
        passed: false,
        details: `Incorrect totalMs: expected 3600000, got ${session.totalMs}`
      };
    }

    if (session.focusPct !== 100) {
      return {
        scenario: 'Session reconstruction',
        passed: false,
        details: `Incorrect focusPct: expected 100, got ${session.focusPct}`
      };
    }

    return {
      scenario: 'Session reconstruction',
      passed: true,
      details: 'Session correctly reconstructed from events',
      data: { session }
    };

  } catch (error) {
    return {
      scenario: 'Session reconstruction',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}

/**
 * Test 2: Rollup calculations
 */
async function testRollupCalculations(): Promise<BugHuntResult> {
  console.log('  Testing rollup calculations...');

  try {
    const date = getDateKey(Date.now());

    // Create two sessions
    const events = [
      createEvent('TIMER_START', {
        startTs: Date.now() - 7200000,
        timerType: 'INFINITY',
        title: 'Session 1',
        entityId: 'task-1',
        entityType: 'TASK'
      }),
      createEvent('TIMER_STOP', {
        stopTs: Date.now() - 3600000,
        entityId: 'task-1',
        reason: 'COMPLETED',
        snapshot: {
          totalMs: 3600000,
          pauseMs: 600000,
          pauseCount: 2,
          productiveMs: 3000000,
          focusPct: 83.3
        }
      }),
      createEvent('TIMER_START', {
        startTs: Date.now() - 3600000,
        timerType: 'INFINITY',
        title: 'Session 2',
        entityId: 'task-2',
        entityType: 'TASK'
      }),
      createEvent('TIMER_STOP', {
        stopTs: Date.now(),
        entityId: 'task-2',
        reason: 'COMPLETED',
        snapshot: {
          totalMs: 3600000,
          pauseMs: 0,
          pauseCount: 0,
          productiveMs: 3600000,
          focusPct: 100
        }
      })
    ];

    // Store events
    const logKey = storageKeys.log(date);
    const store = new LocalStore();
    store.set(logKey, events);

    // Test rollup
    const rollup = getRollupForDate(date);

    // Expected totals
    const expectedTotal = 7200000; // 2 hours
    const expectedProductive = 6600000; // 1h 50m
    const expectedPause = 600000; // 10m
    const expectedFocus = ((expectedProductive / expectedTotal) * 100);

    if (rollup.totalMs !== expectedTotal) {
      return {
        scenario: 'Rollup calculations',
        passed: false,
        details: `Incorrect totalMs: expected ${expectedTotal}, got ${rollup.totalMs}`
      };
    }

    if (Math.abs(rollup.productiveMs - expectedProductive) > 1) {
      return {
        scenario: 'Rollup calculations',
        passed: false,
        details: `Incorrect productiveMs: expected ${expectedProductive}, got ${rollup.productiveMs}`
      };
    }

    if (Math.abs(rollup.focusPct - expectedFocus) > 0.1) {
      return {
        scenario: 'Rollup calculations',
        passed: false,
        details: `Incorrect focusPct: expected ${expectedFocus}, got ${rollup.focusPct}`
      };
    }

    return {
      scenario: 'Rollup calculations',
      passed: true,
      details: 'Rollup correctly aggregated multiple sessions',
      data: { rollup, expectedFocus }
    };

  } catch (error) {
    return {
      scenario: 'Rollup calculations',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}

/**
 * Test 3: Day boundary handling
 */
async function testDayBoundaryHandling(): Promise<BugHuntResult> {
  console.log('  Testing day boundary handling...');

  try {
    // Create a session that crosses the 04:00 boundary
    const boundaryDate = new Date();
    boundaryDate.setHours(3, 30, 0, 0); // 03:30
    const startTs = boundaryDate.getTime();
    const endTs = startTs + 3600000; // 04:30 (1 hour later)

    const startDate = getDateKey(startTs);
    const endDate = getDateKey(endTs);

    // Create events
    const events = [
      createEvent('TIMER_START', {
        startTs,
        timerType: 'INFINITY',
        title: 'Boundary Test',
        entityId: 'task-boundary',
        entityType: 'TASK'
      }, startTs),
      createEvent('TIMER_STOP', {
        stopTs: endTs,
        entityId: 'task-boundary',
        reason: 'COMPLETED',
        snapshot: {
          totalMs: 3600000,
          pauseMs: 0,
          pauseCount: 0,
          productiveMs: 3600000,
          focusPct: 100
        }
      }, endTs)
    ];

    // Store events for both dates
    const store = new LocalStore();
    store.set(storageKeys.log(startDate), [events[0]]);
    store.set(storageKeys.log(endDate), [events[1]]);

    // Test rollup across days
    const rollup = getRollupInRange(startDate, endDate);

    // Should have data for both days
    const day1 = rollup.dailyBreakdown[startDate];
    const day2 = rollup.dailyBreakdown[endDate];

    if (!day1 || !day2) {
      return {
        scenario: 'Day boundary handling',
        passed: false,
        details: 'Missing data for one or both days',
        data: { dailyBreakdown: rollup.dailyBreakdown }
      };
    }

    // Check total is preserved
    const totalFromDays = day1.totalMs + day2.totalMs;
    if (Math.abs(totalFromDays - 3600000) > 1000) {
      return {
        scenario: 'Day boundary handling',
        passed: false,
        details: `Total not preserved: expected 3600000, got ${totalFromDays}`
      };
    }

    return {
      scenario: 'Day boundary handling',
      passed: true,
      details: `Session correctly split across days: Day1=${Math.round(day1.totalMs/60000)}m, Day2=${Math.round(day2.totalMs/60000)}m`,
      data: { day1, day2 }
    };

  } catch (error) {
    return {
      scenario: 'Day boundary handling',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}

/**
 * Test 4: Manual entries
 */
async function testManualEntries(): Promise<BugHuntResult> {
  console.log('  Testing manual entries...');

  try {
    const date = getDateKey(Date.now());

    // Create manual entry
    const manualEvent = createEvent('MANUAL_TIME_ENTRY', {
      date: new Date().toISOString(),
      durationMs: 5400000, // 1.5 hours
      productivePct: 90,
      note: 'Manual test entry'
    });

    // Store event
    const logKey = storageKeys.log(date);
    const store = new LocalStore();
    store.set(logKey, [manualEvent]);

    // Test with manual included
    const sessionsWithManual = getSessionsForDate(date, true);

    // Test without manual
    const sessionsWithoutManual = getSessionsForDate(date, false);

    if (sessionsWithManual.length !== 1) {
      return {
        scenario: 'Manual entries',
        passed: false,
        details: `Expected 1 session with manual, got ${sessionsWithManual.length}`
      };
    }

    if (sessionsWithoutManual.length !== 0) {
      return {
        scenario: 'Manual entries',
        passed: false,
        details: `Expected 0 sessions without manual, got ${sessionsWithoutManual.length}`
      };
    }

    const manualSession = sessionsWithManual[0];
    if (manualSession.type !== 'manual') {
      return {
        scenario: 'Manual entries',
        passed: false,
        details: `Session type incorrect: expected 'manual', got '${manualSession.type}'`
      };
    }

    // Test rollup includes manual
    const rollup = getRollupForDate(date, true);
    if (rollup.totalMs === 0) {
      return {
        scenario: 'Manual entries',
        passed: false,
        details: 'Rollup does not include manual entries'
      };
    }

    return {
      scenario: 'Manual entries',
      passed: true,
      details: 'Manual entries correctly handled',
      data: { manualSession, rollup }
    };

  } catch (error) {
    return {
      scenario: 'Manual entries',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}

/**
 * Test 5: Invariant validation
 */
async function testInvariantValidation(): Promise<BugHuntResult> {
  console.log('  Testing invariant validation...');

  try {
    const date = getDateKey(Date.now());

    // Create valid session
    const events = [
      createEvent('TIMER_START', {
        startTs: Date.now() - 3600000,
        timerType: 'INFINITY',
        title: 'Valid Session',
        entityId: 'task-valid',
        entityType: 'TASK'
      }),
      createEvent('TIMER_STOP', {
        stopTs: Date.now(),
        entityId: 'task-valid',
        reason: 'COMPLETED',
        snapshot: {
          totalMs: 3600000,
          pauseMs: 600000,
          pauseCount: 2,
          productiveMs: 3000000,
          focusPct: 83.3
        }
      })
    ];

    // Store events
    const logKey = storageKeys.log(date);
    const store = new LocalStore();
    store.set(logKey, events);

    // Get session - this should not throw invariant errors
    const sessions = getSessionsForDate(date);
    const session = sessions[0];

    // Manually validate
    try {
      validateSessionMetrics(session);
      validateSessionConstraints(session);
    } catch (error) {
      return {
        scenario: 'Invariant validation',
        passed: false,
        details: `Valid session failed validation: ${error.message}`
      };
    }

    return {
      scenario: 'Invariant validation',
      passed: true,
      details: 'Invariants correctly validate valid sessions',
      data: { session }
    };

  } catch (error) {
    return {
      scenario: 'Invariant validation',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}

/**
 * Test 6: Edge cases
 */
async function testEdgeCases(): Promise<BugHuntResult> {
  console.log('  Testing edge cases...');

  try {
    const date = getDateKey(Date.now());

    // Test empty data - use a different date to avoid conflicts
    const emptyDate = '2024-01-01';
    const emptySessions = getSessionsForDate(emptyDate);
    const emptyRollup = getRollupForDate(emptyDate);

    if (emptySessions.length !== 0) {
      return {
        scenario: 'Edge cases',
        passed: false,
        details: `Expected 0 sessions for empty date, got ${emptySessions.length}`
      };
    }

    if (emptyRollup.totalMs !== 0) {
      return {
        scenario: 'Edge cases',
        passed: false,
        details: `Expected 0 totalMs for empty rollup, got ${emptyRollup.totalMs}`
      };
    }

    // Test focus percentage rounding
    const events = [
      createEvent('TIMER_START', {
        startTs: Date.now() - 3600000,
        timerType: 'INFINITY',
        title: 'Rounding Test',
        entityId: 'task-rounding',
        entityType: 'TASK'
      }),
      createEvent('TIMER_STOP', {
        stopTs: Date.now(),
        entityId: 'task-rounding',
        reason: 'COMPLETED',
        snapshot: {
          totalMs: 3600000,
          pauseMs: 600000,
          pauseCount: 2,
          productiveMs: 3000000,
          focusPct: 83.3
        }
      })
    ];

    const logKey = storageKeys.log(date);
    const store = new LocalStore();
    store.set(logKey, events);

    const sessions = getSessionsForDate(date);
    const session = sessions[0];

    // Check rounding
    const focusStr = session.focusPct.toString();
    const decimalPlaces = focusStr.split('.')[1]?.length || 0;

    if (decimalPlaces > 1) {
      return {
        scenario: 'Edge cases',
        passed: false,
        details: `Focus percentage not properly rounded: ${session.focusPct} (${decimalPlaces} decimals)`
      };
    }

    return {
      scenario: 'Edge cases',
      passed: true,
      details: 'Edge cases handled correctly',
      data: { emptyRollup, session }
    };

  } catch (error) {
    return {
      scenario: 'Edge cases',
      passed: false,
      details: `Error: ${error.message}`
    };
  }
}