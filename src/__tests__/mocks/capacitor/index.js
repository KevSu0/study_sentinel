/**
 * Capacitor Mocks Index
 * 
 * Exports all Capacitor plugin mocks for easy importing in tests.
 * This file provides a centralized way to access all mocked Capacitor plugins.
 */

const AppMock = require('./app');
const NetworkMock = require('./network');
const StorageMock = require('./storage');
const DeviceMock = require('./device');
const FilesystemMock = require('./filesystem');
const LocalNotificationsMock = require('./local-notifications');

// Export individual mocks
module.exports = {
  App: AppMock,
  Network: NetworkMock,
  Storage: StorageMock,
  Device: DeviceMock,
  Filesystem: FilesystemMock,
  LocalNotifications: LocalNotificationsMock,
};

// Setup function to install all mocks globally
module.exports.setupCapacitorMocks = () => {
  // Mock the global Capacitor object
  global.Capacitor = {
    platform: 'android',
    isNativePlatform: () => true,
    isPluginAvailable: (pluginName) => {
      const availablePlugins = [
        'App', 'Network', 'Storage', 'Device', 
        'Filesystem', 'LocalNotifications'
      ];
      return availablePlugins.includes(pluginName);
    },
    getPlatform: () => 'android',
    convertFileSrc: (filePath) => `capacitor://localhost/_capacitor_file_${filePath}`,
    Plugins: {
      App: AppMock,
      Network: NetworkMock,
      Storage: StorageMock,
      Device: DeviceMock,
      Filesystem: FilesystemMock,
      LocalNotifications: LocalNotificationsMock,
    }
  };
  
  // Mock Capacitor imports for ES6 modules
  jest.doMock('@capacitor/app', () => ({ App: AppMock }));
  jest.doMock('@capacitor/network', () => ({ Network: NetworkMock }));
  jest.doMock('@capacitor/preferences', () => ({ Preferences: StorageMock }));
  jest.doMock('@capacitor/device', () => ({ Device: DeviceMock }));
  jest.doMock('@capacitor/filesystem', () => ({ Filesystem: FilesystemMock }));
  jest.doMock('@capacitor/local-notifications', () => ({ LocalNotifications: LocalNotificationsMock }));
  
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
  StorageMock.__reset();
  DeviceMock.__reset();
  FilesystemMock.__reset();
  LocalNotificationsMock.__reset();
};

// Helper function to get all mock instances
module.exports.getAllMocks = () => ({
  App: AppMock,
  Network: NetworkMock,
  Storage: StorageMock,
  Device: DeviceMock,
  Filesystem: FilesystemMock,
  LocalNotifications: LocalNotificationsMock,
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
  
  // Simulate storage quota exceeded
  storageQuotaExceeded: () => {
    StorageMock.__simulateQuotaExceeded();
  },
  
  // Simulate notification permission denied
  notificationPermissionDenied: () => {
    LocalNotificationsMock.__simulatePermissionDenied();
  },
  
  // Reset all scenarios
  reset: () => {
    module.exports.resetCapacitorMocks();
  }
};

// Auto-setup mocks when this module is imported
module.exports.setupCapacitorMocks();