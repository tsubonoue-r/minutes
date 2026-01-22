/**
 * Minutes UI Components
 *
 * @description Components for displaying AI-generated meeting minutes
 *              including topics, decisions, action items, and generation controls.
 * @module components/minutes
 */

// MinutesViewer - Main component
export { MinutesViewer } from './MinutesViewer';
export type { MinutesViewerProps, MinutesTab } from './MinutesViewer';

// TopicSection - Topic/segment display
export { TopicSection, TopicList } from './TopicSection';
export type { TopicSectionProps, TopicListProps } from './TopicSection';

// DecisionList - Decision items display
export { DecisionItemCard, DecisionList } from './DecisionList';
export type { DecisionItemCardProps, DecisionListProps } from './DecisionList';

// ActionItemList - Action items display with filtering
export {
  ActionItemCard,
  ActionItemFilters,
  ActionItemList,
} from './ActionItemList';
export type {
  ActionItemCardProps,
  ActionItemFiltersProps,
  ActionItemFilterOptions,
  ActionItemListProps,
} from './ActionItemList';

// GenerateButton - Generation controls
export { GenerateButton, GenerateMinutesCard } from './GenerateButton';
export type {
  GenerateButtonProps,
  GenerateMinutesCardProps,
  GenerationState,
  GenerationStatus,
} from './GenerateButton';

// GenerateMinutesWithTemplate - Generation with template selection
export { GenerateMinutesWithTemplate } from './GenerateMinutesWithTemplate';
export type { GenerateMinutesWithTemplateProps } from './GenerateMinutesWithTemplate';

// MinutesSkeleton - Loading states
export { MinutesSkeleton, MinutesContentSkeleton } from './MinutesSkeleton';
export type {
  MinutesSkeletonProps,
  MinutesContentSkeletonProps,
} from './MinutesSkeleton';
