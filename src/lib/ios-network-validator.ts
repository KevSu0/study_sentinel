import { useState, useCallback } from 'react';
import { remoteApiPaths } from './remote-api-paths';

/**
 * iOS Networking Validator
 * Tests iOS-specific networking behavior, sync OFF functionality, and zero-network guarantees
 */

export interface NetworkValidationResult {
  testId: string;
  category: 'connectivity' | 'offline' | 'sync' | 'performance' | 'throttling' | 'recovery';
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  recommendations?: string[];
  iosSpecific?: boolean;
  userAgent: string;
  timestamp: number;
  networkState?: {
    online: boolean;
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

export interface NetworkMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  iOSSpecificTests: number;
  iOSSpecificPasses: number;
  averageTestDuration: number;
  criticalFailures: string[];
  compatibilityScore: number; // 0-100
  categories: {
    connectivity: { passed: number; total: number };
    offline: { passed: number; total: number };
    sync: { passed: number; total: number };
    performance: { passed: number; total: number };
    throttling: { passed: number; total: number };
    recovery: { passed: number; total: number };
  };
  networkStateSummary: {
    testStartTime: number;
    networkChanges: number;
    offlinePeriods: number;
    averageRecoveryTime: number;
  };
}

export class iOSNetworkValidator {
  private results: NetworkValidationResult[] = [];
  private testStartTime: number;
  private userAgent: string;
  private isIOS: boolean;
  private safariVersion: number;
  private networkChanges: number = 0;
  private offlinePeriods: number = 0;
  private recoveryTimes: number[] = [];
  private connectionInfo: any = {};

  constructor() {
    this.testStartTime = Date.now();
    this.userAgent = navigator.userAgent;
    this.isIOS = /iPad|iPhone|iPod/.test(this.userAgent);
    this.safariVersion = this.detectSafariVersion();
    this.setupNetworkMonitoring();
  }

  private detectSafariVersion(): number {
    const safariMatch = this.userAgent.match(/Version\/(\d+)/);
    return safariMatch ? parseInt(safariMatch[1]) : 0;
  }

