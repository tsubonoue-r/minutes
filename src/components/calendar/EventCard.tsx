'use client';

/**
 * Event Card Component - Display a single calendar event
 * @module components/calendar/EventCard
 */

import type { CalendarEvent, CalendarEventStatus } from '@/types/calendar';
import { Badge } from '@/components/ui';
import { calculateEventDuration, isEventInProgress, isEventUpcoming } from '@/types/calendar';

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Get status badge configuration
 */
function getStatusConfig(
  status: CalendarEventStatus
): { label: string; variant: 'default' | 'success' | 'warning' | 'error' } {
  const config: Record<
    CalendarEventStatus,
    { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
  > = {
    confirmed: { label: 'Confirmed', variant: 'success' },
    tentative: { label: 'Tentative', variant: 'warning' },
    cancelled: { label: 'Cancelled', variant: 'error' },
  };
  return config[status];
}

/**
 * Event card props
 */
export interface EventCardProps {
  /** Calendar event to display */
  readonly event: CalendarEvent;
  /** Whether to show full date */
  readonly showDate?: boolean;
  /** Click handler */
  readonly onClick?: (event: CalendarEvent) => void;
  /** Custom class name */
  readonly className?: string;
  /** Compact mode */
  readonly compact?: boolean;
}

/**
 * Event Card Component
 *
 * @description Displays a calendar event in a card format
 * @example
 * ```tsx
 * <EventCard
 *   event={event}
 *   onClick={(e) => console.log('Clicked:', e.eventId)}
 * />
 * ```
 */
export function EventCard({
  event,
  showDate = false,
  onClick,
  className = '',
  compact = false,
}: EventCardProps): JSX.Element {
  const statusConfig = getStatusConfig(event.status);
  const duration = calculateEventDuration(event);
  const inProgress = isEventInProgress(event);
  const upcoming = isEventUpcoming(event);

  const handleClick = (): void => {
    if (onClick !== undefined) {
      onClick(event);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-3 p-2 rounded-lg border border-lark-border
          hover:bg-lark-background/50 transition-colors cursor-pointer
          ${inProgress ? 'border-l-4 border-l-green-500' : ''}
          ${className}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Event: ${event.summary}`}
      >
        {/* Time */}
        <div className="flex-shrink-0 text-sm text-gray-500">
          {event.isAllDay ? (
            <span className="text-xs font-medium text-lark-primary">All Day</span>
          ) : (
            <span>{formatTime(event.startTime)}</span>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-lark-text truncate">{event.summary}</p>
        </div>

        {/* Status indicator */}
        {inProgress && (
          <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg border border-lark-border p-4
        hover:shadow-md transition-shadow cursor-pointer
        ${inProgress ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Event: ${event.summary}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-lark-text truncate">
            {event.summary}
          </h3>
          {showDate && (
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(event.startTime)}
            </p>
          )}
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {/* Time info */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        {event.isAllDay ? (
          <span className="font-medium text-lark-primary">All Day Event</span>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </span>
            </div>
            <span className="text-gray-400">({formatDuration(duration)})</span>
          </>
        )}
      </div>

      {/* Location */}
      {event.location !== undefined && (
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {/* Organizer & Attendees */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">{event.organizer.displayName}</span>
        </div>
        {event.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{event.attendees.length}</span>
          </div>
        )}
      </div>

      {/* Linked indicators */}
      {(event.meetingId !== undefined || event.minutesId !== undefined) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-lark-border">
          {event.meetingId !== undefined && (
            <Badge variant="default">Meeting Linked</Badge>
          )}
          {event.minutesId !== undefined && (
            <Badge variant="success">Minutes Available</Badge>
          )}
        </div>
      )}

      {/* In progress indicator */}
      {inProgress && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-lark-border">
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            In Progress
          </span>
        </div>
      )}
    </div>
  );
}

export default EventCard;
