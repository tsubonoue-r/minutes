/**
 * Server-Sent Events (SSE) Manager
 * @module lib/sse
 *
 * Manages SSE client connections, broadcasts events,
 * and handles heartbeat/timeout lifecycle.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * SSE event types supported by the system
 */
export type SSEEventType =
  | 'minutes:generating'
  | 'minutes:completed'
  | 'action-item:updated'
  | 'meeting:ended'
  | 'heartbeat'
  | 'connected';

/**
 * SSE event data payload
 */
export interface SSEEventData {
  readonly type: SSEEventType;
  readonly payload?: unknown;
  readonly timestamp: string;
}

/**
 * SSE client connection entry
 */
export interface SSEClient {
  readonly id: string;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly connectedAt: number;
  lastActivityAt: number;
}

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  /** Heartbeat interval in milliseconds (default: 30000) */
  readonly heartbeatIntervalMs?: number | undefined;
  /** Connection timeout in milliseconds (default: 300000 = 5 minutes) */
  readonly connectionTimeoutMs?: number | undefined;
}

/**
 * SSE Manager metrics
 */
export interface SSEManagerMetrics {
  readonly activeConnections: number;
  readonly totalConnectionsServed: number;
  readonly lastBroadcastAt: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Default heartbeat interval: 30 seconds */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

/** Default connection timeout: 5 minutes */
const DEFAULT_CONNECTION_TIMEOUT_MS = 300_000;

/** Log prefix for SSE operations */
const LOG_PREFIX = '[SSE]';

// =============================================================================
// SSEManager Class
// =============================================================================

/**
 * Manages Server-Sent Events connections and broadcasting.
 *
 * Features:
 * - Client connection lifecycle management
 * - Broadcast to all connected clients
 * - Send to specific client by ID
 * - Heartbeat keep-alive (configurable interval)
 * - Connection timeout with automatic cleanup
 *
 * @example
 * ```typescript
 * const manager = new SSEManager({ heartbeatIntervalMs: 30000 });
 * manager.start();
 *
 * // Add client
 * manager.addClient('client-1', controller);
 *
 * // Broadcast event
 * manager.broadcast('minutes:completed', { meetingId: '123' });
 *
 * // Cleanup
 * manager.stop();
 * ```
 */
export class SSEManager {
  private readonly clients: Map<string, SSEClient> = new Map();
  private readonly heartbeatIntervalMs: number;
  private readonly connectionTimeoutMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutCheckTimer: ReturnType<typeof setInterval> | null = null;
  private totalConnectionsServed = 0;
  private lastBroadcastAt: string | null = null;
  private started = false;

  constructor(config?: SSEManagerConfig) {
    this.heartbeatIntervalMs =
      config?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.connectionTimeoutMs =
      config?.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the SSE manager (heartbeat + timeout checker)
   */
  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.startHeartbeat();
    this.startTimeoutChecker();

    console.log(`${LOG_PREFIX} Manager started`, {
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      connectionTimeoutMs: this.connectionTimeoutMs,
    });
  }

  /**
   * Stop the SSE manager and disconnect all clients
   */
  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.stopHeartbeat();
    this.stopTimeoutChecker();
    this.disconnectAll();

    console.log(`${LOG_PREFIX} Manager stopped`);
  }

  /**
   * Check if the manager is running
   */
  isRunning(): boolean {
    return this.started;
  }

  // ---------------------------------------------------------------------------
  // Client Management
  // ---------------------------------------------------------------------------

  /**
   * Add a new client connection
   *
   * @param id - Unique client identifier
   * @param controller - ReadableStream controller for sending data
   */
  addClient(
    id: string,
    controller: ReadableStreamDefaultController<Uint8Array>
  ): void {
    // Remove existing client with same ID if present
    if (this.clients.has(id)) {
      this.removeClient(id);
    }

    const now = Date.now();
    const client: SSEClient = {
      id,
      controller,
      connectedAt: now,
      lastActivityAt: now,
    };

    this.clients.set(id, client);
    this.totalConnectionsServed++;

    console.log(`${LOG_PREFIX} Client connected: ${id}`, {
      activeConnections: this.clients.size,
    });

    // Send initial connected event
    this.sendToClient(id, 'connected', { clientId: id });
  }

  /**
   * Remove a client connection
   *
   * @param id - Client identifier to remove
   * @returns true if client was found and removed
   */
  removeClient(id: string): boolean {
    const client = this.clients.get(id);

    if (client === undefined) {
      return false;
    }

    try {
      client.controller.close();
    } catch {
      // Controller may already be closed
    }

    this.clients.delete(id);

    console.log(`${LOG_PREFIX} Client disconnected: ${id}`, {
      activeConnections: this.clients.size,
    });

    return true;
  }

