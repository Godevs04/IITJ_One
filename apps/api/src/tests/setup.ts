// Test setup and global configuration
import { config } from '../config';

// Ensure tests run against test database if needed
if (config.nodeEnv !== 'test') {
  console.warn('⚠️  Tests should run with NODE_ENV=test');
}

// Global test timeout
jest.setTimeout(10000);

// Mock external services if needed
beforeAll(() => {
  // Database will be mocked by tests that need it
});

afterEach(() => {
  jest.clearAllMocks();
});

// Suppress logs during tests
const originalLog = console.log;
const originalError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});
