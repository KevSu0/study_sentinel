/**
 * Capacitor Network Plugin Mock
 * 
 * Mocks the @capacitor/network plugin for testing network connectivity,
 * offline mode, and network status changes in Android environment.
 */

const createNetworkMock = () => {
  const listeners = new Map();
  let currentStatus = {
    connected: true,
    connectionType: 'wifi',
  };
  
  const mockNetwork = {
    // Get current network status
    getStatus: jest.fn().mockImplementation(() => {
      return Promise.resolve(currentStatus);
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
  };
  
  // Helper methods for testing
  mockNetwork.__setNetworkStatus = (connected, connectionType = 'wifi') => {
    const previousStatus = { ...currentStatus };
    currentStatus = { connected, connectionType };
    
    // Update navigator.onLine to match the mock status
    Object.defineProperty(navigator, 'onLine', { value: connected, configurable: true });
    
    // Trigger network status change event
    const eventListeners = listeners.get('networkStatusChange');
    if (eventListeners) {
      eventListeners.forEach(callback => callback(currentStatus));
    }
    
    return previousStatus;
  };
  
  mockNetwork.__setOffline = () => {
    return mockNetwork.__setNetworkStatus(false, 'none');
  };
  
  mockNetwork.__setOnline = (connectionType = 'wifi') => {
    return mockNetwork.__setNetworkStatus(true, connectionType);
  };
  
  mockNetwork.__setConnectionType = (connectionType) => {
    return mockNetwork.__setNetworkStatus(true, connectionType);
  };
  
  mockNetwork.__getListeners = (eventName) => {
    return listeners.get(eventName) || new Set();
  };
  
  mockNetwork.__reset = () => {
    currentStatus = { connected: true, connectionType: 'wifi' };
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    listeners.clear();
    jest.clearAllMocks();
  };
  
  return mockNetwork;
};

module.exports = createNetworkMock();