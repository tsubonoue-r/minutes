/**
 * SSE Events API Route
 * @module app/api/events/route
 *
 * Provides a Server-Sent Events endpoint for real-time updates.
 * Clients connect via GET request and receive streaming events.
 *
 * Supported events:
 * - `minutes:generating` - Minutes generation progress
 * - `minutes:completed` - Minutes generation complete
 * - `action-item:updated` - Action item was updated
 * - `meeting:ended` - Meeting has ended
 * - `heartbeat` - Keep-alive signal
 * - `connected` - Initial connection confirmation
 */

import { getSSEManager } from '@/lib/sse';

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/events
 *
 * Establishes an SSE connection for real-time event streaming.
 *
 * Query Parameters:
 * - clientId (optional): Custom client identifier. If not provided,
 *   a UUID will be generated.
 *
 * Response:
 * - 200: SSE stream (text/event-stream)
 *
 * @example
 * ```javascript
 * const eventSource = new EventSource('/api/events?clientId=my-client');
 * eventSource.addEventListener('minutes:completed', (e) => {
 *   const data = JSON.parse(e.data);
 *   console.log('Minutes completed:', data);
 * });
 * ```
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId') ?? generateClientId();

  const manager = getSSEManager();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      manager.addClient(clientId, controller);
    },
    cancel() {
      manager.removeClient(clientId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `sse-${timestamp}-${random}`;
}
