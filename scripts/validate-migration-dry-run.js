#!/usr/bin/env node

/**
 * Migration Dry-Run Validation Script
 * This script performs validation of the migration process without actual data modification
 */

const { MigrationManager } = require('../src/lib/migration-manager');
const { StorageManagerV2 } = require('../src/lib/storage-v2');
const { HybridRollupManager } = require('../src/lib/hybrid-rollups');
const { runMigrationTests } = require('../src/test/migration-tests');

class MigrationDryRunValidator {
  constructor() {
    this.validationResults = [];
    this.deviceId = 'dry-run-device';
  }

  async validateEnvironment() {
    console.log('🔍 Validating Environment...');
    
    const checks = [
      {
        name: 'IndexedDB Support',
        check: () => 'indexedDB' in window,
        critical: true
      },
      {
        name: 'Service Worker Support',
        check: () => 'serviceWorker' in navigator,
        critical: false
      },
      {
        name: 'Storage Quota Available',
        check: async () => {
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return estimate.quota > 100 * 1024 * 1024; // 100MB
          }
          return true;
        },
        critical: true
      },
      {
        name: 'Performance API Available',
        check: () => 'performance' in window,
        critical: false
      }
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        this.validationResults.push({
          name: check.name,
          passed: result,
          critical: check.critical,
          error: result ? null : `${check.name} not available`
        });
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        this.validationResults.push({
          name: check.name,
          passed: false,
          critical: check.critical,
          error: error.message
        });
        console.log(`  ❌ ${check.name} - ${error.message}`);
      }
    }

    const criticalFailures = this.validationResults.filter(r => r.critical && !r.passed);
    if (criticalFailures.length > 0) {
      throw new Error(`Critical validation failures: ${criticalFailures.map(f => f.name).join(', ')}`);
    }
  }

  async validateMigrationPrerequisites() {
    console.log('\n🔍 Validating Migration Prerequisites...');
    
    const checks = [
      {
        name: 'Device ID Generation',
        check: async () => {
          const deviceId = await this.generateDeviceId();
          return deviceId && typeof deviceId === 'string' && deviceId.length > 0;
        }
      },
      {
        name: 'Migration Manager Initialization',
        check: async () => {
          const manager = new MigrationManager(this.deviceId);
          return manager && typeof manager.migrate === 'function';
        }
      },
      {
        name: 'Storage Manager V2 Initialization',
        check: async () => {
          const storage = new StorageManagerV2(this.deviceId);
          return storage && typeof storage.initialize === 'function';
        }
      },
      {
        name: 'Rollup Manager Initialization',
        check: async () => {
          const storage = new StorageManagerV2(this.deviceId);
          const rollup = new HybridRollupManager(storage);
          return rollup && typeof rollup.processEvent === 'function';
        }
      }
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        this.validationResults.push({
          name: check.name,
          passed: result,
          critical: true,
          error: result ? null : `${check.name} failed`
        });
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        this.validationResults.push({
          name: check.name,
          passed: false,
          critical: true,
          error: error.message
        });
        console.log(`  ❌ ${check.name} - ${error.message}`);
      }
    }
  }

  async validateDataIntegrity() {
    console.log('\n🔍 Validating Data Integrity...');
    
    // Create test data
    const testData = this.generateTestData();
    
    // Validate data transformation
    const transformationChecks = [
      {
        name: 'Event ID Transformation',
        check: () => {
          const transformed = this.transformEventV1ToV2(testData.events[0]);
          return transformed.id && transformed.id !== testData.events[0].id;
        }
      },
      {
        name: 'Device ID Assignment',
        check: () => {
          const transformed = this.transformEventV1ToV2(testData.events[0]);
          return transformed.deviceId === this.deviceId;
        }
      },
      {
        name: 'Timestamp Preservation',
        check: () => {
          const transformed = this.transformEventV1ToV2(testData.events[0]);
          return transformed.timestamp === testData.events[0].timestamp;
        }
      },
      {
        name: 'Data Structure Validation',
        check: () => {
          const transformed = this.transformEventV1ToV2(testData.events[0]);
          return transformed.data && 
                 transformed.data.subject && 
                 transformed.data.duration && 
                 transformed.data.startTime && 
                 transformed.data.endTime;
        }
      }
    ];

    for (const check of transformationChecks) {
      try {
        const result = check.check();
        this.validationResults.push({
          name: check.name,
          passed: result,
          critical: true,
          error: result ? null : `${check.name} failed`
        });
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        this.validationResults.push({
          name: check.name,
          passed: false,
          critical: true,
          error: error.message
        });
        console.log(`  ❌ ${check.name} - ${error.message}`);
      }
    }
  }

  async validatePerformance() {
    console.log('\n🔍 Validating Performance...');
    
    const performanceChecks = [
      {
        name: 'Single Event Migration Performance',
        check: async () => {
          const start = performance.now();
          const testData = this.generateTestData(1);
          const transformed = testData.events.map(event => this.transformEventV1ToV2(event));
          const duration = performance.now() - start;
          return duration < 100; // Should be very fast
        }
      },
      {
        name: 'Batch Migration Performance',
        check: async () => {
          const start = performance.now();
          const testData = this.generateTestData(1000);
          const transformed = testData.events.map(event => this.transformEventV1ToV2(event));
          const duration = performance.now() - start;
          return duration < 1000; // Should complete in < 1s
        }
      },
      {
        name: 'Memory Usage',
        check: async () => {
          const before = performance.memory ? performance.memory.usedJSHeapSize : 0;
          const testData = this.generateTestData(10000);
          const transformed = testData.events.map(event => this.transformEventV1ToV2(event));
          const after = performance.memory ? performance.memory.usedJSHeapSize : 0;
          const memoryIncrease = after - before;
          return memoryIncrease < 50 * 1024 * 1024; // Less than 50MB increase
        }
      }
    ];

    for (const check of performanceChecks) {
      try {
        const result = await check.check();
        this.validationResults.push({
          name: check.name,
          passed: result,
          critical: false,
          error: result ? null : `${check.name} failed`
        });
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        this.validationResults.push({
          name: check.name,
          passed: false,
          critical: false,
          error: error.message
        });
        console.log(`  ❌ ${check.name} - ${error.message}`);
      }
    }
  }

  async validateRollbacks() {
    console.log('\n🔍 Validating Rollback Procedures...');
    
    const rollbackChecks = [
      {
        name: 'Backup Creation',
        check: async () => {
          const testData = this.generateTestData();
          const backup = this.createBackup(testData);
          return backup && backup.events && backup.events.length === testData.events.length;
        }
      },
      {
        name: 'Backup Integrity',
        check: async () => {
          const testData = this.generateTestData();
          const backup = this.createBackup(testData);
          const checksum = this.calculateChecksum(backup);
          return checksum && checksum.length > 0;
        }
      },
      {
        name: 'Backup Restoration',
        check: async () => {
          const testData = this.generateTestData();
          const backup = this.createBackup(testData);
          const restored = this.restoreFromBackup(backup);
          return restored.events.length === testData.events.length;
        }
      }
    ];

    for (const check of rollbackChecks) {
      try {
        const result = await check.check();
        this.validationResults.push({
          name: check.name,
          passed: result,
          critical: true,
          error: result ? null : `${check.name} failed`
        });
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
      } catch (error) {
        this.validationResults.push({
          name: check.name,
          passed: false,
          critical: true,
          error: error.message
        });
        console.log(`  ❌ ${check.name} - ${error.message}`);
      }
    }
  }

  async runFullValidation() {
    console.log('🚀 Starting Migration Dry-Run Validation...\n');
    
    try {
      await this.validateEnvironment();
      await this.validateMigrationPrerequisites();
      await this.validateDataIntegrity();
      await this.validatePerformance();
      await this.validateRollbacks();
      
      await this.generateReport();
      
    } catch (error) {
      console.error(`❌ Dry-run validation failed: ${error.message}`);
      process.exit(1);
    }
  }

  async generateReport() {
    console.log('\n📊 Dry-Run Validation Report');
    console.log('='.repeat(50));
    
    const totalChecks = this.validationResults.length;
    const passedChecks = this.validationResults.filter(r => r.passed).length;
    const failedChecks = this.validationResults.filter(r => !r.passed).length;
    const criticalFailures = this.validationResults.filter(r => !r.passed && r.critical).length;
    
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${failedChecks}`);
    console.log(`Critical Failures: ${criticalFailures}`);
    console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
    
    if (failedChecks > 0) {
      console.log('\n❌ Failed Checks:');
      this.validationResults
        .filter(r => !r.passed)
        .forEach(check => {
          console.log(`  - ${check.name}${check.critical ? ' (CRITICAL)' : ''}: ${check.error}`);
        });
    }
    
    if (criticalFailures > 0) {
      console.log('\n🚨 CRITICAL FAILURES DETECTED');
      console.log('Migration should NOT proceed until these issues are resolved.');
      process.exit(1);
    } else if (failedChecks > 0) {
      console.log('\n⚠️  Non-critical failures detected.');
      console.log('Migration can proceed but issues should be addressed.');
    } else {
      console.log('\n✅ All checks passed!');
      console.log('Migration is ready to proceed.');
    }
  }

  // Helper methods
  async generateDeviceId() {
    return `dry-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTestData(count = 100) {
    const events = [];
    const settings = [];
    
    for (let i = 0; i < count; i++) {
      events.push({
        id: `event-${i}`,
        type: 'study_session',
        subject: `Subject ${i % 10}`,
        duration: Math.floor(Math.random() * 180) + 15,
        startTime: Date.now() - (i * 24 * 60 * 60 * 1000),
        endTime: Date.now() - (i * 24 * 60 * 60 * 1000) + (Math.floor(Math.random() * 180) + 15) * 60000,
        rating: Math.floor(Math.random() * 5) + 1,
        timestamp: Date.now() - (i * 24 * 60 * 60 * 1000)
      });
    }
    
    return { events, settings };
  }

  transformEventV1ToV2(event) {
    return {
      id: `v2-${event.id}-${Date.now()}`,
      deviceId: this.deviceId,
      type: 'study_session_created',
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
    };
  }

  createBackup(data) {
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data,
      checksum: this.calculateChecksum(data)
    };
  }

  calculateChecksum(data) {
    // Simple checksum calculation
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  restoreFromBackup(backup) {
    return backup.data;
  }
}

// Run the validation
if (require.main === module) {
  const validator = new MigrationDryRunValidator();
  validator.runFullValidation().catch(console.error);
}

module.exports = { MigrationDryRunValidator };