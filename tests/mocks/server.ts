/**
 * MSW server setup for integration tests
 * @module tests/mocks/server
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for intercepting HTTP requests in Node.js tests.
 *
 * Usage:
 * - Start before all tests: server.listen()
 * - Reset after each test: server.resetHandlers()
 * - Close after all tests: server.close()
 *
 * To override a handler for a specific test:
 * server.use(http.get('/path', () => HttpResponse.json(...)))
 *
 * @example
 * ```typescript
 * import { server } from '../mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);
