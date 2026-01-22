/**
 * Type definitions barrel export
 * @module types
 */

export * from './auth';
export * from './lark';
export * from './meeting';
export * from './transcript';

// Template types - exported with namespace to avoid MeetingType collision
export {
  // Constants
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  MEETING_TYPE_LABELS_EN,
  // Schemas
  MeetingTypeSchema as TemplateMeetingTypeSchema,
  TemplateSectionSchema,
  TemplateStructureSchema,
  TemplateSchema,
  TemplateCreateInputSchema,
  TemplateUpdateInputSchema,
  TemplateSelectRequestSchema,
  TemplateSelectResponseSchema,
  // Types (with alias for MeetingType to avoid collision)
  type MeetingType as TemplateMeetingType,
  type TemplateSection,
  type TemplateStructure,
  type Template,
  type TemplateCreateInput,
  type TemplateUpdateInput,
  type TemplateSelectRequest,
  type TemplateSelectResponse,
  type ReadonlyTemplateSection,
  type ReadonlyTemplateStructure,
  type ReadonlyTemplate,
  // Utility functions
  generateTemplateId,
  createTemplate,
  updateTemplate,
  createTemplateSection,
  sortSectionsByOrder,
  getMeetingTypeLabel,
  // Validation functions
  validateTemplate,
  validateTemplateCreateInput,
  validateTemplateUpdateInput,
  validateTemplateSelectRequest,
} from './template';

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

// Notification types
export {
  // Constants
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  RECIPIENT_TYPE,
  // Zod Schemas
  NotificationStatusSchema,
  NotificationTypeSchema,
  RecipientTypeSchema,
  NotificationRecipientSchema,
  NotificationHistorySchema,
  GroupNotificationRequestSchema,
  BatchNotificationRequestSchema,
  NotificationResultSchema,
  BatchNotificationResultSchema,
  NotificationStatsSchema,
  NotificationFiltersSchema,
  NotificationListResponseSchema,
  // Types
  type NotificationStatus,
  type NotificationType,
  type RecipientType,
  type NotificationRecipient as NotificationRecipientData,
  type NotificationHistory,
  type GroupNotificationRequest,
  type BatchNotificationRequest,
  type NotificationResult as NotificationResultData,
  type BatchNotificationResult as BatchNotificationResultData,
  type NotificationStats,
  type NotificationFilters,
  type NotificationListResponse,
  type ReadonlyNotificationRecipient,
  type ReadonlyNotificationHistory,
  // Utility functions
  generateNotificationId,
  createNotificationHistory,
  createNotificationResult,
  createBatchNotificationResult,
  canRetryNotification,
  calculateNotificationStats,
  // Validation functions
  validateNotificationHistory,
  validateGroupNotificationRequest,
  validateBatchNotificationRequest,
  validateNotificationFilters,
} from './notification';

// Search types
export {
  // Zod Schemas
  SearchTargetSchema,
  DateFilterSchema,
  ParticipantFilterSchema,
  SearchFiltersSchema,
  SearchQuerySchema,
  TextMatchSchema,
  SearchResultContextSchema,
  MeetingSearchResultSchema,
  MinutesSearchResultSchema,
  TranscriptSearchResultSchema,
  ActionItemSearchResultSchema,
  SearchResultItemSchema,
  FacetCountSchema,
  SearchFacetsSchema,
  SearchResponseSchema,
  // Types
  type SearchTarget,
  type DateFilter,
  type ParticipantFilter,
  type SearchFilters as SearchFiltersType,
  type SearchQuery,
  type TextMatch,
  type SearchResultContext,
  type MeetingSearchResult,
  type MinutesSearchResult,
  type TranscriptSearchResult,
  type ActionItemSearchResult,
  type SearchResultItem,
  type FacetCount,
  type SearchFacets,
  type SearchResponse,
  type ReadonlySearchResultContext,
  type ReadonlySearchResultBase,
  // Utility functions
  createSearchContexts,
  calculateRelevanceScore,
  mergeSearchResults,
  getResultTypeLabel,
  validateSearchQuery,
  validateSearchResponse,
  createEmptySearchResponse,
} from './search';

