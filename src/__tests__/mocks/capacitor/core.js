/**
 * Capacitor Core Plugin Mock
 * 
 * Mocks the @capacitor/core module for testing Capacitor functionality
 * in web environment without native dependencies.
 */

const createCapacitorCoreMock = () => {
  const mockCapacitor = {
    platform: 'web',
    isNative: false,
    isPluginAvailable: jest.fn().mockReturnValue(true),
    registerPlugin: jest.fn(),
    convertFileSrc: jest.fn((filePath) => filePath),
    getPlatform: jest.fn().mockReturnValue('web'),
    isNativePlatform: jest.fn().mockReturnValue(false),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  const WebPlugin = class WebPlugin {
    constructor() {
      this.listeners = new Map();
    }

    addListener(eventName, callback) {
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }
      this.listeners.get(eventName).add(callback);
      
      return {
        remove: () => {
          const eventListeners = this.listeners.get(eventName);
          if (eventListeners) {
            eventListeners.delete(callback);
          }
        },
      };
    }

    removeAllListeners() {
      this.listeners.clear();
    }

    notifyListeners(eventName, data) {
      const eventListeners = this.listeners.get(eventName);
      if (eventListeners) {
        eventListeners.forEach(callback => callback(data));
      }
    }
  };

  return {
    Capacitor: mockCapacitor,
    registerPlugin: mockCapacitor.registerPlugin,
    WebPlugin,
    CapacitorException: Error,
  };
};

module.exports = createCapacitorCoreMock();