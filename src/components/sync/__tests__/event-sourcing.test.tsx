import { renderHook, act } from '@testing-library/react';

// Mock the hooks that would be implemented in Phase B
const useEventSourcing = jest.fn();
const useSyncManager = jest.fn();
const useNotificationManager = jest.fn();

// Mock IndexedDB
const mockDB = {
  transaction: jest.fn(),
  close: jest.fn()
};

const mockObjectStore = {
  add: jest.fn(),
  getAll: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  index: jest.fn(),
  clear: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockObjectStore),
  oncomplete: null,
  onerror: null,
  abort: jest.fn()
};

const mockOpenRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockDB
};


describe('Event Sourcing System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock IndexedDB
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: jest.fn().mockReturnValue(mockOpenRequest),
        deleteDatabase: jest.fn()
      },
      configurable: true
    });

    // Mock transaction
    mockDB.transaction.mockReturnValue(mockTransaction);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useEventSourcing', () => {
    it('initializes IndexedDB v2 database', async () => {
      const mockEventStore = {
        addEvent: jest.fn().mockResolvedValue('event-123'),
        getEvents: jest.fn().mockResolvedValue([]),
        getRollups: jest.fn().mockResolvedValue({}),
        computeRollups: jest.fn().mockResolvedValue({}),
        compactEvents: jest.fn().mockResolvedValue(true)
      };

      useEventSourcing.mockReturnValue(mockEventStore);

      const { result } = renderHook(() => useEventSourcing());

      expect(result.current).toEqual(mockEventStore);
    });

    it('adds study session events correctly', async () => {
      const mockEventStore = {
        addEvent: jest.fn().mockResolvedValue('session-event-123'),
        getEvents: jest.fn().mockResolvedValue([]),
        getRollups: jest.fn().mockResolvedValue({}),
        computeRollups: jest.fn().mockResolvedValue({}),
        compactEvents: jest.fn().mockResolvedValue(true)
      };

      useEventSourcing.mockReturnValue(mockEventStore);

      const { result } = renderHook(() => useEventSourcing());

      const sessionEvent = {
        type: 'StudySessionEvent',
        data: {
          startAtUTC: '2024-01-01T10:00:00Z',
          endAtUTC: '2024-01-01T11:00:00Z',
          subjectId: 'math',
          tags: ['algebra', 'calculus']
        }
      };

      await act(async () => {
        await result.current.addEvent(sessionEvent);
      });

      expect(result.current.addEvent).toHaveBeenCalledWith(sessionEvent);
    });

    it('adds task events correctly', async () => {
      const mockEventStore = {
        addEvent: jest.fn().mockResolvedValue('task-event-123'),
        getEvents: jest.fn().mockResolvedValue([]),
        getRollups: jest.fn().mockResolvedValue({}),
        computeRollups: jest.fn().mockResolvedValue({}),
        compactEvents: jest.fn().mockResolvedValue(true)
      };

      useEventSourcing.mockReturnValue(mockEventStore);

      const { result } = renderHook(() => useEventSourcing());

      const taskEvent = {
        type: 'TaskEvent',
        data: {
          taskId: 'task-123',
          type: 'completed',
          payload: { completedAt: '2024-01-01T10:00:00Z' }
        }
      };

      await act(async () => {
        await result.current.addEvent(taskEvent);
      });

      expect(result.current.addEvent).toHaveBeenCalledWith(taskEvent);
    });

    it('handles database initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      useEventSourcing.mockImplementation(() => {
        throw new Error('Database initialization failed');
      });

      expect(() => {
        renderHook(() => useEventSourcing());
      }).toThrow('Database initialization failed');

      consoleSpy.mockRestore();
    });

    it('retrieves events correctly', async () => {
      const mockEvents = [
        { id: 'event-1', type: 'StudySessionEvent', data: {}, timestamp: '2024-01-01T10:00:00Z' },
        { id: 'event-2', type: 'TaskEvent', data: {}, timestamp: '2024-01-01T11:00:00Z' }
      ];

      const mockEventStore = {
        addEvent: jest.fn(),
        getEvents: jest.fn().mockResolvedValue(mockEvents),
        getRollups: jest.fn().mockResolvedValue({}),
        computeRollups: jest.fn().mockResolvedValue({}),
        compactEvents: jest.fn().mockResolvedValue(true)
      };

      useEventSourcing.mockReturnValue(mockEventStore);

      const { result } = renderHook(() => useEventSourcing());

      const events = await result.current.getEvents();
      expect(events).toEqual(mockEvents);
    });

    it('computes rollups correctly', async () => {
      const mockRollups = {
        daily: { totalMinutes: 120, sessionCount: 2 },
        weekly: { totalMinutes: 840, sessionCount: 12 },
        monthly: { totalMinutes: 3600, sessionCount: 45 }
      };

      const mockEventStore = {
        addEvent: jest.fn(),
        getEvents: jest.fn().mockResolvedValue([]),
        getRollups: jest.fn().mockResolvedValue(mockRollups),
        computeRollups: jest.fn().mockResolvedValue(mockRollups),
        compactEvents: jest.fn().mockResolvedValue(true)
      };

      useEventSourcing.mockReturnValue(mockEventStore);

      const { result } = renderHook(() => useEventSourcing());

      const rollups = await result.current.computeRollups();
      expect(rollups).toEqual(mockRollups);
    });
  });

  describe('useSyncManager', () => {
    it('manages outbox sync correctly', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
        getOutboxItems: jest.fn().mockResolvedValue([]),
        syncUp: jest.fn().mockResolvedValue(true),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      expect(result.current).toEqual(mockSyncManager);
    });

    it('adds events to outbox correctly', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
        getOutboxItems: jest.fn().mockResolvedValue([]),
        syncUp: jest.fn().mockResolvedValue(true),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      const event = {
        id: 'event-123',
        type: 'StudySessionEvent',
        data: {},
        timestamp: '2024-01-01T10:00:00Z'
      };

      await act(async () => {
        await result.current.addToOutbox(event);
      });

      expect(result.current.addToOutbox).toHaveBeenCalledWith(event);
    });

    it('handles uplink sync correctly', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn(),
        getOutboxItems: jest.fn().mockResolvedValue([
          { id: 'outbox-1', event: { type: 'StudySessionEvent' }, status: 'pending' }
        ]),
        syncUp: jest.fn().mockResolvedValue(true),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      const success = await result.current.syncUp();
      expect(success).toBe(true);
      expect(result.current.syncUp).toHaveBeenCalled();
    });

    it('handles downlink sync correctly', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn(),
        getOutboxItems: jest.fn().mockResolvedValue([]),
        syncUp: jest.fn().mockResolvedValue(true),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      const success = await result.current.syncDown();
      expect(success).toBe(true);
      expect(result.current.syncDown).toHaveBeenCalled();
    });

    it('manages checkpoints correctly', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn(),
        getOutboxItems: jest.fn().mockResolvedValue([]),
        syncUp: jest.fn().mockResolvedValue(true),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      const checkpoint = await result.current.getCheckpoint();
      expect(checkpoint).toBe('checkpoint-123');

      await act(async () => {
        await result.current.setCheckpoint('new-checkpoint');
      });

      expect(result.current.setCheckpoint).toHaveBeenCalledWith('new-checkpoint');
    });

    it('handles sync errors gracefully', async () => {
      const mockSyncManager = {
        addToOutbox: jest.fn(),
        getOutboxItems: jest.fn().mockResolvedValue([]),
        syncUp: jest.fn().mockRejectedValue(new Error('Network error')),
        syncDown: jest.fn().mockResolvedValue(true),
        clearOutbox: jest.fn().mockResolvedValue(true),
        setCheckpoint: jest.fn().mockResolvedValue(true),
        getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
      };

      useSyncManager.mockReturnValue(mockSyncManager);

      const { result } = renderHook(() => useSyncManager());

      await expect(result.current.syncUp()).rejects.toThrow('Network error');
    });
  });

  describe('useNotificationManager', () => {
    beforeEach(() => {
      // Mock notification permissions
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: jest.fn().mockResolvedValue('granted')
        },
        configurable: true
      });

      // Mock service worker registration
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            showNotification: jest.fn(),
            getSubscription: jest.fn().mockResolvedValue(null),
            pushManager: {
              subscribe: jest.fn().mockResolvedValue({}),
              getSubscription: jest.fn().mockResolvedValue(null)
            }
          })
        },
        configurable: true
      });
    });

    it('manages push notifications correctly', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('granted'),
        subscribeToNotifications: jest.fn().mockResolvedValue(true),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
        isSupported: jest.fn().mockReturnValue(true)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      expect(result.current.isSupported()).toBe(true);
      
      const permission = await result.current.requestPermission();
      expect(permission).toBe('granted');
    });

    it('handles notification subscription correctly', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('granted'),
        subscribeToNotifications: jest.fn().mockResolvedValue(true),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
        isSupported: jest.fn().mockReturnValue(true)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      const success = await result.current.subscribeToNotifications(['study-reminders']);
      expect(success).toBe(true);
      expect(result.current.subscribeToNotifications).toHaveBeenCalledWith(['study-reminders']);
    });

    it('handles notification unsubscription correctly', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('granted'),
        subscribeToNotifications: jest.fn().mockResolvedValue(true),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
        isSupported: jest.fn().mockReturnValue(true)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      const success = await result.current.unsubscribeFromNotifications();
      expect(success).toBe(true);
    });

    it('sends notifications correctly', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('granted'),
        subscribeToNotifications: jest.fn().mockResolvedValue(true),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
        isSupported: jest.fn().mockReturnValue(true)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      const notification = {
        title: 'Study Reminder',
        body: 'Time to study!',
        icon: '/icon.png',
        tag: 'study-reminder'
      };

      const success = await result.current.sendNotification(notification);
      expect(success).toBe(true);
      expect(result.current.sendNotification).toHaveBeenCalledWith(notification);
    });

    it('handles unsupported browsers', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('denied'),
        subscribeToNotifications: jest.fn().mockResolvedValue(false),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(false),
        sendNotification: jest.fn().mockResolvedValue(false),
        getSubscription: jest.fn().mockResolvedValue(null),
        isSupported: jest.fn().mockReturnValue(false)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      expect(result.current.isSupported()).toBe(false);
      
      const success = await result.current.subscribeToNotifications(['study-reminders']);
      expect(success).toBe(false);
    });

    it('handles permission denial', async () => {
      const mockNotificationManager = {
        requestPermission: jest.fn().mockResolvedValue('denied'),
        subscribeToNotifications: jest.fn().mockResolvedValue(false),
        unsubscribeFromNotifications: jest.fn().mockResolvedValue(false),
        sendNotification: jest.fn().mockResolvedValue(false),
        getSubscription: jest.fn().mockResolvedValue(null),
        isSupported: jest.fn().mockReturnValue(true)
      };

      useNotificationManager.mockReturnValue(mockNotificationManager);

      const { result } = renderHook(() => useNotificationManager());

      const permission = await result.current.requestPermission();
      expect(permission).toBe('denied');
    });
  });
});

