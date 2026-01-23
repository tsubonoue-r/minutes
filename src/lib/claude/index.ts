/**
 * Claude API Library
 *
 * Anthropic Claude APIを使用するためのライブラリ
 *
 * @example
 * ```typescript
 * import { ClaudeClient, ClaudeApiError, ClaudeParseError } from '@/lib/claude';
 *
 * const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY);
 *
 * // メッセージ送信
 * const response = await client.sendMessage([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 *
 * // 構造化出力
 * import { z } from 'zod';
 * const schema = z.object({ answer: z.string() });
 * const data = await client.generateStructuredOutput(messages, schema);
 * ```
 *
 * @example
 * ```typescript
 * // 議事録生成
 * import {
 *   ClaudeClient,
 *   MINUTES_GENERATION_SYSTEM_PROMPT,
 *   buildMinutesGenerationPrompt,
 *   minutesOutputSchema,
 * } from '@/lib/claude';
 *
 * const prompt = buildMinutesGenerationPrompt({
 *   transcript: '...',
 *   meetingTitle: '定例会議',
 *   meetingDate: '2025-01-22',
 *   attendees: ['田中', '鈴木'],
 * });
 *
 * const minutes = await client.generateStructuredOutput(
 *   [{ role: 'user', content: prompt }],
 *   minutesOutputSchema,
 *   { system: MINUTES_GENERATION_SYSTEM_PROMPT }
 * );
 * ```
 */

// Client
export { ClaudeClient } from './client';

// Types
export type {
  ClaudeClientOptions,
  ClaudeMessage,
  ClaudeRequest,
  ClaudeResponse,
  ContentBlock,
  MessageRole,
  SendMessageOptions,
  StopReason,
  StructuredOutputOptions,
  Usage,
} from './types';

// Error classes
export { ClaudeApiError, ClaudeParseError } from './types';

// Zod schemas
export {
  ClaudeMessageSchema,
  ClaudeRequestSchema,
  ClaudeResponseSchema,
  ContentBlockSchema,
  MessageRoleSchema,
  StopReasonSchema,
  UsageSchema,
} from './types';

// Constants
export { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from './types';

// =============================================================================
// Prompt Templates
// =============================================================================

// Minutes Generation
export {
  MINUTES_GENERATION_SYSTEM_PROMPT,
  getSystemPrompt,
  buildMinutesGenerationPrompt,
  minutesOutputSchema,
  MinutesOutputSpeakerSchema,
  MinutesOutputTopicSchema,
  MinutesOutputDecisionSchema,
  MinutesOutputActionItemSchema,
  validateMinutesGenerationInput,
  validateMinutesOutput,
  type MinutesGenerationInput,
  type OutputLanguage,
  type MinutesOutput,
  type MinutesOutputSpeaker,
  type MinutesOutputTopic,
  type MinutesOutputDecision,
  type MinutesOutputActionItem,
} from './prompts/index';

// Template Utilities
export {
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateVariables,
  buildStructuredPrompt,
  JSON_OUTPUT_INSTRUCTION_JA,
  JSON_OUTPUT_INSTRUCTION_EN,
  JAPANESE_MEETING_INSTRUCTION,
  getJsonOutputInstruction,
  trimText,
  formatList,
  estimateTokenCount,
  splitTranscriptByTokens,
  formatDate,
  type TemplateVariables,
  type PromptSection,
  type StructuredPrompt,
} from './prompts/index';

// AI Enhancement Prompts
export {
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
  FOLLOW_UP_DETECTION_SYSTEM_PROMPT,
  QUALITY_SCORING_SYSTEM_PROMPT,
  IMPROVEMENT_SUGGESTION_SYSTEM_PROMPT,
  QUALITY_CRITERIA,
  buildDuplicateDetectionPrompt,
  buildFollowUpDetectionPrompt,
  buildQualityScoringPrompt,
  buildImprovementSuggestionPrompt,
} from './prompts/index';

// Summary Levels
export {
  BRIEF_SUMMARY_SYSTEM_PROMPT,
  STANDARD_SUMMARY_SYSTEM_PROMPT,
  DETAILED_SUMMARY_SYSTEM_PROMPT,
  getSummarySystemPrompt,
  buildSummaryPrompt,
  SUMMARY_LEVEL_CONFIGS,
  getSummaryLevelConfig,
  getAllSummaryLevelConfigs,
  type SummaryLevelConfig,
} from './prompts/index';
