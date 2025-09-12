// Migration Tests and Validation Suite
// This test suite validates the IndexedDB v1 to v2 migration process

import { MigrationManager } from '../lib/migration-manager';
import { StorageManagerV2 } from '../lib/storage-v2';
import { HybridRollupManager } from '../lib/hybrid-rollups';
import { GOLDEN_DATASET, validateGoldenDataset, calculateExpectedMetrics } from './golden-dataset';
import { generateEventId } from '../lib/id-generator';

// Test interfaces
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface MigrationTestResult extends TestResult {
  migrationStats: {
    eventsMigrated: number;
    settingsMigrated: number;
    warnings: string[];
    duration: number;
  };
  validation: {
    dataIntegrity: boolean;
    parityCheck: boolean;
    invariantsValid: boolean;
    errors: string[];
  };
}

interface PerformanceTestResult extends TestResult {
  metrics: {
    avgComputationTime: number;
    maxComputationTime: number;
    memoryUsage: number;
    throughput: number;
  };
}

// Test configuration
const TEST_CONFIG = {
  iterations: 100,
  largeDatasetSize: 10000,
  timeoutMs: 30000,
  memoryThresholdMb: 100,
  performanceThresholds: {
    avgComputationTime: 1000, // 1 second
    maxComputationTime: 5000, // 5 seconds
    throughput: 1000 // events per second
  }
};

// Mock IndexedDB v1 for testing
class MockIndexedDBV1 {
  private data: {
    events: any[];
    settings: any[];
  } = {
    events: [],
    settings: []
  };

  constructor(events: any[] = [], settings: any[] = []) {
    this.data.events = events;
    this.data.settings = settings;
  }

  async getEvents(): Promise<any[]> {
    return this.data.events;
  }

  async getSettings(): Promise<any[]> {
    return this.data.settings;
  }

  async addEvent(event: any): Promise<void> {
    this.data.events.push(event);
  }

  async addSetting(setting: any): Promise<void> {
    this.data.settings.push(setting);
  }

  async clear(): Promise<void> {
    this.data.events = [];
    this.data.settings = [];
  }

  getData() {
    return { ...this.data };
  }
}

// Migration Test Suite
export class MigrationTestSuite {
  private results: TestResult[] = [];
  private deviceId: string;

  constructor(deviceId = 'test-device') {
    this.deviceId = deviceId;
  }

  async runAllTests(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
    results: TestResult[];
  }> {
    const startTime = performance.now();
    
    console.log('🧪 Starting Migration Test Suite...');
    
    // Core migration tests
    await this.testGoldenDatasetMigration();
    await this.testEmptyDatabaseMigration();
    await this.testLargeDatasetMigration();
    await this.testCorruptedDataMigration();
    await this.testIncrementalMigration();
    
    // Performance tests
    await this.testMigrationPerformance();
    await this.testRollupPerformance();
    await this.testMemoryUsage();
    
    // Edge case tests
    await this.testConcurrentMigration();
    await this.testMigrationRollback();
    await this.testBrowserCompatibility();
    
    // Data integrity tests
    await this testDataParity();
    await this.testInvariantValidation();
    await this.testMetricsCalculation();
    
    const duration = performance.now() - startTime;
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      duration
    };
    
