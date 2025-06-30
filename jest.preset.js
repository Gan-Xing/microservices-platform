const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/apps/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/libs/**/*.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    '<rootDir>/apps/**/*.{ts,tsx}',
    '<rootDir>/libs/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.spec.ts',
    '!**/*.test.ts',
  ],
  moduleNameMapping: {
    '^@platform/(.*)$': '<rootDir>/libs/$1/src',
  },
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.spec.json',
    },
  },
};