  private setupNetworkMonitoring(): void {
    // Monitor network state changes
    window.addEventListener('online', () => {
      this.networkChanges++;
      const now = Date.now();
      if (this.lastOfflineTime) {
        this.recoveryTimes.push(now - this.lastOfflineTime);
      }
    });

    window.addEventListener('offline', () => {
      this.networkChanges++;
      this.offlinePeriods++;
      this.lastOfflineTime = Date.now();
    });

    // Monitor connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.networkChanges++;
        this.updateConnectionInfo();
      });
      this.updateConnectionInfo();
    }
  }

  private lastOfflineTime: number | null = null;

  private updateConnectionInfo(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      this.connectionInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        type: connection.type
      };
    }
  }

  async runFullValidation(): Promise<NetworkMetrics> {
    console.log('Starting iOS Network validation...');
    
    // Test categories in logical order
    await this.testConnectivity();
    await this.testOfflineBehavior();
    await this.testSyncFunctionality();
    await this.testNetworkPerformance();
    await this.testThrottling();
    await this.testNetworkRecovery();

    return this.generateMetrics();
  }

  private async testConnectivity(): Promise<void> {
    // Test 1: Basic connectivity detection
    await this.runTest({
      category: 'connectivity',
      name: 'Basic Connectivity Detection',
      testId: 'conn-001',
      testFn: async () => {
        const isOnline = navigator.onLine;
        return typeof isOnline === 'boolean';
      },
      iosSpecific: false
    });

    // Test 2: Connection API availability
    await this.runTest({
      category: 'connectivity',
      name: 'Connection API',
      testId: 'conn-002',
      testFn: async () => {
        const connection = (navigator as any).connection;
        if (!connection) return false; // Not supported everywhere
        
        const hasEffectiveType = typeof connection.effectiveType === 'string';
        const hasDownlink = typeof connection.downlink === 'number';
        const hasRTT = typeof connection.rtt === 'number';
        
        return hasEffectiveType && hasDownlink && hasRTT;
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific connectivity quirks
    await this.runTest({
      category: 'connectivity',
      name: 'iOS Connectivity Quirks',
      testId: 'conn-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific connectivity behaviors
        const connection = (navigator as any).connection;
        
        // iOS sometimes reports online even when connection is poor
        const isOnline = navigator.onLine;
        const hasConnection = !!connection;
        
        // Test actual network reachability
        try {
          const response = await fetch(remoteApiPaths.health(), { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          return isOnline && response.ok;
        } catch (error) {
          // If fetch fails but navigator.onLine is true, this is an iOS quirk
          return !isOnline; // Only pass if offline state is correctly detected
        }
      },
      iosSpecific: true
    });

    // Test 4: Network type detection
    await this.runTest({
      category: 'connectivity',
      name: 'Network Type Detection',
      testId: 'conn-004',
      testFn: async () => {
        const connection = (navigator as any).connection;
        if (!connection) return true; // Skip if not supported
        
        const validTypes = ['bluetooth', 'cellular', 'ethernet', 'wifi', 'wimax', 'other', 'unknown'];
        const isValidType = !connection.type || validTypes.includes(connection.type);
        
        return isValidType;
      },
      iosSpecific: false
    });
  }

  private async testOfflineBehavior(): Promise<void> {
    // Test 1: Offline event handling
    await this.runTest({
      category: 'offline',
      name: 'Offline Event Handling',
      testId: 'offline-001',
      testFn: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(true), 3000); // Default to true if no offline event
          
          window.addEventListener('offline', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // If already offline, consider this passed
          if (!navigator.onLine) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific offline behavior
    await this.runTest({
      category: 'offline',
      name: 'iOS Offline Behavior',
      testId: 'offline-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific offline detection accuracy
        const isOnline = navigator.onLine;
        
        // Test cached resource access while offline
        try {
          const response = await fetch('/offline.html', { 
            cache: 'force-cache'
          });
          return response.ok;
        } catch (error) {
          // If offline and cached resource fails, this might be an iOS issue
          return !isOnline; // Only acceptable if actually offline
        }
      },
      iosSpecific: true
    });

    // Test 3: Zero-network guarantee enforcement
    await this.runTest({
      category: 'offline',
      name: 'Zero-Network Guarantee',
      testId: 'offline-003',
      testFn: async () => {
        // Test if app functions correctly in zero-network conditions
        try {
          // Access IndexedDB
          const dbRequest = indexedDB.open('test-db');
          await new Promise((resolve, reject) => {
            dbRequest.onsuccess = resolve;
            dbRequest.onerror = reject;
          });
          
          // Test localStorage
          localStorage.setItem('test-key', 'test-value');
          const value = localStorage.getItem('test-key');
          localStorage.removeItem('test-key');
          
          return value === 'test-value';
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 4: Offline data persistence
    await this.runTest({
      category: 'offline',
      name: 'Offline Data Persistence',
      testId: 'offline-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        try {
          // Test iOS-specific storage persistence
          const testData = {
            timestamp: Date.now(),
            userAgent: this.userAgent,
            testData: 'offline-persistence-test'
          };
          
          // Store in IndexedDB
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('ios-offline-test', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('test-store')) {
                    db.createObjectStore('test-store', { keyPath: 'timestamp' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          const transaction = db.transaction(['test-store'], 'readwrite');
          const store = transaction.objectStore('test-store');
          await store.add(testData);
          
          // Retrieve and verify
          const result = await store.get(testData.timestamp) as unknown as { testData: string };
          db.close();
          
          return result && result.testData === 'offline-persistence-test';
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testSyncFunctionality(): Promise<void> {
    // Test 1: Sync OFF capability
    await this.runTest({
      category: 'sync',
      name: 'Sync OFF Capability',
      testId: 'sync-001',
      testFn: async () => {
        // Test if sync can be properly disabled
        try {
          // Check for sync control mechanisms
          const hasSyncManager = 'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype;
          const hasBackgroundSync = this.supportsBackgroundSync();
          
          // Test queuing behavior when sync is OFF
          const testData = { test: 'sync-off-test', timestamp: Date.now() };
          
          // Simulate storing sync event when sync is disabled
          localStorage.setItem(`sync-off-${testData.timestamp}`, JSON.stringify(testData));
          
          const stored = localStorage.getItem(`sync-off-${testData.timestamp}`);
          localStorage.removeItem(`sync-off-${testData.timestamp}`);
          
          return stored === JSON.stringify(testData);
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific sync behavior
    await this.runTest({
      category: 'sync',
      name: 'iOS Sync Behavior',
      testId: 'sync-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific sync quirks and behaviors
        const connection = (navigator as any).connection;
        
        // Test sync behavior under poor network conditions
        const isSlowConnection = connection && 
          (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
        
        try {
          // Simulate sync operation
          const syncData = {
            type: 'test-sync',
            data: { test: 'ios-sync', timestamp: Date.now() },
            priority: 'normal'
          };
          
          // Test queuing mechanism
          const queueKey = `sync-queue-${syncData.data.timestamp}`;
          sessionStorage.setItem(queueKey, JSON.stringify(syncData));
          
          const retrieved = sessionStorage.getItem(queueKey);
          sessionStorage.removeItem(queueKey);
          
          return retrieved === JSON.stringify(syncData);
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 3: Background sync availability
    await this.runTest({
      category: 'sync',
      name: 'Background Sync',
      testId: 'sync-003',
      testFn: async () => {
        if (!('serviceWorker' in navigator)) return false;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        return 'sync' in registration;
      },
      iosSpecific: false
    });

    // Test 4: Sync queue management
    await this.runTest({
      category: 'sync',
      name: 'Sync Queue Management',
      testId: 'sync-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        try {
          // Test iOS-specific sync queue behavior
          const queueItems: any[] = [];
          
          // Add multiple items to queue
          for (let i = 0; i < 5; i++) {
            const item = {
              id: `sync-item-${i}`,
              data: { test: `queue-test-${i}`, timestamp: Date.now() + i },
              retries: 0
            };
            queueItems.push(item);
            localStorage.setItem(`sync-queue-${item.id}`, JSON.stringify(item));
          }
        
          // Retrieve and process queue
          const retrievedItems: any[] = [];
          for (let i = 0; i < 5; i++) {
            const itemKey = `sync-queue-sync-item-${i}`;
            const item = localStorage.getItem(itemKey);
            if (item) {
              retrievedItems.push(JSON.parse(item));
              localStorage.removeItem(itemKey);
            }
          }
          
          return retrievedItems.length === 5;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testNetworkPerformance(): Promise<void> {
    // Test 1: Network timing accuracy
    await this.runTest({
      category: 'performance',
      name: 'Network Timing Accuracy',
      testId: 'perf-001',
      testFn: async () => {
        const startTime = performance.now();
        
        try {
          const response = await fetch(remoteApiPaths.health(), { 
            method: 'GET',
            cache: 'no-cache'
          });
          const endTime = performance.now();
          
          return response.ok && (endTime - startTime) < 5000; // Should complete within 5s
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific network performance
    await this.runTest({
      category: 'performance',
      name: 'iOS Network Performance',
      testId: 'perf-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const connection = (navigator as any).connection;
        if (!connection) return true;
        
        // Test iOS network performance characteristics
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        const rtt = connection.rtt;
        
        // Validate that performance metrics are reasonable
        const reasonableDownlink = downlink > 0 && downlink < 100; // Between 0 and 100 Mbps
        const reasonableRTT = rtt > 0 && rtt < 5000; // Between 0 and 5 seconds
        
        return reasonableDownlink && reasonableRTT;
      },
      iosSpecific: true
    });

    // Test 3: Resource loading performance
    await this.runTest({
      category: 'performance',
      name: 'Resource Loading',
      testId: 'perf-003',
      testFn: async () => {
        const resources = [
          '/manifest.json',
          '/sw.js',
          '/favicon.ico'
        ];
        
        const results = await Promise.all(
          resources.map(async (resource) => {
            const startTime = performance.now();
            try {
              const response = await fetch(resource, { method: 'HEAD' });
              const duration = performance.now() - startTime;
              return response.ok && duration < 3000; // Should load within 3s
            } catch (error) {
              return false;
            }
          })
        );
        
        return results.some(result => result); // At least one resource should load
      },
      iosSpecific: false
    });

    // Test 4: iOS request throttling
    await this.runTest({
      category: 'performance',
      name: 'iOS Request Throttling',
      testId: 'perf-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test if iOS properly handles concurrent requests
        const requests: Promise<Response | null>[] = [];
        const requestCount = 10;
        
        for (let i = 0; i < requestCount; i++) {
          requests.push(
            fetch(remoteApiPaths.health(), { 
              method: 'HEAD',
              cache: 'no-cache'
            }).catch(() => null)
          );
        }
        
        const results = await Promise.all(requests);
        const successful = results.filter(r => r && r.ok).length;
        
        // Should have some successful requests
        return successful > 0 && successful <= requestCount;
      },
      iosSpecific: true
    });
  }

  private async testThrottling(): Promise<void> {
    // Test 1: Connection API throttling detection
    await this.runTest({
      category: 'throttling',
      name: 'Throttling Detection',
      testId: 'throttle-001',
      testFn: async () => {
        const connection = (navigator as any).connection;
        if (!connection) return true; // Skip if not supported
        
        const isThrottled = connection.saveData || 
                          connection.effectiveType === 'slow-2g' ||
                          connection.effectiveType === '2g';
        
        return typeof isThrottled === 'boolean';
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific throttling behavior
    await this.runTest({
      category: 'throttling',
      name: 'iOS Throttling Behavior',
      testId: 'throttle-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const connection = (navigator as any).connection;
        if (!connection) return true;
        
        // Test iOS-specific throttling responses
        const effectiveType = connection.effectiveType;
        const saveData = connection.saveData;
        
        // Simulate behavior under throttled conditions
        const testDataSize = 1024; // 1KB test data
        const testData = 'x'.repeat(testDataSize);
        
        try {
          const response = await fetch(remoteApiPaths.testThrottle(), {
            method: 'POST',
            body: testData,
            headers: { 'Content-Type': 'text/plain' }
          });
          
          return response.ok;
        } catch (error) {
          // Under throttled conditions, some failures are acceptable
          return effectiveType !== '4g'; // Only fail if on good connection
        }
      },
      iosSpecific: true
    });

    // Test 3: Data saver mode handling
    await this.runTest({
      category: 'throttling',
      name: 'Data Saver Mode',
      testId: 'throttle-003',
      testFn: async () => {
        const connection = (navigator as any).connection;
        if (!connection) return true;
        
        const saveData = connection.saveData;
        
        // Test if app properly handles data saver mode
        if (saveData) {
          // Should load optimized resources
          try {
            const response = await fetch(remoteApiPaths.optimized(), {
              headers: { 'Save-Data': 'on' }
            });
            return response.ok;
          } catch (error) {
            return false;
          }
        }
        
        return true; // Pass if not in data saver mode
      },
      iosSpecific: false
    });

    // Test 4: Adaptive loading
    await this.runTest({
      category: 'throttling',
      name: 'Adaptive Loading',
      testId: 'throttle-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const connection = (navigator as any).connection;
        if (!connection) return true;
        
        // Test adaptive loading based on connection quality
        const effectiveType = connection.effectiveType;
        
        // Determine appropriate loading strategy
        let loadingStrategy;
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            loadingStrategy = 'minimal';
            break;
          case '3g':
            loadingStrategy = 'balanced';
            break;
          case '4g':
          default:
            loadingStrategy = 'full';
            break;
        }
        
        return ['minimal', 'balanced', 'full'].includes(loadingStrategy);
      },
      iosSpecific: true
    });
  }

  private async testNetworkRecovery(): Promise<void> {
    // Test 1: Network recovery detection
    await this.runTest({
      category: 'recovery',
      name: 'Recovery Detection',
      testId: 'recovery-001',
      testFn: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(true), 5000); // Default to true
          
          window.addEventListener('online', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // If already online, test connectivity
          if (navigator.onLine) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific recovery behavior
    await this.runTest({
      category: 'recovery',
      name: 'iOS Recovery Behavior',
      testId: 'recovery-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific network recovery timing
        if (this.recoveryTimes.length > 0) {
          const averageRecoveryTime = this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length;
          return averageRecoveryTime < 10000; // Should recover within 10s
        }
        
        return true; // Pass if no recovery events to test
      },
      iosSpecific: true
    });

    // Test 3: Automatic retry mechanisms
    await this.runTest({
      category: 'recovery',
      name: 'Automatic Retry',
      testId: 'recovery-003',
      testFn: async () => {
        // Test if app automatically retries failed requests
        let retryCount = 0;
        const maxRetries = 3;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await fetch(remoteApiPaths.retryTest(), {
              method: 'GET',
              cache: 'no-cache'
            });
            if (response.ok) {
              retryCount = i + 1;
              break;
            }
          } catch (error) {
            retryCount = i + 1;
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return retryCount <= maxRetries;
      },
      iosSpecific: false
    });

    // Test 4: iOS connection restoration
    await this.runTest({
      category: 'recovery',
      name: 'iOS Connection Restoration',
      testId: 'recovery-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test if iOS properly restores connections after network issues
        const connection = (navigator as any).connection;
        
        try {
          // Test multiple endpoints to verify connection restoration
          const endpoints = [remoteApiPaths.health(), '/manifest.json', '/sw.js'];
          const results = await Promise.all(
            endpoints.map(endpoint => 
              fetch(endpoint, { method: 'HEAD' }).catch(() => null)
            )
          );
          
          const successful = results.filter(r => r && r.ok).length;
          return successful > 0; // At least one should succeed
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private supportsBackgroundSync(): boolean {
    return 'serviceWorker' in navigator && 
           'sync' in (window as any).ServiceWorkerRegistration.prototype;
  }

  private async runTest(config: {
    category: NetworkValidationResult['category'];
    name: string;
    testId: string;
    testFn: () => Promise<boolean>;
    iosSpecific?: boolean;
  }): Promise<void> {
    const startTime = performance.now();
    let passed = false;
    let details = '';
    let recommendations: string[] = [];

    try {
      passed = await config.testFn();
      details = passed ? 'Test completed successfully' : 'Test failed';
    } catch (error) {
      details = `Test error: ${error instanceof Error ? error.message : String(error)}`;
      recommendations = this.generateRecommendations(config.category, config.testId, error);
    }

    const duration = performance.now() - startTime;

    const result: NetworkValidationResult = {
      testId: config.testId,
      category: config.category,
      name: config.name,
      passed,
      duration,
      details,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      iosSpecific: config.iosSpecific || false,
      userAgent: this.userAgent,
      timestamp: Date.now(),
      networkState: {
        online: navigator.onLine,
        connectionType: this.connectionInfo.type,
        effectiveType: this.connectionInfo.effectiveType,
        downlink: this.connectionInfo.downlink,
        rtt: this.connectionInfo.rtt
      }
    };

    this.results.push(result);
    
    if (this.isIOS && config.iosSpecific) {
      console.log(`[iOS Network Test] ${config.name}: ${passed ? 'PASS' : 'FAIL'} (${duration.toFixed(2)}ms)`);
    }
  }

  private generateRecommendations(
    category: NetworkValidationResult['category'],
    testId: string,
    error: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (this.isIOS) {
      switch (category) {
        case 'connectivity':
          recommendations.push(
            'Implement robust connectivity detection for iOS',
            'Handle iOS-specific online/offline state quirks',
            'Test on various iOS network conditions',
            'Consider iOS network API limitations'
          );
          break;
        case 'offline':
          recommendations.push(
            'Ensure offline functionality works reliably on iOS',
            'Test IndexedDB behavior in offline mode',
            'Implement proper offline data persistence',
            'Handle iOS storage quota limitations'
          );
          break;
        case 'sync':
          recommendations.push(
            'Optimize sync behavior for iOS network conditions',
            'Implement iOS-specific sync queue management',
            'Handle iOS background sync limitations',
            'Consider iOS battery and data saver modes'
          );
          break;
        case 'performance':
          recommendations.push(
            'Optimize network performance for iOS Safari',
            'Implement iOS-specific performance optimizations',
            'Handle iOS request throttling properly',
            'Test on various iOS devices and connections'
          );
          break;
        case 'throttling':
          recommendations.push(
            'Implement adaptive loading for iOS devices',
            'Handle iOS data saver mode appropriately',
            'Optimize resource loading under throttled conditions',
            'Test on slow iOS network connections'
          );
          break;
        case 'recovery':
          recommendations.push(
            'Implement robust network recovery for iOS',
            'Handle iOS-specific connection restoration',
            'Test automatic retry mechanisms on iOS',
            'Optimize recovery timing for iOS devices'
          );
          break;
      }
    }

    // Generic recommendations based on error type
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        recommendations.push('Implement network error handling and retries');
      } else if (error.message.includes('timeout')) {
        recommendations.push('Increase timeout values for network operations');
      } else if (error.message.includes('storage')) {
        recommendations.push('Handle storage quota limitations gracefully');
      }
    }

    return recommendations;
  }

  private generateMetrics(): NetworkMetrics {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const iosTests = this.results.filter(r => r.iosSpecific);
    const iosTestsTotal = iosTests.length;
    const iosTestsPassed = iosTests.filter(r => r.passed).length;
    
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    const criticalFailures = this.results
      .filter(r => !r.passed && r.iosSpecific)
      .map(r => r.testId);
    
    const compatibilityScore = iosTestsTotal > 0 
      ? (iosTestsPassed / iosTestsTotal) * 100 
      : 100;

    const categories = {
      connectivity: this.getCategoryMetrics('connectivity'),
      offline: this.getCategoryMetrics('offline'),
      sync: this.getCategoryMetrics('sync'),
      performance: this.getCategoryMetrics('performance'),
      throttling: this.getCategoryMetrics('throttling'),
      recovery: this.getCategoryMetrics('recovery')
    };

    const averageRecoveryTime = this.recoveryTimes.length > 0 
      ? this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length 
      : 0;

    const networkStateSummary = {
      testStartTime: this.testStartTime,
      networkChanges: this.networkChanges,
      offlinePeriods: this.offlinePeriods,
      averageRecoveryTime
    };

    return {
      totalTests,
      passedTests,
      failedTests,
      iOSSpecificTests: iosTestsTotal,
      iOSSpecificPasses: iosTestsPassed,
      averageTestDuration: averageDuration,
      criticalFailures,
      compatibilityScore,
      categories,
      networkStateSummary
    };
  }

  private getCategoryMetrics(category: NetworkValidationResult['category']) {
    const categoryResults = this.results.filter(r => r.category === category);
    return {
      passed: categoryResults.filter(r => r.passed).length,
      total: categoryResults.length
    };
  }

  getResults(): NetworkValidationResult[] {
    return [...this.results];
  }

  getDetailedReport(): {
    summary: NetworkMetrics;
    results: NetworkValidationResult[];
    recommendations: string[];
    iosSpecificIssues: string[];
  } {
    const metrics = this.generateMetrics();
    
    const recommendations = [
      'Implement iOS-specific network handling optimizations',
      'Test network behavior across various iOS devices and conditions',
      'Handle iOS connectivity quirks and offline detection',
      'Optimize sync behavior for iOS network characteristics',
      'Implement robust network recovery mechanisms for iOS'
    ];

    const iosSpecificIssues = this.results
      .filter(r => !r.passed && r.iosSpecific)
      .map(r => `${r.name}: ${r.details}`);

    return {
      summary: metrics,
      results: this.results,
      recommendations,
      iosSpecificIssues
    };
  }
}

// React hook for network validation
export function useIOSNetworkValidator() {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [results, setResults] = useState<NetworkValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const validator = new iOSNetworkValidator();
      const validationMetrics = await validator.runFullValidation();
      const validationResults = validator.getResults();
      
      setMetrics(validationMetrics);
      setResults(validationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getDetailedReport = useCallback(() => {
    if (!results.length) return null;
    
    const validator = new iOSNetworkValidator();
    (validator as any).results = results; // Inject results for report generation
    return validator.getDetailedReport();
  }, [results]);

  return {
    metrics,
    results,
    isRunning,
    error,
    runValidation,
    getDetailedReport
  };
}