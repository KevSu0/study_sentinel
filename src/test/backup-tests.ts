// Migration Backup/Restore Verification Tests
// Tests backup creation, integrity, and restoration

import { MigrationManager } from '../lib/migration-manager';
import { StorageManagerV2 } from '../lib/storage-v2';

export interface BackupTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface BackupVerificationResult {
  backupCreated: boolean;
  backupIntact: boolean;
  dataComplete: boolean;
  checksumValid: boolean;
  restoreSuccessful: boolean;
  size: number;
  timestamp: number;
  errors: string[];
}

export class MigrationBackupTester {
  private deviceId: string;
  private testResults: BackupTestResult[] = [];

  constructor(deviceId = 'test-device-backup') {
    this.deviceId = deviceId;
  }

  async runAllTests(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
    };
    results: BackupTestResult[];
  }> {
    const startTime = performance.now();
    
    console.log('🧪 Starting Migration Backup/Restore Tests...');
    
    // Run all backup tests
    await this.testBackupCreation();
    await this.testBackupIntegrity();
    await this.testDataCompleteness();
    await this.testChecksumValidation();
    await this.testRestoreProcess();
    await this.testMultipleBackups();
    await this.testLargeDatasetBackup();
    await this.testCorruptedBackupHandling();
    
    const duration = performance.now() - startTime;
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.passed).length,
      failed: this.testResults.filter(r => !r.passed).length,
      duration
    };
    
    console.log(`📊 Backup Test Summary: ${summary.passed}/${summary.total} passed (${(summary.passed/summary.total*100).toFixed(1)}%)`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)}ms`);
    
    return { summary, results: this.testResults };
  }

  private async testBackupCreation(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Backup Creation';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data
      const testData = this.generateTestData(100);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: backup && backup.data && backup.timestamp > 0,
        duration: performance.now() - startTime,
        details: {
          backupSize: JSON.stringify(backup).length,
          eventCount: backup.data.events.length,
          settingCount: backup.data.settings.length,
          timestamp: backup.timestamp
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testBackupIntegrity(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Backup Integrity';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data
      const testData = this.generateTestData(50);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Check integrity
      const integrity = await this.verifyBackupIntegrity(backup, testData);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: integrity.backupIntact && integrity.dataComplete,
        duration: performance.now() - startTime,
        details: {
          ...integrity,
          backupSize: JSON.stringify(backup).length
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
      if (!testResult.passed) {
        console.log(`    Errors: ${integrity.errors.join(', ')}`);
      }
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testDataCompleteness(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Data Completeness';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data with various data types
      const testData = this.generateTestData(200);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Check data completeness
      const completeness = await this.verifyDataCompleteness(backup, testData);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: completeness.eventsMatch && completeness.settingsMatch,
        duration: performance.now() - startTime,
        details: completeness
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testChecksumValidation(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Checksum Validation';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data
      const testData = this.generateTestData(75);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Validate checksum
      const checksumValid = await this.validateChecksum(backup);
      
      // Test checksum detection of corruption
      const corruptedBackup = { ...backup, data: { ...backup.data, events: backup.data.events.slice(0, -5) } };
      const corruptionDetected = !await this.validateChecksum(corruptedBackup);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: checksumValid && corruptionDetected,
        duration: performance.now() - startTime,
        details: {
          checksumValid,
          corruptionDetected,
          originalChecksum: backup.checksum,
          corruptedChecksum: this.calculateChecksum(corruptedBackup.data)
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testRestoreProcess(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Restore Process';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data
      const testData = this.generateTestData(150);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Simulate restore process
      const restored = await this.simulateRestore(backup);
      
      // Verify restore
      const restoreVerified = await this.verifyRestore(restored, testData);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: restoreVerified.success,
        duration: performance.now() - startTime,
        details: restoreVerified
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testMultipleBackups(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Multiple Backups';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      const backups = [];
      
      // Create multiple backups
      for (let i = 0; i < 5; i++) {
        const testData = this.generateTestData(20 + i * 10);
        const backup = await this.createBackup(testData);
        backups.push(backup);
      }
      
      // Verify all backups are valid
      const backupValidations = await Promise.all(
        backups.map(backup => this.verifyBackupIntegrity(backup, backup.data))
      );
      
      const allValid = backupValidations.every(validation => validation.backupIntact);
      
      // Test backup selection (most recent)
      const sortedBackups = backups.sort((a, b) => b.timestamp - a.timestamp);
      const mostRecent = sortedBackups[0];
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: allValid && mostRecent.timestamp > 0,
        duration: performance.now() - startTime,
        details: {
          backupCount: backups.length,
          allValid,
          mostRecentTimestamp: mostRecent.timestamp,
          backupSizes: backups.map(b => JSON.stringify(b).length)
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testLargeDatasetBackup(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Large Dataset Backup';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create large dataset
      const testData = this.generateTestData(1000);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Verify backup
      const verification = await this.verifyBackupIntegrity(backup, testData);
      
      // Check performance
      const duration = performance.now() - startTime;
      const size = JSON.stringify(backup).length;
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: verification.backupIntact && duration < 5000, // Should complete in < 5s
        duration,
        details: {
          ...verification,
          backupSize: size,
          eventCount: testData.events.length,
          durationMs: duration,
          throughput: (testData.events.length / (duration / 1000)).toFixed(2) + ' events/s'
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  private async testCorruptedBackupHandling(): Promise<void> {
    const startTime = performance.now();
    const testName = 'Corrupted Backup Handling';
    
    try {
      console.log(`  📋 Testing: ${testName}`);
      
      // Create test data
      const testData = this.generateTestData(50);
      
      // Create backup
      const backup = await this.createBackup(testData);
      
      // Create corrupted versions
      const corruptedBackups = [
        { ...backup, checksum: 'invalid' },
        { ...backup, data: { events: [] } },
        { ...backup, timestamp: -1 },
        { ...backup, version: 'invalid' }
      ];
      
      // Test handling of corrupted backups
      const corruptionResults = await Promise.all(
        corruptedBackups.map(async (corrupted, index) => {
          try {
            await this.verifyBackupIntegrity(corrupted, testData);
            return { index, detected: false };
          } catch (error) {
            return { index, detected: true, error: error.message };
          }
        })
      );
      
      const allCorruptionDetected = corruptionResults.every(result => result.detected);
      
      const testResult: BackupTestResult = {
        name: testName,
        passed: allCorruptionDetected,
        duration: performance.now() - startTime,
        details: {
          corruptionResults,
          allCorruptionDetected
        }
      };
      
      this.testResults.push(testResult);
      console.log(`    ${testResult.passed ? '✅' : '❌'} ${testName} (${testResult.duration.toFixed(2)}ms)`);
      
    } catch (error) {
      const testResult: BackupTestResult = {
        name: testName,
        passed: false,
        duration: performance.now() - startTime,
        error: error.message
      };
      this.testResults.push(testResult);
      console.log(`    ❌ ${testName} - ${error.message}`);
    }
  }

  // Helper methods
  private generateTestData(eventCount = 100) {
    const events = [];
    const settings = [];
    
    for (let i = 0; i < eventCount; i++) {
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
    
    for (let i = 0; i < 10; i++) {
      settings.push({
        key: `setting-${i}`,
        value: `value-${i}`,
        type: 'preference'
      });
    }
    
    return { events, settings };
  }

  private async createBackup(data: any): Promise<any> {
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      deviceId: this.deviceId,
      data,
      checksum: this.calculateChecksum(data)
    };
  }

  private async verifyBackupIntegrity(backup: any, originalData: any): Promise<BackupVerificationResult> {
    const errors: string[] = [];
    
    let backupIntact = true;
    let dataComplete = true;
    let checksumValid = false;
    
    // Check basic structure
    if (!backup.version || !backup.timestamp || !backup.data || !backup.checksum) {
      errors.push('Backup missing required fields');
      backupIntact = false;
    }
    
    // Check timestamp
    if (backup.timestamp <= 0) {
      errors.push('Invalid timestamp');
      backupIntact = false;
    }
    
    // Check data completeness
    if (backup.data.events.length !== originalData.events.length) {
      errors.push(`Event count mismatch: ${backup.data.events.length} vs ${originalData.events.length}`);
      dataComplete = false;
    }
    
    if (backup.data.settings.length !== originalData.settings.length) {
      errors.push(`Setting count mismatch: ${backup.data.settings.length} vs ${originalData.settings.length}`);
      dataComplete = false;
    }
    
    // Check checksum
    checksumValid = this.validateChecksum(backup);
    if (!checksumValid) {
      errors.push('Checksum validation failed');
    }
    
    return {
      backupIntact,
      dataComplete,
      checksumValid,
      restoreSuccessful: false, // Will be tested separately
      size: JSON.stringify(backup).length,
      timestamp: backup.timestamp,
      errors
    };
  }

  private async verifyDataCompleteness(backup: any, originalData: any): Promise<{
    eventsMatch: boolean;
    settingsMatch: boolean;
    dataIntegrity: boolean;
    missingEvents: string[];
    missingSettings: string[];
  }> {
    const missingEvents: string[] = [];
    const missingSettings: string[] = [];
    
    // Check events
    const backupEventIds = new Set(backup.data.events.map((e: any) => e.id));
    const originalEventIds = new Set(originalData.events.map((e: any) => e.id));
    
    originalEventIds.forEach(id => {
      if (!backupEventIds.has(id)) {
        missingEvents.push(id);
      }
    });
    
    // Check settings
    const backupSettingKeys = new Set(backup.data.settings.map((s: any) => s.key));
    const originalSettingKeys = new Set(originalData.settings.map((s: any) => s.key));
    
    originalSettingKeys.forEach(key => {
      if (!backupSettingKeys.has(key)) {
        missingSettings.push(key);
      }
    });
    
    return {
      eventsMatch: missingEvents.length === 0,
      settingsMatch: missingSettings.length === 0,
      dataIntegrity: missingEvents.length === 0 && missingSettings.length === 0,
      missingEvents,
      missingSettings
    };
  }

  private validateChecksum(backup: any): boolean {
    const calculatedChecksum = this.calculateChecksum(backup.data);
    return calculatedChecksum === backup.checksum;
  }

  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async simulateRestore(backup: any): Promise<any> {
    // Simulate restore process
    return {
      success: true,
      restoredData: backup.data,
      restoreTime: Date.now(),
      backupTimestamp: backup.timestamp
    };
  }

  private async verifyRestore(restored: any, original: any): Promise<{
    success: boolean;
    eventsMatch: boolean;
    settingsMatch: boolean;
    restoreTime: number;
  }> {
    const eventsMatch = restored.restoredData.events.length === original.events.length;
    const settingsMatch = restored.restoredData.settings.length === original.settings.length;
    
    return {
      success: eventsMatch && settingsMatch,
      eventsMatch,
      settingsMatch,
      restoreTime: restored.restoreTime
    };
  }
}

// Test runner
export async function runBackupTests(): Promise<void> {
  const tester = new MigrationBackupTester();
  const results = await tester.runAllTests();
  
  // Output results
  console.log('\n🏁 Backup Test Results Summary:');
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
export { MigrationBackupTester };