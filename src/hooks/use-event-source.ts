'use client';

/**
 * SSE Event Source Hook
 * @module hooks/use-event-source
 *
 * React hook for managing Server-Sent Events connections
 * with automatic reconnection using exponential backoff.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Connection state of the EventSource
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * SSE event handler function
 */
export type SSEEventHandler = (data: unknown) => void;

/**
 * Configuration options for useEventSource
 */
export interface UseEventSourceOptions {
  /** Whether to automatically connect on mount (default: true) */
  readonly enabled?: boolean | undefined;
  /** Initial reconnect delay in milliseconds (default: 1000) */
  readonly initialReconnectDelayMs?: number | undefined;
  /** Maximum reconnect delay in milliseconds (default: 30000) */
  readonly maxReconnectDelayMs?: number | undefined;
  /** Maximum number of reconnect attempts (default: 10) */
  readonly maxReconnectAttempts?: number | undefined;
  /** Custom client ID for the connection */
  readonly clientId?: string | undefined;
}

/**
 * Return value of useEventSource hook
 */
export interface UseEventSourceResult {
  /** Current connection state */
  readonly connectionState: ConnectionState;
  /** Number of reconnect attempts made */
  readonly reconnectAttempts: number;
  /** Last error that occurred */
  readonly lastError: Error | null;
  /** Register an event listener */
  readonly addEventListener: (event: string, handler: SSEEventHandler) => void;
  /** Remove an event listener */
  readonly removeEventListener: (event: string, handler: SSEEventHandler) => void;
  /** Manually disconnect */
  readonly disconnect: () => void;
  /** Manually reconnect */
  readonly reconnect: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Default initial reconnect delay: 1 second */
const DEFAULT_INITIAL_RECONNECT_DELAY_MS = 1000;

/** Default maximum reconnect delay: 30 seconds */
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

/** Default maximum reconnect attempts */
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for managing SSE (Server-Sent Events) connections.
 *
 * Features:
 * - Automatic connection on mount (configurable)
 * - Exponential backoff reconnection
 * - Connection state tracking
 * - Event listener registration
 * - Cleanup on unmount (prevents memory leaks)
 * - SSR-safe (only connects in browser via useEffect)
 *
 * @param url - SSE endpoint URL
 * @param options - Configuration options
 * @returns Connection state and control methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { connectionState, addEventListener } = useEventSource('/api/events');
 *
 *   useEffect(() => {
 *     const handler = (data) => {
 *       console.log('Minutes completed:', data);
 *     };
 *     addEventListener('minutes:completed', handler);
 *     return () => removeEventListener('minutes:completed', handler);
 *   }, [addEventListener]);
 *
 *   return <div>Status: {connectionState}</div>;
 * }
 * ```
 */
export function useEventSource(
  url: string,
  options?: UseEventSourceOptions
): UseEventSourceResult {
  const enabled = options?.enabled ?? true;
  const initialReconnectDelayMs =
    options?.initialReconnectDelayMs ?? DEFAULT_INITIAL_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs =
    options?.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
  const maxReconnectAttempts =
    options?.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  const clientId = options?.clientId;

  // State
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Refs for mutable state that should not trigger re-renders
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Map<string, Set<SSEEventHandler>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  /**
   * Build the full URL with optional clientId parameter
   */
  const buildUrl = useCallback((): string => {
    if (clientId === undefined) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}clientId=${encodeURIComponent(clientId)}`;
  }, [url, clientId]);

  /**
   * Calculate reconnect delay with exponential backoff
   */
  const getReconnectDelay = useCallback(
    (attempt: number): number => {
      const delay = Math.min(
        initialReconnectDelayMs * Math.pow(2, attempt),
        maxReconnectDelayMs
      );
      // Add jitter (0-25% random variation)
      const jitter = delay * Math.random() * 0.25;
      return delay + jitter;
    },
    [initialReconnectDelayMs, maxReconnectDelayMs]
  );

  /**
   * Clean up existing connection and timers
   */
  const cleanup = useCallback((): void => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  /**
   * Connect to the SSE endpoint
   */
  const connect = useCallback((): void => {
    cleanup();
    isManualDisconnectRef.current = false;
    setConnectionState('connecting');

    const fullUrl = buildUrl();
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = (): void => {
      setConnectionState('connected');
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0;
      setLastError(null);
    };

    eventSource.onerror = (): void => {
      if (isManualDisconnectRef.current) {
        return;
      }

      setConnectionState('disconnected');
      setLastError(new Error('EventSource connection error'));

      // Close current connection
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        setReconnectAttempts(reconnectAttemptsRef.current);
        setConnectionState('connecting');

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    // Re-attach all registered event listeners
    const listenerEntries = Array.from(listenersRef.current.entries());
    for (const [event, handlers] of listenerEntries) {
      const handlerArray = Array.from(handlers);
      for (const handler of handlerArray) {
        eventSource.addEventListener(event, ((e: MessageEvent) => {
          try {
            const parsed: unknown = JSON.parse(e.data as string);
            handler(parsed);
          } catch {
            handler(e.data);
          }
        }) as EventListener);
      }
    }
  }, [buildUrl, cleanup, getReconnectDelay, maxReconnectAttempts]);

  /**
   * Register an event listener
   */
  const addEventListener = useCallback(
    (event: string, handler: SSEEventHandler): void => {
      let handlers = listenersRef.current.get(event);

      if (handlers === undefined) {
        handlers = new Set();
        listenersRef.current.set(event, handlers);
      }

      handlers.add(handler);

      // If already connected, add listener to active EventSource
      if (eventSourceRef.current !== null) {
        eventSourceRef.current.addEventListener(event, ((e: MessageEvent) => {
          try {
            const parsed: unknown = JSON.parse(e.data as string);
            handler(parsed);
          } catch {
            handler(e.data);
          }
        }) as EventListener);
      }
    },
    []
  );

  /**
   * Remove an event listener
   */
  const removeEventListener = useCallback(
    (event: string, handler: SSEEventHandler): void => {
      const handlers = listenersRef.current.get(event);

      if (handlers !== undefined) {
        handlers.delete(handler);

        if (handlers.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    },
    []
  );

  /**
   * Manually disconnect from SSE
   */
  const disconnect = useCallback((): void => {
    isManualDisconnectRef.current = true;
    cleanup();
    setConnectionState('disconnected');
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
  }, [cleanup]);

  /**
   * Manually reconnect to SSE
   */
  const reconnect = useCallback((): void => {
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Effect: Connect on mount if enabled, cleanup on unmount
  useEffect(() => {
    if (!enabled) {
      return;
    }

    connect();

    return (): void => {
      isManualDisconnectRef.current = true;
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return {
    connectionState,
    reconnectAttempts,
    lastError,
    addEventListener,
    removeEventListener,
    disconnect,
    reconnect,
  };
}
