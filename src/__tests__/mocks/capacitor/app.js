/**
 * Capacitor App Plugin Mock
 * 
 * Mocks the @capacitor/app plugin for testing Android app lifecycle events,
 * state changes, and URL handling.
 */

const createAppMock = () => {
  const listeners = new Map();
  
  const mockApp = {
    // App state management
    getState: jest.fn().mockResolvedValue({
      isActive: true,
    }),
    
    // App info
    getInfo: jest.fn().mockResolvedValue({
      name: 'Study Sentinel',
      id: 'com.studysentinel.app',
      build: '1.0.0',
      version: '1.0.0',
    }),
    
    // URL handling
    getLaunchUrl: jest.fn().mockResolvedValue({
      url: 'studysentinel://app/home',
    }),
    
    // Event listeners
    addListener: jest.fn().mockImplementation((eventName, callback) => {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName).add(callback);
      
      return {
        remove: jest.fn().mockImplementation(() => {
          const eventListeners = listeners.get(eventName);
          if (eventListeners) {
            eventListeners.delete(callback);
          }
        }),
      };
    }),
    
    removeAllListeners: jest.fn().mockImplementation(() => {
      listeners.clear();
    }),
    
    // Minimize app (Android specific)
    minimizeApp: jest.fn().mockResolvedValue(undefined),
    
    // Exit app (Android specific)
    exitApp: jest.fn().mockResolvedValue(undefined),
  };
  
  // Helper methods for testing
  mockApp.__triggerEvent = (eventName, data) => {
    const eventListeners = listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  };
  
  mockApp.__getListeners = (eventName) => {
    return listeners.get(eventName) || new Set();
  };
  
  mockApp.__reset = () => {
    listeners.clear();
    jest.clearAllMocks();
  };
  
  return mockApp;
};

module.exports = createAppMock();