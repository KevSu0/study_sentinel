const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Memory optimization settings
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
  
  // Reduce test timeout to prevent hanging
  testTimeout: 10000,
  
  // Force garbage collection
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/jest.setup.ts',
    '<rootDir>/src/hooks/__tests__/setup-stats-tests.js'
  ],
  
  // Only run stats tests
  testMatch: [
    '<rootDir>/src/hooks/__tests__/use-stats.test.tsx'
  ],
  
  // Disable coverage for memory efficiency
  collectCoverage: false,
  
  // Clear cache between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Optimize for memory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-stats',
  
  // Reduce memory usage
  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true
};