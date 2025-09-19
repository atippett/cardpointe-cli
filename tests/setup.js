// Jest setup file
const path = require('path');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock the config directory for tests
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    join: jest.fn((...args) => {
      if (args.includes('config') && args.includes('.profile')) {
        return actualPath.join(__dirname, 'fixtures', '.profile');
      }
      return actualPath.join(...args);
    })
  };
});
