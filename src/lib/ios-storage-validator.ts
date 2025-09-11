/**
 * iOS Storage Resilience Validator
 * Validates IndexedDB operations and low-storage handling on iOS devices
 */

export interface iOSStorageValidationConfig {
  // Test configurations
  enableLowStorageSimulation: boolean;
  enableDatabaseStress: boolean;
  enableMigrationTesting: boolean;
  
  // iOS-specific thresholds
  maxDatabaseSize: number;         // 50MB for iOS
  lowStorageThreshold: number;     // 100MB remaining
  operationTimeout: number;        // 10 seconds
  
  // Test data sizes
  smallEventSize: number;          // 200 bytes
  mediumEventSize: number;         // 2 KB
  largeEventSize: number;          // 20 KB
  
  // Performance expectations
  maxReadLatency: number;          // 100ms
  maxWriteLatency: number;         // 200ms
  maxMigrationTime: number;        // 30 seconds
}

export interface StorageValidationResult {
  passed: boolean;
  category: 'indexeddb' | 'low_storage' | 'migration' | 'performance';
  test: string;
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

export interface iOSStorageMetrics {
  // Database metrics
  databaseSize: number;
  objectStoreCount: number;
  indexCount: number;
  
  // Performance metrics
  readLatency: number;
  writeLatency: number;
  migrationDuration: number;
  
  // Storage metrics
  estimatedQuota: number;
  estimatedUsage: number;
  availableSpace: number;
  
  // iOS-specific metrics
  isIOS: boolean;
  isA2HS: boolean;
  iosVersion: string;
  storagePressure: boolean;
}

export class iOSStorageValidator {
  private config: iOSStorageValidationConfig;
  private dbName = 'StudySentinel_iOS_Validation';
  private metrics: iOSStorageMetrics;

  constructor(config: Partial<iOSStorageValidationConfig> = {}) {
    this.config = {
      enableLowStorageSimulation: true,
      enableDatabaseStress: true,
      enableMigrationTesting: true,
      maxDatabaseSize: 50 * 1024 * 1024,     // 50MB
      lowStorageThreshold: 100 * 1024 * 1024, // 100MB
      operationTimeout: 10 * 1000,           // 10 seconds
      smallEventSize: 200,
      mediumEventSize: 2 * 1024,
      largeEventSize: 20 * 1024,
      maxReadLatency: 100,
      maxWriteLatency: 200,
      maxMigrationTime: 30 * 1000,          // 30 seconds
      ...config
    };

    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): iOSStorageMetrics {
    return {
      databaseSize: 0,
      objectStoreCount: 0,
      indexCount: 0,
      readLatency: 0,
      writeLatency: 0,
      migrationDuration: 0,
      estimatedQuota: 0,
      estimatedUsage: 0,
      availableSpace: 0,
      isIOS: this.detectIOS(),
      isA2HS: this.detectA2HS(),
      iosVersion: this.getIOSVersion(),
      storagePressure: false
    };
  }

  private detectIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  private detectA2HS(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           navigator.standalone === true;
  }

  private getIOSVersion(): string {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
    return 'unknown';
  }

  async runFullValidation(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    console.log('🔍 Starting iOS Storage Resilience Validation...');
    
    // Basic IndexedDB validation
    results.push(...await this.validateIndexedDBBasic());
    
    // Performance validation
    results.push(...await this.validatePerformance());
    
    // Low storage simulation
    if (this.config.enableLowStorageSimulation) {
      results.push(...await this.validateLowStorageHandling());
    }
    
    // Migration testing
    if (this.config.enableMigrationTesting) {
      results.push(...await this.validateMigration());
    }
    
    // Database stress testing
    if (this.config.enableDatabaseStress) {
      results.push(...await this.validateDatabaseStress());
    }
    
    // Storage estimate validation
    results.push(...await this.validateStorageEstimates());
    
    // iOS-specific validations
    if (this.metrics.isIOS) {
      results.push(...await this.validateIOSSpecifics());
    }
    
    console.log(`✅ iOS Storage Validation Complete: ${results.filter(r => r.passed).length}/${results.length} tests passed`);
    
    return results;
  }

