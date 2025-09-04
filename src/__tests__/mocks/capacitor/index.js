/**
 * Capacitor Mocks Index
 * 
 * Exports all Capacitor plugin mocks for easy importing in tests.
 * This file provides a centralized way to access all mocked Capacitor plugins.
 */

const AppMock = require('./app');
const NetworkMock = require('./network');
const DeviceMock = require('./device');
const FilesystemMock = require('./filesystem');
// Note: Storage and LocalNotifications mocks not needed for Capacitor v7

// Export individual mocks
module.exports = {
  App: AppMock,
  Network: NetworkMock,
  Device: DeviceMock,
  Filesystem: FilesystemMock,
};

// Device profile factory function
module.exports.createMockCapacitorDevice = (profile = 'high-end') => {
  const profiles = {
    'high-end': {
      profile: 'high-end',
      memUsed: 2048000000, // 2GB
      diskFree: 8000000000, // 8GB
      batteryLevel: 0.85,
      osVersion: '13'
    },
    'mid-range': {
      profile: 'mid-range',
      memUsed: 1536000000, // 1.5GB
      diskFree: 4000000000, // 4GB
      batteryLevel: 0.70,
      osVersion: '12'
    },
    'low-end': {
      profile: 'low-end',
      memUsed: 1024000000, // 1GB
      diskFree: 2000000000, // 2GB
      batteryLevel: 0.60,
      osVersion: '11'
    }
  };
  
  const config = profiles[profile] || profiles['high-end'];
  
  // Configure device mock with profile settings
  DeviceMock.__setDeviceInfo({
    memUsed: config.memUsed,
    diskFree: config.diskFree,
    osVersion: config.osVersion
  });
  
  DeviceMock.__setBatteryInfo({
    batteryLevel: config.batteryLevel,
    isCharging: false
  });
  
  return {
    ...config,
    mock: DeviceMock
  };
};

// Setup function to install all mocks globally
module.exports.setupCapacitorMocks = () => {
  // Mock the global Capacitor object
  global.Capacitor = {
    platform: 'android',
    isNativePlatform: () => true,
    isPluginAvailable: (pluginName) => {
      const availablePlugins = [
        'App', 'Network', 'Device', 'Filesystem'
      ];
      return availablePlugins.includes(pluginName);
    },
    getPlatform: () => 'android',
    convertFileSrc: (filePath) => `capacitor://localhost/_capacitor_file_${filePath}`,
    Plugins: {
      App: AppMock,
      Network: NetworkMock,
      Device: DeviceMock,
      Filesystem: FilesystemMock,
    }
  };
  
  // Mock Capacitor imports for ES6 modules
  jest.doMock('@capacitor/app', () => ({ App: AppMock }));
  jest.doMock('@capacitor/network', () => ({ Network: NetworkMock }));
  jest.doMock('@capacitor/device', () => ({ Device: DeviceMock }));
  jest.doMock('@capacitor/filesystem', () => ({ Filesystem: FilesystemMock }));
  // Note: @capacitor/local-notifications not installed, skipping mock
  
  // Mock Capacitor core
  jest.doMock('@capacitor/core', () => ({
    Capacitor: global.Capacitor,
    registerPlugin: jest.fn(),
    WebPlugin: class WebPlugin {},
  }));
};

// Reset function to clear all mocks
module.exports.resetCapacitorMocks = () => {
  AppMock.__reset();
  NetworkMock.__reset();
  DeviceMock.__reset();
  FilesystemMock.__reset();
};

// Helper function to get all mock instances
module.exports.getAllMocks = () => ({
  App: AppMock,
  Network: NetworkMock,
  Device: DeviceMock,
  Filesystem: FilesystemMock,
});

// Helper function to simulate common scenarios
module.exports.simulateScenarios = {
  // Simulate app going to background
  appToBackground: () => {
    AppMock.__setState('background');
    AppMock.__triggerStateChange('background');
  },
  
  // Simulate app coming to foreground
  appToForeground: () => {
    AppMock.__setState('active');
    AppMock.__triggerStateChange('active');
  },
  
  // Simulate going offline
  goOffline: () => {
    NetworkMock.__setOffline();
  },
  
  // Simulate coming online
  goOnline: () => {
    NetworkMock.__setOnline();
  },
  
  // Simulate low battery
  lowBattery: () => {
    DeviceMock.__simulateLowBattery();
  },
  
  // Simulate low memory
  lowMemory: () => {
    DeviceMock.__simulateLowMemory();
  },
  
  // Note: Storage and LocalNotifications plugins not available in this Capacitor version
  
  // Reset all scenarios
  reset: () => {
    module.exports.resetCapacitorMocks();
  }
};

// Auto-setup mocks when this module is imported
module.exports.setupCapacitorMocks();