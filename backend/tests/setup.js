// Global test setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/mindful_ad_wizard_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';

// Suppress console logs during testing unless needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}