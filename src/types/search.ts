/**
 * Search-related type definitions
 * @module types/search
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Search target types - what can be searched
 */
export const SearchTargetSchema = z.enum([
  'meetings',
  'minutes',
  'transcripts',
  'action_items',
  'all',
]);

/**
 * Date filter schema for search
 */
export const DateFilterSchema = z.object({
  /** Start date (ISO string) */
  from: z.string().datetime({ offset: true }).optional(),
  /** End date (ISO string) */
  to: z.string().datetime({ offset: true }).optional(),
});

/**
 * Participant filter schema
 */
export const ParticipantFilterSchema = z.object({
  /** Participant ID */
  id: z.string().min(1),
  /** Participant name (for display) */
  name: z.string().min(1),
});

/**
 * Search filters schema
 */
export const SearchFiltersSchema = z.object({
  /** Date range filter */
  dateRange: DateFilterSchema.optional(),
  /** Filter by participants */
  participants: z.array(ParticipantFilterSchema).optional(),
  /** Filter by tags */
  tags: z.array(z.string()).optional(),
  /** Filter by meeting status */
  meetingStatus: z
    .enum(['scheduled', 'in_progress', 'ended', 'cancelled'])
    .optional(),
  /** Filter by minutes status */
  minutesStatus: z
    .enum(['not_created', 'draft', 'pending_approval', 'approved'])
    .optional(),
  /** Filter by action item status */
  actionItemStatus: z.enum(['pending', 'in_progress', 'completed']).optional(),
  /** Filter by priority */
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

/**
 * Search query request schema
 */
export const SearchQuerySchema = z.object({
  /** Search query string */
  query: z.string().min(1).max(500),
  /** Search targets */
  targets: z.array(SearchTargetSchema).default(['all']),
  /** Search filters */
  filters: SearchFiltersSchema.optional(),
  /** Page number (1-based) */
  page: z.number().int().positive().default(1),
  /** Items per page */
  limit: z.number().int().positive().max(100).default(20),
  /** Sort by relevance or date */
  sortBy: z.enum(['relevance', 'date']).default('relevance'),
  /** Sort direction */
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Text match schema for highlighting
 */
export const TextMatchSchema = z.object({
  /** Start index of match */
  startIndex: z.number().int().nonnegative(),
  /** End index of match */
  endIndex: z.number().int().nonnegative(),
  /** Matched text */
  matchedText: z.string(),
});

/**
 * Search result item context schema
 */
export const SearchResultContextSchema = z.object({
  /** Text before the match */
  before: z.string(),
  /** Matched text */
  match: z.string(),
  /** Text after the match */
  after: z.string(),
  /** Field where match was found */
  field: z.string(),
});

/**
 * Meeting search result schema
 */
export const MeetingSearchResultSchema = z.object({
  type: z.literal('meeting'),
  /** Meeting ID */
  id: z.string(),
  /** Meeting title */
  title: z.string(),
  /** Meeting date */
  date: z.string(),
  /** Host name */
  hostName: z.string(),
  /** Participant count */
  participantCount: z.number(),
  /** Has minutes */
  hasMinutes: z.boolean(),
  /** Match contexts */
  contexts: z.array(SearchResultContextSchema),
  /** Relevance score (0-1) */
  score: z.number().min(0).max(1),
});

/**
 * Minutes search result schema
 */
export const MinutesSearchResultSchema = z.object({
  type: z.literal('minutes'),
  /** Minutes ID */
  id: z.string(),
  /** Meeting ID */
  meetingId: z.string(),
  /** Meeting title */
  title: z.string(),
  /** Meeting date */
  date: z.string(),
  /** Summary snippet */
  summarySnippet: z.string(),
  /** Match contexts */
  contexts: z.array(SearchResultContextSchema),
  /** Relevance score (0-1) */
  score: z.number().min(0).max(1),
});

/**
 * Transcript search result schema
 */
export const TranscriptSearchResultSchema = z.object({
  type: z.literal('transcript'),
  /** Unique ID for this result (segmentId) */
  id: z.string(),
  /** Meeting ID */
  meetingId: z.string(),
  /** Meeting title */
  meetingTitle: z.string(),
  /** Segment ID */
  segmentId: z.string(),
  /** Speaker name */
  speakerName: z.string(),
  /** Timestamp in milliseconds */
  timestamp: z.number(),
  /** Match contexts */
  contexts: z.array(SearchResultContextSchema),
  /** Relevance score (0-1) */
  score: z.number().min(0).max(1),
});

/**
 * Action item search result schema
 */
export const ActionItemSearchResultSchema = z.object({
  type: z.literal('action_item'),
  /** Action item ID */
  id: z.string(),
  /** Meeting ID */
  meetingId: z.string(),
  /** Meeting title */
  meetingTitle: z.string(),
  /** Action item content */
  content: z.string(),
  /** Assignee name */
  assigneeName: z.string().optional(),
  /** Due date */
  dueDate: z.string().optional(),
  /** Priority */
  priority: z.enum(['high', 'medium', 'low']),
  /** Status */
  status: z.enum(['pending', 'in_progress', 'completed']),
  /** Match contexts */
  contexts: z.array(SearchResultContextSchema),
  /** Relevance score (0-1) */
  score: z.number().min(0).max(1),
});

/**
 * Union of all search result types
 */
export const SearchResultItemSchema = z.discriminatedUnion('type', [
  MeetingSearchResultSchema,
  MinutesSearchResultSchema,
  TranscriptSearchResultSchema,
  ActionItemSearchResultSchema,
]);

/**
 * Facet count schema
 */
export const FacetCountSchema = z.object({
  /** Facet value */
  value: z.string(),
  /** Count of results */
  count: z.number().int().nonnegative(),
  /** Display label */
  label: z.string(),
});

/**
 * Search facets schema
 */
export const SearchFacetsSchema = z.object({
  /** Result counts by type */
  byType: z.array(FacetCountSchema),
  /** Result counts by participant */
  byParticipant: z.array(FacetCountSchema).optional(),
  /** Result counts by date range */
  byDateRange: z.array(FacetCountSchema).optional(),
});

/**
 * Search response schema
 */
export const SearchResponseSchema = z.object({
  /** Search query */
  query: z.string(),
  /** Search results */
  results: z.array(SearchResultItemSchema),
  /** Total number of results */
  total: z.number().int().nonnegative(),
  /** Current page */
  page: z.number().int().positive(),
  /** Items per page */
  limit: z.number().int().positive(),
  /** Total pages */
  totalPages: z.number().int().nonnegative(),
  /** Has more results */
  hasMore: z.boolean(),
  /** Search facets for filtering */
  facets: SearchFacetsSchema.optional(),
  /** Search execution time in milliseconds */
  executionTimeMs: z.number().nonnegative(),
});

// ============================================================================
// Inferred Types
// ============================================================================

/**
 * Search target type
 */
export type SearchTarget = z.infer<typeof SearchTargetSchema>;

/**
 * Date filter type
 */
export type DateFilter = z.infer<typeof DateFilterSchema>;

/**
 * Participant filter type
 */
export type ParticipantFilter = z.infer<typeof ParticipantFilterSchema>;

/**
 * Search filters type
 */
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Search query request type
 */
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Text match type for highlighting
 */
export type TextMatch = z.infer<typeof TextMatchSchema>;

/**
 * Search result context type
 */
export type SearchResultContext = z.infer<typeof SearchResultContextSchema>;

/**
 * Meeting search result type
 */
export type MeetingSearchResult = z.infer<typeof MeetingSearchResultSchema>;

/**
 * Minutes search result type
 */
export type MinutesSearchResult = z.infer<typeof MinutesSearchResultSchema>;

/**
 * Transcript search result type
 */
export type TranscriptSearchResult = z.infer<
  typeof TranscriptSearchResultSchema
>;

/**
 * Action item search result type
 */
export type ActionItemSearchResult = z.infer<
  typeof ActionItemSearchResultSchema
>;

/**
 * Union of all search result types
 */
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * Facet count type
 */
export type FacetCount = z.infer<typeof FacetCountSchema>;

/**
 * Search facets type
 */
export type SearchFacets = z.infer<typeof SearchFacetsSchema>;

/**
 * Search response type
 */
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ============================================================================
// Read-only Types
// ============================================================================

/**
 * Read-only search result context
 */
export interface ReadonlySearchResultContext {
  readonly before: string;
  readonly match: string;
  readonly after: string;
  readonly field: string;
}

/**
 * Read-only search result item (base)
 */
export interface ReadonlySearchResultBase {
  readonly id: string;
  readonly contexts: readonly ReadonlySearchResultContext[];
  readonly score: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create context from matched text
 *
 * @param text - Full text to search in
 * @param query - Search query
 * @param contextLength - Number of characters before/after match
 * @param field - Field name where match was found
 * @returns Array of search result contexts
 *
 * @example
 * ```typescript
 * const contexts = createSearchContexts(
 *   "This is a test meeting about project updates",
 *   "meeting",
 *   30,
 *   "title"
 * );
 * // contexts = [{ before: "is a test ", match: "meeting", after: " about project", field: "title" }]
 * ```
 */
export function createSearchContexts(
  text: string,
  query: string,
  contextLength: number = 50,
  field: string
): SearchResultContext[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const contexts: SearchResultContext[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  let searchIndex = 0;

  while (searchIndex < lowerText.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, searchIndex);
    if (matchIndex === -1) {
      break;
    }

    const beforeStart = Math.max(0, matchIndex - contextLength);
    const afterEnd = Math.min(
      text.length,
      matchIndex + lowerQuery.length + contextLength
    );

    const before =
      (beforeStart > 0 ? '...' : '') +
      text.slice(beforeStart, matchIndex);
    const match = text.slice(matchIndex, matchIndex + lowerQuery.length);
    const after =
      text.slice(matchIndex + lowerQuery.length, afterEnd) +
      (afterEnd < text.length ? '...' : '');

    contexts.push({
      before,
      match,
      after,
      field,
    });

    searchIndex = matchIndex + lowerQuery.length;
  }

  return contexts;
}

/**
 * Calculate relevance score based on match quality
 *
 * @param text - Text being searched
 * @param query - Search query
 * @param fieldWeight - Weight multiplier for this field (default: 1)
 * @returns Relevance score between 0 and 1
 *
 * @example
 * ```typescript
 * const score = calculateRelevanceScore("Meeting about project updates", "meeting", 1.5);
 * // score = 0.8 (approximate)
 * ```
 */
export function calculateRelevanceScore(
  text: string,
  query: string,
  fieldWeight: number = 1
): number {
  if (!query || query.trim() === '' || !text) {
    return 0;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  // Exact match gets highest score
  if (lowerText === lowerQuery) {
    return 1 * fieldWeight;
  }

  // Starts with query
  if (lowerText.startsWith(lowerQuery)) {
    return 0.9 * fieldWeight;
  }

  // Contains query
  if (lowerText.includes(lowerQuery)) {
    // Score based on position and frequency
    const matchCount = (lowerText.match(new RegExp(escapeRegex(lowerQuery), 'g')) ?? []).length;
    const positionFactor = 1 - lowerText.indexOf(lowerQuery) / lowerText.length;
    const frequencyFactor = Math.min(matchCount / 5, 1);
    const lengthFactor = lowerQuery.length / lowerText.length;

    return Math.min(
      (0.5 + positionFactor * 0.2 + frequencyFactor * 0.2 + lengthFactor * 0.1) * fieldWeight,
      1
    );
  }

  // Word-level matching
  const queryWords = lowerQuery.split(/\s+/);
  const textWords = new Set(lowerText.split(/\s+/));
  const matchingWords = queryWords.filter((word) => textWords.has(word));

  if (matchingWords.length > 0) {
    return (matchingWords.length / queryWords.length) * 0.4 * fieldWeight;
  }

  return 0;
}

/**
 * Escape special regex characters
 *
 * @param string - String to escape
 * @returns Escaped string safe for regex
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get unique ID from search result
 */
function getResultId(result: SearchResultItem): string {
  switch (result.type) {
    case 'meeting':
    case 'minutes':
    case 'action_item':
    case 'transcript':
      return result.id;
  }
}

/**
 * Merge and deduplicate search results
 *
 * @param results - Array of search result arrays
 * @returns Merged and deduplicated results sorted by score
 */
export function mergeSearchResults(
  ...results: SearchResultItem[][]
): SearchResultItem[] {
  const seen = new Set<string>();
  const merged: SearchResultItem[] = [];

  for (const resultArray of results) {
    for (const result of resultArray) {
      const key = `${result.type}:${getResultId(result)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }
  }

  return merged.sort((a, b) => b.score - a.score);
}

/**
 * Get result type display label
 *
 * @param type - Search result type
 * @returns Localized display label
 */
export function getResultTypeLabel(type: SearchResultItem['type']): string {
  const labels: Record<SearchResultItem['type'], string> = {
    meeting: '会議',
    minutes: '議事録',
    transcript: 'トランスクリプト',
    action_item: 'アクションアイテム',
  };
  return labels[type];
}

/**
 * Validate search query
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateSearchQuery(
  data: unknown
): z.SafeParseReturnType<unknown, SearchQuery> {
  return SearchQuerySchema.safeParse(data);
}

/**
 * Validate search response
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateSearchResponse(
  data: unknown
): z.SafeParseReturnType<unknown, SearchResponse> {
  return SearchResponseSchema.safeParse(data);
}

/**
 * Create empty search response
 *
 * @param query - Original search query
 * @returns Empty search response
 */
export function createEmptySearchResponse(query: string): SearchResponse {
  return {
    query,
    results: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
    executionTimeMs: 0,
  };
}