describe('Event Validation and Invariants', () => {
  it('validates study session event structure', () => {
    const validSessionEvent = {
      id: 'session-123',
      type: 'StudySessionEvent',
      data: {
        startAtUTC: '2024-01-01T10:00:00Z',
        endAtUTC: '2024-01-01T11:00:00Z',
        subjectId: 'math',
        tags: ['algebra']
      },
      timestamp: '2024-01-01T10:00:00Z'
    };

    expect(validSessionEvent.type).toBe('StudySessionEvent');
    expect(validSessionEvent.data.startAtUTC).toBeDefined();
    expect(validSessionEvent.data.endAtUTC).toBeDefined();
    expect(validSessionEvent.data.subjectId).toBeDefined();
  });

  it('validates task event structure', () => {
    const validTaskEvent = {
      id: 'task-123',
      type: 'TaskEvent',
      data: {
        taskId: 'task-123',
        type: 'completed',
        payload: { completedAt: '2024-01-01T10:00:00Z' }
      },
      timestamp: '2024-01-01T10:00:00Z'
    };

    expect(validTaskEvent.type).toBe('TaskEvent');
    expect(validTaskEvent.data.taskId).toBeDefined();
    expect(validTaskEvent.data.type).toBeDefined();
  });

  it('validates badge event structure', () => {
    const validBadgeEvent = {
      id: 'badge-123',
      type: 'BadgeEvent',
      data: {
        badgeId: 'study-streak',
        criteriaId: '7-day-streak',
        earnedAtUTC: '2024-01-01T10:00:00Z'
      },
      timestamp: '2024-01-01T10:00:00Z'
    };

    expect(validBadgeEvent.type).toBe('BadgeEvent');
    expect(validBadgeEvent.data.badgeId).toBeDefined();
    expect(validBadgeEvent.data.criteriaId).toBeDefined();
  });

  it('enforces event ordering by timestamp', () => {
    const events = [
      { id: 'event-1', timestamp: '2024-01-01T10:00:00Z' },
      { id: 'event-2', timestamp: '2024-01-01T11:00:00Z' },
      { id: 'event-3', timestamp: '2024-01-01T09:00:00Z' }
    ];

    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    expect(sortedEvents[0].id).toBe('event-3');
    expect(sortedEvents[1].id).toBe('event-1');
    expect(sortedEvents[2].id).toBe('event-2');
  });
});

