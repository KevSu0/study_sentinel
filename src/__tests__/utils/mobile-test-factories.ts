/**
 * Mobile Test Factories
 * 
 * Provides factory functions to generate test data and components
 * specifically for mobile and Android testing scenarios.
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { offlineTestHelpers } from './offline-test-helpers';
import { createMockCapacitorDevice } from '../mocks/capacitor';
import { MobilePerformanceMonitor } from './mobile-performance-framework';

// Mobile viewport configurations
export const MOBILE_VIEWPORTS = {
  android_phone: { width: 360, height: 640, devicePixelRatio: 3 },
  android_tablet: { width: 768, height: 1024, devicePixelRatio: 2 },
  small_phone: { width: 320, height: 568, devicePixelRatio: 2 },
  large_phone: { width: 414, height: 896, devicePixelRatio: 3 },
} as const;

// Touch event configurations
export const TOUCH_EVENTS = {
  tap: { type: 'touchstart', touches: [{ clientX: 100, clientY: 100 }] },
  longPress: { type: 'touchstart', touches: [{ clientX: 100, clientY: 100 }], duration: 1000 },
  swipeLeft: {
    start: { type: 'touchstart', touches: [{ clientX: 200, clientY: 100 }] },
    move: { type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }] },
    end: { type: 'touchend', touches: [] },
  },
  swipeRight: {
    start: { type: 'touchstart', touches: [{ clientX: 50, clientY: 100 }] },
    move: { type: 'touchmove', touches: [{ clientX: 200, clientY: 100 }] },
    end: { type: 'touchend', touches: [] },
  },
  swipeUp: {
    start: { type: 'touchstart', touches: [{ clientX: 100, clientY: 200 }] },
    move: { type: 'touchmove', touches: [{ clientX: 100, clientY: 50 }] },
    end: { type: 'touchend', touches: [] },
  },
  swipeDown: {
    start: { type: 'touchstart', touches: [{ clientX: 100, clientY: 50 }] },
    move: { type: 'touchmove', touches: [{ clientX: 100, clientY: 200 }] },
    end: { type: 'touchend', touches: [] },
  },
  pinchZoom: {
    start: {
      type: 'touchstart',
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ],
    },
    move: {
      type: 'touchmove',
      touches: [
        { clientX: 50, clientY: 50 },
        { clientX: 250, clientY: 250 },
      ],
    },
    end: { type: 'touchend', touches: [] },
  },
} as const;

// Network condition presets
export const NETWORK_CONDITIONS = {
  offline: { type: 'offline' as const },
  slow3g: { type: 'slow' as const, speed: 50, latency: 2000, reliability: 0.8 },
  fast3g: { type: 'slow' as const, speed: 200, latency: 500, reliability: 0.9 },
  '4g': { type: 'online' as const, speed: 400, latency: 100, reliability: 0.95 },
  '5g': { type: 'online' as const, speed: 2000, latency: 20, reliability: 0.98 },
  wifi: { type: 'online' as const, speed: 1000, latency: 50, reliability: 1 },
  unstable: { type: 'unstable' as const, latency: 1000, reliability: 0.6 },
  intermittent: { type: 'intermittent' as const, uptime: 0.7, latency: 800, reliability: 0.5 },
} as const;

// Device configuration factory
export interface MockDeviceConfig {
  platform: 'android' | 'ios';
  model: string;
  osVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  memUsed: number;
  diskFree: number;
  isVirtual: boolean;
}

export const createMockDevice = (overrides: Partial<MockDeviceConfig> = {}): MockDeviceConfig => ({
  platform: 'android',
  model: 'Android SDK built for x86',
  osVersion: '11',
  batteryLevel: 0.85,
  isCharging: false,
  memUsed: 2048000000, // 2GB
  diskFree: 8000000000, // 8GB
  isVirtual: true,
  ...overrides,
});

// Plan data factory for testing
export interface MockPlan {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  isOffline: boolean;
  lastSynced?: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export const createMockPlan = (overrides: Partial<MockPlan> = {}): MockPlan => ({
  id: `plan-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Sample Study Plan',
  description: 'A comprehensive study plan for mobile testing',
  subject: 'Computer Science',
  difficulty: 'intermediate',
  duration: 60, // minutes
  isOffline: false,
  lastSynced: Date.now() - 300000, // 5 minutes ago
  syncStatus: 'synced',
  ...overrides,
});

// Create multiple mock plans
export const createMockPlans = (count: number, overrides: Partial<MockPlan> = {}): MockPlan[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockPlan({
      title: `Study Plan ${index + 1}`,
      id: `plan-${index + 1}`,
      ...overrides,
    })
  );
};

// User data factory
export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    offlineMode: boolean;
  };
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test User',
  email: 'test@example.com',
  preferences: {
    theme: 'light',
    notifications: true,
    offlineMode: false,
  },
  ...overrides,
});

// Mobile render function with viewport setup
export interface MobileRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  viewport?: keyof typeof MOBILE_VIEWPORTS;
  networkCondition?: keyof typeof NETWORK_CONDITIONS;
  deviceConfig?: Partial<MockDeviceConfig>;
  isOffline?: boolean;
}

export const renderMobile = (
  ui: ReactElement,
  options: MobileRenderOptions = {}
) => {
  const {
    viewport = 'android_phone',
    networkCondition = 'wifi',
    deviceConfig = {},
    isOffline = false,
    ...renderOptions
  } = options;

  // Set up viewport
  const viewportConfig = MOBILE_VIEWPORTS[viewport];
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: viewportConfig.width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: viewportConfig.height,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: viewportConfig.devicePixelRatio,
  });

  // Set up network condition
  if (isOffline) {
    offlineTestHelpers.goOffline();
  } else {
    const condition = NETWORK_CONDITIONS[networkCondition];
    offlineTestHelpers.setFastNetwork();
    if (condition.type === 'slow') {
      offlineTestHelpers.setSlowNetwork();
    } else if (condition.type === 'unstable') {
      offlineTestHelpers.setUnstableNetwork();
    }
  }

  // Set up device configuration
  const device = createMockDevice(deviceConfig);
  const { getAllMocks } = require('../mocks/capacitor');
  const mocks = getAllMocks();
  mocks.Device.__setDeviceInfo({
    platform: device.platform,
    model: device.model,
    osVersion: device.osVersion,
    memUsed: device.memUsed,
    diskFree: device.diskFree,
    isVirtual: device.isVirtual,
  });
  mocks.Device.__setBatteryInfo({
    batteryLevel: device.batteryLevel,
    isCharging: device.isCharging,
  });

  return render(ui, renderOptions);
};

// Touch event simulator
export const simulateTouchEvent = (
  element: Element,
  eventType: keyof typeof TOUCH_EVENTS
) => {
  const touchEvent = TOUCH_EVENTS[eventType];
  
  if ('start' in touchEvent) {
    // Complex gesture (swipe, pinch)
    const { start, move, end } = touchEvent;
    
    element.dispatchEvent(new TouchEvent(start.type, {
      touches: start.touches.map(touch => new Touch({
        identifier: 0,
        target: element,
        clientX: touch.clientX,
        clientY: touch.clientY,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1,
      })),
      bubbles: true,
      cancelable: true,
    }));
    
    setTimeout(() => {
      element.dispatchEvent(new TouchEvent(move.type, {
        touches: move.touches.map((touch, index) => new Touch({
          identifier: index,
          target: element,
          clientX: touch.clientX,
          clientY: touch.clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1,
        })),
        bubbles: true,
        cancelable: true,
      }));
    }, 50);
    
    setTimeout(() => {
      element.dispatchEvent(new TouchEvent(end.type, {
        touches: [],
        bubbles: true,
        cancelable: true,
      }));
    }, 100);
  } else {
    // Simple touch event
    const duration = 'duration' in touchEvent ? touchEvent.duration : 0;
    
    element.dispatchEvent(new TouchEvent(touchEvent.type, {
      touches: touchEvent.touches.map((touch, index) => new Touch({
        identifier: index,
        target: element,
        clientX: touch.clientX,
        clientY: touch.clientY,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1,
      })),
      bubbles: true,
      cancelable: true,
    }));
    
    if (duration > 0) {
      setTimeout(() => {
        element.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          bubbles: true,
          cancelable: true,
        }));
      }, duration);
    }
  }
};

// Performance measurement utilities
export const measureMobilePerformance = () => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    finish: () => {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      return {
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        timestamp: Date.now(),
      };
    },
  };
};

// Cleanup function for mobile tests
export const cleanupMobileTest = () => {
  // Reset viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: 1,
  });
  
  // Reset network state
  offlineTestHelpers.reset();
  
  // Reset Capacitor mocks
  const { resetCapacitorMocks } = require('../mocks/capacitor');
  resetCapacitorMocks();
};

// Offline scenario utilities
export interface OfflineScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  networkCondition: keyof typeof NETWORK_CONDITIONS;
  expectedBehavior: string[];
}

export const offlineScenarios = {
  completeOffline: {
    name: 'Complete Offline',
    description: 'Device has no network connectivity',
    setup: async () => {
      offlineTestHelpers.goOffline();
      // Simulate airplane mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    },
    teardown: async () => {
      offlineTestHelpers.goOnline();
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    },
    networkCondition: 'offline' as const,
    expectedBehavior: [
      'Data should be cached locally',
      'Sync queue should accumulate changes',
      'UI should show offline indicators',
      'Critical features should remain functional'
    ]
  },
  
  intermittentConnection: {
    name: 'Intermittent Connection',
    description: 'Network connection drops in and out',
    setup: async () => {
      let isOnline = true;
      const toggleConnection = () => {
        isOnline = !isOnline;
        if (isOnline) {
          offlineTestHelpers.goOnline();
        } else {
          offlineTestHelpers.goOffline();
        }
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: isOnline
        });
      };
      
      // Toggle every 2 seconds
      (global as any).__connectionToggleInterval = setInterval(toggleConnection, 2000);
    },
    teardown: async () => {
      if ((global as any).__connectionToggleInterval) {
        clearInterval((global as any).__connectionToggleInterval);
        delete (global as any).__connectionToggleInterval;
      }
      offlineTestHelpers.goOnline();
    },
    networkCondition: 'intermittent' as const,
    expectedBehavior: [
      'Should handle connection state changes gracefully',
      'Sync should resume when connection is restored',
      'Should not lose data during connection drops',
      'UI should reflect current connection state'
    ]
  },
  
  slowConnection: {
    name: 'Slow Connection',
    description: 'Very slow network with high latency',
    setup: async () => {
      offlineTestHelpers.setSlowNetwork();
      // Mock slow fetch responses
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((...args) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(originalFetch(...args));
          }, 3000); // 3 second delay
        });
      });
    },
    teardown: async () => {
      offlineTestHelpers.setFastNetwork();
      jest.restoreAllMocks();
    },
    networkCondition: 'slow3g' as const,
    expectedBehavior: [
      'Should show loading indicators',
      'Should implement request timeouts',
      'Should prioritize critical requests',
      'Should cache responses aggressively'
    ]
  }
};

// Conflict resolution utilities
export interface ConflictScenario {
  name: string;
  description: string;
  localData: any;
  serverData: any;
  expectedResolution: any;
  resolutionStrategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
}

export const conflictScenarios = {
  planTitleConflict: {
    name: 'Plan Title Conflict',
    description: 'Same plan edited offline and online simultaneously',
    localData: {
      id: 'plan-123',
      title: 'Advanced Mathematics - Local Edit',
      lastModified: Date.now() - 60000, // 1 minute ago
      version: 1
    },
    serverData: {
      id: 'plan-123',
      title: 'Advanced Mathematics - Server Edit',
      lastModified: Date.now() - 30000, // 30 seconds ago
      version: 2
    },
    expectedResolution: {
      id: 'plan-123',
      title: 'Advanced Mathematics - Server Edit', // Server wins (newer)
      lastModified: Date.now() - 30000,
      version: 3,
      conflictResolved: true
    },
    resolutionStrategy: 'server-wins'
  },
  
  planContentMerge: {
    name: 'Plan Content Merge',
    description: 'Different sections of plan edited simultaneously',
    localData: {
      id: 'plan-456',
      title: 'Study Plan',
      sections: {
        introduction: 'Updated intro - local',
        chapter1: 'Original chapter 1',
        chapter2: 'Original chapter 2'
      },
      lastModified: Date.now() - 120000,
      version: 1
    },
    serverData: {
      id: 'plan-456',
      title: 'Study Plan',
      sections: {
        introduction: 'Original intro',
        chapter1: 'Updated chapter 1 - server',
        chapter2: 'Updated chapter 2 - server'
      },
      lastModified: Date.now() - 60000,
      version: 2
    },
    expectedResolution: {
      id: 'plan-456',
      title: 'Study Plan',
      sections: {
        introduction: 'Updated intro - local', // Keep local change
        chapter1: 'Updated chapter 1 - server', // Keep server change
        chapter2: 'Updated chapter 2 - server' // Keep server change
      },
      lastModified: Date.now(),
      version: 3,
      conflictResolved: true,
      mergeStrategy: 'field-level'
    },
    resolutionStrategy: 'merge'
  },
  
  deletionConflict: {
    name: 'Deletion Conflict',
    description: 'Item deleted locally but modified on server',
    localData: {
      id: 'plan-789',
      deleted: true,
      deletedAt: Date.now() - 60000,
      version: 1
    },
    serverData: {
      id: 'plan-789',
      title: 'Updated Plan Title',
      content: 'Updated content',
      lastModified: Date.now() - 30000,
      version: 2
    },
    expectedResolution: {
      id: 'plan-789',
      title: 'Updated Plan Title',
      content: 'Updated content',
      lastModified: Date.now() - 30000,
      version: 3,
      conflictResolved: true,
      restoredFromDeletion: true
    },
    resolutionStrategy: 'server-wins' // Server modification wins over local deletion
  }
};

// Conflict resolution test helpers
export const conflictResolutionHelpers = {
  simulateConflict: async (scenario: ConflictScenario) => {
    // Store local data
    const localStore = await indexedDB.open('test-conflicts', 1);
    const transaction = localStore.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    await store.put(scenario.localData);
    
    // Mock server response with conflicting data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(scenario.serverData)
    });
    
    return {
      localData: scenario.localData,
      serverData: scenario.serverData,
      expectedResolution: scenario.expectedResolution
    };
  },
  
  resolveConflict: (local: any, server: any, strategy: ConflictScenario['resolutionStrategy']) => {
    switch (strategy) {
      case 'client-wins':
        return { ...local, version: (server.version || 0) + 1, conflictResolved: true };
      
      case 'server-wins':
        return { ...server, version: (server.version || 0) + 1, conflictResolved: true };
      
      case 'merge':
        const merged = { ...server };
        // Simple merge strategy - prefer local for specific fields
        if (local.sections && server.sections) {
          merged.sections = { ...server.sections, ...local.sections };
        }
        return { ...merged, version: (server.version || 0) + 1, conflictResolved: true, mergeStrategy: 'field-level' };
      
      case 'manual':
        return {
          ...local,
          ...server,
          conflictResolved: false,
          requiresManualResolution: true,
          conflictData: { local, server }
        };
      
      default:
        return server;
    }
  },
  
  validateResolution: (resolved: any, expected: any) => {
    expect(resolved.conflictResolved).toBe(expected.conflictResolved);
    expect(resolved.version).toBeGreaterThan(Math.max(expected.version - 1, 0));
    
    if (expected.mergeStrategy) {
      expect(resolved.mergeStrategy).toBe(expected.mergeStrategy);
    }
    
    if (expected.restoredFromDeletion) {
      expect(resolved.restoredFromDeletion).toBe(true);
    }
  }
};

// Enhanced performance monitoring with offline scenarios
export const offlinePerformanceHelpers = {
  measureOfflinePerformance: async (testFunction: () => Promise<void>) => {
    const monitor = new MobilePerformanceMonitor();
    monitor.startMonitoring();
    
    const startTime = performance.now();
    await testFunction();
    const endTime = performance.now();
    
    const metrics = monitor.stopMonitoring();
    
    return {
      ...metrics,
      totalDuration: endTime - startTime,
      offlineOptimized: metrics.frameRate > 30 && metrics.touchLatency < 200
    };
  },
  
  measureSyncPerformance: async (syncFunction: () => Promise<void>) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    await syncFunction();
    
    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      syncDuration: endTime - startTime,
      memoryUsed: endMemory - startMemory,
      efficient: (endTime - startTime) < 5000 && (endMemory - startMemory) < 10000000
    };
  }
};