import { useState, useCallback } from 'react';

/**
 * iOS Service Worker Lifecycle Validator
 * Tests service worker update flow, navigateFallback, and iOS-specific SW behaviors
 */

export interface SWLifecycleValidationResult {
  testId: string;
  category: 'registration' | 'update' | 'lifecycle' | 'navigate' | 'fallback' | 'cleanup';
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  recommendations?: string[];
  iosSpecific?: boolean;
  userAgent: string;
  timestamp: number;
}

export interface SWLifecycleMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  iOSSpecificTests: number;
  iOSSpecificPasses: number;
  averageTestDuration: number;
  criticalFailures: string[];
  compatibilityScore: number; // 0-100
  categories: {
    registration: { passed: number; total: number };
    update: { passed: number; total: number };
    lifecycle: { passed: number; total: number };
    navigate: { passed: number; total: number };
    fallback: { passed: number; total: number };
    cleanup: { passed: number; total: number };
  };
}

export class iOSLifecycleValidator {
  private results: SWLifecycleValidationResult[] = [];
  private testStartTime: number;
  private userAgent: string;
  private isIOS: boolean;
  private safariVersion: number;
  private supportsServiceWorkers: boolean;
  private supportsBackgroundSync: boolean;
  private supportsNavigationPreload: boolean;

  constructor() {
    this.testStartTime = Date.now();
    this.userAgent = navigator.userAgent;
    this.isIOS = /iPad|iPhone|iPod/.test(this.userAgent);
    this.safariVersion = this.detectSafariVersion();
    this.supportsServiceWorkers = 'serviceWorker' in navigator;
    this.supportsBackgroundSync = 'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype;
    this.supportsNavigationPreload = 'serviceWorker' in navigator && 'navigationPreload' in (window as any).ServiceWorkerRegistration.prototype;
  }

  private detectSafariVersion(): number {
    const safariMatch = this.userAgent.match(/Version\/(\d+)/);
    return safariMatch ? parseInt(safariMatch[1]) : 0;
  }

  async runFullValidation(): Promise<SWLifecycleMetrics> {
    console.log('Starting iOS Service Worker Lifecycle validation...');
    
    // Test categories in logical order
    await this.testRegistration();
    await this.testUpdateFlow();
    await this.testLifecycleEvents();
    await this.testNavigationHandling();
    await this.testNavigateFallback();
    await this.testCleanup();

    return this.generateMetrics();
  }

