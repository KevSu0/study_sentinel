/**
 * IndexedDB Mock Setup
 * 
 * Provides a mock implementation of IndexedDB for testing offline storage
 * functionality. Uses fake-indexeddb for consistent behavior across test environments.
 */

import 'fake-indexeddb/auto';
import { IDBFactory, IDBKeyRange, IDBDatabase, IDBRequest, IDBOpenDBRequest } from 'fake-indexeddb';

// Initialize fake IndexedDB globally
const fakeIndexedDB = new IDBFactory();

// Set up fake IndexedDB
if (typeof window !== 'undefined') {
  (window as any).indexedDB = fakeIndexedDB;
  (window as any).IDBKeyRange = IDBKeyRange;
}
if (typeof global !== 'undefined') {
  (global as any).indexedDB = fakeIndexedDB;
  (global as any).IDBKeyRange = IDBKeyRange;
}

// Ensure indexedDB is available in the current scope
const indexedDB = fakeIndexedDB;

// Database configuration
export const DB_CONFIG = {
  name: 'study-sentinel-test',
  version: 1,
  stores: {
    plans: 'id, title, dueDate, completed, syncStatus',
    tasks: 'id, planId, title, completed, syncStatus',
    syncQueue: 'id, operation, data, timestamp',
    large_plans: 'id',
    cleanup_test: 'id',
    ...Array.from({ length: 10 }, (_, i) => `plans_${i}`).reduce((acc, storeName) => ({ ...acc, [storeName]: 'id' }), {}),
    ...Array.from({ length: 100 }, (_, i) => `perf_test_${i}`).reduce((acc, storeName) => ({ ...acc, [storeName]: 'id' }), {}),
  },
};

// Mock database connection
export class IndexedDBMock {
  private db: IDBDatabase | null = null;
  public simulation: string | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.simulation) {
        if (this.simulation === 'The quota has been exceeded.') {
          return Promise.reject(new DOMException(this.simulation, 'QuotaExceededError'));
        }
        if (this.simulation === 'The database is corrupted.') {
            return Promise.reject(new DOMException(this.simulation, 'InvalidStateError'));
        }
        if (this.simulation === 'The requested version is lower than the existing version.') {
            return Promise.reject(new DOMException(this.simulation, 'VersionError'));
        }
    }
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
        
        if (!request) {
          return;
        }
        
        request.onerror = () => reject(request.error || new Error('IndexedDB connection failed'));
        
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          Object.entries(DB_CONFIG.stores).forEach(([storeName, keyPath]) => {
            if (!db.objectStoreNames.contains(storeName)) {
              const [key, ...indexes] = keyPath.split(',').map(s => s.trim());
              const store = db.createObjectStore(storeName, { keyPath: key });
              indexes.forEach(index => {
                store.createIndex(index, index, { unique: false });
              });
            }
          });
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async clear(): Promise<void> {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) return;
    
    const stores = Array.from(this.db.objectStoreNames);
    const tx = this.db.transaction(stores, 'readwrite');
    
    await Promise.all(
      stores.map(
        (store) =>
          new Promise<void>((resolve, reject) => {
            const request = tx.objectStore(store).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );
  }
  
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
  
  // Helper method to simulate quota exceeded error
  simulateQuotaExceeded(): void {
    this.simulation = 'The quota has been exceeded.';
  }
  
  // Helper method to simulate database corruption
  simulateCorruption(): void {
    this.simulation = 'The database is corrupted.';
  }
  
  // Helper method to simulate version mismatch
  simulateVersionMismatch(): void {
    this.simulation = 'The requested version is lower than the existing version.';
  }
}

// Create and export a singleton instance
export const indexedDBMock = new IndexedDBMock();

// Helper functions for testing
export const indexedDBTestHelpers = {
  // Add test data to the database
  async seedTestData(db: IDBDatabase, data: { [store: string]: any[] }): Promise<void> {
    if (indexedDBMock.simulation) {
        let errorName = 'QuotaExceededError';
        if (indexedDBMock.simulation === 'The database is corrupted.') {
            errorName = 'InvalidStateError';
        } else if (indexedDBMock.simulation === 'The requested version is lower than the existing version.') {
            errorName = 'VersionError';
        }
        return Promise.reject(new DOMException(indexedDBMock.simulation, errorName));
    }
    const tx = db.transaction(Object.keys(data), 'readwrite');
    
    await Promise.all(
      Object.entries(data).map(
        ([store, items]) =>
          Promise.all(
            items.map(
              (item) =>
                new Promise<void>((resolve, reject) => {
                  const request = tx.objectStore(store).add(item);
                  request.onsuccess = () => resolve();
                  request.onerror = () => reject(request.error);
                })
            )
          )
      )
    );
  },
  
  // Clear all test data
  async clearTestData(db: IDBDatabase): Promise<void> {
    const stores = Array.from(db.objectStoreNames);
    const tx = db.transaction(stores, 'readwrite');

    await Promise.all(
      stores.map(
        (store) =>
          new Promise<void>((resolve, reject) => {
            const request = tx.objectStore(store).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );
  },
  
  // Get all items from a store
  async getAllItems(db: IDBDatabase, storeName: string): Promise<any[]> {
    if (indexedDBMock.simulation) {
        let errorName = 'QuotaExceededError';
        if (indexedDBMock.simulation === 'The database is corrupted.') {
            errorName = 'InvalidStateError';
        } else if (indexedDBMock.simulation === 'The requested version is lower than the existing version.') {
            errorName = 'VersionError';
        }
        return Promise.reject(new DOMException(indexedDBMock.simulation, errorName));
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  // Reset the mock to its original state
  async reset(): Promise<void> {
    await indexedDBMock.close();
  },
  
  // Seed data to a specific store
  async seedData(db: IDBDatabase, storeName: string, items: any[]): Promise<void> {
    if (indexedDBMock.simulation) {
        let errorName = 'QuotaExceededError';
        if (indexedDBMock.simulation === 'The database is corrupted.') {
            errorName = 'InvalidStateError';
        } else if (indexedDBMock.simulation === 'The requested version is lower than the existing version.') {
            errorName = 'VersionError';
        }
        return Promise.reject(new DOMException(indexedDBMock.simulation, errorName));
    }
    const tx = db.transaction(storeName, 'readwrite');
    
    await Promise.all(
      items.map(
        (item) =>
          new Promise<void>((resolve, reject) => {
            const request = tx.objectStore(storeName).add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );
  },
  
  // Clear data from a specific store
  async clearData(db: IDBDatabase, storeName: string): Promise<void> {
    const tx = db.transaction(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = tx.objectStore(storeName).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};

// Export additional helper for database corruption simulation
export const simulateIndexedDBError = {
  quotaExceeded: () => indexedDBMock.simulateQuotaExceeded(),
  corruption: () => indexedDBMock.simulateCorruption(),
  versionMismatch: () => indexedDBMock.simulateVersionMismatch(),
};