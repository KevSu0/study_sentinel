/**
 * Android Test Utilities
 * 
 * Common utilities and helper functions for Android-specific testing,
 * including touch event simulation, network condition management,
 * and offline mode testing.
 */

import { act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IDBFactory } from 'fake-indexeddb';

// Network condition simulation
export const setNetworkConditions = async (conditions: {
  offline?: boolean;
  latency?: number;
  downloadThroughput?: number;
  uploadThroughput?: number;
}) => {
  if (global.__NETWORK_CONDITIONS) {
    Object.assign(global.__NETWORK_CONDITIONS, conditions);
  }
  
  // Update navigator.onLine status
  if (typeof conditions.offline === 'boolean') {
    Object.defineProperty(navigator, 'onLine', {
      value: !conditions.offline,
      configurable: true,
    });
    
    // Dispatch online/offline events
    const event = new Event(conditions.offline ? 'offline' : 'online');
    window.dispatchEvent(event);
  }
};

// Touch event simulation
export const createTouchEvent = (type: string, x: number, y: number) => {
  const touch = {
    identifier: Date.now(),
    target: document.elementFromPoint(x, y),
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 0,
    force: 1,
  };
  
  const touchList: Touch[] = [touch as unknown as Touch];
  
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: touchList,
    targetTouches: touchList,
    changedTouches: touchList,
  });
};

// Simulate touch interactions
export const simulateTouch = async (element: Element, x: number, y: number) => {
  await act(async () => {
    element.dispatchEvent(createTouchEvent('touchstart', x, y));
    element.dispatchEvent(createTouchEvent('touchend', x, y));
  });
};

// Simulate swipe gesture
export const simulateSwipe = async (
  element: Element,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number = 300
) => {
  await act(async () => {
    element.dispatchEvent(createTouchEvent('touchstart', startX, startY));
    
    // Simulate touch move events
    const steps = Math.floor(duration / 16); // ~60fps
    const dx = (endX - startX) / steps;
    const dy = (endY - startY) / steps;
    
    for (let i = 1; i <= steps; i++) {
      const x = startX + dx * i;
      const y = startY + dy * i;
      element.dispatchEvent(createTouchEvent('touchmove', x, y));
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    
    element.dispatchEvent(createTouchEvent('touchend', endX, endY));
  });
};

// Simulate Android back button
export const simulateBackButton = async () => {
  await act(async () => {
    const event = new Event('backbutton');
    document.dispatchEvent(event);
  });
};

// Mock IndexedDB operations
export const mockIndexedDB = {
  clear: async () => {
    (global as any).indexedDB = new IDBFactory();
  },
  
  simulateQuotaExceeded: () => {
    const originalOpen = indexedDB.open;
    indexedDB.open = jest.fn().mockImplementation((name, version) => {
      const request = originalOpen.call(indexedDB, name, version);
      request.onerror = () => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      };
      return request;
    });
  },
};

// Performance measurement utilities
export const measurePerformance = {
  recordRenderTime: (duration: number) => {
    if (global.__PERFORMANCE_METRICS) {
      global.__PERFORMANCE_METRICS.renderTimes.push(duration);
    }
  },
  
  recordMemoryUsage: () => {
    if (global.__PERFORMANCE_METRICS && performance.memory) {
      global.__PERFORMANCE_METRICS.memoryUsage.push(
        (performance as any).memory.usedJSHeapSize
      );
    }
  },
  
  recordEventHandlingTime: (duration: number) => {
    if (global.__PERFORMANCE_METRICS) {
      global.__PERFORMANCE_METRICS.eventHandlingTimes.push(duration);
    }
  },
};

// Reset all mocks and test environment
export const resetTestEnvironment = () => {
  // Reset network conditions
  setNetworkConditions({ offline: false });
  
  // Reset IndexedDB
  mockIndexedDB.clear('study-sentinel-test');
  
  // Reset performance metrics
  if (global.__PERFORMANCE_METRICS) {
    global.__PERFORMANCE_METRICS.renderTimes = [];
    global.__PERFORMANCE_METRICS.memoryUsage = [];
    global.__PERFORMANCE_METRICS.eventHandlingTimes = [];
  }
  
  // Reset Capacitor mocks
  if (global.__CAPACITOR_PLUGINS_MOCKED) {
    const appMock = require('../mocks/capacitor/app');
    const networkMock = require('../mocks/capacitor/network');
    const storageMock = require('../mocks/capacitor/storage');
    
    appMock.__reset();
    networkMock.__reset();
    storageMock.__reset();
  }
};