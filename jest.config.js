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
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 90,
      lines: 95,
      statements: 95,
    },
    '**/src/utils/point-calculator.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/utils/id-generator.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/providers/quote-provider.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/providers/sound-provider.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/utils/performance-monitor.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/utils/sync-engine.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    '**/src/app/api/ping/route.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
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