  private async testRegistration(): Promise<void> {
    // Test 1: Basic service worker registration
    await this.runTest({
      category: 'registration',
      name: 'Basic SW Registration',
      testId: 'reg-001',
      testFn: async () => {
        if (!this.supportsServiceWorkers) {
          throw new Error('Service Workers not supported');
        }
        
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      },
      iosSpecific: false
    });

    // Test 2: SW registration scope validation
    await this.runTest({
      category: 'registration',
      name: 'Registration Scope Validation',
      testId: 'reg-002',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        const expectedScope = new URL('/', window.location.href).href;
        return registration.scope === expectedScope;
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific registration timing
    await this.runTest({
      category: 'registration',
      name: 'iOS Registration Timing',
      testId: 'reg-003',
      testFn: async () => {
        if (!this.isIOS) return true; // Skip on non-iOS
        
        const startTime = performance.now();
        try {
          await navigator.serviceWorker.ready;
          const duration = performance.now() - startTime;
          return duration < 3000; // Should register within 3s on iOS
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 4: Multiple tab registration
    await this.runTest({
      category: 'registration',
      name: 'Multi-tab Registration',
      testId: 'reg-004',
      testFn: async () => {
        try {
          // Simulate multiple tabs by checking active workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          return registrations.length <= 1; // Should have at most one registration
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testUpdateFlow(): Promise<void> {
    // Test 1: Update availability detection
    await this.runTest({
      category: 'update',
      name: 'Update Detection',
      testId: 'update-001',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        // Check if update method exists and is callable
        return typeof registration.update === 'function';
      },
      iosSpecific: false
    });

    // Test 2: Update process execution
    await this.runTest({
      category: 'update',
      name: 'Update Process Execution',
      testId: 'update-002',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        try {
          await registration.update();
          return true;
        } catch (error) {
          console.warn('Update process failed:', error);
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific update timing
    await this.runTest({
      category: 'update',
      name: 'iOS Update Timing',
      testId: 'update-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        const startTime = performance.now();
        try {
          await registration.update();
          const duration = performance.now() - startTime;
          return duration < 5000; // Updates should complete within 5s
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 4: Skip waiting behavior
    await this.runTest({
      category: 'update',
      name: 'Skip Waiting Behavior',
      testId: 'update-004',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration || !registration.installing) return true; // No installing worker
        
        // Test if the installing worker can be forced to skip waiting
        try {
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);
            
            registration.installing?.postMessage({ type: 'SKIP_WAITING' });
            
            registration.installing?.addEventListener('statechange', () => {
              if (registration.installing?.state === 'activated') {
                clearTimeout(timeout);
                resolve(true);
              }
            });
          });
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testLifecycleEvents(): Promise<void> {
    // Test 1: Controller change handling
    await this.runTest({
      category: 'lifecycle',
      name: 'Controller Change Handling',
      testId: 'life-001',
      testFn: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          
          const controller = navigator.serviceWorker.controller;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // If we already have a controller, consider this passed
          if (controller) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      },
      iosSpecific: false
    });

    // Test 2: Message passing to SW
    await this.runTest({
      category: 'lifecycle',
      name: 'Message Passing',
      testId: 'life-002',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.active) return false;
        
        try {
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);
            
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'pong') {
                clearTimeout(timeout);
                resolve(true);
              }
            };
            
            registration.active?.postMessage({ type: 'ping' }, [messageChannel.port2]);
          });
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific lifecycle timing
    await this.runTest({
      category: 'lifecycle',
      name: 'iOS Lifecycle Timing',
      testId: 'life-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        // Test installation timing
        if (registration.installing) {
          const startTime = performance.now();
          await new Promise((resolve) => {
            registration.installing?.addEventListener('statechange', () => {
              if (registration.installing?.state === 'installed' || 
                  registration.installing?.state === 'activated') {
                resolve(true);
              }
            });
          });
          const duration = performance.now() - startTime;
          return duration < 3000; // Should install within 3s
        }
        
        return true;
      },
      iosSpecific: true
    });

    // Test 4: Service worker state persistence
    await this.runTest({
      category: 'lifecycle',
      name: 'State Persistence',
      testId: 'life-004',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        // Test if worker maintains state across page reloads
        try {
          registration.active?.postMessage({ type: 'SET_STATE', key: 'test', value: Date.now() });
          
          // Simulate page reload by checking state after a delay
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);
            
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'GET_STATE_RESPONSE') {
                clearTimeout(timeout);
                resolve(true);
              }
            };
            
            registration.active?.postMessage({ type: 'GET_STATE', key: 'test' }, [messageChannel.port2]);
          });
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testNavigationHandling(): Promise<void> {
    // Test 1: Navigation preload availability
    await this.runTest({
      category: 'navigate',
      name: 'Navigation Preload',
      testId: 'nav-001',
      testFn: async () => {
        if (!this.supportsNavigationPreload) return false;
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        try {
          const state = await registration.navigationPreload.getState();
          return state.enabled !== undefined;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 2: Navigation event handling
    await this.runTest({
      category: 'navigate',
      name: 'Navigation Event Handling',
      testId: 'nav-002',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.active) return false;
        
        try {
          // Test if service worker can handle navigation events
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);
            
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'NAV_HANDLING_CAPABLE') {
                clearTimeout(timeout);
                resolve(true);
              }
            };
            
            registration.active?.postMessage({ type: 'TEST_NAV_HANDLING' }, [messageChannel.port2]);
          });
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific navigation performance
    await this.runTest({
      category: 'navigate',
      name: 'iOS Navigation Performance',
      testId: 'nav-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const startTime = performance.now();
        
        // Navigate to a test route and measure timing
        try {
          const testUrl = new URL('/test-nav', window.location.href).href;
          const response = await fetch(testUrl);
          const duration = performance.now() - startTime;
          
          return duration < 2000 && response.ok; // Should complete within 2s
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 4: Offline navigation
    await this.runTest({
      category: 'navigate',
      name: 'Offline Navigation',
      testId: 'nav-004',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        try {
          // Test offline navigation to cached routes
          const offlineUrl = new URL('/offline', window.location.href).href;
          const response = await fetch(offlineUrl, { headers: { 'Service-Worker': 'test' } });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });
  }

  private async testNavigateFallback(): Promise<void> {
    // Test 1: Fallback navigation detection
    await this.runTest({
      category: 'fallback',
      name: 'Fallback Detection',
      testId: 'fallback-001',
      testFn: async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return false;
        
        try {
          // Test if service worker can detect when to use fallback
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);
            
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'FALLBACK_CAPABLE') {
                clearTimeout(timeout);
                resolve(true);
              }
            };
            
            registration.active?.postMessage({ type: 'TEST_FALLBACK' }, [messageChannel.port2]);
          });
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 2: iOS-specific navigateFallback behavior
    await this.runTest({
      category: 'fallback',
      name: 'iOS navigateFallback',
      testId: 'fallback-002',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        // Test iOS-specific fallback behavior
        const startTime = performance.now();
        
        try {
          // Simulate a failed navigation and test fallback
          const fallbackUrl = new URL('/offline.html', window.location.href).href;
          const response = await fetch(fallbackUrl);
          const duration = performance.now() - startTime;
          
          return duration < 1500 && response.ok; // Should fallback within 1.5s
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 3: Fallback content availability
    await this.runTest({
      category: 'fallback',
      name: 'Fallback Content Availability',
      testId: 'fallback-003',
      testFn: async () => {
        const fallbackResources = [
          '/offline.html',
          '/manifest.json',
          '/sw.js'
        ];
        
        const results = await Promise.all(
          fallbackResources.map(async (resource) => {
            try {
              const response = await fetch(resource);
              return response.ok;
            } catch (error) {
              return false;
            }
          })
        );
        
        return results.every(result => result);
      },
      iosSpecific: false
    });

    // Test 4: Fallback user experience
    await this.runTest({
      category: 'fallback',
      name: 'Fallback UX',
      testId: 'fallback-004',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        try {
          // Test if fallback page provides good UX
          const response = await fetch('/offline.html');
          if (!response.ok) return false;
          
          const html = await response.text();
          return html.includes('offline') && html.length > 1000; // Has meaningful content
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });
  }

  private async testCleanup(): Promise<void> {
    // Test 1: Service worker unregistration
    await this.runTest({
      category: 'cleanup',
      name: 'SW Unregistration',
      testId: 'cleanup-001',
      testFn: async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
          
          // Verify unregistration
          const remaining = await navigator.serviceWorker.getRegistrations();
          return remaining.length === 0;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 2: Cache cleanup
    await this.runTest({
      category: 'cleanup',
      name: 'Cache Cleanup',
      testId: 'cleanup-002',
      testFn: async () => {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
          
          // Verify cleanup
          const remaining = await caches.keys();
          return remaining.length === 0;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });

    // Test 3: iOS-specific cleanup timing
    await this.runTest({
      category: 'cleanup',
      name: 'iOS Cleanup Timing',
      testId: 'cleanup-003',
      testFn: async () => {
        if (!this.isIOS) return true;
        
        const startTime = performance.now();
        
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          
          const duration = performance.now() - startTime;
          return duration < 2000; // Should cleanup within 2s
        } catch (error) {
          return false;
        }
      },
      iosSpecific: true
    });

    // Test 4: Post-cleanup state
    await this.runTest({
      category: 'cleanup',
      name: 'Post-Cleanup State',
      testId: 'cleanup-004',
      testFn: async () => {
        try {
          // Verify clean state after cleanup
          const hasSW = 'serviceWorker' in navigator;
          const hasController = navigator.serviceWorker.controller !== null;
          const hasCaches = 'caches' in window;
          
          // After cleanup, should still have APIs but no active instances
          return hasSW && !hasController && hasCaches;
        } catch (error) {
          return false;
        }
      },
      iosSpecific: false
    });
  }

  private async runTest(config: {
    category: SWLifecycleValidationResult['category'];
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

    const result: SWLifecycleValidationResult = {
      testId: config.testId,
      category: config.category,
      name: config.name,
      passed,
      duration,
      details,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      iosSpecific: config.iosSpecific || false,
      userAgent: this.userAgent,
      timestamp: Date.now()
    };

    this.results.push(result);
    
    if (this.isIOS && config.iosSpecific) {
      console.log(`[iOS SW Test] ${config.name}: ${passed ? 'PASS' : 'FAIL'} (${duration.toFixed(2)}ms)`);
    }
  }

  private generateRecommendations(
    category: SWLifecycleValidationResult['category'],
    testId: string,
    error: unknown
  ): string[] {
    const recommendations: string[] = [];

    if (this.isIOS) {
      switch (category) {
        case 'registration':
          recommendations.push(
            'Ensure service worker scope is correctly configured for iOS',
            'Consider using relative paths for service worker registration',
            'Test registration in both Safari and Chrome on iOS'
          );
          break;
        case 'update':
          recommendations.push(
            'Implement graceful update fallback for iOS',
            'Consider longer timeout periods for iOS updates',
            'Test update flow on various iOS versions'
          );
          break;
        case 'lifecycle':
          recommendations.push(
            'Handle iOS-specific service worker lifecycle timing',
            'Implement state persistence mechanisms',
            'Consider iOS memory constraints in lifecycle management'
          );
          break;
        case 'navigate':
          recommendations.push(
            'Optimize navigation performance for iOS',
            'Implement offline navigation fallbacks',
            'Consider iOS navigation timing differences'
          );
          break;
        case 'fallback':
          recommendations.push(
            'Ensure fallback pages work well on iOS Safari',
            'Test fallback behavior in various network conditions',
            'Provide clear user feedback during fallback navigation'
          );
          break;
        case 'cleanup':
          recommendations.push(
            'Implement proper cleanup procedures for iOS',
            'Consider iOS storage constraints in cleanup operations',
            'Test cleanup doesn\'t affect app functionality'
          );
          break;
      }
    }

    // Generic recommendations based on error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        recommendations.push('Increase timeout values for operations');
      } else if (error.message.includes('network')) {
        recommendations.push('Implement network error handling and retries');
      } else if (error.message.includes('storage')) {
        recommendations.push('Handle storage quota limitations gracefully');
      }
    }

    return recommendations;
  }

  private generateMetrics(): SWLifecycleMetrics {
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
      registration: this.getCategoryMetrics('registration'),
      update: this.getCategoryMetrics('update'),
      lifecycle: this.getCategoryMetrics('lifecycle'),
      navigate: this.getCategoryMetrics('navigate'),
      fallback: this.getCategoryMetrics('fallback'),
      cleanup: this.getCategoryMetrics('cleanup')
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
      categories
    };
  }

  private getCategoryMetrics(category: SWLifecycleValidationResult['category']) {
    const categoryResults = this.results.filter(r => r.category === category);
    return {
      passed: categoryResults.filter(r => r.passed).length,
      total: categoryResults.length
    };
  }

  getResults(): SWLifecycleValidationResult[] {
    return [...this.results];
  }

  getDetailedReport(): {
    summary: SWLifecycleMetrics;
    results: SWLifecycleValidationResult[];
    recommendations: string[];
    iosSpecificIssues: string[];
  } {
    const metrics = this.generateMetrics();
    
    const recommendations = [
      'Implement iOS-specific service worker optimizations',
      'Add comprehensive error handling for iOS edge cases',
      'Test on multiple iOS versions and devices',
      'Consider iOS memory and storage limitations',
      'Implement graceful degradation for unsupported features'
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

// React hook for SW lifecycle validation
export function useIOSLifecycleValidator() {
  const [metrics, setMetrics] = useState<SWLifecycleMetrics | null>(null);
  const [results, setResults] = useState<SWLifecycleValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const validator = new iOSLifecycleValidator();
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
    
    const validator = new iOSLifecycleValidator();
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