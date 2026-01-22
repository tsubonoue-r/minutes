/**
 * Transcript UI Components
 *
 * @description Components for displaying meeting transcripts with search,
 *              speaker segments, and virtual scroll support.
 * @module components/transcript
 */

// TranscriptViewer - Main component
export { TranscriptViewer } from './TranscriptViewer';
export type { TranscriptViewerProps } from './TranscriptViewer';

// SpeakerSegment - Individual speaker utterance display
export { SpeakerSegment } from './SpeakerSegment';
export type { SpeakerSegmentProps } from './SpeakerSegment';

// TranscriptSearch - Search result navigation
export { TranscriptSearch } from './TranscriptSearch';
export type { TranscriptSearchProps } from './TranscriptSearch';

// TranscriptSkeleton - Loading states
export {
  TranscriptSkeleton,
  TranscriptSegmentSkeleton,
} from './TranscriptSkeleton';
export type {
  TranscriptSkeletonProps,
  TranscriptSegmentSkeletonProps,
} from './TranscriptSkeleton';
