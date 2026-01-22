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
