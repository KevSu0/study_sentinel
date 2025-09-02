// Setup file for stats tests to handle memory cleanup

// Force garbage collection after each test if available
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear any remaining async operations
  return new Promise(resolve => {
    setImmediate(() => {
      resolve();
    });
  });
});

// Set up memory monitoring
beforeAll(() => {
  // Set Node.js memory limits
  if (process.env.NODE_OPTIONS && !process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
    console.warn('Consider setting NODE_OPTIONS="--max-old-space-size=4096" for better memory management');
  }
});

// Clean up after all tests
afterAll(() => {
  // Final cleanup
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  if (global.gc) {
    global.gc();
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});