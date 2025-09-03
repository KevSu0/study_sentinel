/**
 * Mobile Test Factories
 * 
 * Provides factory functions to generate test data and components
 * specifically for mobile and Android testing scenarios.
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { offlineTestHelpers } from '../mocks/offline/offline-state-manager';

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
  wifi: { type: 'online' as const, speed: 1000, latency: 50, reliability: 1 },
  unstable: { type: 'unstable' as const, latency: 1000, reliability: 0.6 },
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