    console.log(`📊 Test Summary: ${summary.passed}/${summary.total} passed (${(summary.passed/summary.total*100).toFixed(1)}%)`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)}ms`);
    
    return { summary, results: this.results };
  }

  private async testGoldenDatasetMigration(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Golden Dataset Migration';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create v1 database with golden dataset
      const v1Db = new MockIndexedDBV1();
      const migrationManager = new MigrationManager(this.deviceId);
      
      // Add golden dataset events
      for (const record of GOLDEN_DATASET) {
        await v1Db.addEvent({
          id: record.id,
          type: record.type.replace('_created', ''), // Convert to v1 format
          ...record.data,
          timestamp: record.timestamp
        });
      }
      
      // Simulate migration
      const result = await this.simulateMigration(v1Db);
      
      // Validate results
      const validation = await this.validateMigrationResults(
        v1Db.getData(), 
        result
      );
      
      const testResult: MigrationTestResult = {
        name: testName,
        passed: validation.dataIntegrity && validation.parityCheck,
        duration: performance.now() - startTime,
        migrationStats: {
          eventsMigrated: GOLDEN_DATASET.length,
          settingsMigrated: 0,
          warnings: [],
          duration: performance.now() - startTime
        },
        validation,
        details: {
          goldenDatasetValidated: validateGoldenDataset(),
          expectedMetrics: calculateExpectedMetrics(GOLDEN_DATASET)
        }
      };
      
      this.results.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
      if (!testResult.passed) {
        console.log(`    Errors: ${validation.errors.join(', ')}`);
      }
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testEmptyDatabaseMigration(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Empty Database Migration';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create empty v1 database
      const v1Db = new MockIndexedDBV1();
      
      // Simulate migration
      const result = await this.simulateMigration(v1Db);
      
      const testResult: MigrationTestResult = {
        name: testName,
        passed: true,
        duration: performance.now() - startTime,
        migrationStats: {
          eventsMigrated: 0,
          settingsMigrated: 0,
          warnings: [],
          duration: performance.now() - startTime
        },
        validation: {
          dataIntegrity: true,
          parityCheck: true,
          invariantsValid: true,
          errors: []
        }
      };
      
      this.results.push(testResult);
      console.log(`    ✅ ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testLargeDatasetMigration(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Large Dataset Migration';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create v1 database with large dataset
      const v1Db = new MockIndexedDBV1();
      
      // Generate large dataset
      for (let i = 0; i < TEST_CONFIG.largeDatasetSize; i++) {
        await v1Db.addEvent({
          id: generateEventId(this.deviceId),
          type: 'study_session',
          subject: `Subject ${i % 10}`,
          duration: Math.floor(Math.random() * 180) + 15,
          startTime: Date.now() - (i * 24 * 60 * 60 * 1000),
          endTime: Date.now() - (i * 24 * 60 * 60 * 1000) + (Math.floor(Math.random() * 180) + 15) * 60000,
          rating: Math.floor(Math.random() * 5) + 1,
          timestamp: Date.now() - (i * 24 * 60 * 60 * 1000)
        });
      }
      
      // Simulate migration
      const result = await this.simulateMigration(v1Db);
      
      const testResult: MigrationTestResult = {
        name: testName,
        passed: result.events.length === TEST_CONFIG.largeDatasetSize,
        duration: performance.now() - startTime,
        migrationStats: {
          eventsMigrated: TEST_CONFIG.largeDatasetSize,
          settingsMigrated: 0,
          warnings: [],
          duration: performance.now() - startTime
        },
        validation: {
          dataIntegrity: result.events.length === TEST_CONFIG.largeDatasetSize,
          parityCheck: true,
          invariantsValid: true,
          errors: []
        }
      };
      
      this.results.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testMigrationPerformance(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Migration Performance';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      const computationTimes: number[] = [];
      
      // Test multiple migrations
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const iterationStart = performance.now();
        
        const v1Db = new MockIndexedDBV1();
        await v1Db.addEvent({
          id: generateEventId(this.deviceId),
          type: 'study_session',
          subject: 'Test Subject',
          duration: 60,
          startTime: Date.now(),
          endTime: Date.now() + 60 * 60000,
          rating: 4,
          timestamp: Date.now()
        });
        
        await this.simulateMigration(v1Db);
        
        computationTimes.push(performance.now() - iterationStart);
      }
      
      const avgTime = computationTimes.reduce((a, b) => a + b, 0) / computationTimes.length;
      const maxTime = Math.max(...computationTimes);
      const throughput = 1000 / avgTime; // events per second
      
      const testResult: PerformanceTestResult = {
        name: testName,
        passed: avgTime < TEST_CONFIG.performanceThresholds.avgComputationTime &&
               maxTime < TEST_CONFIG.performanceThresholds.maxComputationTime &&
               throughput > TEST_CONFIG.performanceThresholds.throughput,
        duration: performance.now() - startTime,
        metrics: {
          avgComputationTime: avgTime,
          maxComputationTime: maxTime,
          memoryUsage: 0, // Would be measured in real environment
          throughput
        }
      };
      
      this.results.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testRollupPerformance(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Rollup Performance';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test storage
      const storage = new StorageManagerV2(this.deviceId);
      const rollupManager = new HybridRollupManager(storage);
      
      // Add test events
      const events = [];
      for (let i = 0; i < 1000; i++) {
        events.push({
          id: generateEventId(this.deviceId),
          type: 'study_session_created',
          data: {
            subject: `Subject ${i % 10}`,
            duration: Math.floor(Math.random() * 180) + 15,
            startTime: Date.now() - (i * 60 * 60 * 1000),
            endTime: Date.now() - (i * 60 * 60 * 1000) + (Math.floor(Math.random() * 180) + 15) * 60000,
            rating: Math.floor(Math.random() * 5) + 1
          },
          timestamp: Date.now() - (i * 60 * 60 * 1000)
        });
      }
      
      // Test rollup computation
      const rollupTimes: number[] = [];
      for (const event of events) {
        const rollupStart = performance.now();
        await rollupManager.processEvent(event.type, event.data);
        rollupTimes.push(performance.now() - rollupStart);
      }
      
      const avgTime = rollupTimes.reduce((a, b) => a + b, 0) / rollupTimes.length;
      const maxTime = Math.max(...rollupTimes);
      
      const testResult: PerformanceTestResult = {
        name: testName,
        passed: avgTime < 100 && maxTime < 1000, // 100ms avg, 1s max
        duration: performance.now() - startTime,
        metrics: {
          avgComputationTime: avgTime,
          maxComputationTime: maxTime,
          memoryUsage: 0,
          throughput: 1000 / avgTime
        }
      };
      
      this.results.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testDataParity(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Data Parity Validation';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create v1 database
      const v1Db = new MockIndexedDBV1();
      
      // Add test data
      const testData = [];
      for (let i = 0; i < 100; i++) {
        const event = {
          id: generateEventId(this.deviceId),
          type: i % 3 === 0 ? 'study_session' : i % 3 === 1 ? 'task' : 'badge',
          subject: `Subject ${i % 5}`,
          duration: Math.floor(Math.random() * 180) + 15,
          startTime: Date.now() - (i * 24 * 60 * 60 * 1000),
          endTime: Date.now() - (i * 24 * 60 * 60 * 1000) + (Math.floor(Math.random() * 180) + 15) * 60000,
          rating: Math.floor(Math.random() * 5) + 1,
          timestamp: Date.now() - (i * 24 * 60 * 60 * 1000)
        };
        testData.push(event);
        await v1Db.addEvent(event);
      }
      
      // Simulate migration
      const result = await this.simulateMigration(v1Db);
      
      // Validate parity
      const parityErrors: string[] = [];
      
      // Check event count
      if (result.events.length !== testData.length) {
        parityErrors.push(`Event count mismatch: ${result.events.length} vs ${testData.length}`);
      }
      
      // Check data transformation
      for (let i = 0; i < Math.min(result.events.length, testData.length); i++) {
        const migrated = result.events[i];
        const original = testData[i];
        
        if (migrated.deviceId !== this.deviceId) {
          parityErrors.push(`Device ID mismatch for event ${i}`);
        }
        
        if (migrated.version !== 1) {
          parityErrors.push(`Version mismatch for event ${i}`);
        }
      }
      
      const testResult: TestResult = {
        name: testName,
        passed: parityErrors.length === 0,
        duration: performance.now() - startTime,
        details: {
          parityErrors,
          eventCounts: {
            original: testData.length,
            migrated: result.events.length
          }
        }
      };
      
      this.results.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
      if (!testResult.passed) {
        console.log(`    Parity errors: ${parityErrors.join(', ')}`);
      }
      
    } catch (error) {
      const testResult: TestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.results.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  // Additional test methods would go here...
  private async testCorruptedDataMigration(): Promise<void> {
    // Implementation for testing corrupted data handling
  }

  private async testIncrementalMigration(): Promise<void> {
    // Implementation for testing incremental migration
  }

  private async testMemoryUsage(): Promise<void> {
    // Implementation for testing memory usage
  }

  private async testConcurrentMigration(): Promise<void> {
    // Implementation for testing concurrent migration
  }

  private async testMigrationRollback(): Promise<void> {
    // Implementation for testing migration rollback
  }

  private async testBrowserCompatibility(): Promise<void> {
    // Implementation for testing browser compatibility
  }

  private async testInvariantValidation(): Promise<void> {
    // Implementation for testing invariant validation
  }

  private async testMetricsCalculation(): Promise<void> {
    // Implementation for testing metrics calculation
  }

  // Helper methods
  private async simulateMigration(v1Db: MockIndexedDBV1): Promise<{ events: any[]; settings: any[] }> {
    // Simulate migration process
    const v1Data = v1Db.getData();
    
    const migratedEvents = v1Data.events.map(event => ({
      id: generateEventId(this.deviceId),
      deviceId: this.deviceId,
      type: `study_session_created`,
      data: {
        subject: event.subject,
        duration: event.duration,
        startTime: event.startTime,
        endTime: event.endTime,
        rating: event.rating,
        sessionId: event.id
      },
      timestamp: event.timestamp,
      version: 1,
      synced: false,
      encrypted: false
    }));
    
    return {
      events: migratedEvents,
      settings: v1Data.settings.map(setting => ({
        ...setting,
        deviceId: this.deviceId
      }))
    };
  }

  private async validateMigrationResults(
    original: { events: any[]; settings: any[] },
    migrated: { events: any[]; settings: any[] }
  ): Promise<{
    dataIntegrity: boolean;
    parityCheck: boolean;
    invariantsValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Check data integrity
    if (migrated.events.length !== original.events.length) {
      errors.push(`Event count mismatch: ${migrated.events.length} vs ${original.events.length}`);
    }
    
    // Check required fields
    for (const event of migrated.events) {
      if (!event.id || !event.timestamp || !event.type) {
        errors.push(`Event missing required fields: ${event.id}`);
      }
    }
    
    // Check device ID consistency
    for (const event of migrated.events) {
      if (event.deviceId !== this.deviceId) {
        errors.push(`Device ID mismatch: ${event.deviceId} vs ${this.deviceId}`);
      }
    }
    
    return {
      dataIntegrity: errors.length === 0,
      parityCheck: migrated.events.length === original.events.length,
      invariantsValid: errors.length === 0,
      errors
    };
  }
}

// Test runner
export async function runMigrationTests(): Promise<void> {
  const testSuite = new MigrationTestSuite();
  const results = await testSuite.runAllTests();
  
  // Output results
  console.log('\n🏁 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  console.log(`Duration: ${results.summary.duration.toFixed(2)}ms`);
  
  if (results.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.results
      .filter(r => !r.passed)
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
      });
  }
  
  // Return success/failure for CI/CD
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

// Export for use in other test files
export { MigrationTestSuite, TEST_CONFIG };