  /**
   * Get the number of active client connections
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if a specific client is connected
   */
  hasClient(id: string): boolean {
    return this.clients.has(id);
  }

  /**
   * Get manager metrics
   */
  getMetrics(): SSEManagerMetrics {
    return {
      activeConnections: this.clients.size,
      totalConnectionsServed: this.totalConnectionsServed,
      lastBroadcastAt: this.lastBroadcastAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Event Sending
  // ---------------------------------------------------------------------------

  /**
   * Broadcast an event to all connected clients
   *
   * @param event - Event type
   * @param data - Event payload data
   * @returns Number of clients the event was sent to
   */
  broadcast(event: SSEEventType, data?: unknown): number {
    if (this.clients.size === 0) {
      return 0;
    }

    const eventData: SSEEventData = {
      type: event,
      payload: data,
      timestamp: new Date().toISOString(),
    };

    const message = this.formatSSEMessage(event, eventData);
    let sentCount = 0;
    const failedClients: string[] = [];
    const entries = Array.from(this.clients.entries());

    for (const [id, client] of entries) {
      try {
        const encoder = new TextEncoder();
        client.controller.enqueue(encoder.encode(message));
        client.lastActivityAt = Date.now();
        sentCount++;
      } catch {
        failedClients.push(id);
      }
    }

    // Clean up failed clients
    for (const id of failedClients) {
      this.removeClient(id);
    }

    this.lastBroadcastAt = new Date().toISOString();

    if (event !== 'heartbeat') {
      console.log(`${LOG_PREFIX} Broadcast: ${event}`, {
        sentTo: sentCount,
        failed: failedClients.length,
      });
    }

    return sentCount;
  }

  /**
   * Send an event to a specific client
   *
   * @param id - Client identifier
   * @param event - Event type
   * @param data - Event payload data
   * @returns true if the event was sent successfully
   */
  sendToClient(id: string, event: SSEEventType, data?: unknown): boolean {
    const client = this.clients.get(id);

    if (client === undefined) {
      return false;
    }

    const eventData: SSEEventData = {
      type: event,
      payload: data,
      timestamp: new Date().toISOString(),
    };

    const message = this.formatSSEMessage(event, eventData);

    try {
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(message));
      client.lastActivityAt = Date.now();
      return true;
    } catch {
      this.removeClient(id);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Format data as an SSE message string
   */
  private formatSSEMessage(event: string, data: SSEEventData): string {
    const lines: string[] = [];
    lines.push(`event: ${event}`);
    lines.push(`data: ${JSON.stringify(data)}`);
    lines.push(''); // Empty line to end the event
    lines.push(''); // Second empty line for SSE protocol
    return lines.join('\n');
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('heartbeat');
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Start timeout checker
   */
  private startTimeoutChecker(): void {
    // Check every minute
    this.timeoutCheckTimer = setInterval(() => {
      this.checkTimeouts();
    }, 60_000);
  }

  /**
   * Stop timeout checker
   */
  private stopTimeoutChecker(): void {
    if (this.timeoutCheckTimer !== null) {
      clearInterval(this.timeoutCheckTimer);
      this.timeoutCheckTimer = null;
    }
  }

  /**
   * Check and disconnect timed-out clients
   */
  private checkTimeouts(): void {
    const now = Date.now();
    const timedOutClients: string[] = [];
    const entries = Array.from(this.clients.entries());

    for (const [id, client] of entries) {
      const elapsed = now - client.connectedAt;

      if (elapsed >= this.connectionTimeoutMs) {
        timedOutClients.push(id);
      }
    }

    for (const id of timedOutClients) {
      console.log(`${LOG_PREFIX} Client timed out: ${id}`);
      this.removeClient(id);
    }
  }

  /**
   * Disconnect all clients
   */
  private disconnectAll(): void {
    const clientIds = Array.from(this.clients.keys());

    for (const id of clientIds) {
      this.removeClient(id);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global SSE manager instance (singleton for the server process)
 */
let globalSSEManager: SSEManager | null = null;

/**
 * Get the global SSE manager instance.
 * Creates and starts one if it does not exist.
 *
 * @param config - Optional configuration (only used on first call)
 * @returns The singleton SSEManager instance
 */
export function getSSEManager(config?: SSEManagerConfig): SSEManager {
  if (globalSSEManager === null) {
    globalSSEManager = new SSEManager(config);
    globalSSEManager.start();
  }

  return globalSSEManager;
}

/**
 * Reset the global SSE manager (for testing purposes)
 */
export function resetSSEManager(): void {
  if (globalSSEManager !== null) {
    globalSSEManager.stop();
    globalSSEManager = null;
  }
}
