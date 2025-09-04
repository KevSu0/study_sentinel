import 'fake-indexeddb/auto';
import { jest } from '@jest/globals';

// Mid-range Android device simulation (e.g., Samsung Galaxy A series)
const MID_RANGE_CONFIG = {
  devicePixelRatio: 2.0,
  viewport: { width: 412, height: 892 },
  memory: 1024, // 1GB
  cpuCores: 4,
  networkSpeed: '4g',
  userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

// Configure global environment for mid-range device
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: MID_RANGE_CONFIG.devicePixelRatio
});

// Set viewport dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: MID_RANGE_CONFIG.viewport.width
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: MID_RANGE_CONFIG.viewport.height
});

// Mock memory API with mid-range capacity
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  configurable: true,
  value: 1 // 1GB
});

// Mock hardware concurrency for quad-core
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  configurable: true,
  value: MID_RANGE_CONFIG.cpuCores
});

// Mock connection API for 4G network
Object.defineProperty(navigator, 'connection', {
  writable: true,
  configurable: true,
  value: {
    effectiveType: '4g',
    downlink: 2.5,
    rtt: 150,
    saveData: false
  }
});

// Mock performance API with moderate timings
const originalPerformanceNow = performance.now;
performance.now = jest.fn(() => {
  // Simulate moderate performance with minimal delay
  return originalPerformanceNow() + Math.random() * 3;
});

// Mock requestAnimationFrame with standard frame rate
const originalRAF = window.requestAnimationFrame;
window.requestAnimationFrame = jest.fn((callback) => {
  // Simulate 45fps for mid-range devices
  return setTimeout(callback, 22);
});

// Mock Capacitor for mid-range device
global.Capacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: (filePath: string) => filePath,
  Plugins: {
    Device: {
      getInfo: jest.fn().mockResolvedValue({
        platform: 'android',
        model: 'SM-A515F',
        operatingSystem: 'android',
        osVersion: '11',
        manufacturer: 'Samsung',
        isVirtual: false,
        memUsed: 600000000, // 600MB used
        diskFree: 8000000000, // 8GB free
        diskTotal: 32000000000, // 32GB total
        realDiskFree: 7000000000,
        realDiskTotal: 32000000000
      })
    },
    App: {
      getInfo: jest.fn().mockResolvedValue({
        name: 'Study Sentinel',
        id: 'com.studysentinel.app',
        build: '1.0.0',
        version: '1.0.0'
      })
    },
    Network: {
      getStatus: jest.fn().mockResolvedValue({
        connected: true,
        connectionType: 'cellular',
        networkTechnology: '4g'
      })
    }
  }
};

// Mock localStorage with moderate size constraints
const originalLocalStorage = window.localStorage;
const mockLocalStorage = {
  ...originalLocalStorage,
  setItem: jest.fn((key: string, value: string) => {
    // Simulate storage quota exceeded for very large data
    if (value.length > 200000) { // 200KB limit for mid-range
      throw new Error('QuotaExceededError: Storage quota exceeded');
    }
    return originalLocalStorage.setItem(key, value);
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock battery API for mid-range device
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  configurable: true,
  value: jest.fn().mockResolvedValue({
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 21600, // 6 hours
    level: 0.6 // 60% battery
  })
});

// Set user agent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  configurable: true,
  value: MID_RANGE_CONFIG.userAgent
});

console.log('🔧 Android Mid-Range Device Testing Environment Configured');
console.log(`📱 Device: ${MID_RANGE_CONFIG.viewport.width}x${MID_RANGE_CONFIG.viewport.height}`);
console.log(`💾 Memory: ${MID_RANGE_CONFIG.memory}MB`);
console.log(`⚡ CPU Cores: ${MID_RANGE_CONFIG.cpuCores}`);
console.log(`🌐 Network: ${MID_RANGE_CONFIG.networkSpeed}`);