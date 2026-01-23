/**
 * Lark integration barrel export
 * @module lib/lark
 */

// Client
export { LarkClient, LarkClientError, createLarkClient } from './client';

// OAuth
export {
  generateOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getAppAccessToken,
  clearAppAccessTokenCache,
  type OAuthAuthenticationResult,
} from './oauth';

// Token management
export {
  checkTokenExpiration,
  calculateExpirationTimestamp,
  formatExpirationTime,
  TokenManager,
  type TokenStorage,
  type StoredTokens,
  type TokenExpirationStatus,
} from './token';

// Meeting Service
export {
  MeetingService,
  MeetingNotFoundError,
  MeetingApiError,
  createMeetingService,
  calculateDuration,
  transformLarkMeeting,
  transformLarkParticipant,
  transformLarkRecording,
  type PaginationOptions,
} from './meeting';

// Transcript Service
export {
  TranscriptClient,
  TranscriptNotFoundError,
  TranscriptApiError,
  createTranscriptClient,
  transformLarkSpeaker,
  transformLarkTranscriptSegment,
  transformLarkTranscript,
  extractUniqueSpeakers,
  calculateTotalDuration,
  type Speaker,
  type TranscriptSegment,
  type Transcript,
} from './transcript';

// Docs Service
export {
  DocsClient,
  DocsApiError,
  DocsImportTimeoutError,
  DocsImportError,
  createDocsClient,
  type CreateDocFromMarkdownOptions,
  type CreateDocResult,
  type PermissionMember,
} from './docs';

// Message Service
export {
  MessageClient,
  MessageApiError,
  createMessageClient,
  type SendMessageOptions,
  type SendMessageResult,
  type InteractiveCard,
  type CardElement,
  type CardHeader,
  type CardTemplateColor,
  type ReceiveIdType,
  type MessageType,
} from './message';

// Card Templates
export {
  createMinutesCompletedCard,
  createMinutesDraftCard,
  createActionItemAssignedCard,
  createApprovalRequestCard,
  createApprovalResultCard,
  validateMinutesCardInfo,
  validateActionItemCardInfo,
  validateDraftMinutesCardInfo,
  validateApprovalRequestCardInfo,
  validateApprovalResultCardInfo,
  type MinutesCardInfo,
  type ActionItemCardInfo,
  type DraftMinutesCardInfo,
  type ApprovalRequestCardInfo,
  type ApprovalResultCardInfo,
  type CardLanguage,
} from './card-templates';

// Bitable (Base) Client
export {
  BitableClient,
  BitableApiError,
  RecordNotFoundError,
  createBitableClient,
  createBitableClientFromEnv,
  LarkBitableApiEndpoints,
  type BitableClientConfig,
  type BitableFieldType,
  type BitableFieldValue,
  type BitableRecordFields,
  type BitableRecord,
  type TypedBitableRecord,
  type BitableUserValue,
  type BitableLinkValue,
  type ListRecordsParams,
  type CreateRecordRequest,
  type UpdateRecordRequest,
} from './bitable';

// Bitable Schema Definitions
export {
  BitableFieldTypeCode,
  MeetingsTableSchema,
  MinutesTableSchema,
  ActionItemsTableSchema,
  RequiredEnvVars,
  validateEnvironmentVariables,
  getAllTableSchemas,
  generateTableSetupDocumentation,
  type FieldDefinition,
  type TableSchemaDefinition,
} from './bitable-schema';

// Calendar Service
export {
  CalendarClient,
  CalendarEventNotFoundError,
  CalendarApiError,
  createCalendarClient,
  transformLarkCalendarEvent,
  transformLarkAttendee,
  transformLarkOrganizer,
  transformLarkRecurrence,
  LarkCalendarApiEndpoints,
  type CalendarPaginationOptions,
  type GetCalendarEventsOptions,
  type SearchCalendarEventsOptions,
  type CalendarEventsListResult,
  type LarkCalendarEvent,
  type LarkAttendee,
  type LarkOrganizer,
  type LarkRecurrence,
} from './calendar';

// Types
export * from './types';
