/**
 * Minutes (AI-generated meeting minutes) type definitions
 * @module types/minutes
 */

import { z, type ZodSafeParseResult } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for Speaker information
 */
export const SpeakerSchema = z.object({
  /** Unique speaker identifier */
  id: z.string().min(1),
  /** Speaker display name */
  name: z.string().min(1),
  /** Lark user ID for integration (optional) */
  larkUserId: z.string().optional(),
});

/**
 * Zod schema for TopicSegment
 */
export const TopicSegmentSchema = z.object({
  /** Unique segment identifier */
  id: z.string().min(1),
  /** Topic title */
  title: z.string().min(1),
  /** Start time in milliseconds from meeting start */
  startTime: z.number().int().nonnegative(),
  /** End time in milliseconds from meeting start */
  endTime: z.number().int().nonnegative(),
  /** AI-generated summary of the topic */
  summary: z.string(),
  /** Key points discussed */
  keyPoints: z.array(z.string()),
  /** Speakers who participated in this topic */
  speakers: z.array(SpeakerSchema),
}).refine((data) => data.endTime >= data.startTime, {
  message: 'endTime must be greater than or equal to startTime',
  path: ['endTime'],
});

/**
 * Zod schema for DecisionItem
 */
export const DecisionItemSchema = z.object({
  /** Unique decision identifier */
  id: z.string().min(1),
  /** Decision content */
  content: z.string().min(1),
  /** Background or reasoning for the decision */
  context: z.string(),
  /** Time when decision was made (milliseconds) */
  decidedAt: z.number().int().nonnegative(),
  /** Related topic segment ID (optional) */
  relatedTopicId: z.string().optional(),
});

/**
 * Priority level for action items
 */
export const PrioritySchema = z.enum(['high', 'medium', 'low']);

/**
 * Status of action items
 */
export const ActionItemStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

/**
 * Zod schema for ActionItem
 */
export const ActionItemSchema = z.object({
  /** Unique action item identifier */
  id: z.string().min(1),
  /** Task content */
  content: z.string().min(1),
  /** Assigned person (optional) */
  assignee: SpeakerSchema.optional(),
  /** Due date in ISO format (optional) */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date format YYYY-MM-DD').optional(),
  /** Priority level */
  priority: PrioritySchema,
  /** Current status */
  status: ActionItemStatusSchema,
  /** Related topic segment ID (optional) */
  relatedTopicId: z.string().optional(),
});

/**
 * Zod schema for MinutesMetadata
 */
