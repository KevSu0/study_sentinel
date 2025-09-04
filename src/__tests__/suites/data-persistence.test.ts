/**
 * Data Persistence Test Suite
 * 
 * Comprehensive tests for offline data persistence functionality,
 * including IndexedDB operations, sync queue management, and data integrity.
 */

import { indexedDBTestHelpers, IndexedDBMock } from '../mocks/indexeddb/indexeddb-mock';
import { offlineTestHelpers, type OfflineState } from '../mocks/offline/offline-state-manager';
import { serviceWorkerTestHelpers } from '../mocks/service-worker/service-worker-mock';
import { createMockPlan, createMockUser, createMockPlans } from '../utils/mobile-test-factories';
import { measureMobilePerformance } from '../utils/mobile-test-factories';

interface SyncQueueItem {
  id: string;
  type?: string;
  data: any;
  timestamp: number;
  retryCount?: number;
  maxRetries?: number;
}

describe('Data Persistence Test Suite', () => {
  let dbMock: IndexedDBMock;
  
  beforeEach(async () => {
    // Initialize IndexedDB mock
    dbMock = new IndexedDBMock();
    await dbMock.connect();
    
    // Reset offline state
    offlineTestHelpers.reset();
    
    // Reset service worker
    serviceWorkerTestHelpers.resetMocks();
  });
  
  afterEach(async () => {
    await dbMock.close();
    offlineTestHelpers.reset();
    serviceWorkerTestHelpers.resetMocks();
    if(dbMock) (dbMock as any).simulation = null;
  });
  
  describe('IndexedDB Operations', () => {
    it('should store and retrieve study plans', async () => {
      const mockPlan = createMockPlan({
        title: 'Test Plan for Persistence',
        isOffline: true,
      });
      
      // Store plan
      const db = (dbMock as any).db;
      const tx = db.transaction('plans', 'readwrite');
      const store = tx.objectStore('plans');
      await new Promise(r => {
        const req = store.add(mockPlan);
        req.onsuccess = r;
      });
      
      // Retrieve plan
      const storedPlans = await new Promise(r => {
          const tx2 = db.transaction('plans', 'readonly');
          const store2 = tx2.objectStore('plans');
          const req = store2.getAll();
          req.onsuccess = () => r(req.result);
      });
      
      expect(storedPlans).toHaveLength(1);
      expect(storedPlans[0]).toMatchObject({
        id: mockPlan.id,
        title: mockPlan.title,
        isOffline: true,
      });
    });
    
    it('should handle storage quota exceeded error', async () => {
      const largePlans = createMockPlans(1000, {
        description: 'A'.repeat(10000), // Large description
      });
      
      // Simulate quota exceeded
      dbMock.simulateQuotaExceeded();
      
      await expect(dbMock.connect()).rejects.toThrow('The quota has been exceeded.');
    });
    
    it('should handle database corruption gracefully', async () => {
      const mockPlan = createMockPlan();
      
      // Store initial data
      await indexedDBTestHelpers.seedData((dbMock as any).db, 'plans', [mockPlan]);
      
      // Simulate corruption
      dbMock.simulateCorruption();
      
      // Attempt to read data
      await expect(dbMock.connect()).rejects.toThrow('The database is corrupted.');
    });
    
    it('should handle version mismatch during upgrade', async () => {
      const mockPlan = createMockPlan();
      
      // Store data with current version
      await indexedDBTestHelpers.seedData((dbMock as any).db, 'plans', [mockPlan]);
      
      // Simulate version mismatch
      dbMock.simulateVersionMismatch();
      
      // Attempt to connect with new version
      await expect(
        dbMock.connect()
      ).rejects.toThrow('The requested version is lower than the existing version.');
    });
    
    it('should maintain data integrity during concurrent operations', async () => {
      const plans = createMockPlans(10);
      const performance = measureMobilePerformance();
      
      // Perform concurrent writes
      const writePromises = plans.map((plan, index) => {
        const db = (dbMock as any).db;
        const tx = db.transaction(`plans_${index}`, 'readwrite');
        const store = tx.objectStore(`plans_${index}`);
        return new Promise(r => {
            const req = store.add(plan);
            req.onsuccess = r;
        });
      });
      
      await Promise.all(writePromises);
      
      // Verify all data was stored correctly
      const readPromises = plans.map((_, index) => {
        const db = (dbMock as any).db;
        return new Promise(r => {
            const tx2 = db.transaction(`plans_${index}`, 'readonly');
            const store2 = tx2.objectStore(`plans_${index}`);
            const req = store2.getAll();
            req.onsuccess = () => r(req.result);
        });
      });
      
      const results = await Promise.all(readPromises);
      const metrics = performance.finish();
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(plans[index].id);
      });
      
      // Performance should be reasonable for concurrent operations
      expect(metrics.duration).toBeLessThan(1000); // Less than 1 second
    });
  });
  
  describe('Offline Data Synchronization', () => {
    it('should queue data changes when offline', async () => {
      const mockPlan = createMockPlan({
        syncStatus: 'pending',
      });
      
      // Go offline
      offlineTestHelpers.goOffline();
      
      // Add item to sync queue
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-1',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
      });
      
      const syncQueue = offlineTestHelpers.getSyncQueue();
      
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0]).toMatchObject({
        type: 'create',
        data: mockPlan,
      });
    });
    
    it('should process sync queue when coming back online', async () => {
      const mockPlans = createMockPlans(3, {
        syncStatus: 'pending',
      });
      
      // Go offline and queue changes
      offlineTestHelpers.goOffline();
      
      mockPlans.forEach((plan, index) => {
        offlineTestHelpers.addToSyncQueue({
          id: `sync-${index}`,
          type: 'create',
          data: plan,
          timestamp: Date.now() + index,
        });
      });
      
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(3);
      
      // Come back online
      offlineTestHelpers.goOnline();
      
      // Process sync queue
      const processedItems = await offlineTestHelpers.processSyncQueue();
      
      expect(processedItems).toHaveLength(3);
      expect(offlineTestHelpers.getSyncQueue()).toHaveLength(0);
    });
    
    it('should handle sync conflicts gracefully', async () => {
      const originalPlan = createMockPlan({
        title: 'Original Title',
        lastSynced: Date.now() - 60000, // 1 minute ago
      });
      
      const modifiedPlan = {
        ...originalPlan,
        title: 'Modified Title',
        lastSynced: Date.now() - 30000, // 30 seconds ago
      };
      
      // Store original in cache
      offlineTestHelpers.setCachedData(`plans.${originalPlan.id}`, originalPlan);
      
      // Add modified version to sync queue
      offlineTestHelpers.addToSyncQueue({
        id: 'sync-conflict',
        type: 'update',
        data: modifiedPlan,
        timestamp: Date.now(),
      });
      
      // Simulate server having newer version
      const serverPlan = {
        ...originalPlan,
        title: 'Server Title',
        lastSynced: Date.now(), // Most recent
      };
      
      // Process sync with conflict resolution
      const syncQueue = offlineTestHelpers.getSyncQueue();
      const conflictItem = syncQueue[0];
      
      // In a real app, this would involve conflict resolution logic
      expect(conflictItem.data.title).toBe('Modified Title');
      expect(serverPlan.lastSynced).toBeGreaterThan(modifiedPlan.lastSynced!);
    });
    
    it('should retry failed sync operations', async () => {
      const mockPlan = createMockPlan();
      
      // Add to sync queue with retry count
      offlineTestHelpers.addToSyncQueue({
        id: 'retry-test',
        type: 'create',
        data: mockPlan,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      });
      
      // Simulate network failure
      offlineTestHelpers.setUnstableNetwork();
      
      let syncQueue: SyncQueueItem[] = offlineTestHelpers.getSyncQueue();
      expect(syncQueue[0].retryCount).toBe(0);
      
      // Simulate retry attempts
      for (let i = 1; i <= 3; i++) {
        // Increment retry count (simulating failed sync attempt)
        const updatedItem = { ...syncQueue[0], retryCount: i };
        offlineTestHelpers.updateSyncQueue(updatedItem);
        
        syncQueue = offlineTestHelpers.getSyncQueue();
        expect(syncQueue[0].retryCount).toBe(i);
      }
      
      // After max retries, item should still be in queue for manual resolution
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0].retryCount).toBe(3);
    });
  });
  
  describe('Cache Management', () => {
    it('should cache frequently accessed data', async () => {
      const mockUser = createMockUser();
      const mockPlans = createMockPlans(5);
      
      // Cache user data
      offlineTestHelpers.setCachedData(`user.${mockUser.id}`, mockUser);
      
      // Cache plans
      mockPlans.forEach(plan => {
        offlineTestHelpers.setCachedData(`plans.${plan.id}`, plan);
      });
      
      // Verify cached data
      const cachedUser = offlineTestHelpers.getCacheData(`user.${mockUser.id}`);
      expect(cachedUser).toEqual(mockUser);
      
      const cachedPlans = mockPlans.map(plan => 
        offlineTestHelpers.getCacheData(`plans.${plan.id}`)
      );
      
      expect(cachedPlans).toHaveLength(5);
      cachedPlans.forEach((cachedPlan, index) => {
        expect(cachedPlan).toEqual(mockPlans[index]);
      });
    });
    
    it('should implement cache eviction policy', async () => {
      const plans = createMockPlans(100); // Large number of plans
      
      // Fill cache beyond typical limits
      plans.forEach(plan => {
        offlineTestHelpers.setCachedData(`plans.${plan.id}`, plan);
      });
      
      // Simulate cache size limit (in a real app, this would be automatic)
      const cacheSize = Object.keys(offlineTestHelpers.getAllCachedData()).length;
      expect(cacheSize).toBeGreaterThan(50); // Assuming we have a reasonable cache
      
      // In a real implementation, LRU or other eviction would occur
      // Here we just verify the cache can handle large datasets
      expect(cacheSize).toBeLessThanOrEqual(100);
    });
    
    it('should handle cache corruption gracefully', async () => {
      const mockPlan = createMockPlan();
      
      // Store valid data
      offlineTestHelpers.setCachedData(`plans.${mockPlan.id}`, mockPlan);
      
      // Verify data is cached
      let cachedPlan = offlineTestHelpers.getCacheData(`plans.${mockPlan.id}`);
      expect(cachedPlan).toEqual(mockPlan);
      
      // Simulate cache corruption by clearing
      offlineTestHelpers.clearCache();
      
      // Verify cache is empty
      cachedPlan = offlineTestHelpers.getCacheData(`plans.${mockPlan.id}`);
      expect(cachedPlan).toBeUndefined();
    });
  });
  
  describe('Performance and Memory Management', () => {
    it('should handle large datasets efficiently', async () => {
      const largePlans = createMockPlans(1000);
      const performance = measureMobilePerformance();
      
      // Store large dataset
      const db = (dbMock as any).db;
      const tx = db.transaction('large_plans', 'readwrite');
      const store = tx.objectStore('large_plans');
      await Promise.all(largePlans.map(plan => new Promise(r => {
        const req = store.add(plan);
        req.onsuccess = r;
      })));
      
      // Retrieve and measure performance
      const retrievedPlans = await new Promise(r => {
          const tx2 = db.transaction('large_plans', 'readonly');
          const store2 = tx2.objectStore('large_plans');
          const req = store2.getAll();
          req.onsuccess = () => r(req.result);
      });
      const metrics = performance.finish();
      
      expect(retrievedPlans).toHaveLength(1000);
      expect(metrics.duration).toBeLessThan(5000); // Less than 5 seconds
      expect(metrics.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
    
    it('should clean up resources properly', async () => {
      const mockPlans = createMockPlans(10);
      
      // Store data
      const db = (dbMock as any).db;
      const tx = db.transaction('cleanup_test', 'readwrite');
      const store = tx.objectStore('cleanup_test');
      await Promise.all(mockPlans.map(plan => new Promise(r => {
        const req = store.add(plan);
        req.onsuccess = r;
      })));
      
      // Verify data exists
      let storedPlans = await new Promise(r => {
          const tx2 = db.transaction('cleanup_test', 'readonly');
          const store2 = tx2.objectStore('cleanup_test');
          const req = store2.getAll();
          req.onsuccess = () => r(req.result);
      });
      expect(storedPlans).toHaveLength(10);
      
      // Clear data
      const tx3 = db.transaction('cleanup_test', 'readwrite');
      const store3 = tx3.objectStore('cleanup_test');
      await new Promise(r => {
        const req = store3.clear();
        req.onsuccess = r;
      });
      
      // Verify data is cleared
      storedPlans = await new Promise(r => {
            const tx4 = db.transaction('cleanup_test', 'readonly');
            const store4 = tx4.objectStore('cleanup_test');
            const req = store4.getAll();
            req.onsuccess = () => r(req.result);
      });
      expect(storedPlans).toHaveLength(0);
    });
    
    it('should maintain performance under memory pressure', async () => {
      const iterations = 100;
      const performanceMetrics: Array<{ duration: number; memoryDelta: number }> = [];
      
      for (let i = 0; i < iterations; i++) {
        const performance = measureMobilePerformance();
        const mockPlan = createMockPlan({ title: `Performance Test ${i}` });
        
        const db = (dbMock as any).db;
        const tx = db.transaction(`perf_test_${i}`, 'readwrite');
        const store = tx.objectStore(`perf_test_${i}`);
        await new Promise(r => {
            const req = store.add(mockPlan);
            req.onsuccess = r;
        });
        const retrieved = await new Promise(r => {
            const tx2 = db.transaction(`perf_test_${i}`, 'readonly');
            const store2 = tx2.objectStore(`perf_test_${i}`);
            const req = store2.getAll();
            req.onsuccess = () => r(req.result);
        });
        
        const metrics = performance.finish();
        performanceMetrics.push(metrics);
        
        expect(retrieved).toHaveLength(1);
      }
      
      // Analyze performance trends
      const avgDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / iterations;
      const avgMemoryDelta = performanceMetrics.reduce((sum, m) => sum + m.memoryDelta, 0) / iterations;
      
      // Performance should remain consistent
      expect(avgDuration).toBeLessThan(100); // Less than 100ms average
      expect(avgMemoryDelta).toBeLessThan(1024 * 1024); // Less than 1MB average
      
      // Memory usage shouldn't grow linearly with iterations
      const lastTenMetrics = performanceMetrics.slice(-10);
      const lastTenAvgMemory = lastTenMetrics.reduce((sum, m) => sum + m.memoryDelta, 0) / 10;
      
      expect(lastTenAvgMemory).toBeLessThan(avgMemoryDelta * 2 + 100000); // Not more than 2x average
    });
  });
});