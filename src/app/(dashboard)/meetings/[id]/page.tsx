'use client';

/**
 * Meeting Detail Page
 * Displays comprehensive meeting information including participants and recordings
 * @module app/(dashboard)/meetings/[id]/page
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

/**
 * Navigate to a URL using window.location
 * This avoids Next.js strict route type checking issues
 */
function navigateTo(url: string): void {
  window.location.href = url;
}
import {
  MeetingDetailHeader,
  ParticipantsList,
  RecordingsList,
  MeetingActions,
  MeetingDetailSkeleton,
  TranscriptSection,
  MinutesSection,
} from './_components';
import type { ParticipantData } from './_components/participants-list';
import type { RecordingData } from './_components/recordings-list';
import type {
  MeetingStatus,
  MeetingType,
  MinutesStatus,
  MeetingUser,
} from '@/types/meeting';

/**
 * Meeting data from API
 */
interface MeetingData {
  readonly id: string;
  readonly title: string;
  readonly meetingNo: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
  readonly status: MeetingStatus;
  readonly type: MeetingType;
  readonly host: MeetingUser;
  readonly participantCount: number;
  readonly hasRecording: boolean;
  readonly recordingUrl?: string;
  readonly minutesStatus: MinutesStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * API response types
 */
interface MeetingApiResponse {
  readonly data: MeetingData;
}

interface ParticipantsApiResponse {
  readonly data: readonly ParticipantData[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
}

interface RecordingsApiResponse {
  readonly data: readonly RecordingData[];
}

interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Page state interface
 */
interface PageState {
  readonly meeting: MeetingData | null;
  readonly participants: readonly ParticipantData[];
  readonly recordings: readonly RecordingData[];
  readonly isLoading: boolean;
  readonly meetingError: string | null;
  readonly participantsError: string | null;
  readonly recordingsError: string | null;
  readonly participantsLoading: boolean;
  readonly recordingsLoading: boolean;
  readonly hasTranscript: boolean;
  readonly transcriptLoading: boolean;
}

/**
 * Initial page state
 */
const initialState: PageState = {
  meeting: null,
  participants: [],
  recordings: [],
  isLoading: true,
  meetingError: null,
  participantsError: null,
  recordingsError: null,
  participantsLoading: true,
  recordingsLoading: true,
  hasTranscript: false,
  transcriptLoading: true,
};

/**
 * Breadcrumb component
 */
function Breadcrumb({
  meetingTitle,
}: {
  readonly meetingTitle?: string;
}): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <a
            href="/dashboard"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Dashboard
          </a>
        </li>
        <li className="text-slate-400 dark:text-slate-500" aria-hidden="true">
          /
        </li>
        <li>
          <a
            href="/meetings"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Meetings
          </a>
        </li>
        <li className="text-slate-400 dark:text-slate-500" aria-hidden="true">
          /
        </li>
        <li
          className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]"
          aria-current="page"
        >
          {meetingTitle ?? 'Loading...'}
        </li>
      </ol>
    </nav>
  );
}

/**
 * Error state component
 */
function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="card text-center py-12">
      <svg
        className="mx-auto h-16 w-16 text-red-400"
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
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        Error Loading Meeting
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={() => navigateTo('/meetings')}
          className="btn-secondary"
        >
          Back to Meetings
        </button>
      </div>
    </div>
  );
}

/**
 * Meeting Detail Page Component
 *
 * @description Displays comprehensive meeting information including:
 * - Meeting header with title, status, and time information
 * - Host information
 * - List of participants with join/leave times
 * - Meeting recordings with playback options
 * - Action buttons for generating minutes
 *
 * Uses Next.js App Router with dynamic routes for meeting ID.
 */
