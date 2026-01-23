/**
 * Claude Prompt Templates
 *
 * AIプロンプトテンプレートのエクスポート
 *
 * @module lib/claude/prompts
 *
 * @example
 * ```typescript
 * import {
 *   MINUTES_GENERATION_SYSTEM_PROMPT,
 *   buildMinutesGenerationPrompt,
 *   minutesOutputSchema,
 * } from '@/lib/claude/prompts';
 *
 * // プロンプト構築
 * const userPrompt = buildMinutesGenerationPrompt({
 *   transcript: '...',
 *   meetingTitle: '週次定例会議',
 *   meetingDate: '2025-01-22',
 *   attendees: ['田中', '鈴木'],
 * });
 *
 * // ClaudeClientで使用
 * const result = await client.generateStructuredOutput(
 *   [{ role: 'user', content: userPrompt }],
 *   minutesOutputSchema,
 *   { system: MINUTES_GENERATION_SYSTEM_PROMPT }
 * );
 * ```
 */

// =============================================================================
// Minutes Generation
// =============================================================================

export {
  // System Prompt
  MINUTES_GENERATION_SYSTEM_PROMPT,
  getSystemPrompt,

  // User Prompt Builder
  buildMinutesGenerationPrompt,

  // Output Schema
  minutesOutputSchema,
  MinutesOutputSpeakerSchema,
  MinutesOutputTopicSchema,
  MinutesOutputDecisionSchema,
  MinutesOutputActionItemSchema,

  // Validation
  validateMinutesGenerationInput,
  validateMinutesOutput,

  // Types
  type MinutesGenerationInput,
  type OutputLanguage,
  type MinutesOutput,
  type MinutesOutputSpeaker,
  type MinutesOutputTopic,
  type MinutesOutputDecision,
  type MinutesOutputActionItem,
} from './minutes-generation';

// =============================================================================
// Shared Templates and Utilities
// =============================================================================

export {
  // Template Processing
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateVariables,

  // Structured Prompt Building
  buildStructuredPrompt,

  // Common Templates
  JSON_OUTPUT_INSTRUCTION_JA,
  JSON_OUTPUT_INSTRUCTION_EN,
  JAPANESE_MEETING_INSTRUCTION,
  getJsonOutputInstruction,

  // Utility Functions
  trimText,
  formatList,
  estimateTokenCount,
  splitTranscriptByTokens,
  formatDate,

  // Types
  type TemplateVariables,
  type PromptSection,
  type StructuredPrompt,
} from './templates';

// =============================================================================
// AI Enhancement Prompts
// =============================================================================

export {
  // System Prompts
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
  FOLLOW_UP_DETECTION_SYSTEM_PROMPT,
  QUALITY_SCORING_SYSTEM_PROMPT,
  IMPROVEMENT_SUGGESTION_SYSTEM_PROMPT,

  // Quality Criteria
  QUALITY_CRITERIA,

  // User Prompt Builders
  buildDuplicateDetectionPrompt,
  buildFollowUpDetectionPrompt,
  buildQualityScoringPrompt,
  buildImprovementSuggestionPrompt,
} from './ai-enhancement';

// =============================================================================
// Summary Levels
// =============================================================================

export {
  // System Prompts
  BRIEF_SUMMARY_SYSTEM_PROMPT,
  STANDARD_SUMMARY_SYSTEM_PROMPT,
  DETAILED_SUMMARY_SYSTEM_PROMPT,

  // Prompt Builders
  getSummarySystemPrompt,
  buildSummaryPrompt,

  // Config
  SUMMARY_LEVEL_CONFIGS,
  getSummaryLevelConfig,
  getAllSummaryLevelConfigs,

  // Types
  type SummaryLevelConfig,
} from './summary-levels';
