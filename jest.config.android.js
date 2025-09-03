const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const isCI = !!process.env.CI;

// Android-specific Jest configuration for WebView testing
const androidJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/android-setup.ts'
  ],
  testEnvironment: 'jest-environment-jsdom',
  resetMocks: true,
  resetModules: true,
  
  // Android WebView specific settings
  testEnvironmentOptions: {
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36',
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  },
  
  // Performance settings for mobile testing
  maxWorkers: process.env.CI ? 2 : 1,
  testTimeout: 30000, // Longer timeout for mobile operations
  
  // Coverage settings
  collectCoverage: isCI,
  coverageDirectory: '<rootDir>/coverage/android',
  coverageThreshold: isCI ? {
    global: {
      branches: 65, // Slightly lower for mobile complexity
      functions: 75,
      lines: 80,
      statements: 80,
    },
  } : undefined,
  
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/__mocks__/**',
    // Focus on mobile-critical components
    '<rootDir>/src/components/plans/**/*.{ts,tsx}',
    '<rootDir>/src/hooks/use-mobile.tsx',
    '<rootDir>/src/utils/sync-engine.ts',
    '<rootDir>/src/lib/db.ts',
  ],
  
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
  
  // Module mapping with Android/Capacitor specific mocks
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/router$': '<rootDir>/__mocks__/next/router.js',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
    '^remark-gfm$': '<rootDir>/__mocks__/remark-gfm.js',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    // Capacitor mocks
    '^@capacitor/(.*)$': '<rootDir>/src/__tests__/mocks/capacitor/$1.js',
    '^@capacitor-community/(.*)$': '<rootDir>/src/__tests__/mocks/capacitor-community/$1.js',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|nanoid|@capacitor|@capacitor-community)/)',
  ],
  
  // Test matching patterns for Android-specific tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.android.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.mobile.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.offline.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.capacitor.test.{ts,tsx}',
  ],
  
  // Global setup for Android testing
  globalSetup: '<rootDir>/src/__tests__/setup/android-global-setup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/android-global-teardown.js',
  
  // Memory management for mobile testing
  workerIdleMemoryLimit: '512MB',
  
  // Verbose output for debugging mobile issues
  verbose: process.env.NODE_ENV === 'development',
};

module.exports = createJestConfig(androidJestConfig);