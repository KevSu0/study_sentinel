/**
 * IndexedDB Mock Setup
 * 
 * Provides a mock implementation of IndexedDB for testing offline storage
 * functionality. Uses fake-indexeddb for consistent behavior across test environments.
 */

import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import { IDBDatabase } from 'fake-indexeddb';
import { Event } from 'fake-indexeddb/lib/Event';
import { IDBRequest } from 'fake-indexeddb/lib/IDBRequest';

// Initialize fake IndexedDB globally
const fakeIndexedDB = new FDBFactory();

// Set up fake IndexedDB
if (typeof window !== 'undefined') {
  (window as any).indexedDB = fakeIndexedDB;
  (window as any).IDBKeyRange = FDBKeyRange;
}
if (typeof global !== 'undefined') {
  (global as any).indexedDB = fakeIndexedDB;
  (global as any).IDBKeyRange = FDBKeyRange;
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
  },
};

// Mock database connection
export class IndexedDBMock {
  private db: IDBDatabase | null = null;
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
        
        if (!request) {
          reject(new Error('Failed to create IndexedDB request'));
          return;
        }
        
        request.onerror = () => reject(request.error || new Error('IndexedDB connection failed'));
        
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains('tasks')) {
            const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
            taskStore.createIndex('date', 'date', { unique: false });
            taskStore.createIndex('completed', 'completed', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('routines')) {
            const routineStore = db.createObjectStore('routines', { keyPath: 'id' });
            routineStore.createIndex('active', 'active', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('sync_queue')) {
            db.createObjectStore('sync_queue', { keyPath: 'id' });
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async clear(): Promise<void> {
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
    const originalOpen = indexedDB.open;
    (indexedDB as any).open = jest.fn().mockImplementation((name, version) => {
      const request = originalOpen.call(indexedDB, name, version);
      request.onerror = () => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      };
      return request;
    });
  }
  
  // Helper method to simulate database corruption
  simulateCorruption(): void {
    const originalOpen = indexedDB.open;
    (indexedDB as any).open = jest.fn().mockImplementation((name, version) => {
      const request = originalOpen.call(indexedDB, name, version);
      request.onerror = () => {
        throw new Error('InvalidStateError: The database is corrupted.');
      };
      return request;
    });
  }
  
  // Helper method to simulate version mismatch
  simulateVersionMismatch(): void {
    const originalOpen = indexedDB.open;
    (indexedDB as any).open = jest.fn().mockImplementation((name, version) => {
      const request = originalOpen.call(indexedDB, name, version);
      request.onerror = () => {
        throw new Error('VersionError: The requested version is lower than the existing version.');
      };
      return request;
    });
  }
}

// Create and export a singleton instance
export const indexedDBMock = new IndexedDBMock();

// Helper functions for testing
export const indexedDBTestHelpers = {
  // Add test data to the database
  async seedTestData(data: { [store: string]: any[] }): Promise<void> {
    const db = await indexedDBMock.connect();
    
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
  async clearTestData(): Promise<void> {
    await indexedDBMock.clear();
  },
  
  // Get all items from a store
  async getAllItems(storeName: string): Promise<any[]> {
    const db = await indexedDBMock.connect();
    
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
  async seedData(storeName: string, items: any[]): Promise<void> {
    const db = await indexedDBMock.connect();
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
  async clearData(storeName: string): Promise<void> {
    const db = await indexedDBMock.connect();
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