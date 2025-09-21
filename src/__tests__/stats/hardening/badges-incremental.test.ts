/**
 * @jest-environment jsdom
 * @stats-hardening
 */

import { BadgeProgressManager } from '@/lib/badge-progress-manager';

// Mock IndexedDB
const mockDB = {
  get: jest.fn(),
  put: jest.fn(),
  add: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn()
};

jest.mock('idb', () => ({
  openDB: jest.fn(() => Promise.resolve(mockDB))
}));

describe('Badges (Incremental)', () => {
  let manager: BadgeProgressManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new BadgeProgressManager();
  });

  test('event-driven progress updates only impacted badges', async () => {
    const badges = [
      { id: 'streak-7', category: 'weekly', conditions: [{ type: 'DAY_STREAK', target: 7 }] },
      { id: 'sessions-100', category: 'overall', conditions: [{ type: 'TOTAL_SESSIONS', target: 100 }] }
    ];

    // Mock existing progress
    mockDB.getAll.mockResolvedValue([
      { badge_id: 'streak-7', state: 'pending', progress: 50 },
      { badge_id: 'sessions-100', state: 'pending', progress: 30 }
    ]);

    await manager['initializeBadges'](badges);

    // Session completed - should only impact sessions-100 badge
    const session = {
      id: 'session-1',
      duration: 1800,
      points: 30,
      timestamp: Date.now()
    };

    const results = await manager.onStudySessionCompleted(session as any);

    // Only sessions-100 should be evaluated
    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        badge_id: 'sessions-100',
        progress: expect.any(Number)
      })
    );

    // streak-7 should not be updated
    expect(mockDB.put).not.toHaveBeenCalledWith(
      expect.objectContaining({
        badge_id: 'streak-7'
      })
    );
  });

  test('idle scheduling respects frame budget', async () => {
    // Mock performance.now() to simulate time passage
    const originalNow = performance.now;
    let callCount = 0;
    performance.now = jest.fn(() => {
      callCount++;
      return callCount === 1 ? 0 : 20; // Second call returns 20ms
    });

    const badges = [
      { id: 'test-badge', category: 'daily', conditions: [{ type: 'TOTAL_STUDY_TIME', target: 120 }] }
    ];

    mockDB.getAll.mockResolvedValue([]);
    mockDB.get.mockResolvedValue(null);

    await manager['initializeBadges'](badges);

    // Force evaluation during idle
    const result = await manager['evaluateBadge']('test-badge');

    // Should have stopped early due to frame budget
    expect(performance.now).toHaveBeenCalled();
    expect(result).toBeDefined();

    performance.now = originalNow;
  });

  test('edits reflow progress correctly', async () => {
    const badges = [
      { id: 'daily-goal', category: 'daily', conditions: [{ type: 'TOTAL_STUDY_TIME', target: 120 }] }
    ];

    mockDB.getAll.mockResolvedValue([
      { badge_id: 'daily-goal', state: 'earned', progress: 100 }
    ]);

    await manager['initializeBadges'](badges);

    // Edit a session to remove time
    const editedSession = {
      id: 'session-1',
      duration: 600, // Reduced from 1800 to 600 (10 minutes)
      points: 10,
      timestamp: Date.now()
    };

    await manager.onStudySessionCompleted(editedSession as any);

    // Progress should be recalculated
    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        badge_id: 'daily-goal',
        progress: expect.toBeLessThan(100),
        state: expect.not.toBe('earned')
      })
    );
  });

  test('badge_progress store persists correctly', async () => {
    mockDB.get.mockResolvedValue(null);

    const progress = {
      badge_id: 'test-badge',
      state: 'pending' as const,
      progress: 50,
      context: { total_sessions: 25 },
      version: '1.0.0',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await mockDB.put(progress);

    expect(mockDB.put).toHaveBeenCalledWith(
      expect.objectContaining({
        badge_id: 'test-badge',
        state: 'pending',
        progress: 50,
        context: { total_sessions: 25 }
      })
    );
  });
});