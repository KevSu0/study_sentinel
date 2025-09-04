const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const isCI = !!process.env.CI;

const customJestConfig = {
  testEnvironment: "jsdom",
  // if using ts-jest:
  // globals: { 'ts-jest': { tsconfig: 'tsconfig.tests.json' } },
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/android-high-end-setup.ts'
  ],
  resetMocks: true,
  resetModules: true,
  collectCoverage: isCI,
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: isCI ? {
    global: {
      branches: 70,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  } : undefined,
  collectCoverageFrom: [
    '<rootDir>/src/utils/point-calculator.ts',
    '<rootDir>/src/utils/id-generator.ts',
    '<rootDir>/src/providers/quote-provider.ts',
    '<rootDir>/src/providers/sound-provider.ts',
    '<rootDir>/src/utils/performance-monitor.ts',
    '<rootDir>/src/utils/sync-engine.ts',
    '<rootDir>/src/app/api/ping/route.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/__tests__/$1',
    '^next/router$': '<rootDir>/__mocks__/next/router.js',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
    '^remark-gfm$': '<rootDir>/__mocks__/remark-gfm.js',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|nanoid)/)'
  ],
}

module.exports = createJestConfig(customJestConfig)