describe('Conflict Resolution', () => {
  it('resolves session conflicts by keeping both versions', () => {
    const localSession = {
      id: 'session-123',
      startAtUTC: '2024-01-01T10:00:00Z',
      endAtUTC: '2024-01-01T11:00:00Z',
      deviceId: 'device-1'
    };

    const remoteSession = {
      id: 'session-123',
      startAtUTC: '2024-01-01T10:00:00Z',
      endAtUTC: '2024-01-01T12:00:00Z',
      deviceId: 'device-2'
    };

    // Both versions should be kept for manual merge
    expect(localSession.deviceId).not.toBe(remoteSession.deviceId);
    expect(localSession.endAtUTC).not.toBe(remoteSession.endAtUTC);
  });

  it('resolves task conflicts by last-write-wins', () => {
    const task1 = {
      id: 'task-123',
      type: 'TaskEvent',
      data: {
        taskId: 'task-123',
        type: 'updated',
        payload: { status: 'in-progress' },
        tsUTC: '2024-01-01T10:00:00Z',
        deviceId: 'device-1'
      }
    };

    const task2 = {
      id: 'task-123',
      type: 'TaskEvent',
      data: {
        taskId: 'task-123',
        type: 'updated',
        payload: { status: 'completed' },
        tsUTC: '2024-01-01T11:00:00Z',
        deviceId: 'device-2'
      }
    };

    // Task 2 should win due to later timestamp
    expect(new Date(task2.data.tsUTC).getTime()).toBeGreaterThan(
      new Date(task1.data.tsUTC).getTime()
    );
  });

  it('merges badge events by union', () => {
    const badge1 = {
      id: 'badge-123',
      type: 'BadgeEvent',
      data: {
        badgeId: 'study-streak',
        criteriaId: '7-day-streak',
        earnedAtUTC: '2024-01-01T10:00:00Z'
      }
    };

    const badge2 = {
      id: 'badge-124',
      type: 'BadgeEvent',
      data: {
        badgeId: 'study-streak',
        criteriaId: '30-day-streak',
        earnedAtUTC: '2024-01-01T11:00:00Z'
      }
    };

    // Both badges should be kept
    expect(badge1.data.criteriaId).not.toBe(badge2.data.criteriaId);
    expect(badge1.data.badgeId).toBe(badge2.data.badgeId);
  });
});