export default function MeetingDetailPage(): JSX.Element {
  const params = useParams();
  const meetingId = params.id as string;

  const [state, setState] = useState<PageState>(initialState);

  /**
   * Fetch meeting data from API
   */
  const fetchMeeting = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(errorData.error.message ?? 'Failed to fetch meeting');
      }

      const data = (await response.json()) as MeetingApiResponse;
      setState((prev) => ({
        ...prev,
        meeting: data.data,
        meetingError: null,
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setState((prev) => ({
        ...prev,
        meetingError: message,
        isLoading: false,
      }));
    }
  }, [meetingId]);

  /**
   * Fetch participants data from API
   */
  const fetchParticipants = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, participantsLoading: true }));

      const response = await fetch(`/api/meetings/${meetingId}/participants`);

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(
          errorData.error.message ?? 'Failed to fetch participants'
        );
      }

      const data = (await response.json()) as ParticipantsApiResponse;
      setState((prev) => ({
        ...prev,
        participants: data.data,
        participantsError: null,
        participantsLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setState((prev) => ({
        ...prev,
        participantsError: message,
        participantsLoading: false,
      }));
    }
  }, [meetingId]);

  /**
   * Fetch recordings data from API
   */
  const fetchRecordings = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, recordingsLoading: true }));

      const response = await fetch(`/api/meetings/${meetingId}/recordings`);

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(errorData.error.message ?? 'Failed to fetch recordings');
      }

      const data = (await response.json()) as RecordingsApiResponse;
      setState((prev) => ({
        ...prev,
        recordings: data.data,
        recordingsError: null,
        recordingsLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setState((prev) => ({
        ...prev,
        recordingsError: message,
        recordingsLoading: false,
      }));
    }
  }, [meetingId]);

  /**
   * Check if transcript exists for the meeting
   */
  const checkTranscript = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, transcriptLoading: true }));

      const response = await fetch(`/api/meetings/${meetingId}/transcript`);

      // 404 means no transcript
      if (response.status === 404) {
        setState((prev) => ({
          ...prev,
          hasTranscript: false,
          transcriptLoading: false,
        }));
        return;
      }

      // Any successful response means transcript exists
      if (response.ok) {
        setState((prev) => ({
          ...prev,
          hasTranscript: true,
          transcriptLoading: false,
        }));
        return;
      }

      // Other errors - assume no transcript
      setState((prev) => ({
        ...prev,
        hasTranscript: false,
        transcriptLoading: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        hasTranscript: false,
        transcriptLoading: false,
      }));
    }
  }, [meetingId]);

  /**
   * Retry fetching all data
   */
  const handleRetry = useCallback((): void => {
    setState(initialState);
    void fetchMeeting();
    void fetchParticipants();
    void fetchRecordings();
    void checkTranscript();
  }, [fetchMeeting, fetchParticipants, fetchRecordings, checkTranscript]);

  /**
   * Handle generate minutes action
   */
  const handleGenerateMinutes = useCallback((): void => {
    // TODO: Implement minutes generation (Issue #6)
    console.log('Generate minutes for meeting:', meetingId);
  }, [meetingId]);

  // Fetch data on mount
  useEffect(() => {
    void fetchMeeting();
    void fetchParticipants();
    void fetchRecordings();
    void checkTranscript();
  }, [fetchMeeting, fetchParticipants, fetchRecordings, checkTranscript]);

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container-app py-8">
          <MeetingDetailSkeleton />
        </div>
      </div>
    );
  }

  // Show error state if meeting failed to load
  if (state.meetingError !== null || state.meeting === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container-app py-8">
          <Breadcrumb />
          <ErrorState
            message={state.meetingError ?? 'Meeting not found'}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  const { meeting, participants, recordings } = state;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container-app py-8">
        {/* Breadcrumb */}
        <Breadcrumb meetingTitle={meeting.title} />

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Header */}
            <MeetingDetailHeader
              title={meeting.title}
              meetingNo={meeting.meetingNo}
              status={meeting.status}
              startTime={meeting.startTime}
              endTime={meeting.endTime}
              durationMinutes={meeting.durationMinutes}
              host={meeting.host}
              participantCount={meeting.participantCount}
            />

            {/* Participants List */}
            <ParticipantsList
              participants={participants}
              isLoading={state.participantsLoading}
              error={state.participantsError}
            />

            {/* Recordings List */}
            <RecordingsList
              recordings={recordings}
              isLoading={state.recordingsLoading}
              error={state.recordingsError}
            />

            {/* Transcript Section */}
            <TranscriptSection
              meetingId={meeting.id}
              meetingTitle={meeting.title}
            />

            {/* Minutes Section */}
            <MinutesSection
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              hasTranscript={state.hasTranscript}
            />
          </div>

          {/* Right column - Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <MeetingActions
                meetingId={meeting.id}
                minutesStatus={meeting.minutesStatus}
                hasRecording={meeting.hasRecording}
                onGenerateMinutes={handleGenerateMinutes}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
