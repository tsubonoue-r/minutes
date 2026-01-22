'use client';

/**
 * Upcoming Events Component - Display list of upcoming calendar events
 * @module components/calendar/UpcomingEvents
 */

import type { CalendarEvent } from '@/types/calendar';
import { EventCard } from './EventCard';
import { Skeleton } from '@/components/ui';

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Started';
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
  }

  if (diffHours > 0) {
    return diffHours === 1 ? 'In 1 hour' : `In ${diffHours} hours`;
  }

  if (diffMins > 0) {
    return diffMins === 1 ? 'In 1 minute' : `In ${diffMins} minutes`;
  }

  return 'Starting now';
}

/**
 * Group events by date
 */
function groupEventsByDate(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const dateKey = event.startTime.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const existing = grouped.get(dateKey) ?? [];
    grouped.set(dateKey, [...existing, event]);
  }

  return grouped;
}

/**
 * Upcoming events props
 */
export interface UpcomingEventsProps {
  /** List of upcoming events */
  readonly events: readonly CalendarEvent[];
  /** Loading state */
  readonly isLoading?: boolean;
  /** Error state */
  readonly error?: Error | null;
  /** Click handler */
  readonly onEventClick?: (event: CalendarEvent) => void;
  /** Retry handler */
  readonly onRetry?: () => void;
  /** Custom class name */
  readonly className?: string;
  /** Show header */
  readonly showHeader?: boolean;
  /** Maximum events to show */
  readonly maxEvents?: number;
  /** Group by date */
  readonly groupByDate?: boolean;
}

/**
 * Loading skeleton
 */
function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-lark-border p-4"
        >
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState(): JSX.Element {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-4" role="img" aria-label="Calendar icon">
        <svg
          className="w-12 h-12 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-lark-text mb-2">
        No Upcoming Events
      </h3>
      <p className="text-sm text-gray-500">
        Your calendar is clear. Enjoy your free time!
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({
  error,
  onRetry,
}: {
  readonly error: Error;
  readonly onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-4" role="img" aria-label="Warning icon">
        <svg
          className="w-12 h-12 mx-auto text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-red-600 mb-2">
        Failed to Load Events
      </h3>
      <p className="text-sm text-gray-500 mb-4">{error.message}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-lark-primary rounded-lg hover:bg-lark-primary/90 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Upcoming Events Component
 *
 * @description Displays a list of upcoming calendar events with grouping
 * @example
 * ```tsx
 * <UpcomingEvents
 *   events={events}
 *   onEventClick={(e) => router.push(`/calendar/${e.eventId}`)}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function UpcomingEvents({
  events,
  isLoading = false,
  error = null,
  onEventClick,
  onRetry,
  className = '',
  showHeader = true,
  maxEvents,
  groupByDate = true,
}: UpcomingEventsProps): JSX.Element {
  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-lark-text">Upcoming Events</h2>
          </div>
        )}
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error !== null) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-lark-text">Upcoming Events</h2>
          </div>
        )}
        {onRetry !== undefined ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          <ErrorState error={error} />
        )}
      </div>
    );
  }

  // Limit events if needed
  const displayEvents = maxEvents !== undefined
    ? events.slice(0, maxEvents)
    : events;

  // Empty state
  if (displayEvents.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-lark-text">Upcoming Events</h2>
          </div>
        )}
        <EmptyState />
      </div>
    );
  }

  // Group events if enabled
  if (groupByDate) {
    const groupedEvents = groupEventsByDate(displayEvents);

    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-lark-text">Upcoming Events</h2>
            <span className="text-sm text-gray-500">{displayEvents.length} events</span>
          </div>
        )}
        <div className="space-y-6">
          {Array.from(groupedEvents.entries()).map(([dateKey, dateEvents]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{dateKey}</h3>
              <div className="space-y-2">
                {dateEvents.map((event) =>
                  onEventClick !== undefined ? (
                    <EventCard
                      key={event.eventId}
                      event={event}
                      onClick={onEventClick}
                      compact
                    />
                  ) : (
                    <EventCard
                      key={event.eventId}
                      event={event}
                      compact
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple list without grouping
  return (
    <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-lark-text">Upcoming Events</h2>
          <span className="text-sm text-gray-500">{displayEvents.length} events</span>
        </div>
      )}
      <div className="space-y-3">
        {displayEvents.map((event) =>
          onEventClick !== undefined ? (
            <EventCard
              key={event.eventId}
              event={event}
              onClick={onEventClick}
              showDate
            />
          ) : (
            <EventCard
              key={event.eventId}
              event={event}
              showDate
            />
          )
        )}
      </div>
    </div>
  );
}

export default UpcomingEvents;
