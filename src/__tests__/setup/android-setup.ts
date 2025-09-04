/**
 * Android WebView Testing Environment Setup
 * 
 * This file configures the Jest environment to simulate an Android WebView environment
 * for testing mobile-specific functionality, including touch events, screen dimensions,
 * and Android-specific browser behaviors.
 */

import '@testing-library/jest-dom';

// Configure Android WebView user agent
Object.defineProperty(window.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36',
  configurable: true,
});

// Set up mobile viewport dimensions (Galaxy S10 dimensions)
Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 760, configurable: true });
Object.defineProperty(window.screen, 'width', { value: 360, configurable: true });
Object.defineProperty(window.screen, 'height', { value: 760, configurable: true });
Object.defineProperty(window.screen, 'availWidth', { value: 360, configurable: true });
Object.defineProperty(window.screen, 'availHeight', { value: 760, configurable: true });
Object.defineProperty(window.screen, 'orientation', {
  value: {
    type: 'portrait-primary',
    angle: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  configurable: true,
});

// Mock device pixel ratio for high-density screens
Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });

// Mock touch events for mobile testing
class TouchEvent extends Event {
  touches: TouchList;
  targetTouches: TouchList;
  changedTouches: TouchList;
  
  constructor(type: string, touchEventInit: any = {}) {
    super(type, { bubbles: true, cancelable: true, ...touchEventInit });
    
    // Create mock touch lists
    this.touches = touchEventInit.touches || createEmptyTouchList();
    this.targetTouches = touchEventInit.targetTouches || createEmptyTouchList();
    this.changedTouches = touchEventInit.changedTouches || createEmptyTouchList();
  }
}

function createEmptyTouchList(): TouchList {
  const touchList = [] as unknown as TouchList;
  Object.defineProperty(touchList, 'length', { value: 0 });
  Object.defineProperty(touchList, 'item', { value: (index: number) => null });
  return touchList;
}

// Add TouchEvent to global scope
global.TouchEvent = TouchEvent as any;

// Mock Capacitor global object
global.Capacitor = {
  isNative: true,
  isPluginAvailable: jest.fn().mockImplementation((pluginName) => true),
  convertFileSrc: jest.fn().mockImplementation((path) => `capacitor://localhost/${path}`),
  getPlatform: jest.fn().mockReturnValue('android'),
  registerPlugin: jest.fn().mockImplementation((name) => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    removeAllListeners: jest.fn(),
  })),
};

// Mock network connection status for offline testing
Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

// Mock battery API for mobile testing
Object.defineProperty(navigator, 'getBattery', {
  value: jest.fn().mockResolvedValue({
    charging: true,
    chargingTime: 3600,
    dischargingTime: Infinity,
    level: 0.85,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
  configurable: true,
});

// Mock vibration API
navigator.vibrate = jest.fn().mockReturnValue(true);

// Mock WebView storage quotas
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue({
      quota: 1073741824, // 1GB
      usage: 10485760, // 10MB
      usageDetails: {
        indexedDB: 8388608, // 8MB
        serviceWorkerRegistrations: 1048576, // 1MB
        caches: 1048576, // 1MB
      },
    }),
    persist: jest.fn().mockResolvedValue(true),
    persisted: jest.fn().mockResolvedValue(true),
  },
  configurable: true,
});

// Mock Android back button behavior
const backButtonEvent = new Event('backbutton');
Object.defineProperty(document, 'backbutton', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: () => document.dispatchEvent(backButtonEvent),
  },
  configurable: true,
});

// Mock IndexedDB for offline storage testing
const indexedDB = require('fake-indexeddb');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

// Mock document.elementFromPoint for touch event simulation
if (typeof document.elementFromPoint === 'undefined') {
  document.elementFromPoint = jest.fn().mockReturnValue(document.body);
}

// Mock performance.memory for performance testing
if (typeof performance.memory === 'undefined') {
  (performance as any).memory = {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 5000000,
  };
}

// Set up console message for Android test environment
console.info('Android WebView testing environment initialized successfully');