import 'fake-indexeddb/auto';
import { jest } from '@jest/globals';

// High-end Android device simulation (e.g., Samsung Galaxy S series, Google Pixel)
const HIGH_END_CONFIG = {
  devicePixelRatio: 3.0,
  viewport: { width: 412, height: 915 },
  memory: 2048, // 2GB+
  cpuCores: 8,
  networkSpeed: '5g',
  userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

// Configure global environment for high-end device
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: HIGH_END_CONFIG.devicePixelRatio
});

// Set viewport dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: HIGH_END_CONFIG.viewport.width
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: HIGH_END_CONFIG.viewport.height
});

// Mock memory API with high-end capacity
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  configurable: true,
  value: 2 // 2GB+
});

// Mock hardware concurrency for octa-core
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  configurable: true,
  value: HIGH_END_CONFIG.cpuCores
});

// Mock connection API for 5G network
Object.defineProperty(navigator, 'connection', {
  writable: true,
  configurable: true,
  value: {
    effectiveType: '5g',
    downlink: 10.0,
    rtt: 50,
    saveData: false
  }
});

// Mock performance API with optimal timings
const originalPerformanceNow = performance.now;
performance.now = jest.fn(() => {
  // Simulate high performance with minimal delay
  return originalPerformanceNow() + Math.random() * 1;
});

// Mock requestAnimationFrame with high frame rate
const originalRAF = window.requestAnimationFrame;
window.requestAnimationFrame = jest.fn((callback) => {
  // Simulate 60fps for high-end devices
  return setTimeout(callback, 16);
});

// Mock Capacitor for high-end device
global.Capacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: (filePath: string) => filePath,
  Plugins: {
    Device: {
      getInfo: jest.fn().mockResolvedValue({
        platform: 'android',
        model: 'SM-G991B',
        operatingSystem: 'android',
        osVersion: '12',
        manufacturer: 'Samsung',
        isVirtual: false,
        memUsed: 1200000000, // 1.2GB used
        diskFree: 50000000000, // 50GB free
        diskTotal: 128000000000, // 128GB total
        realDiskFree: 45000000000,
        realDiskTotal: 128000000000
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
        networkTechnology: '5g'
      })
    }
  }
};

// Mock localStorage with generous size limits
const originalLocalStorage = window.localStorage;
const mockLocalStorage = {
  ...originalLocalStorage,
  setItem: jest.fn((key: string, value: string) => {
    // Simulate storage quota exceeded only for extremely large data
    if (value.length > 1000000) { // 1MB limit for high-end
      throw new Error('QuotaExceededError: Storage quota exceeded');
    }
    return originalLocalStorage.setItem(key, value);
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock battery API for high-end device
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  configurable: true,
  value: jest.fn().mockResolvedValue({
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 36000, // 10 hours
    level: 0.8 // 80% battery
  })
});

// Set user agent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  configurable: true,
  value: HIGH_END_CONFIG.userAgent
});

console.log('🔧 Android High-End Device Testing Environment Configured');
console.log(`📱 Device: ${HIGH_END_CONFIG.viewport.width}x${HIGH_END_CONFIG.viewport.height}`);
console.log(`💾 Memory: ${HIGH_END_CONFIG.memory}MB`);
console.log(`⚡ CPU Cores: ${HIGH_END_CONFIG.cpuCores}`);
console.log(`🌐 Network: ${HIGH_END_CONFIG.networkSpeed}`);