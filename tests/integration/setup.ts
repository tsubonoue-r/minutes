/**
 * Integration test setup - MSW server lifecycle management
 * @module tests/integration/setup
 */

import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../mocks/server';

/**
 * Start MSW server before all integration tests.
 * Unhandled requests will trigger a warning (not an error)
 * to avoid breaking tests that make requests to non-mocked endpoints.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

/**
 * Reset any runtime request handlers after each test.
 * This ensures that test-specific overrides don't leak between tests.
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Close the MSW server after all tests complete.
 */
afterAll(() => {
  server.close();
});
