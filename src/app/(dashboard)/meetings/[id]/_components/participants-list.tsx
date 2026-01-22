'use client';

/**
 * Participants List Component
 * Displays meeting participants with their details
 * @module app/(dashboard)/meetings/[id]/_components/participants-list
 */

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Participant data structure from API
 */
export interface ParticipantData {
  /** Unique participant ID */
  readonly id: string;
  /** Participant display name */
  readonly name: string;
  /** Participant avatar URL */
  readonly avatarUrl?: string;
  /** Participant email */
  readonly email?: string;
  /** Whether the participant is the meeting host */
  readonly isHost: boolean;
  /** Time when participant joined (ISO string) */
  readonly joinTime?: string;
  /** Time when participant left (ISO string) */
  readonly leaveTime?: string;
  /** Duration in meeting (minutes) */
  readonly duration?: number;
}

/**
 * Props for ParticipantsList component
 */
export interface ParticipantsListProps {
  /** List of participants */
  readonly participants: readonly ParticipantData[];
  /** Whether data is loading */
  readonly isLoading?: boolean;
  /** Error message if fetch failed */
  readonly error?: string | null;
}

/**
 * Format time for display
 */
function formatTime(isoString: string | undefined): string {
  if (isoString === undefined) {
    return '--:--';
  }
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) {
    return '--';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Single participant row component
 */
function ParticipantRow({
  participant,
}: {
  readonly participant: ParticipantData;
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      role="listitem"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          src={participant.avatarUrl}
          name={participant.name}
          size="sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {participant.name}
            </p>
            {participant.isHost && (
              <Badge variant="default" className="text-xs">
                Host
              </Badge>
            )}
          </div>
          {participant.email !== undefined && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {participant.email}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        <div className="hidden sm:block text-right">
          <p className="font-medium">Joined</p>
          <p>{formatTime(participant.joinTime)}</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="font-medium">Left</p>
          <p>{formatTime(participant.leaveTime)}</p>
        </div>
        <div className="text-right min-w-[60px]">
          <p className="font-medium">Duration</p>
          <p>{formatDuration(participant.duration)}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for participant list
 */
function ParticipantsListSkeleton(): JSX.Element {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-3 px-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-14" />
          </div>
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
    <div className="py-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        No participants found for this meeting.
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }: { readonly message: string }): JSX.Element {
  return (
    <div className="py-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-red-400"
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
      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
        {message}
      </p>
    </div>
  );
}

/**
 * Participants List Component
 *
 * @description Displays a list of meeting participants with their join/leave times
 * and duration. Includes loading and error states.
 *
 * @example
 * ```tsx
 * <ParticipantsList
 *   participants={[
 *     { id: '1', name: 'John Doe', isHost: true, joinTime: '2024-01-15T10:00:00Z' },
 *     { id: '2', name: 'Jane Smith', isHost: false, joinTime: '2024-01-15T10:05:00Z' },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export function ParticipantsList({
  participants,
  isLoading = false,
  error = null,
}: ParticipantsListProps): JSX.Element {
  return (
    <section
      className="card p-0 overflow-hidden"
      aria-labelledby="participants-heading"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2
          id="participants-heading"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          Participants
          {!isLoading && error === null && participants.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({participants.length})
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <ParticipantsListSkeleton />
      ) : error !== null ? (
        <ErrorState message={error} />
      ) : participants.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="divide-y divide-slate-200 dark:divide-slate-700"
          role="list"
          aria-label="Meeting participants"
        >
          {participants.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
            />
          ))}
        </div>
      )}
    </section>
  );
}