// Dashboard types - for statistics and analytics
export {
  // Zod Schemas
  DashboardPeriodSchema,
  MeetingStatsSchema,
  MinutesStatsSchema,
  DashboardActionItemStatsSchema,
  ParticipantStatsSchema,
  MeetingFrequencyPointSchema,
  MeetingFrequencySchema,
  RecentActivitySchema,
  DashboardStatsSchema,
  DashboardStatsQuerySchema,
  // Types
  type DashboardPeriod,
  type MeetingStats,
  type MinutesStats,
  type DashboardActionItemStats,
  type ParticipantStats,
  type MeetingFrequencyPoint,
  type MeetingFrequency,
  type RecentActivity,
  type DashboardStats,
  type DashboardStatsQuery,
  type ReadonlyMeetingStats,
  type ReadonlyMinutesStats,
  type ReadonlyDashboardActionItemStats,
  type ReadonlyParticipantStats,
  type ReadonlyMeetingFrequency,
  type ReadonlyRecentActivity,
  type ReadonlyDashboardStats,
  // Utility functions
  calculatePeriodDates,
  calculateChangePercent,
  getFrequencyInterval,
  // Validation functions
  validateDashboardStatsQuery,
  validateDashboardStats,
} from './dashboard';

// Webhook types - for Lark webhook handling
export {
  // Constants
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROCESSING_STATE,
  // Zod Schemas
  WebhookEventTypeSchema,
  WebhookProcessingStateSchema,
  WebhookHeaderSchema,
  MeetingEndedEventSchema,
  TranscriptReadyEventSchema,
  RecordingReadyEventSchema,
  WebhookEventSchema,
  WebhookPayloadSchema,
  WebhookChallengeSchema,
  SignatureVerificationResultSchema,
  WebhookProcessingResultSchema,
  RetryConfigSchema,
  // Types
  type WebhookEventType,
  type WebhookProcessingState,
  type WebhookHeader,
  type MeetingEndedEvent,
  type TranscriptReadyEvent,
  type RecordingReadyEvent,
  type WebhookEvent,
  type WebhookPayload,
  type WebhookChallenge,
  type SignatureVerificationResult,
  type WebhookProcessingResult,
  type RetryConfig,
  type ReadonlyWebhookHeader,
  type ReadonlyMeetingEndedEvent,
  type ReadonlyWebhookPayload,
  type ReadonlyWebhookProcessingResult,
  type ReadonlyRetryConfig,
  // Type guards
  isMeetingEndedEvent,
  isTranscriptReadyEvent,
  isRecordingReadyEvent,
  isWebhookChallenge,
  // Validation functions
  validateWebhookPayload,
  safeParseWebhookPayload,
  validateWebhookChallenge,
  validateRetryConfig,
  // Factory functions
  createRetryConfig,
  createWebhookProcessingResult,
  // Utility functions
  getEventTypeLabel,
  getProcessingStateLabel,
  unixTimestampToISOString,
} from './webhook';

// Calendar types
export {
  // Constants
  CALENDAR_EVENT_STATUS,
  CALENDAR_VIEW_MODE,
  RECURRENCE_FREQUENCY,
  // Zod Schemas
  CalendarEventStatusSchema,
  CalendarViewModeSchema,
  RecurrenceFrequencySchema,
  AttendeeResponseStatusSchema,
  AttendeeSchema,
  OrganizerSchema,
  RecurrenceRuleSchema,
  CalendarEventSchema,
  CalendarFilterSchema,
  CalendarViewStateSchema,
  UpcomingEventsRequestSchema,
  CalendarEventWithMinutesSchema,
  LinkMeetingToEventRequestSchema,
  CalendarEventsListResponseSchema,
  // Types
  type CalendarEventStatus,
  type CalendarViewMode,
  type RecurrenceFrequency,
  type AttendeeResponseStatus,
  type Attendee,
  type Organizer,
  type RecurrenceRule,
  type CalendarEvent,
  type CalendarFilter,
  type CalendarViewState,
  type UpcomingEventsRequest,
  type CalendarEventWithMinutes,
  type LinkMeetingToEventRequest,
  type CalendarEventsListResponse,
  type ReadonlyAttendee,
  type ReadonlyOrganizer,
  type ReadonlyRecurrenceRule,
  type ReadonlyCalendarEvent,
  type ReadonlyCalendarFilter,
  type ReadonlyCalendarViewState,
  // Utility functions
  generateEventId,
  calculateEventDuration,
  isEventInProgress,
  isEventUpcoming,
  isEventPast,
  eventOccursOnDate,
  getEventsInRange,
  sortEventsByStartTime,
  groupEventsByDate,
  getEventStatusConfig,
  getViewModeConfig,
  // Factory functions
  createEmptyCalendarFilter,
  createDefaultCalendarViewState,
  createAttendee,
  createOrganizer,
  // Validation functions
  validateCalendarEvent,
  validateCalendarFilter,
  validateCalendarViewState,
  validateUpcomingEventsRequest,
  validateLinkMeetingToEventRequest,
} from './calendar';
