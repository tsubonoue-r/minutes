'use client';

/**
 * Connection Status Indicator Component
 * @module components/ui/connection-status
 *
 * Displays a small colored dot indicating the current SSE connection state.
 * - Green: Connected
 * - Yellow: Connecting/Reconnecting
 * - Red: Disconnected
 */

import { type ConnectionState } from '@/hooks/use-event-source';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ConnectionStatus component
 */
export interface ConnectionStatusProps {
  /** Current connection state */
  readonly connectionState: ConnectionState;
  /** Whether to show the label text (default: false) */
  readonly showLabel?: boolean | undefined;
  /** Additional CSS class names */
  readonly className?: string | undefined;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Status configuration mapping
 */
const STATUS_CONFIG: Record<
  ConnectionState,
  {
    readonly color: string;
    readonly pulseColor: string;
    readonly label: string;
    readonly animate: boolean;
  }
> = {
  connected: {
    color: 'bg-green-500',
    pulseColor: 'bg-green-400',
    label: 'Connected',
    animate: false,
  },
  connecting: {
    color: 'bg-yellow-500',
    pulseColor: 'bg-yellow-400',
    label: 'Reconnecting...',
    animate: true,
  },
  disconnected: {
    color: 'bg-red-500',
    pulseColor: 'bg-red-400',
    label: 'Disconnected',
    animate: false,
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Connection status indicator with colored dot.
 *
 * Designed to be placed in a header or status bar.
 * The dot is intentionally small (8px) to not draw too much attention.
 *
 * @example
 * ```tsx
 * <ConnectionStatus connectionState="connected" />
 * <ConnectionStatus connectionState="connecting" showLabel />
 * ```
 */
export function ConnectionStatus({
  connectionState,
  showLabel = false,
  className,
}: ConnectionStatusProps): JSX.Element {
  const config = STATUS_CONFIG[connectionState];

  return (
    <div
      className={`inline-flex items-center gap-1.5${className !== undefined ? ` ${className}` : ''}`}
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      <span className="relative flex h-2 w-2">
        {config.animate && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.pulseColor}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.color}`}
        />
      </span>
      {showLabel && (
        <span className="text-xs text-gray-500">{config.label}</span>
      )}
    </div>
  );
}
