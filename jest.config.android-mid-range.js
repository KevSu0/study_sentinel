const baseConfig = require('./jest.config.android.js');

module.exports = {
  ...baseConfig,
  displayName: 'Android Mid-Range Device Tests',
  testTimeout: 30000, // Standard timeout for mid-range devices
  maxWorkers: 2, // Dual workers for balanced performance
  
  // Mid-range device simulation
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/android-mid-range-setup.ts'
  ],
  
  // Memory allocation for mid-range devices
  workerIdleMemoryLimit: '512MB',
  
  // Test patterns for mid-range device scenarios
  testMatch: [
    '<rootDir>/src/__tests__/suites/device-matrix/mid-range/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/performance/balanced.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/sync-queue-management.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/data-persistence.test.{js,ts,tsx}'
  ],
  
  // Coverage thresholds for mid-range testing
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Environment variables for mid-range device simulation
  globals: {
    ...baseConfig.globals,
    DEVICE_PROFILE: 'mid-range',
    MEMORY_LIMIT: '1GB',
    CPU_CORES: 4,
    NETWORK_SPEED: '4g'
  }
};