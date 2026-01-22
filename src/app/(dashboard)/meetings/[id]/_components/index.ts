/**
 * Meeting Detail Page Components
 * @module app/(dashboard)/meetings/[id]/_components
 */

export { MeetingDetailHeader } from './meeting-detail-header';
export type { MeetingDetailHeaderProps } from './meeting-detail-header';

export { ParticipantsList } from './participants-list';
export type { ParticipantsListProps, ParticipantData } from './participants-list';

export { RecordingsList } from './recordings-list';
export type { RecordingsListProps, RecordingData, RecordingStatus } from './recordings-list';

export { MeetingActions } from './meeting-actions';
export type { MeetingActionsProps } from './meeting-actions';

export { MeetingDetailSkeleton } from './meeting-detail-skeleton';

export { TranscriptSection } from './transcript-section';
export type { TranscriptSectionProps } from './transcript-section';
