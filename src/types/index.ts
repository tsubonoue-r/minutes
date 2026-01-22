/**
 * Type definitions barrel export
 * @module types
 */

export * from './auth';
export * from './lark';
export * from './meeting';
export * from './transcript';

// Minutes types - exported with namespace to avoid Speaker collision with transcript
export {
  // Zod Schemas
  SpeakerSchema as MinutesSpeakerSchema,
  TopicSegmentSchema,
  DecisionItemSchema,
  ActionItemSchema,
  MinutesMetadataSchema,
  MinutesSchema,
  PrioritySchema,
  ActionItemStatusSchema,
  // Types
  type Speaker as MinutesSpeaker,
  type TopicSegment,
  type DecisionItem,
  type ActionItem,
  type Minutes,
  type MinutesMetadata,
  type Priority,
  type ActionItemStatus,
  type ReadonlySpeaker as ReadonlyMinutesSpeaker,
  type ReadonlyTopicSegment,
  type ReadonlyDecisionItem,
  type ReadonlyActionItem,
  type ReadonlyMinutesMetadata,
  type ReadonlyMinutes,
  // Utility functions
  generateId,
  createEmptyMinutes,
  minutesToMarkdown,
  filterActionItemsByStatus,
  sortActionItemsByPriority,
  getActionItemsByAssignee,
  getTotalTopicsDuration,
  findTopicById,
  getDecisionsByTopicId,
  getActionItemsByTopicId,
  calculateCompletionPercentage,
  createSpeaker as createMinutesSpeaker,
  createActionItem,
  createDecisionItem,
  createTopicSegment,
  // Validation functions
  validateMinutes,
  validateActionItem,
  validateTopicSegment,
  validateSpeaker as validateMinutesSpeaker,
  validateDecisionItem,
} from './minutes';

// Export types
export * from './export';

// Action Item extended types - for action item management
// Note: Some types use aliases to avoid collisions with component types
export {
  // Zod Schemas
  ManagedActionItemSchema,
  ActionItemFiltersSchema as ActionItemFiltersDataSchema,
  ActionItemSortFieldSchema,
  SortOrderSchema,
  ActionItemSortOptionsSchema as ActionItemSortOptionsDataSchema,
  ActionItemPaginationSchema,
  ActionItemListResponseSchema,
  ActionItemStatusUpdateSchema,
  ActionItemStatsSchema as ActionItemStatsDataSchema,
  // Types
  type ManagedActionItem as ManagedActionItemData,
  type ActionItemFilters as ActionItemFiltersData,
  type ActionItemSortField as ActionItemSortFieldData,
  type SortOrder,
  type ActionItemSortOptions as ActionItemSortOptionsData,
  type ActionItemPagination,
  type ActionItemListResponse,
  type ActionItemStatusUpdate,
  type ActionItemStats as ActionItemStatsData,
  type ReadonlyManagedActionItem,
  type ReadonlyActionItemFilters,
  type ReadonlyActionItemStats,
  type MeetingInfo,
  // Utility functions
  isActionItemOverdue,
  sortByPriority,
  sortByDueDate,
  filterActionItems,
  toManagedActionItem,
  getDaysUntilDue,
  getActionItemStats,
  sortManagedActionItems,
  createPagination,
  paginateItems,
  createActionItemListResponse,
  refreshOverdueStatus,
  createManagedActionItem,
  // Validation functions
  validateManagedActionItem,
  validateActionItemFilters,
  validateActionItemSortOptions,
  validateActionItemPagination,
  validateActionItemListResponse,
  validateActionItemStatusUpdate,
  validateActionItemStats,
} from './action-item';
