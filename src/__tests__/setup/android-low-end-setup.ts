import 'fake-indexeddb/auto';
import { jest } from '@jest/globals';

// Low-end Android device simulation (e.g., Android Go devices)
const LOW_END_CONFIG = {
  devicePixelRatio: 1.5,
  viewport: { width: 360, height: 640 },
  memory: 512, // MB
  cpuCores: 2,
  networkSpeed: 'slow-3g',
  userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-A105F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

// Configure global environment for low-end device
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: LOW_END_CONFIG.devicePixelRatio
});

// Set viewport dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: LOW_END_CONFIG.viewport.width
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: LOW_END_CONFIG.viewport.height
});

// Mock memory API with low-end constraints
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  configurable: true,
  value: 0.5 // 512MB
});

// Mock hardware concurrency for dual-core
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  configurable: true,
  value: LOW_END_CONFIG.cpuCores
});

// Mock connection API for slow network
Object.defineProperty(navigator, 'connection', {
  writable: true,
  configurable: true,
  value: {
    effectiveType: '3g',
    downlink: 0.4,
    rtt: 400,
    saveData: true
  }
});

// Mock performance API with slower timings
const originalPerformanceNow = performance.now;
performance.now = jest.fn(() => {
  // Simulate slower performance by adding random delay
  return originalPerformanceNow() + Math.random() * 10;
});

// Mock requestAnimationFrame with lower frame rate
const originalRAF = window.requestAnimationFrame;
window.requestAnimationFrame = jest.fn((callback) => {
  // Simulate 30fps instead of 60fps for low-end devices
  return setTimeout(callback, 33);
});

// Mock Capacitor for low-end device
global.Capacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: (filePath: string) => filePath,
  Plugins: {
    Device: {
      getInfo: jest.fn().mockResolvedValue({
        platform: 'android',
        model: 'SM-A105F',
        operatingSystem: 'android',
        osVersion: '10',
        manufacturer: 'Samsung',
        isVirtual: false,
        memUsed: 400000000, // 400MB used
        diskFree: 2000000000, // 2GB free
        diskTotal: 8000000000, // 8GB total
        realDiskFree: 1500000000,
        realDiskTotal: 8000000000
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
        networkTechnology: '3g'
      })
    }
  }
};

// Mock localStorage with size constraints
const originalLocalStorage = window.localStorage;
const mockLocalStorage = {
  ...originalLocalStorage,
  setItem: jest.fn((key: string, value: string) => {
    // Simulate storage quota exceeded for large data
    if (value.length > 50000) { // 50KB limit for low-end
      throw new Error('QuotaExceededError: Storage quota exceeded');
    }
    return originalLocalStorage.setItem(key, value);
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock battery API for low-end device
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  configurable: true,
  value: jest.fn().mockResolvedValue({
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 14400, // 4 hours
    level: 0.3 // 30% battery
  })
});

// Set user agent
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  configurable: true,
  value: LOW_END_CONFIG.userAgent
});

console.log('🔧 Android Low-End Device Testing Environment Configured');
console.log(`📱 Device: ${LOW_END_CONFIG.viewport.width}x${LOW_END_CONFIG.viewport.height}`);
console.log(`💾 Memory: ${LOW_END_CONFIG.memory}MB`);
console.log(`⚡ CPU Cores: ${LOW_END_CONFIG.cpuCores}`);
console.log(`🌐 Network: ${LOW_END_CONFIG.networkSpeed}`);