/**
 * Capacitor Storage Plugin Mock
 * 
 * Mocks the @capacitor/storage plugin for testing persistent storage
 * functionality in Android environment.
 */

const createStorageMock = () => {
  // In-memory storage for tests
  const storageMap = new Map();
  
  const mockStorage = {
    // Get a stored item
    get: jest.fn().mockImplementation(({ key }) => {
      return Promise.resolve({
        value: storageMap.has(key) ? storageMap.get(key) : null,
      });
    }),
    
    // Set a storage item
    set: jest.fn().mockImplementation(({ key, value }) => {
      storageMap.set(key, value);
      return Promise.resolve();
    }),
    
    // Remove a storage item
    remove: jest.fn().mockImplementation(({ key }) => {
      storageMap.delete(key);
      return Promise.resolve();
    }),
    
    // Clear all stored items
    clear: jest.fn().mockImplementation(() => {
      storageMap.clear();
      return Promise.resolve();
    }),
    
    // Get all keys
    keys: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        keys: Array.from(storageMap.keys()),
      });
    }),
    
    // Check if key exists
    migrate: jest.fn().mockResolvedValue({ migrated: [] }),
    
    // Configure storage
    configure: jest.fn().mockResolvedValue({}),
  };
  
  // Helper methods for testing
  mockStorage.__getAll = () => {
    const result = {};
    storageMap.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  };
  
  mockStorage.__setAll = (items) => {
    Object.entries(items).forEach(([key, value]) => {
      storageMap.set(key, value);
    });
  };
  
  mockStorage.__reset = () => {
    storageMap.clear();
    jest.clearAllMocks();
  };
  
  // Simulate storage quota exceeded error
  mockStorage.__simulateQuotaExceeded = (shouldExceed = true) => {
    if (shouldExceed) {
      mockStorage.set.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      });
    } else {
      mockStorage.set.mockImplementation(({ key, value }) => {
        storageMap.set(key, value);
        return Promise.resolve();
      });
    }
  };
  
  return mockStorage;
};

module.exports = createStorageMock();