export const MinutesMetadataSchema = z.object({
  /** Generation timestamp in ISO format */
  generatedAt: z.string().datetime({ offset: true }),
  /** AI model used for generation */
  model: z.string().min(1),
  /** Processing time in milliseconds */
  processingTimeMs: z.number().int().nonnegative(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
});

/**
 * Zod schema for Minutes (complete meeting minutes)
 */
export const MinutesSchema = z.object({
  /** Unique minutes identifier */
  id: z.string().min(1),
  /** Associated meeting identifier */
  meetingId: z.string().min(1),
  /** Meeting title */
  title: z.string().min(1),
  /** Meeting date in ISO format */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Meeting duration in milliseconds */
  duration: z.number().int().nonnegative(),
  /** Overall meeting summary (3-5 sentences) */
  summary: z.string(),
  /** Topic segments */
  topics: z.array(TopicSegmentSchema),
  /** Decision items */
  decisions: z.array(DecisionItemSchema),
  /** Action items */
  actionItems: z.array(ActionItemSchema),
  /** Meeting attendees */
  attendees: z.array(SpeakerSchema),
  /** Generation metadata */
  metadata: MinutesMetadataSchema,
});

// ============================================================================
// Core Types (inferred from Zod schemas)
// ============================================================================

/**
 * Speaker information in meeting minutes
 */
export type Speaker = z.infer<typeof SpeakerSchema>;

/**
 * A topic segment representing a discussion topic within the meeting
 */
export type TopicSegment = z.infer<typeof TopicSegmentSchema>;

/**
 * A decision made during the meeting
 */
export type DecisionItem = z.infer<typeof DecisionItemSchema>;

/**
 * Priority level for action items
 */
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Status of an action item
 */
export type ActionItemStatus = z.infer<typeof ActionItemStatusSchema>;

/**
 * An action item or task assigned during the meeting
 */
export type ActionItem = z.infer<typeof ActionItemSchema>;

/**
 * Metadata about the AI-generated minutes
 */
export type MinutesMetadata = z.infer<typeof MinutesMetadataSchema>;

/**
 * Complete AI-generated meeting minutes
 */
export type Minutes = z.infer<typeof MinutesSchema>;

// ============================================================================
// Read-only Types (for immutable usage)
// ============================================================================

/**
 * Read-only Speaker type
 */
export interface ReadonlySpeaker {
  readonly id: string;
  readonly name: string;
  readonly larkUserId?: string | undefined;
}

/**
 * Read-only TopicSegment type
 */
export interface ReadonlyTopicSegment {
  readonly id: string;
  readonly title: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly summary: string;
  readonly keyPoints: readonly string[];
  readonly speakers: readonly ReadonlySpeaker[];
}

/**
 * Read-only DecisionItem type
 */
export interface ReadonlyDecisionItem {
  readonly id: string;
  readonly content: string;
  readonly context: string;
  readonly decidedAt: number;
  readonly relatedTopicId?: string | undefined;
}

/**
 * Read-only ActionItem type
 */
export interface ReadonlyActionItem {
  readonly id: string;
  readonly content: string;
  readonly assignee?: ReadonlySpeaker | undefined;
  readonly dueDate?: string | undefined;
  readonly priority: Priority;
  readonly status: ActionItemStatus;
  readonly relatedTopicId?: string | undefined;
}

/**
 * Read-only MinutesMetadata type
 */
export interface ReadonlyMinutesMetadata {
  readonly generatedAt: string;
  readonly model: string;
  readonly processingTimeMs: number;
  readonly confidence: number;
}

/**
 * Read-only Minutes type
 */
export interface ReadonlyMinutes {
  readonly id: string;
  readonly meetingId: string;
  readonly title: string;
  readonly date: string;
  readonly duration: number;
  readonly summary: string;
  readonly topics: readonly ReadonlyTopicSegment[];
  readonly decisions: readonly ReadonlyDecisionItem[];
  readonly actionItems: readonly ReadonlyActionItem[];
  readonly attendees: readonly ReadonlySpeaker[];
  readonly metadata: ReadonlyMinutesMetadata;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for minutes-related entities
 *
 * @param prefix - Prefix for the ID (e.g., 'min', 'topic', 'action')
 * @returns A unique identifier string
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create an empty Minutes object with default values
 *
 * @param meetingId - The associated meeting ID
 * @param title - Optional title for the minutes
 * @returns A new Minutes object with empty/default values
 *
 * @example
 * ```typescript
 * const minutes = createEmptyMinutes('meeting-123');
 * // minutes.id = 'min_xxxxx'
 * // minutes.topics = []
 * // minutes.decisions = []
 * // minutes.actionItems = []
 * ```
 */
export function createEmptyMinutes(meetingId: string, title?: string): Minutes {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  return {
    id: generateId('min'),
    meetingId,
    title: title ?? 'Untitled Meeting',
    date: dateStr ?? '1970-01-01',
    duration: 0,
    summary: '',
    topics: [],
    decisions: [],
    actionItems: [],
    attendees: [],
    metadata: {
      generatedAt: now.toISOString(),
      model: 'unknown',
      processingTimeMs: 0,
      confidence: 0,
    },
  };
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1h 30m", "45m", "2h")
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '0m';
  }
}

/**
 * Format timestamp in milliseconds to MM:SS or HH:MM:SS format
 *
 * @param ms - Time in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(ms: number): string {
  if (ms < 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Convert Minutes to Markdown format
 *
 * @param minutes - The Minutes object to convert
 * @returns Markdown string representation
 *
 * @example
 * ```typescript
 * const markdown = minutesToMarkdown(minutes);
 * // Returns formatted markdown with all sections
 * ```
 */
export function minutesToMarkdown(minutes: Minutes): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${minutes.title}`);
  lines.push('');
  lines.push(`**Date:** ${minutes.date}`);
  lines.push(`**Duration:** ${formatDuration(minutes.duration)}`);
  lines.push('');

  // Attendees
  if (minutes.attendees.length > 0) {
    lines.push('## Attendees');
    lines.push('');
    for (const attendee of minutes.attendees) {
      lines.push(`- ${attendee.name}`);
    }
    lines.push('');
  }

  // Summary
  if (minutes.summary) {
    lines.push('## Summary');
    lines.push('');
    lines.push(minutes.summary);
    lines.push('');
  }

  // Topics
  if (minutes.topics.length > 0) {
    lines.push('## Topics Discussed');
    lines.push('');
    for (const topic of minutes.topics) {
      lines.push(`### ${topic.title}`);
      lines.push('');
      lines.push(`*${formatTimestamp(topic.startTime)} - ${formatTimestamp(topic.endTime)}*`);
      lines.push('');
      if (topic.summary) {
        lines.push(topic.summary);
        lines.push('');
      }
      if (topic.keyPoints.length > 0) {
        lines.push('**Key Points:**');
        for (const point of topic.keyPoints) {
          lines.push(`- ${point}`);
        }
        lines.push('');
      }
      if (topic.speakers.length > 0) {
        lines.push(`**Speakers:** ${topic.speakers.map((s) => s.name).join(', ')}`);
        lines.push('');
      }
    }
  }

  // Decisions
  if (minutes.decisions.length > 0) {
    lines.push('## Decisions');
    lines.push('');
    for (const decision of minutes.decisions) {
      lines.push(`### ${decision.content}`);
      lines.push('');
      if (decision.context) {
        lines.push(`*Context:* ${decision.context}`);
        lines.push('');
      }
      lines.push(`*Decided at:* ${formatTimestamp(decision.decidedAt)}`);
      lines.push('');
    }
  }

  // Action Items
  if (minutes.actionItems.length > 0) {
    lines.push('## Action Items');
    lines.push('');
    lines.push('| Task | Assignee | Priority | Due Date | Status |');
    lines.push('|------|----------|----------|----------|--------|');
    for (const item of minutes.actionItems) {
      const assignee = item.assignee?.name ?? 'Unassigned';
      const dueDate = item.dueDate ?? '-';
      const status = item.status.replace('_', ' ');
      lines.push(`| ${item.content} | ${assignee} | ${item.priority} | ${dueDate} | ${status} |`);
    }
    lines.push('');
  }

  // Metadata footer
  lines.push('---');
  lines.push('');
  lines.push(`*Generated: ${minutes.metadata.generatedAt} | Model: ${minutes.metadata.model} | Confidence: ${(minutes.metadata.confidence * 100).toFixed(1)}%*`);

  return lines.join('\n');
}