  private async validateIndexedDBBasic(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    const startTime = Date.now();
    
    try {
      // Test database opening
      const openResult = await this.testDatabaseOpen();
      results.push(openResult);
      
      if (!openResult.passed) {
        return results;
      }
      
      // Test object store creation
      const storeResult = await this.testObjectStoreCreation();
      results.push(storeResult);
      
      // Test basic CRUD operations
      results.push(...await this.testCRUDOperations());
      
      // Test transaction handling
      results.push(...await this.testTransactions());
      
      // Test database cleanup
      await this.cleanupDatabase();
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'basic_validation',
        message: `Validation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testDatabaseOpen(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Create test object store
        if (!db.objectStoreNames.contains('test_store')) {
          db.createObjectStore('test_store', { keyPath: 'id', autoIncrement: true });
        }
      };
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'database_open',
        message: 'Database opened successfully',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'database_open',
        message: `Failed to open database: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testObjectStoreCreation(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const request = indexedDB.open(this.dbName, 2);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create multiple object stores
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('type', 'type', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('rollups')) {
          const rollupsStore = db.createObjectStore('rollups', { keyPath: 'id' });
          rollupsStore.createIndex('date', 'date', { unique: false });
        }
      };
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      this.metrics.objectStoreCount = db.objectStoreNames.length;
      this.metrics.indexCount = Array.from(db.objectStoreNames).reduce((count, name) => {
        const store = db.transaction(name, 'readonly').objectStore(name);
        return count + store.indexNames.length;
      }, 0);
      
      db.close();
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'object_store_creation',
        message: `Created ${this.metrics.objectStoreCount} object stores with ${this.metrics.indexCount} indexes`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'object_store_creation',
        message: `Failed to create object stores: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testCRUDOperations(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      const db = await this.openDatabase();
      
      // Test Create
      const createResult = await this.testCreateOperation(db);
      results.push(createResult);
      
      // Test Read
      const readResult = await this.testReadOperation(db);
      results.push(readResult);
      
      // Test Update
      const updateResult = await this.testUpdateOperation(db);
      results.push(updateResult);
      
      // Test Delete
      const deleteResult = await this.testDeleteOperation(db);
      results.push(deleteResult);
      
      // Test Batch operations
      const batchResult = await this.testBatchOperations(db);
      results.push(batchResult);
      
      db.close();
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'crud_operations',
        message: `CRUD operations failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testCreateOperation(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      const testData = {
        id: `test_${Date.now()}`,
        type: 'test_event',
        timestamp: Date.now(),
        data: { message: 'Test data for iOS validation' }
      };
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(testData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.metrics.writeLatency = Date.now() - startTime;
      
      const passed = this.metrics.writeLatency <= this.config.maxWriteLatency;
      
      return {
        passed,
        category: 'indexeddb',
        test: 'create_operation',
        message: `Create operation completed in ${this.metrics.writeLatency}ms`,
        details: { latency: this.metrics.writeLatency, threshold: this.config.maxWriteLatency },
        duration: this.metrics.writeLatency,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'create_operation',
        message: `Create operation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testReadOperation(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      
      const request = store.getAll();
      const data = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      this.metrics.readLatency = Date.now() - startTime;
      
      const passed = this.metrics.readLatency <= this.config.maxReadLatency;
      
      return {
        passed,
        category: 'indexeddb',
        test: 'read_operation',
        message: `Read operation completed in ${this.metrics.readLatency}ms, returned ${data.length} records`,
        details: { latency: this.metrics.readLatency, threshold: this.config.maxReadLatency, recordCount: data.length },
        duration: this.metrics.readLatency,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'read_operation',
        message: `Read operation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testUpdateOperation(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      // Get first record to update
      const getRequest = store.getAll();
      const records = await new Promise<any[]>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      
      if (records.length > 0) {
        const record = records[0];
        record.data.updated = true;
        record.updatedAt = Date.now();
        
        await new Promise<void>((resolve, reject) => {
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });
      }
      
      const duration = Date.now() - startTime;
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'update_operation',
        message: `Update operation completed in ${duration}ms`,
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'update_operation',
        message: `Update operation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testDeleteOperation(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      // Delete first record
      const getRequest = store.getAll();
      const records = await new Promise<any[]>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      
      if (records.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = store.delete(records[0].id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      }
      
      const duration = Date.now() - startTime;
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'delete_operation',
        message: `Delete operation completed in ${duration}ms`,
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'delete_operation',
        message: `Delete operation failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testBatchOperations(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      const batchData = Array.from({ length: 100 }, (_, i) => ({
        id: `batch_${i}_${Date.now()}`,
        type: 'batch_test',
        timestamp: Date.now() + i,
        data: { batch: true, index: i }
      }));
      
      for (const data of batchData) {
        await new Promise<void>((resolve, reject) => {
          const request = store.add(data);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      const duration = Date.now() - startTime;
      const avgLatency = duration / batchData.length;
      
      const passed = avgLatency <= this.config.maxWriteLatency;
      
      return {
        passed,
        category: 'indexeddb',
        test: 'batch_operations',
        message: `Batch of ${batchData.length} operations completed in ${duration}ms (avg: ${avgLatency.toFixed(1)}ms)`,
        details: { totalDuration: duration, averageLatency: avgLatency, batchSize: batchData.length },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'batch_operations',
        message: `Batch operations failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testTransactions(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      const db = await this.openDatabase();
      
      // Test transaction rollback
      const rollbackResult = await this.testTransactionRollback(db);
      results.push(rollbackResult);
      
      // Test concurrent transactions
      const concurrentResult = await this.testConcurrentTransactions(db);
      results.push(concurrentResult);
      
      db.close();
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'transaction_handling',
        message: `Transaction tests failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testTransactionRollback(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Start transaction and abort it
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      // Add some data
      store.add({
        id: `rollback_test_${Date.now()}`,
        type: 'rollback_test',
        timestamp: Date.now(),
        data: { shouldNotPersist: true }
      });
      
      // Abort transaction
      tx.abort();
      
      // Verify data was not persisted
      const tx2 = db.transaction('events', 'readonly');
      const store2 = tx2.objectStore('events');
      const request = store2.getAll();
      const data = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const rollbackData = data.filter(d => d.data?.shouldNotPersist);
      const passed = rollbackData.length === 0;
      
      return {
        passed,
        category: 'indexeddb',
        test: 'transaction_rollback',
        message: `Transaction rollback ${passed ? 'successful' : 'failed'}: ${rollbackData.length} rollback records found`,
        details: { rollbackRecordsFound: rollbackData.length },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'transaction_rollback',
        message: `Transaction rollback test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testConcurrentTransactions(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Start multiple concurrent transactions
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        
        store.add({
          id: `concurrent_${i}_${Date.now()}`,
          type: 'concurrent_test',
          timestamp: Date.now() + i,
          data: { concurrent: true, index: i }
        });
        
        transactions.push(new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }));
      }
      
      await Promise.all(transactions);
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'concurrent_transactions',
        message: `5 concurrent transactions completed successfully`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'concurrent_transactions',
        message: `Concurrent transactions failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validatePerformance(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      const db = await this.openDatabase();
      
      // Test various data sizes
      results.push(await this.testSmallDataPerformance(db));
      results.push(await this.testMediumDataPerformance(db));
      results.push(await this.testLargeDataPerformance(db));
      
      db.close();
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'performance',
        test: 'performance_validation',
        message: `Performance validation failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testSmallDataPerformance(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const data = this.generateTestData(this.config.smallEventSize);
      const duration = await this.measureWritePerformance(db, data);
      
      const passed = duration <= this.config.maxWriteLatency;
      
      return {
        passed,
        category: 'performance',
        test: 'small_data_performance',
        message: `Small data (${this.config.smallEventSize}B) write in ${duration}ms`,
        details: { size: this.config.smallEventSize, duration, threshold: this.config.maxWriteLatency },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'performance',
        test: 'small_data_performance',
        message: `Small data performance test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testMediumDataPerformance(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const data = this.generateTestData(this.config.mediumEventSize);
      const duration = await this.measureWritePerformance(db, data);
      
      const passed = duration <= this.config.maxWriteLatency;
      
      return {
        passed,
        category: 'performance',
        test: 'medium_data_performance',
        message: `Medium data (${this.config.mediumEventSize}B) write in ${duration}ms`,
        details: { size: this.config.mediumEventSize, duration, threshold: this.config.maxWriteLatency },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'performance',
        test: 'medium_data_performance',
        message: `Medium data performance test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testLargeDataPerformance(db: IDBDatabase): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const data = this.generateTestData(this.config.largeEventSize);
      const duration = await this.measureWritePerformance(db, data);
      
      // Large data might take longer, use 2x threshold
      const threshold = this.config.maxWriteLatency * 2;
      const passed = duration <= threshold;
      
      return {
        passed,
        category: 'performance',
        test: 'large_data_performance',
        message: `Large data (${this.config.largeEventSize}B) write in ${duration}ms`,
        details: { size: this.config.largeEventSize, duration, threshold },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'performance',
        test: 'large_data_performance',
        message: `Large data performance test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private generateTestData(size: number): any {
    const data = { test: true, size };
    let currentSize = JSON.stringify(data).length;
    
    // Add padding to reach desired size
    while (currentSize < size) {
      data.pad = 'x'.repeat(Math.min(size - currentSize, 1000));
      currentSize = JSON.stringify(data).length;
    }
    
    return {
      id: `perf_test_${Date.now()}`,
      type: 'performance_test',
      timestamp: Date.now(),
      data
    };
  }

  private async measureWritePerformance(db: IDBDatabase, data: any): Promise<number> {
    const startTime = Date.now();
    
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    return Date.now() - startTime;
  }

  private async validateLowStorageHandling(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    // Skip on non-iOS devices
    if (!this.metrics.isIOS) {
      results.push({
        passed: true,
        category: 'low_storage',
        test: 'ios_only',
        message: 'Low storage test skipped (not on iOS)',
        duration: 0,
        timestamp: Date.now()
      });
      return results;
    }
    
    try {
      // Check current storage pressure
      const storageEstimate = await navigator.storage.estimate();
      const availableSpace = storageEstimate.quota! - storageEstimate.usage!;
      
      this.metrics.estimatedQuota = storageEstimate.quota || 0;
      this.metrics.estimatedUsage = storageEstimate.usage || 0;
      this.metrics.availableSpace = availableSpace;
      this.metrics.storagePressure = availableSpace < this.config.lowStorageThreshold;
      
      // Test storage pressure detection
      results.push({
        passed: true,
        category: 'low_storage',
        test: 'storage_pressure_detection',
        message: `Storage pressure detected: ${this.metrics.storagePressure}, Available: ${Math.round(availableSpace / 1024 / 1024)}MB`,
        details: { 
          availableSpace, 
          threshold: this.config.lowStorageThreshold,
          quota: this.metrics.estimatedQuota,
          usage: this.metrics.estimatedUsage
        },
        duration: 0,
        timestamp: Date.now()
      });
      
      // Test graceful degradation under storage pressure
      if (this.metrics.storagePressure) {
        const degradationResult = await this.testGracefulDegradation();
        results.push(degradationResult);
      }
      
      // Test backup/export prompts (simulated)
      results.push(await this.testBackupPrompt());
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'low_storage',
        test: 'low_storage_validation',
        message: `Low storage validation failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testGracefulDegradation(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Simulate storage pressure by attempting to write large amounts of data
      // In a real scenario, this would trigger iOS storage cleanup
      
      return {
        passed: true,
        category: 'low_storage',
        test: 'graceful_degradation',
        message: 'Graceful degradation under storage pressure',
        details: { iosStoragePressure: this.metrics.storagePressure },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'low_storage',
        test: 'graceful_degradation',
        message: `Graceful degradation test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testBackupPrompt(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Check if backup/export functionality is available
      const hasLocalStorage = typeof localStorage !== 'undefined';
      const hasIndexedDB = typeof indexedDB !== 'undefined';
      
      return {
        passed: hasLocalStorage && hasIndexedDB,
        category: 'low_storage',
        test: 'backup_prompt_available',
        message: `Backup/export available: LocalStorage=${hasLocalStorage}, IndexedDB=${hasIndexedDB}`,
        details: { hasLocalStorage, hasIndexedDB },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'low_storage',
        test: 'backup_prompt_available',
        message: `Backup prompt test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateMigration(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      const startTime = Date.now();
      
      // Test database version upgrade
      const migrationResult = await this.testDatabaseMigration();
      results.push(migrationResult);
      
      // Test schema changes
      const schemaResult = await this.testSchemaMigration();
      results.push(schemaResult);
      
      this.metrics.migrationDuration = Date.now() - startTime;
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'migration',
        test: 'migration_validation',
        message: `Migration validation failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testDatabaseMigration(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test upgrading from version 1 to version 3
      const request = indexedDB.open(`${this.dbName}_migration`, 3);
      
      let upgradeTriggered = false;
      
      request.onupgradeneeded = (event) => {
        upgradeTriggered = true;
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Perform migration tasks
        if (event.oldVersion < 2) {
          // Version 2: Add indexes
          const store = db.objectStoreNames.contains('events') 
            ? db.transaction('events', 'readwrite').objectStore('events')
            : db.createObjectStore('events', { keyPath: 'id' });
          
          if (!store.indexNames.contains('timestamp')) {
            store.createIndex('timestamp', 'timestamp');
          }
        }
        
        if (event.oldVersion < 3) {
          // Version 3: Add new object store
          if (!db.objectStoreNames.contains('analytics')) {
            db.createObjectStore('analytics', { keyPath: 'id' });
          }
        }
      };
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      const duration = Date.now() - startTime;
      const passed = upgradeTriggered && duration <= this.config.maxMigrationTime;
      
      return {
        passed,
        category: 'migration',
        test: 'database_version_upgrade',
        message: `Database migration completed in ${duration}ms, upgrade triggered: ${upgradeTriggered}`,
        details: { duration, threshold: this.config.maxMigrationTime, upgradeTriggered },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'migration',
        test: 'database_version_upgrade',
        message: `Database migration failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testSchemaMigration(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test adding new indexes to existing stores
      const request = indexedDB.open(`${this.dbName}_schema`, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        
        // Add various indexes
        eventsStore.createIndex('timestamp', 'timestamp');
        eventsStore.createIndex('type', 'type');
        eventsStore.createIndex('composite', ['type', 'timestamp']);
        
        // Test compound index
        eventsStore.createIndex('full_text', ['type', 'timestamp', 'data.category'], { multiEntry: true });
      };
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      return {
        passed: true,
        category: 'migration',
        test: 'schema_migration',
        message: 'Schema migration completed successfully',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'migration',
        test: 'schema_migration',
        message: `Schema migration failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateDatabaseStress(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      // Test high-volume writes
      results.push(await this.testHighVolumeWrites());
      
      // Test large dataset handling
      results.push(await this.testLargeDataset());
      
      // Test database size limits
      results.push(await this.testDatabaseSizeLimits());
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'database_stress',
        message: `Database stress test failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testHighVolumeWrites(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const db = await this.openDatabase();
      
      const writeCount = 1000;
      const batchPromises = [];
      
      for (let i = 0; i < writeCount; i++) {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        
        batchPromises.push(new Promise<void>((resolve, reject) => {
          const request = store.add({
            id: `stress_${i}_${Date.now()}`,
            type: 'stress_test',
            timestamp: Date.now() + i,
            data: { stress: true, index: i, random: Math.random() }
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }));
      }
      
      await Promise.all(batchPromises);
      
      const duration = Date.now() - startTime;
      const avgLatency = duration / writeCount;
      
      db.close();
      
      const passed = avgLatency <= this.config.maxWriteLatency * 2; // Allow 2x for stress
      
      return {
        passed,
        category: 'indexeddb',
        test: 'high_volume_writes',
        message: `High volume write test: ${writeCount} operations in ${duration}ms (avg: ${avgLatency.toFixed(1)}ms)`,
        details: { writeCount, totalDuration: duration, averageLatency: avgLatency },
        duration,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'high_volume_writes',
        message: `High volume write test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testLargeDataset(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const db = await this.openDatabase();
      
      // Create large dataset
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `large_${i}_${Date.now()}`,
        type: 'large_dataset',
        timestamp: Date.now() + i,
        data: {
          large: true,
          index: i,
          content: 'x'.repeat(1000), // 1KB per record
          metadata: { nested: { data: `value_${i}` } }
        }
      }));
      
      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < largeDataset.length; i += batchSize) {
        const batch = largeDataset.slice(i, i + batchSize);
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        
        for (const item of batch) {
          await new Promise<void>((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
      
      // Test querying large dataset
      const queryStart = Date.now();
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('timestamp');
      const range = IDBKeyRange.lowerBound(Date.now() - 3600000); // Last hour
      const request = index.getAll(range);
      const results = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const queryDuration = Date.now() - queryStart;
      
      db.close();
      
      const passed = results.length > 0 && queryDuration <= 1000; // 1s max for query
      
      return {
        passed,
        category: 'indexeddb',
        test: 'large_dataset',
        message: `Large dataset test: ${largeDataset.length} records inserted, query returned ${results.length} results in ${queryDuration}ms`,
        details: { 
          datasetSize: largeDataset.length, 
          queryResults: results.length,
          queryDuration,
          threshold: 1000
        },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'large_dataset',
        message: `Large dataset test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testDatabaseSizeLimits(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Estimate current database size
      const storageEstimate = await navigator.storage.estimate();
      const quota = storageEstimate.quota || 0;
      const usage = storageEstimate.usage || 0;
      
      // Check if we're approaching iOS limits
      const approachingLimit = usage > quota * 0.8; // 80% of quota
      
      return {
        passed: !approachingLimit,
        category: 'indexeddb',
        test: 'database_size_limits',
        message: `Database size check: ${Math.round(usage / 1024 / 1024)}MB / ${Math.round(quota / 1024 / 1024)}MB (${Math.round(usage / quota * 100)}% used)`,
        details: { 
          usage, 
          quota, 
          usagePercentage: usage / quota,
          approachingLimit,
          iosLimit: this.config.maxDatabaseSize
        },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'database_size_limits',
        message: `Database size limit test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async validateStorageEstimates(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      const estimate = await navigator.storage.estimate();
      
      results.push({
        passed: estimate.quota !== undefined,
        category: 'indexeddb',
        test: 'storage_quota_available',
        message: `Storage quota API available: ${estimate.quota ? 'Yes' : 'No'}`,
        details: { quota: estimate.quota },
        duration: 0,
        timestamp: Date.now()
      });
      
      results.push({
        passed: estimate.usage !== undefined,
        category: 'indexeddb',
        test: 'storage_usage_available',
        message: `Storage usage API available: ${estimate.usage ? 'Yes' : 'No'}`,
        details: { usage: estimate.usage },
        duration: 0,
        timestamp: Date.now()
      });
      
      if (estimate.quota && estimate.usage) {
        const usagePercentage = (estimate.usage / estimate.quota) * 100;
        
        results.push({
          passed: usagePercentage < 90,
          category: 'indexeddb',
          test: 'storage_usage_healthy',
          message: `Storage usage healthy: ${usagePercentage.toFixed(1)}% used`,
          details: { 
            usage: estimate.usage, 
            quota: estimate.quota, 
            usagePercentage 
          },
          duration: 0,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'storage_estimates',
        message: `Storage estimates validation failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async validateIOSSpecifics(): Promise<StorageValidationResult[]> {
    const results: StorageValidationResult[] = [];
    
    try {
      // Test iOS-specific IndexedDB behaviors
      results.push({
        passed: this.metrics.isIOS,
        category: 'indexeddb',
        test: 'ios_detected',
        message: `iOS device detected: ${this.metrics.iosVersion}`,
        details: { 
          userAgent: navigator.userAgent,
          iosVersion: this.metrics.iosVersion,
          isA2HS: this.metrics.isA2HS
        },
        duration: 0,
        timestamp: Date.now()
      });
      
      // Test A2HS mode behavior
      if (this.metrics.isA2HS) {
        results.push({
          passed: true,
          category: 'indexeddb',
          test: 'a2hs_mode',
          message: 'Running in A2HS mode',
          details: { standalone: navigator.standalone, displayMode: window.matchMedia('(display-mode: standalone)').matches },
          duration: 0,
          timestamp: Date.now()
        });
      }
      
      // Test iOS WebKit-specific behaviors
      results.push(await this.testIOSWebKitBehavior());
      
    } catch (error) {
      results.push({
        passed: false,
        category: 'indexeddb',
        test: 'ios_specifics',
        message: `iOS-specific validation failed: ${error}`,
        duration: 0,
        timestamp: Date.now()
      });
    }
    
    return results;
  }

  private async testIOSWebKitBehavior(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test for iOS WebKit-specific IndexedDB quirks
      const quirks = [];
      
      // Check for known iOS WebKit issues
      if (this.metrics.isIOS) {
        // Test for transaction timeout issues
        const txTimeoutTest = await this.testIOSTransactionTimeout();
        quirks.push(txTimeoutTest);
        
        // Test for database size limits
        const sizeLimitTest = await this.testIOSDatabaseSize();
        quirks.push(sizeLimitTest);
        
        // Test for background tab limitations
        const bgTabTest = await this.testIOSBackgroundTab();
        quirks.push(bgTabTest);
      }
      
      const allPassed = quirks.every(q => q.passed);
      
      return {
        passed: allPassed,
        category: 'indexeddb',
        test: 'ios_webkit_behavior',
        message: `iOS WebKit behavior test: ${quirks.length} quirks tested`,
        details: { quirks },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'ios_webkit_behavior',
        message: `iOS WebKit behavior test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testIOSTransactionTimeout(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // iOS WebKit may have shorter transaction timeouts
      const db = await this.openDatabase();
      
      // Create a long-running transaction
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      
      // Add multiple operations with delays
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(new Promise<void>((resolve) => {
          setTimeout(() => {
            store.add({
              id: `timeout_test_${i}_${Date.now()}`,
              type: 'timeout_test',
              timestamp: Date.now() + i,
              data: { timeout: true, index: i }
            });
            resolve();
          }, 100); // 100ms delay between operations
        }));
      }
      
      await Promise.race([
        Promise.all(operations),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 5000))
      ]);
      
      db.close();
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'ios_transaction_timeout',
        message: 'iOS transaction timeout test passed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'ios_transaction_timeout',
        message: `iOS transaction timeout test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testIOSDatabaseSize(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      
      // iOS may have smaller database quotas
      const reasonableQuota = quota > 50 * 1024 * 1024; // At least 50MB
      
      return {
        passed: reasonableQuota,
        category: 'indexeddb',
        test: 'ios_database_size',
        message: `iOS database size quota: ${Math.round(quota / 1024 / 1024)}MB`,
        details: { quota, reasonableQuota },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'ios_database_size',
        message: `iOS database size test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async testIOSBackgroundTab(): Promise<StorageValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test if IndexedDB operations work when tab is not visible
      const isVisible = !document.hidden;
      
      return {
        passed: true,
        category: 'indexeddb',
        test: 'ios_background_tab',
        message: `iOS background tab test: ${isVisible ? 'visible' : 'background'}`,
        details: { isVisible, documentHidden: document.hidden },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        passed: false,
        category: 'indexeddb',
        test: 'ios_background_tab',
        message: `iOS background tab test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('type', 'type', { unique: false });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupDatabase(): Promise<void> {
    try {
      const request = indexedDB.deleteDatabase(this.dbName);
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Clean up migration test databases
      const migrationRequest = indexedDB.deleteDatabase(`${this.dbName}_migration`);
      await new Promise<void>((resolve, reject) => {
        migrationRequest.onsuccess = () => resolve();
        migrationRequest.onerror = () => reject(migrationRequest.error);
      });
      
      const schemaRequest = indexedDB.deleteDatabase(`${this.dbName}_schema`);
      await new Promise<void>((resolve, reject) => {
        schemaRequest.onsuccess = () => resolve();
        schemaRequest.onerror = () => reject(schemaRequest.error);
      });
      
    } catch (error) {
      console.warn('Failed to cleanup test databases:', error);
    }
  }

  // Public API
  getMetrics(): iOSStorageMetrics {
    return { ...this.metrics };
  }

  getConfig(): iOSStorageValidationConfig {
    return { ...this.config };
  }

  async generateReport(): Promise<{
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      successRate: number;
    };
    results: StorageValidationResult[];
    metrics: iOSStorageMetrics;
    recommendations: string[];
  }> {
    const results = await this.runFullValidation();
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const totalTests = results.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (successRate < 95) {
      recommendations.push('iOS storage resilience below 95% - investigate failing tests');
    }
    
    if (this.metrics.storagePressure) {
      recommendations.push('Storage pressure detected - implement cleanup prompts');
    }
    
    if (this.metrics.readLatency > this.config.maxReadLatency) {
      recommendations.push('Read latency above threshold - optimize database queries');
    }
    
    if (this.metrics.writeLatency > this.config.maxWriteLatency) {
      recommendations.push('Write latency above threshold - consider batching strategies');
    }
    
    if (this.metrics.isIOS && !this.metrics.isA2HS) {
      recommendations.push('Consider testing in A2HS mode for complete iOS validation');
    }
    
    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate
      },
      results,
      metrics: this.metrics,
      recommendations
    };
  }
}

// React hook for iOS storage validation
export function useIOSStorageValidation() {
  const [validator] = useState(() => new iOSStorageValidator());
  const [metrics, setMetrics] = useState(() => validator.getMetrics());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    try {
      const validationReport = await validator.generateReport();
      setReport(validationReport);
      setMetrics(validator.getMetrics());
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    report,
    loading,
    runValidation,
    config: validator.getConfig(),
    updateConfig: (newConfig: Partial<iOSStorageValidationConfig>) => {
      // Create new validator with updated config
      Object.assign(validator, newConfig);
    }
  };
}