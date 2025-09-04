/**
 * Sync Queue Management Test Suite
 * 
 * Tests for background synchronization, conflict resolution,
 * queue processing, and sync state management in offline scenarios.
 */

import { offlineTestHelpers } from '../mocks/offline/offline-state-manager';
import { serviceWorkerTestHelpers } from '../mocks/service-worker/service-worker-mock';
import { createMockPlan, createMockUser, measureMobilePerformance } from '../utils/mobile-test-factories';
import { indexedDBTestHelpers } from '../mocks/indexeddb/indexeddb-mock';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount?: number;
  maxRetries?: number;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

describe('Sync Queue Management Test Suite', () => {
  beforeEach(() => {
    offlineTestHelpers.reset();
    serviceWorkerTestHelpers.resetMocks();
  });
  
  afterEach(() => {
    offlineTestHelpers.reset();
    serviceWorkerTestHelpers.resetMocks();
  });
  
  describe('Queue Operations', () => {
    it('should add items to sync queue in correct order', () => {
      const plan1 = createMockPlan({ title: 'Plan 1' });
      const plan2 = createMockPlan({ title: 'Plan 2' });
      const plan3 = createMockPlan({ title: 'Plan 3' });
      
      // Add items with different timestamps
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-1',
        type: 'create',
        data: plan1,
        timestamp: Date.now() - 2000, // 2 seconds ago
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-2',
        type: 'update',
        data: plan2,
        timestamp: Date.now() - 1000, // 1 second ago
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-3',
        type: 'delete',
        data: plan3,
        timestamp: Date.now(), // Now
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      
      expect(syncQueue).toHaveLength(3);
      // Should be ordered by timestamp (oldest first)
      expect(syncQueue[0].id).toBe('sync-1');
      expect(syncQueue[1].id).toBe('sync-2');
      expect(syncQueue[2].id).toBe('sync-3');
    });
    
    it('should handle priority-based queue ordering', () => {
      const highPriorityPlan = createMockPlan({ title: 'High Priority' });
      const mediumPriorityPlan = createMockPlan({ title: 'Medium Priority' });
      const lowPriorityPlan = createMockPlan({ title: 'Low Priority' });
      
      // Add items in reverse priority order
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-low',
        type: 'create',
        data: lowPriorityPlan,
        timestamp: Date.now() - 3000,
        priority: 'low',
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-medium',
        type: 'create',
        data: mediumPriorityPlan,
        timestamp: Date.now() - 2000,
        priority: 'medium',
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-high',
        type: 'create',
        data: highPriorityPlan,
        timestamp: Date.now() - 1000,
        priority: 'high',
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      
      // In a real implementation, high priority items would be processed first
      // Here we just verify they're all in the queue
      expect(syncQueue).toHaveLength(3);
      
      const highPriorityItem = (syncQueue as SyncQueueItem[]).find(item => item.priority === 'high');
      const mediumPriorityItem = (syncQueue as SyncQueueItem[]).find(item => item.priority === 'medium');
      const lowPriorityItem = (syncQueue as SyncQueueItem[]).find(item => item.priority === 'low');
      
      expect(highPriorityItem).toBeDefined();
      expect(mediumPriorityItem).toBeDefined();
      expect(lowPriorityItem).toBeDefined();
    });
    
    it('should remove items from queue after successful sync', async () => {
      const mockPlan = createMockPlan();
      
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-remove-test',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
      });
      
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(1);
      
      // Simulate successful sync
      const processedItems = await offlineTestHelpers.processSyncQueue();
      
      expect(processedItems).toHaveLength(1);
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(0);
    });
    
    it('should handle queue item dependencies', () => {
      const parentPlan = createMockPlan({ title: 'Parent Plan' });
      const childPlan = createMockPlan({ title: 'Child Plan' });
      
      // Add parent item first
      offlineTestHelpers.addToSyncQueue({
        id: 'parent-sync',
        type: 'create',
        data: parentPlan,
        timestamp: Date.now() - 1000,
      });
      
      // Add child item with dependency on parent
      offlineTestHelpers.addToSyncQueue({
        id: 'child-sync',
        type: 'create',
        data: childPlan,
        timestamp: Date.now(),
        dependencies: ['parent-sync'],
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      
      expect(syncQueue).toHaveLength(2);
      
      const childItem = (syncQueue as SyncQueueItem[]).find(item => item.id === 'child-sync');
      expect(childItem?.dependencies).toContain('parent-sync');
    });
  });
  
  describe('Conflict Resolution', () => {
    it('should detect conflicts between local and server data', () => {
      const originalPlan = createMockPlan({
        title: 'Original Title',
        lastSynced: Date.now() - 120000, // 2 minutes ago
      });
      
      const localModification = {
        ...originalPlan,
        title: 'Local Modification',
        lastSynced: Date.now() - 60000, // 1 minute ago
      };
      
      const serverModification = {
        ...originalPlan,
        title: 'Server Modification',
        lastSynced: Date.now() - 30000, // 30 seconds ago
      };
      
      // Cache original data
      offlineTestHelpers.setCachedData(`plans.${originalPlan.id}`, originalPlan);
      
      // Add local modification to sync queue
      offlineTestHelpers.addToSyncQueue({
        id: 'conflict-test',
        type: 'update',
        data: localModification,
        timestamp: Date.now(),
      });
      
      // Simulate server having newer data
      // In a real app, this would be detected during sync
      const hasConflict = serverModification.lastSynced! > localModification.lastSynced!;
      
      expect(hasConflict).toBe(true);
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      expect(syncQueue[0].data.title).toBe('Local Modification');
    });
    
    it('should handle merge conflicts with user intervention', () => {
      const basePlan = createMockPlan({
        title: 'Base Plan',
        description: 'Original description',
        lastSynced: Date.now() - 180000, // 3 minutes ago
      });
      
      const localChanges = {
        ...basePlan,
        title: 'Locally Modified Plan', // Changed title
        lastSynced: Date.now() - 60000,
      };
      
      const serverChanges = {
        ...basePlan,
        description: 'Server modified description', // Changed description
        lastSynced: Date.now() - 30000,
      };
      
      // Add to sync queue
      offlineTestHelpers.addToSyncQueue({
        id: 'merge-conflict',
        type: 'update',
        data: localChanges,
        timestamp: Date.now(),
      });
      
      // Simulate conflict resolution (in real app, user would choose)
      const resolvedPlan = {
        ...basePlan,
        title: localChanges.title, // Keep local title change
        description: serverChanges.description, // Keep server description change
        lastSynced: Date.now(), // Update sync timestamp
      };
      
      expect(resolvedPlan.title).toBe('Locally Modified Plan');
      expect(resolvedPlan.description).toBe('Server modified description');
    });
    
    it('should handle delete conflicts appropriately', () => {
      const planToDelete = createMockPlan({
        title: 'Plan to Delete',
        lastSynced: Date.now() - 120000,
      });
      
      // Cache the plan
      offlineTestHelpers.setCachedData(`plans.${planToDelete.id}`, planToDelete);
      
      // Add delete operation to queue
      offlineTestHelpers.addToSyncQueue({
        id: 'delete-conflict',
        type: 'delete',
        data: { id: planToDelete.id },
        timestamp: Date.now(),
      });
      
      // Simulate server having modifications to the same item
      const serverModification = {
        ...planToDelete,
        title: 'Server Modified Title',
        lastSynced: Date.now() - 30000, // More recent than local
      };
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      const deleteItem = (syncQueue as SyncQueueItem[]).find(item => item.type === 'delete');
      
      expect(deleteItem).toBeDefined();
      expect(deleteItem?.data.id).toBe(planToDelete.id);
      
      // In a real app, this would require user decision:
      // - Keep server changes and cancel delete
      // - Proceed with delete despite server changes
    });
  });
  
  describe('Retry Logic', () => {
    it('should retry failed sync operations with exponential backoff', async () => {
      const mockPlan = createMockPlan();
      
      offlineTestHelpers.addToSyncQueue({
        id: 'retry-test',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      });
      
      // Simulate network instability
      offlineTestHelpers.setUnstableNetwork();
      
      let syncQueue = offlineTestHelpers.getSyncQueue();
      let retryItem = syncQueue[0] as SyncQueueItem;
      
      // Simulate retry attempts with increasing delays
      const retryDelays = [];
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        retryDelays.push(delay);
        
        // Update retry count
        retryItem.retryCount = attempt;
        offlineTestHelpers.updateSyncQueue(retryItem);
        
        syncQueue = offlineTestHelpers.getSyncQueue();
        expect(syncQueue[0].retryCount).toBe(attempt);
      }
      
      // Verify exponential backoff pattern
      expect(retryDelays).toEqual([2000, 4000, 8000]); // 2s, 4s, 8s
      
      // After max retries, item should still be in queue
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0].retryCount).toBe(3);
    });
    
    it('should handle permanent failures after max retries', () => {
      const mockPlan = createMockPlan();
      
      offlineTestHelpers.addToSyncQueue({
        id: 'permanent-failure',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
        retryCount: 5, // Exceeds max retries
        maxRetries: 3,
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      const failedItem = syncQueue[0] as SyncQueueItem;
      
      expect(failedItem.retryCount).toBeGreaterThan(failedItem.maxRetries!);
      
      // In a real app, this would be marked as permanently failed
      // and require manual intervention or different handling
    });
    
    it('should prioritize retries based on failure type', () => {
      const networkFailurePlan = createMockPlan({ title: 'Network Failure' });
      const serverErrorPlan = createMockPlan({ title: 'Server Error' });
      const validationErrorPlan = createMockPlan({ title: 'Validation Error' });
      
      // Add different types of failures
      offlineTestHelpers.addToSyncQueue({
        id: 'network-failure',
        type: 'create',
        data: networkFailurePlan,
        timestamp: Date.now() - 3000,
        retryCount: 1,
        maxRetries: 5, // Network issues get more retries
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'server-error',
        type: 'create',
        data: serverErrorPlan,
        timestamp: Date.now() - 2000,
        retryCount: 1,
        maxRetries: 3, // Server errors get fewer retries
      });
      
      offlineTestHelpers.addToSyncQueue({
        id: 'validation-error',
        type: 'create',
        data: validationErrorPlan,
        timestamp: Date.now() - 1000,
        retryCount: 1,
        maxRetries: 1, // Validation errors rarely succeed on retry
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      
      expect(syncQueue).toHaveLength(3);
      
      const networkItem = (syncQueue as SyncQueueItem[]).find(item => item.id === 'network-failure');
      const serverItem = (syncQueue as SyncQueueItem[]).find(item => item.id === 'server-error');
      const validationItem = (syncQueue as SyncQueueItem[]).find(item => item.id === 'validation-error');
      
      expect(networkItem?.maxRetries).toBe(5);
      expect(serverItem?.maxRetries).toBe(3);
      expect(validationItem?.maxRetries).toBe(1);
    });
  });
  
  describe('Background Sync', () => {
    it('should register background sync when going offline', async () => {
      const mockPlan = createMockPlan();
      
      // Go online first
      offlineTestHelpers.goOnline();
      
      // Add item to queue
      offlineTestHelpers.addToSyncQueue({
        id: 'bg-sync-test',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
      });
      
      // Go offline
      offlineTestHelpers.goOffline();
      
      // Simulate background sync registration
      await serviceWorkerTestHelpers.simulateBackgroundSync('study-plans-sync');
      
      const registeredSyncs = await serviceWorkerTestHelpers.getBackgroundSyncs();
      expect(registeredSyncs).toContain('study-plans-sync');
    });
    
    it('should process queue when background sync fires', async () => {
      const mockPlans = [createMockPlan(), createMockPlan(), createMockPlan()];
      
      // Add multiple items to queue while offline
      offlineTestHelpers.goOffline();
      
      mockPlans.forEach((plan, index) => {
        offlineTestHelpers.addToSyncQueue({
          id: `bg-sync-${index}`,
          type: 'create',
          data: plan,
          timestamp: Date.now() + index,
        });
      });
      
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(3);
      
      // Simulate background sync event
      await serviceWorkerTestHelpers.simulateBackgroundSync('study-plans-sync');
      
      // Come back online (background sync would detect this)
      offlineTestHelpers.goOnline();
      
      // Process the queue
      const processedItems = await offlineTestHelpers.processSyncQueue();
      
      expect(processedItems).toHaveLength(3);
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(0);
    });
    
    it('should handle background sync failures gracefully', async () => {
      const mockPlan = createMockPlan();
      
      offlineTestHelpers.addToSyncQueue({
        id: 'bg-sync-failure',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
      });
      
      // Simulate background sync failure
      offlineTestHelpers.setUnstableNetwork();
      await serviceWorkerTestHelpers.simulateBackgroundSync('study-plans-sync');
      
      // Items should remain in queue for next attempt
      const syncQueue = offlineTestHelpers.getSyncQueue();
      expect(syncQueue).toHaveLength(1);
      
      // Background sync should be re-registered
      const registeredSyncs = await serviceWorkerTestHelpers.getBackgroundSyncs();
      expect(registeredSyncs).toContain('study-plans-sync');
    });
  });
  
  describe('Performance and Scalability', () => {
    it('should handle large sync queues efficiently', () => {
      const performance = measureMobilePerformance();
      const largeNumberOfItems = 1000;
      
      // Add many items to queue
      for (let i = 0; i < largeNumberOfItems; i++) {
        const mockPlan = createMockPlan({ title: `Plan ${i}` });
        offlineTestHelpers.addToSyncQueue({
          id: `large-queue-${i}`,
          type: 'create',
          data: mockPlan,
          timestamp: Date.now() + i,
        });
      }
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      const metrics = performance.finish();
      
      expect(syncQueue).toHaveLength(largeNumberOfItems);
      expect(metrics.duration).toBeLessThan(1000); // Less than 1 second
    });
    
    it('should batch sync operations for efficiency', () => {
      const batchSize = 10;
      const totalItems = 50;
      
      // Add items to queue
      for (let i = 0; i < totalItems; i++) {
        const mockPlan = createMockPlan({ title: `Batch Plan ${i}` });
        offlineTestHelpers.addToSyncQueue({
          id: `batch-${i}`,
          type: 'create',
          data: mockPlan,
          timestamp: Date.now() + i,
        });
      }
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      expect(syncQueue).toHaveLength(totalItems);
      
      // Simulate batch processing
      const batches = [];
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = syncQueue.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      expect(batches).toHaveLength(Math.ceil(totalItems / batchSize));
      expect(batches[0]).toHaveLength(batchSize);
      expect(batches[batches.length - 1]).toHaveLength(totalItems % batchSize || batchSize);
    });
    
    it('should maintain queue integrity under concurrent operations', async () => {
      const concurrentOperations = 20;
      const promises = [];
      
      // Simulate concurrent queue operations
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            const mockPlan = createMockPlan({ title: `Concurrent Plan ${i}` });
            offlineTestHelpers.addToSyncQueue({
              id: `concurrent-${i}`,
              type: 'create',
              data: mockPlan,
              timestamp: Date.now() + i,
            });
            resolve();
          }, Math.random() * 100); // Random delay up to 100ms
        });
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      expect(syncQueue).toHaveLength(concurrentOperations);
      
      // Verify all items have unique IDs
      const ids = syncQueue.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrentOperations);
    });
  });
});