/**
 * Filter action items by status
 *
 * @param items - Array of action items to filter
 * @param status - Status to filter by
 * @returns Filtered array of action items
 *
 * @example
 * ```typescript
 * const pendingItems = filterActionItemsByStatus(items, 'pending');
 * const completedItems = filterActionItemsByStatus(items, 'completed');
 * ```
 */
export function filterActionItemsByStatus(
  items: readonly ActionItem[],
  status: ActionItemStatus
): ActionItem[] {
  return items.filter((item) => item.status === status);
}

/**
 * Priority order mapping for sorting
 */
const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Sort action items by priority (high -> medium -> low)
 *
 * @param items - Array of action items to sort
 * @returns New sorted array of action items
 *
 * @example
 * ```typescript
 * const sorted = sortActionItemsByPriority(items);
 * // sorted[0].priority === 'high'
 * ```
 */
export function sortActionItemsByPriority(items: readonly ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/**
 * Get action items assigned to a specific speaker
 *
 * @param items - Array of action items
 * @param speakerId - Speaker ID to filter by
 * @returns Array of action items assigned to the speaker
 */
export function getActionItemsByAssignee(
  items: readonly ActionItem[],
  speakerId: string
): ActionItem[] {
  return items.filter((item) => item.assignee?.id === speakerId);
}

/**
 * Get total duration of all topic segments
 *
 * @param topics - Array of topic segments
 * @returns Total duration in milliseconds
 */
export function getTotalTopicsDuration(topics: readonly TopicSegment[]): number {
  return topics.reduce((total, topic) => total + (topic.endTime - topic.startTime), 0);
}

/**
 * Find topic segment by ID
 *
 * @param minutes - Minutes object to search
 * @param topicId - Topic ID to find
 * @returns TopicSegment if found, undefined otherwise
 */
export function findTopicById(
  minutes: Minutes,
  topicId: string
): TopicSegment | undefined {
  return minutes.topics.find((topic) => topic.id === topicId);
}

/**
 * Get decisions related to a specific topic
 *
 * @param minutes - Minutes object
 * @param topicId - Topic ID to filter by
 * @returns Array of decision items related to the topic
 */
export function getDecisionsByTopicId(
  minutes: Minutes,
  topicId: string
): DecisionItem[] {
  return minutes.decisions.filter((decision) => decision.relatedTopicId === topicId);
}

/**
 * Get action items related to a specific topic
 *
 * @param minutes - Minutes object
 * @param topicId - Topic ID to filter by
 * @returns Array of action items related to the topic
 */
export function getActionItemsByTopicId(
  minutes: Minutes,
  topicId: string
): ActionItem[] {
  return minutes.actionItems.filter((item) => item.relatedTopicId === topicId);
}

/**
 * Calculate completion percentage of action items
 *
 * @param items - Array of action items
 * @returns Completion percentage (0-100)
 */
export function calculateCompletionPercentage(items: readonly ActionItem[]): number {
  if (items.length === 0) {
    return 0;
  }
  const completed = items.filter((item) => item.status === 'completed').length;
  return Math.round((completed / items.length) * 100);
}

/**
 * Create a new Speaker object
 *
 * @param id - Speaker ID
 * @param name - Speaker name
 * @param larkUserId - Optional Lark user ID
 * @returns Speaker object
 */
export function createSpeaker(
  id: string,
  name: string,
  larkUserId?: string
): Speaker {
  const speaker: Speaker = {
    id,
    name,
  };

  if (larkUserId !== undefined) {
    return { ...speaker, larkUserId };
  }

  return speaker;
}

/**
 * Create a new ActionItem object
 *
 * @param content - Task content
 * @param priority - Priority level (default: 'medium')
 * @param assignee - Optional assignee
 * @param dueDate - Optional due date
 * @returns ActionItem object
 */
export function createActionItem(
  content: string,
  priority: Priority = 'medium',
  assignee?: Speaker,
  dueDate?: string
): ActionItem {
  const base: ActionItem = {
    id: generateId('action'),
    content,
    priority,
    status: 'pending',
  };

  if (assignee !== undefined && dueDate !== undefined) {
    return { ...base, assignee, dueDate };
  } else if (assignee !== undefined) {
    return { ...base, assignee };
  } else if (dueDate !== undefined) {
    return { ...base, dueDate };
  }

  return base;
}

/**
 * Create a new DecisionItem object
 *
 * @param content - Decision content
 * @param context - Context or reasoning
 * @param decidedAt - Time of decision in milliseconds
 * @param relatedTopicId - Optional related topic ID
 * @returns DecisionItem object
 */
export function createDecisionItem(
  content: string,
  context: string,
  decidedAt: number,
  relatedTopicId?: string
): DecisionItem {
  const base: DecisionItem = {
    id: generateId('decision'),
    content,
    context,
    decidedAt,
  };

  if (relatedTopicId !== undefined) {
    return { ...base, relatedTopicId };
  }

  return base;
}

/**
 * Create a new TopicSegment object
 *
 * @param title - Topic title
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @param summary - Topic summary
 * @param keyPoints - Key points array
 * @param speakers - Speakers array
 * @returns TopicSegment object
 */
export function createTopicSegment(
  title: string,
  startTime: number,
  endTime: number,
  summary: string = '',
  keyPoints: string[] = [],
  speakers: Speaker[] = []
): TopicSegment {
  return {
    id: generateId('topic'),
    title,
    startTime,
    endTime,
    summary,
    keyPoints,
    speakers,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a Minutes object using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateMinutes(data: unknown): ZodSafeParseResult<Minutes> {
  return MinutesSchema.safeParse(data);
}

/**
 * Validate an ActionItem object using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItem(data: unknown): ZodSafeParseResult<ActionItem> {
  return ActionItemSchema.safeParse(data);
}

/**
 * Validate a TopicSegment object using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateTopicSegment(data: unknown): ZodSafeParseResult<TopicSegment> {
  return TopicSegmentSchema.safeParse(data);
}

/**
 * Validate a Speaker object using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateSpeaker(data: unknown): ZodSafeParseResult<Speaker> {
  return SpeakerSchema.safeParse(data);
}

/**
 * Validate a DecisionItem object using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateDecisionItem(data: unknown): ZodSafeParseResult<DecisionItem> {
  return DecisionItemSchema.safeParse(data);
}
