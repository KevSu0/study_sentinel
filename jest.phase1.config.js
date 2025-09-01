const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  resetMocks: true,
  resetModules: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  // Override thresholds for phase1 run to focus on new files only
  coverageThreshold: {},
  collectCoverageFrom: [
    '<rootDir>/src/lib/stats/cache.ts',
    '<rootDir>/src/lib/stats/selectors.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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

