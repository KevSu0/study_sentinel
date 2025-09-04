const baseConfig = require('./jest.config.android.js');

module.exports = {
  ...baseConfig,
  displayName: 'Android Low-End Device Tests',
  testTimeout: 45000, // Increased timeout for slower devices
  maxWorkers: 1, // Single worker for resource-constrained devices
  
  // Low-end device simulation
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/android-low-end-setup.ts'
  ],
  
  // Memory constraints for low-end devices
  workerIdleMemoryLimit: '256MB',
  
  // Test patterns specific to low-end device scenarios
  testMatch: [
    '<rootDir>/src/__tests__/suites/device-matrix/low-end/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/performance/memory-constrained.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/offline/**/*.test.{js,ts,tsx}'
  ],
  
  // Coverage thresholds adjusted for low-end device testing
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Environment variables for low-end device simulation
  globals: {
    ...baseConfig.globals,
    DEVICE_PROFILE: 'low-end',
    MEMORY_LIMIT: '512MB',
    CPU_CORES: 2,
    NETWORK_SPEED: 'slow-3g'
  }
};