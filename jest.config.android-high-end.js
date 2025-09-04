const baseConfig = require('./jest.config.android.js');

module.exports = {
  ...baseConfig,
  displayName: 'Android High-End Device Tests',
  testTimeout: 20000, // Reduced timeout for high-performance devices
  maxWorkers: '50%', // Utilize multiple workers for high-end devices
  
  // High-end device simulation
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/android-high-end-setup.ts'
  ],
  
  // Generous memory allocation for high-end devices
  workerIdleMemoryLimit: '1GB',
  
  // Test patterns for high-end device scenarios
  testMatch: [
    '<rootDir>/src/__tests__/suites/device-matrix/high-end/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/performance/optimized.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/capacitor/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/__tests__/suites/real-time/**/*.test.{js,ts,tsx}'
  ],
  
  // Strict coverage thresholds for high-end testing
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Environment variables for high-end device simulation
  globals: {
    ...baseConfig.globals,
    DEVICE_PROFILE: 'high-end',