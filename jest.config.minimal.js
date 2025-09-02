const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  resetMocks: true,
  resetModules: true,
  collectCoverage: false,
  maxWorkers: 1,
  testTimeout: 10000,
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