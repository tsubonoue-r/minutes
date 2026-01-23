/**
 * Tests for SSE Manager
 * @module lib/__tests__/sse.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEManager, getSSEManager, resetSSEManager } from '../sse';
import type { SSEManagerConfig, SSEEventType } from '../sse';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock ReadableStreamDefaultController
 */
function createMockController(): {
  controller: ReadableStreamDefaultController<Uint8Array>;
  enqueued: string[];
  closed: boolean;
} {
  const enqueued: string[] = [];
  let closed = false;

  const controller = {
    enqueue(chunk: Uint8Array): void {
      const decoder = new TextDecoder();
      enqueued.push(decoder.decode(chunk));
    },
    close(): void {
      closed = true;
    },
    error(_reason?: unknown): void {
      // no-op for tests
    },
    desiredSize: 1,
  } as unknown as ReadableStreamDefaultController<Uint8Array>;

  return { controller, enqueued, get closed() { return closed; } };
}

/**
 * Parse SSE message string into event name and data
 */
function parseSSEMessage(message: string): { event: string; data: unknown } | null {
  const lines = message.split('\n');
  let event = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      event = line.substring(7);
    } else if (line.startsWith('data: ')) {
      data = line.substring(6);
    }
  }

  if (event === '' || data === '') {
    return null;
  }

  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('SSEManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSSEManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSSEManager();
  });

  // ---------------------------------------------------------------------------
  // Client Management
  // ---------------------------------------------------------------------------

  describe('Client Management', () => {
    it('should add a client and track connection count', () => {
      const manager = new SSEManager();
      const { controller } = createMockController();

      manager.addClient('client-1', controller);

      expect(manager.getClientCount()).toBe(1);
      expect(manager.hasClient('client-1')).toBe(true);
    });

    it('should remove a client', () => {
      const manager = new SSEManager();
      const { controller } = createMockController();

      manager.addClient('client-1', controller);
      const removed = manager.removeClient('client-1');

      expect(removed).toBe(true);
      expect(manager.getClientCount()).toBe(0);
      expect(manager.hasClient('client-1')).toBe(false);
    });

    it('should return false when removing non-existent client', () => {
      const manager = new SSEManager();

      const removed = manager.removeClient('non-existent');

      expect(removed).toBe(false);
    });

    it('should handle multiple clients', () => {
      const manager = new SSEManager();
      const { controller: c1 } = createMockController();
      const { controller: c2 } = createMockController();
      const { controller: c3 } = createMockController();

      manager.addClient('client-1', c1);
      manager.addClient('client-2', c2);
      manager.addClient('client-3', c3);

      expect(manager.getClientCount()).toBe(3);
    });

    it('should replace existing client with same ID', () => {
      const manager = new SSEManager();
      const { controller: c1, closed: closed1Getter } = createMockController();
      const { controller: c2 } = createMockController();

      manager.addClient('client-1', c1);
      manager.addClient('client-1', c2);

      expect(manager.getClientCount()).toBe(1);
      expect(manager.hasClient('client-1')).toBe(true);
    });

    it('should send connected event when client is added', () => {
      const manager = new SSEManager();
      const { controller, enqueued } = createMockController();

      manager.addClient('client-1', controller);

      expect(enqueued.length).toBe(1);
      const parsed = parseSSEMessage(enqueued[0]!);
      expect(parsed).not.toBeNull();
      expect(parsed!.event).toBe('connected');
    });

    it('should close controller when removing client', () => {
      const manager = new SSEManager();
      const closeSpy = vi.fn();
      const controller = {
        enqueue: vi.fn(),
        close: closeSpy,
        error: vi.fn(),
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      manager.addClient('client-1', controller);
      manager.removeClient('client-1');

      expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('should handle controller close throwing an error', () => {
      const manager = new SSEManager();
      const controller = {
        enqueue: vi.fn(),
        close: vi.fn().mockImplementation(() => {
          throw new Error('Already closed');
        }),
        error: vi.fn(),
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      manager.addClient('client-1', controller);

      // Should not throw
      expect(() => manager.removeClient('client-1')).not.toThrow();
      expect(manager.getClientCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Broadcast
  // ---------------------------------------------------------------------------

  describe('Broadcast', () => {
    it('should broadcast event to all connected clients', () => {
      const manager = new SSEManager();
      const { controller: c1, enqueued: e1 } = createMockController();
      const { controller: c2, enqueued: e2 } = createMockController();

      manager.addClient('client-1', c1);
      manager.addClient('client-2', c2);

      const sentCount = manager.broadcast('minutes:completed', {
        meetingId: '123',
      });

      expect(sentCount).toBe(2);
      // Each client received connected event + broadcast
      expect(e1.length).toBe(2);
      expect(e2.length).toBe(2);

      const parsed1 = parseSSEMessage(e1[1]!);
      const parsed2 = parseSSEMessage(e2[1]!);

      expect(parsed1!.event).toBe('minutes:completed');
      expect(parsed2!.event).toBe('minutes:completed');
    });

    it('should return 0 when no clients are connected', () => {
      const manager = new SSEManager();

      const sentCount = manager.broadcast('minutes:completed', {
        meetingId: '123',
      });

      expect(sentCount).toBe(0);
    });

    it('should remove clients that fail to receive broadcast', () => {
      const manager = new SSEManager();

      const { controller: c1, enqueued: e1 } = createMockController();
      const failController = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error('Connection closed');
        }),
        close: vi.fn(),
        error: vi.fn(),
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      manager.addClient('client-1', c1);
      manager.addClient('client-2', failController);

      const sentCount = manager.broadcast('minutes:completed', {
        meetingId: '123',
      });

      expect(sentCount).toBe(1);
      expect(manager.getClientCount()).toBe(1);
      expect(manager.hasClient('client-1')).toBe(true);
      expect(manager.hasClient('client-2')).toBe(false);
    });

    it('should format SSE messages correctly', () => {
      const manager = new SSEManager();
      const { controller, enqueued } = createMockController();

      manager.addClient('client-1', controller);
      manager.broadcast('action-item:updated', { id: 'ai-1', status: 'done' });

      const broadcastMessage = enqueued[1]!;
      expect(broadcastMessage).toContain('event: action-item:updated');
      expect(broadcastMessage).toContain('data: ');
      expect(broadcastMessage).toContain('"type":"action-item:updated"');
      expect(broadcastMessage).toContain('"timestamp"');
    });

    it('should update lastBroadcastAt in metrics', () => {
      const manager = new SSEManager();
      const { controller } = createMockController();

      manager.addClient('client-1', controller);

      expect(manager.getMetrics().lastBroadcastAt).toBeNull();

      manager.broadcast('meeting:ended', { meetingId: '456' });

      expect(manager.getMetrics().lastBroadcastAt).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Send to Client
  // ---------------------------------------------------------------------------

  describe('sendToClient', () => {
    it('should send event to a specific client', () => {
      const manager = new SSEManager();
      const { controller: c1, enqueued: e1 } = createMockController();
      const { controller: c2, enqueued: e2 } = createMockController();

      manager.addClient('client-1', c1);
      manager.addClient('client-2', c2);

      const sent = manager.sendToClient('client-1', 'minutes:generating', {
        progress: 50,
      });

      expect(sent).toBe(true);
      // client-1 gets connected + sendToClient
      expect(e1.length).toBe(2);
      // client-2 only gets connected
      expect(e2.length).toBe(1);
    });

    it('should return false for non-existent client', () => {
      const manager = new SSEManager();

      const sent = manager.sendToClient('non-existent', 'heartbeat');

      expect(sent).toBe(false);
    });

    it('should remove client on send failure', () => {
      const manager = new SSEManager();
      let callCount = 0;
      const controller = {
        enqueue: vi.fn().mockImplementation(() => {
          callCount++;
          // First call succeeds (connected event), second fails
          if (callCount > 1) {
            throw new Error('Send failed');
          }
        }),
        close: vi.fn(),
        error: vi.fn(),
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController<Uint8Array>;

      manager.addClient('client-1', controller);
      const sent = manager.sendToClient('client-1', 'heartbeat');

      expect(sent).toBe(false);
      expect(manager.hasClient('client-1')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Heartbeat
  // ---------------------------------------------------------------------------

  describe('Heartbeat', () => {
    it('should send heartbeat at configured interval', () => {
      const manager = new SSEManager({ heartbeatIntervalMs: 5000 });
      const { controller, enqueued } = createMockController();

      manager.start();
      manager.addClient('client-1', controller);

      // Initial: 1 message (connected)
      expect(enqueued.length).toBe(1);

      // After 5 seconds: heartbeat sent
      vi.advanceTimersByTime(5000);
      expect(enqueued.length).toBe(2);

      const heartbeat = parseSSEMessage(enqueued[1]!);
      expect(heartbeat!.event).toBe('heartbeat');

      // After another 5 seconds: another heartbeat
      vi.advanceTimersByTime(5000);
      expect(enqueued.length).toBe(3);

      manager.stop();
    });

    it('should stop heartbeat when manager is stopped', () => {
      const manager = new SSEManager({ heartbeatIntervalMs: 5000 });
      const { controller, enqueued } = createMockController();

      manager.start();
      manager.addClient('client-1', controller);

      vi.advanceTimersByTime(5000);
      expect(enqueued.length).toBe(2); // connected + 1 heartbeat

      manager.stop();

      // Re-add client since stop disconnects all
      const { controller: c2, enqueued: e2 } = createMockController();
      manager.addClient('client-2', c2);

      // addClient sends a "connected" event even when manager is stopped
      const initialLength = e2.length;

      vi.advanceTimersByTime(10000);
      // No additional heartbeats should be sent after stop
      expect(e2.length).toBe(initialLength);
    });

    it('should not start heartbeat twice', () => {
      const manager = new SSEManager({ heartbeatIntervalMs: 5000 });
      const { controller, enqueued } = createMockController();

      manager.start();
      manager.start(); // Second call should be no-op

      manager.addClient('client-1', controller);

      vi.advanceTimersByTime(5000);
      // Only one heartbeat (not duplicated)
      expect(enqueued.length).toBe(2); // connected + 1 heartbeat

      manager.stop();
    });
  });

  // ---------------------------------------------------------------------------
  // Connection Timeout
  // ---------------------------------------------------------------------------

  describe('Connection Timeout', () => {
    it('should disconnect clients after timeout', () => {
      const manager = new SSEManager({
        connectionTimeoutMs: 120_000, // 2 minutes
        heartbeatIntervalMs: 60_000,
      });
      const { controller } = createMockController();

      manager.start();
      manager.addClient('client-1', controller);

      expect(manager.hasClient('client-1')).toBe(true);

      // Advance past timeout check interval (60s) + timeout (120s)
      vi.advanceTimersByTime(180_000);

      expect(manager.hasClient('client-1')).toBe(false);

      manager.stop();
    });

    it('should not disconnect clients before timeout', () => {
      const manager = new SSEManager({
        connectionTimeoutMs: 300_000, // 5 minutes
        heartbeatIntervalMs: 60_000,
      });
      const { controller } = createMockController();

      manager.start();
      manager.addClient('client-1', controller);

      // Advance 2 minutes (well before 5 min timeout)
      vi.advanceTimersByTime(120_000);

      expect(manager.hasClient('client-1')).toBe(true);

      manager.stop();
    });
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  describe('Lifecycle', () => {
    it('should report running state correctly', () => {
      const manager = new SSEManager();

      expect(manager.isRunning()).toBe(false);

      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('should disconnect all clients on stop', () => {
      const manager = new SSEManager();
      const { controller: c1 } = createMockController();
      const { controller: c2 } = createMockController();

      manager.start();
      manager.addClient('client-1', c1);
      manager.addClient('client-2', c2);

      expect(manager.getClientCount()).toBe(2);

      manager.stop();

      expect(manager.getClientCount()).toBe(0);
    });

    it('should not throw when stopping an already stopped manager', () => {
      const manager = new SSEManager();

      expect(() => manager.stop()).not.toThrow();
      expect(() => manager.stop()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  describe('Metrics', () => {
    it('should track total connections served', () => {
      const manager = new SSEManager();
      const { controller: c1 } = createMockController();
      const { controller: c2 } = createMockController();
      const { controller: c3 } = createMockController();

      manager.addClient('client-1', c1);
      manager.addClient('client-2', c2);
      manager.removeClient('client-1');
      manager.addClient('client-3', c3);

      const metrics = manager.getMetrics();
      expect(metrics.totalConnectionsServed).toBe(3);
      expect(metrics.activeConnections).toBe(2);
    });

    it('should return null lastBroadcastAt initially', () => {
      const manager = new SSEManager();

      expect(manager.getMetrics().lastBroadcastAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Singleton
  // ---------------------------------------------------------------------------

  describe('getSSEManager (Singleton)', () => {
    it('should return the same instance on multiple calls', () => {
      const manager1 = getSSEManager();
      const manager2 = getSSEManager();

      expect(manager1).toBe(manager2);
    });

    it('should auto-start the manager', () => {
      const manager = getSSEManager();

      expect(manager.isRunning()).toBe(true);
    });

    it('should create a new instance after reset', () => {
      const manager1 = getSSEManager();
      resetSSEManager();
      const manager2 = getSSEManager();

      expect(manager1).not.toBe(manager2);
    });

    it('should stop the old manager on reset', () => {
      const manager = getSSEManager();
      const { controller } = createMockController();

      manager.addClient('client-1', controller);
      expect(manager.getClientCount()).toBe(1);

      resetSSEManager();

      expect(manager.isRunning()).toBe(false);
      expect(manager.getClientCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SSE Message Format
  // ---------------------------------------------------------------------------

  describe('SSE Message Format', () => {
    it('should include event type in data payload', () => {
      const manager = new SSEManager();
      const { controller, enqueued } = createMockController();

      manager.addClient('client-1', controller);
      manager.broadcast('minutes:generating', { progress: 75 });

      const message = enqueued[1]!;
      const parsed = parseSSEMessage(message);

      expect(parsed).not.toBeNull();
      expect(parsed!.event).toBe('minutes:generating');

      const data = parsed!.data as { type: string; payload: unknown; timestamp: string };
      expect(data.type).toBe('minutes:generating');
      expect(data.payload).toEqual({ progress: 75 });
      expect(data.timestamp).toBeDefined();
    });

    it('should handle undefined payload', () => {
      const manager = new SSEManager();
      const { controller, enqueued } = createMockController();

      manager.addClient('client-1', controller);
      manager.broadcast('heartbeat');

      const message = enqueued[1]!;
      const parsed = parseSSEMessage(message);

      expect(parsed).not.toBeNull();
      const data = parsed!.data as { type: string; payload?: unknown };
      expect(data.type).toBe('heartbeat');
    });

    it('should end messages with double newline (SSE protocol)', () => {
      const manager = new SSEManager();
      const { controller, enqueued } = createMockController();

      manager.addClient('client-1', controller);
      manager.broadcast('meeting:ended', { meetingId: 'test' });

      const message = enqueued[1]!;
      expect(message.endsWith('\n\n')).toBe(true);
    });
  });
});
