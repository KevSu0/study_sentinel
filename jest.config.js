const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'next/router': '<rootDir>/__mocks__/next/router.js',
    'next/navigation': '<rootDir>/__mocks__/next/navigation.js',
    'react-markdown': '<rootDir>/__mocks__/react-markdown.js',
    'remark-gfm': '<rootDir>/__mocks__/remark-gfm.js',
    'lucide-react': '<rootDir>/__mocks__/lucide-react.js',
  },
}

module.exports = createJestConfig(customJestConfig)