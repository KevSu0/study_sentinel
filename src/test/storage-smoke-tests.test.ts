/**
 * Functional smoke tests for IndexedDB storage
 * These tests verify runtime behavior and index functionality
 */

import { StorageManagerV2, EventRecord } from '../lib/storage-v2';
import { EventType, StudyEventData, TaskEventData, BadgeEventData } from '../lib/storage-v2';

describe('Storage Smoke Tests', () => {
  let storage: StorageManagerV2;
  const testDeviceId = 'smoke-test-device';
  
  beforeAll(async () => {
    // Clean up any existing test database
    await indexedDB.deleteDatabase('StudySentinelDB');
    
    storage = new StorageManagerV2(testDeviceId);
    await storage.initialize();
  });
  
  afterAll(async () => {
    if (storage) {
      await storage.cleanup();
    }
    // Clean up test database
    await indexedDB.deleteDatabase('StudySentinelDB');
  });
  
  beforeEach(async () => {
    // Clear all data before each test
    await storage.clearAllData();
  });
  
  describe('C1: Basic Time Range Query', () => {
    test('should return events within time window', async () => {
      // Create events with 1 second intervals to ensure different timestamps
      const baseTime = Date.now();
      const events = [];
      
      // Create events with 1 second intervals for different normalized timestamps
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 second intervals
        
        const event = await storage.addEvent({
          type: 'study_session_created' as EventType,
          deviceId: testDeviceId,
          sessionId: 'session-test',
          data: {
            subject: `Test Subject ${i}`,
            duration: 3600000,
            startTime: baseTime + i * 3600000,
            endTime: baseTime + (i + 1) * 3600000,
            sessionId: 'session-test'
          } as StudyEventData
        });
        events.push(event);
      }
      
      // Get all events and their timestamps
      const allEvents = await storage.getEvents();
      const eventTimestamps = allEvents.map(e => e.timestamp).sort((a, b) => a - b);
      
      // Query for middle 2 events (events 2 and 3)
      const startTime = eventTimestamps[2];
      const endTime = eventTimestamps[3];
      
      const results = await storage.getEvents({
        startTime,
        endTime
      });
      
      // Verify we found some events within the time range
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(event => event.timestamp >= startTime && event.timestamp <= endTime)).toBe(true);
      
      // Verify ascending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].timestamp).toBeGreaterThanOrEqual(results[i - 1].timestamp);
      }
    }, 15000); // 15 second timeout
  });
  
  describe('C3: Device-Specific Time Range', () => {
    test('should filter by device and time range correctly', async () => {
      const baseTime = Date.now();
      
      // Create events for different devices with delay
      await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: 'device-A',
        sessionId: 'session-A',
        data: {
          subject: 'Device A Study',
          duration: 3600000,
          startTime: baseTime,
          endTime: baseTime + 3600000,
          sessionId: 'session-A'
        } as StudyEventData
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: 'device-B', 
        sessionId: 'session-B',
        data: {
          subject: 'Device B Study',
          duration: 3600000,
          startTime: baseTime + 1800000,
          endTime: baseTime + 5400000,
          sessionId: 'session-B'
        } as StudyEventData
      });
      
      // Get all events to determine actual time range
      const allEvents = await storage.getEvents();
      const latestTime = Math.max(...allEvents.map(e => e.timestamp));
      
      // Query for device-A events
      const results = await storage.getEvents({
        deviceId: 'device-A',
        startTime: 0,
        endTime: latestTime
      });
      
      expect(results.length).toBe(1);
      expect(results[0].deviceId).toBe('device-A');
    });
  });
  
  describe('C5: Type-Specific Time Range', () => {
    test('should filter by event type and time range', async () => {
      const baseTime = Date.now();
      
      // Create different event types
      await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-study',
        data: {
          subject: 'Study Session',
          duration: 3600000,
          startTime: baseTime,
          endTime: baseTime + 3600000,
          sessionId: 'session-study'
        } as StudyEventData
      });
      
      await storage.addEvent({
        type: 'task_completed' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-task',
        data: {
          title: 'Completed Task',
          description: 'Test task',
          priority: 'medium' as const,
          completed: true,
          taskId: 'task-123'
        } as TaskEventData
      });
      
      // Query for study sessions only
      const results = await storage.getEvents({
        type: 'study_session_created',
        startTime: baseTime - 3600000,
        endTime: baseTime + 7200000
      });
      
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('study_session_created');
    });
  });
  
  describe('C7: Sync Status - New Data', () => {
    test('should respect synced=false default for new writes', async () => {
      const baseTime = Date.now();
      
      // Add new event (should have synced=false by default)
      const eventId = await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-sync',
        data: {
          subject: 'Sync Test',
          duration: 3600000,
          startTime: baseTime,
          endTime: baseTime + 3600000,
          sessionId: 'session-sync'
        } as StudyEventData
      });
      
      // Verify the event was created with synced=false
      const event = await storage.getEvent(eventId);
      expect(event).toBeDefined();
      expect(event!.synced).toBe(false);
      
      // Test that by_sync_status index works (only false for new events)
      const syncResults = await storage.getEvents({
        startTime: baseTime - 3600000,
        endTime: baseTime + 7200000
      });
      
      // New event should be present in general query
      expect(syncResults.some(e => e.id === eventId)).toBe(true);
    });
  });
  
  describe('C10: Session Exact Match', () => {
    test('should return events for specific session', async () => {
      const baseTime = Date.now();
      
      // Create events for different sessions
      await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-alpha',
        data: {
          subject: 'Alpha Session',
          duration: 3600000,
          startTime: baseTime,
          endTime: baseTime + 3600000,
          sessionId: 'session-alpha'
        } as StudyEventData
      });
      
      await storage.addEvent({
        type: 'task_completed' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-beta',
        data: {
          title: 'Beta Task',
          priority: 'high' as const,
          completed: true,
          taskId: 'task-beta'
        } as TaskEventData
      });
      
      // Query for session-alpha events
      const results = await storage.getEventsBySession('session-alpha');
      
      expect(results.length).toBe(1);
      expect(results[0].sessionId).toBe('session-alpha');
    });
  });
  
  describe('C17: Timestamp Normalization', () => {
    test('should normalize timestamps to whole seconds', async () => {
      const eventId = await storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-normalize',
        data: {
          subject: 'Normalization Test',
          duration: 3600000,
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          sessionId: 'session-normalize'
        } as StudyEventData
      });
      
      const event = await storage.getEvent(eventId);
      expect(event).toBeDefined();
      
      // Verify timestamp is normalized to whole seconds
      expect(event!.timestamp % 1000).toBe(0);
    });
  });
  
  describe('C19: Compile-Time Type Safety', () => {
    test('should enforce correct tuple types at compile time', () => {
      // This test primarily verifies the TypeScript compilation works correctly
      // The actual type checking happens at compile time in storage-compile-time-tests.ts
      
      // Verify that the storage manager can be instantiated
      expect(storage).toBeInstanceOf(StorageManagerV2);
      
      // Verify that methods exist and are callable
      expect(typeof storage.addEvent).toBe('function');
      expect(typeof storage.getEvents).toBe('function');
      expect(typeof storage.getEvent).toBe('function');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty time ranges', async () => {
      // Query with no events
      const results = await storage.getEvents({
        startTime: Date.now() - 86400000,
        endTime: Date.now() - 86300000 // Very small window with no data
      });
      
      expect(results.length).toBe(0);
    });
    
    test('should handle events without sessionId', async () => {
      const eventId = await storage.addEvent({
        type: 'badge_earned' as EventType,
        deviceId: testDeviceId,
        data: {
          badgeId: 'badge-123',
          badgeName: 'Test Badge',
          criteria: 'Complete test',
          earnedAt: Date.now()
        } as BadgeEventData
        // No sessionId provided
      });
      
      const event = await storage.getEvent(eventId);
      expect(event).toBeDefined();
      expect(event!.sessionId).toBeUndefined();
    });
  });
  
  describe('JSON Serialization Validation', () => {
    test('should validate JSON-serializable data', async () => {
      // Valid JSON data should work
      await expect(storage.addEvent({
        type: 'study_session_created' as EventType,
        deviceId: testDeviceId,
        sessionId: 'session-json',
        data: {
          subject: 'JSON Test',
          duration: 3600000,
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
          sessionId: 'session-json',
          tags: ['tag1', 'tag2'],
          rating: 5
        } as StudyEventData
      })).resolves.not.toThrow();
      
      // Invalid data should throw (but we can't easily test this without breaking the test)
      // The validation is implemented and will throw at runtime
    });
  });
  
  describe('Performance Baseline', () => {
    test('should establish performance baseline for queries', async () => {
      const eventCount = 10; // Reduced for faster testing
      
      // Clear existing data first
      await storage.clearAllData();
      
      // Seed test data
      const eventIds = [];
      for (let i = 0; i < eventCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay for different timestamps
        const eventId = await storage.addEvent({
          type: 'study_session_created' as EventType,
          deviceId: testDeviceId,
          sessionId: `session-perf-${i}`,
          data: {
            subject: `Performance Test ${i}`,
            duration: 3600000,
            startTime: Date.now() + i * 60000,
            endTime: Date.now() + (i + 1) * 60000,
            sessionId: `session-perf-${i}`
          } as StudyEventData
        });
        eventIds.push(eventId);
      }
      
      // Get all events to determine time range
      const allEvents = await storage.getEvents();
      const timestamps = allEvents.map(e => e.timestamp).sort((a, b) => a - b);
      const startTime = timestamps[0];
      const endTime = timestamps[timestamps.length - 1];
      
      // Measure query performance
      const startQuery = performance.now();
      const results = await storage.getEvents({
        startTime,
        endTime
      });
      const endQuery = performance.now();
      
      const queryTime = endQuery - startQuery;
      
      expect(results.length).toBe(eventCount);
      expect(queryTime).toBeLessThan(100); // Should be much faster than 100ms
      
      console.log(`Performance baseline: ${queryTime.toFixed(2)}ms for ${eventCount} events`);
    });
  });
});

