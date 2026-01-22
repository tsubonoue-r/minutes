/**
 * Search service for full-text search across meetings, minutes, and transcripts
 * @module services/search.service
 */

import type {
  SearchQuery,
  SearchResponse,
  SearchResultItem,
  SearchFilters,
  SearchFacets,
  FacetCount,
  MeetingSearchResult,
  MinutesSearchResult,
  TranscriptSearchResult,
  ActionItemSearchResult,
  SearchResultContext,
} from '@/types/search';
import {
  createSearchContexts,
  calculateRelevanceScore,
  mergeSearchResults,
  createEmptySearchResponse,
} from '@/types/search';
import type { Meeting } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { Transcript } from '@/types/transcript';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Search service error class
 */
export class SearchServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SearchServiceError';
  }
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Data sources for search
 */
export interface SearchDataSources {
  /** Meetings data */
  readonly meetings: readonly Meeting[];
  /** Minutes data */
  readonly minutes: readonly Minutes[];
  /** Transcripts data */
  readonly transcripts: readonly Transcript[];
}

/**
 * Search service options
 */
export interface SearchServiceOptions {
  /** Maximum context length for snippets */
  readonly contextLength?: number;
  /** Minimum score threshold for results */
  readonly minScoreThreshold?: number;
  /** Field weights for relevance scoring */
  readonly fieldWeights?: FieldWeights;
}

/**
 * Field weights for relevance scoring
 */
export interface FieldWeights {
  /** Weight for title matches */
  readonly title: number;
  /** Weight for summary matches */
  readonly summary: number;
  /** Weight for content matches */
  readonly content: number;
  /** Weight for speaker name matches */
  readonly speaker: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default search service options
 */
const DEFAULT_OPTIONS: Required<SearchServiceOptions> = {
  contextLength: 50,
  minScoreThreshold: 0.1,
  fieldWeights: {
    title: 1.5,
    summary: 1.2,
    content: 1.0,
    speaker: 0.8,
  },
};

// ============================================================================
// Search Service Implementation
// ============================================================================

/**
 * Search service for full-text search
 *
 * @example
 * ```typescript
 * const service = new SearchService({
 *   meetings: meetingsData,
 *   minutes: minutesData,
 *   transcripts: transcriptsData,
 * });
 *
 * const results = await service.search({
 *   query: 'project update',
 *   targets: ['meetings', 'minutes'],
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export class SearchService {
  private readonly options: Required<SearchServiceOptions>;
  private readonly dataSources: SearchDataSources;

  constructor(
    dataSources: SearchDataSources,
    options: SearchServiceOptions = {}
  ) {
    this.dataSources = dataSources;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      fieldWeights: {
        ...DEFAULT_OPTIONS.fieldWeights,
        ...options.fieldWeights,
      },
    };
  }

  /**
   * Execute search query
   *
   * @param query - Search query parameters
   * @returns Search response with results and pagination
   */
  search(query: SearchQuery): SearchResponse {
    const startTime = performance.now();

    try {
      const { query: searchText, targets, filters, page, limit, sortBy, sortOrder } = query;

      if (!searchText || searchText.trim() === '') {
        return createEmptySearchResponse(searchText);
      }

      const normalizedQuery = searchText.trim().toLowerCase();

      // Determine which targets to search
      const searchTargets = targets.includes('all')
        ? ['meetings', 'minutes', 'transcripts', 'action_items']
        : targets;

      // Execute searches
      const searchResults: SearchResultItem[][] = [];

      if (searchTargets.includes('meetings')) {
        searchResults.push(this.searchMeetings(normalizedQuery, filters));
      }
      if (searchTargets.includes('minutes')) {
        searchResults.push(this.searchMinutes(normalizedQuery, filters));
      }
      if (searchTargets.includes('transcripts')) {
        searchResults.push(this.searchTranscripts(normalizedQuery, filters));
      }
      if (searchTargets.includes('action_items')) {
        searchResults.push(this.searchActionItems(normalizedQuery, filters));
      }

      let allResults = mergeSearchResults(...searchResults);

      // Apply minimum score threshold
      allResults = allResults.filter(
        (result) => result.score >= this.options.minScoreThreshold
      );

      // Sort results
      allResults = this.sortResults(allResults, sortBy, sortOrder);

      // Calculate pagination
      const total = allResults.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedResults = allResults.slice(startIndex, startIndex + limit);

      // Calculate facets
      const facets = this.calculateFacets(allResults);

      const executionTimeMs = performance.now() - startTime;

      return {
        query: searchText,
        results: paginatedResults,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
        facets,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = performance.now() - startTime;

      if (error instanceof SearchServiceError) {
        throw error;
      }

      throw new SearchServiceError(
        'Search failed',
        'SEARCH_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error), executionTimeMs }
      );
    }
  }

  /**
   * Search meetings
   */
  private searchMeetings(
    query: string,
    filters?: SearchFilters
  ): MeetingSearchResult[] {
    const results: MeetingSearchResult[] = [];

    for (const meeting of this.dataSources.meetings) {
      // Apply filters
      if (!this.matchesFilters(meeting, filters)) {
        continue;
      }

      const contexts: SearchResultContext[] = [];
      let maxScore = 0;

      // Search in title
      const titleContexts = createSearchContexts(
        meeting.title,
        query,
        this.options.contextLength,
        'title'
      );
      if (titleContexts.length > 0) {
        contexts.push(...titleContexts);
        const titleScore = calculateRelevanceScore(
          meeting.title,
          query,
          this.options.fieldWeights.title
        );
        maxScore = Math.max(maxScore, titleScore);
      }

      // Search in host name
      const hostContexts = createSearchContexts(
        meeting.host.name,
        query,
        this.options.contextLength,
        'host'
      );
      if (hostContexts.length > 0) {
        contexts.push(...hostContexts);
        const hostScore = calculateRelevanceScore(
          meeting.host.name,
          query,
          this.options.fieldWeights.speaker
        );
        maxScore = Math.max(maxScore, hostScore);
      }

      // Search in meeting number
      const meetingNoContexts = createSearchContexts(
        meeting.meetingNo,
        query,
        this.options.contextLength,
        'meetingNo'
      );
      if (meetingNoContexts.length > 0) {
        contexts.push(...meetingNoContexts);
        const meetingNoScore = calculateRelevanceScore(
          meeting.meetingNo,
          query,
          this.options.fieldWeights.content
        );
        maxScore = Math.max(maxScore, meetingNoScore);
      }

      if (contexts.length > 0) {
        // Check if minutes exist
        const hasMinutes = this.dataSources.minutes.some(
          (m) => m.meetingId === meeting.id
        );

        results.push({
          type: 'meeting',
          id: meeting.id,
          title: meeting.title,
          date: meeting.startTime.toISOString(),
          hostName: meeting.host.name,
          participantCount: meeting.participantCount,
          hasMinutes,
          contexts: contexts.slice(0, 3), // Limit contexts
          score: Math.min(maxScore, 1),
        });
      }
    }

    return results;
  }

  /**
   * Search minutes
   */
  private searchMinutes(
    query: string,
    filters?: SearchFilters
  ): MinutesSearchResult[] {
    const results: MinutesSearchResult[] = [];

    for (const minutes of this.dataSources.minutes) {
      // Apply filters
      if (!this.matchesMinutesFilters(minutes, filters)) {
        continue;
      }

      const contexts: SearchResultContext[] = [];
      let maxScore = 0;

      // Search in title
      const titleContexts = createSearchContexts(
        minutes.title,
        query,
        this.options.contextLength,
        'title'
      );
      if (titleContexts.length > 0) {
        contexts.push(...titleContexts);
        const titleScore = calculateRelevanceScore(
          minutes.title,
          query,
          this.options.fieldWeights.title
        );
        maxScore = Math.max(maxScore, titleScore);
      }

      // Search in summary
      const summaryContexts = createSearchContexts(
        minutes.summary,
        query,
        this.options.contextLength,
        'summary'
      );
      if (summaryContexts.length > 0) {
        contexts.push(...summaryContexts);
        const summaryScore = calculateRelevanceScore(
          minutes.summary,
          query,
          this.options.fieldWeights.summary
        );
        maxScore = Math.max(maxScore, summaryScore);
      }

      // Search in topics
      for (const topic of minutes.topics) {
        const topicTitleContexts = createSearchContexts(
          topic.title,
          query,
          this.options.contextLength,
          'topic.title'
        );
        if (topicTitleContexts.length > 0) {
          contexts.push(...topicTitleContexts);
          const topicScore = calculateRelevanceScore(
            topic.title,
            query,
            this.options.fieldWeights.content
          );
          maxScore = Math.max(maxScore, topicScore);
        }

        const topicSummaryContexts = createSearchContexts(
          topic.summary,
          query,
          this.options.contextLength,
          'topic.summary'
        );
        if (topicSummaryContexts.length > 0) {
          contexts.push(...topicSummaryContexts);
          const topicSummaryScore = calculateRelevanceScore(
            topic.summary,
            query,
            this.options.fieldWeights.content
          );
          maxScore = Math.max(maxScore, topicSummaryScore);
        }

        // Search in key points
        for (const keyPoint of topic.keyPoints) {
          const keyPointContexts = createSearchContexts(
            keyPoint,
            query,
            this.options.contextLength,
            'topic.keyPoint'
          );
          if (keyPointContexts.length > 0) {
            contexts.push(...keyPointContexts);
            const keyPointScore = calculateRelevanceScore(
              keyPoint,
              query,
              this.options.fieldWeights.content
            );
            maxScore = Math.max(maxScore, keyPointScore);
          }
        }
      }

      // Search in decisions
      for (const decision of minutes.decisions) {
        const decisionContexts = createSearchContexts(
          decision.content,
          query,
          this.options.contextLength,
          'decision'
        );
        if (decisionContexts.length > 0) {
          contexts.push(...decisionContexts);
          const decisionScore = calculateRelevanceScore(
            decision.content,
            query,
            this.options.fieldWeights.content
          );
          maxScore = Math.max(maxScore, decisionScore);
        }
      }

      if (contexts.length > 0) {
        results.push({
          type: 'minutes',
          id: minutes.id,
          meetingId: minutes.meetingId,
          title: minutes.title,
          date: minutes.date,
          summarySnippet: this.createSnippet(minutes.summary, 150),
          contexts: contexts.slice(0, 5), // Limit contexts
          score: Math.min(maxScore, 1),
        });
      }
    }

    return results;
  }

  /**
   * Search transcripts
   */
  private searchTranscripts(
    query: string,
    filters?: SearchFilters
  ): TranscriptSearchResult[] {
    const results: TranscriptSearchResult[] = [];

    for (const transcript of this.dataSources.transcripts) {
      // Find meeting for this transcript
      const meeting = this.dataSources.meetings.find(
        (m) => m.id === transcript.meetingId
      );

      if (!meeting) {
        continue;
      }

      // Apply filters
      if (!this.matchesFilters(meeting, filters)) {
        continue;
      }

      // Search in each segment
      for (const segment of transcript.segments) {
        const contexts = createSearchContexts(
          segment.text,
          query,
          this.options.contextLength,
          'segment'
        );

        if (contexts.length > 0) {
          const score = calculateRelevanceScore(
            segment.text,
            query,
            this.options.fieldWeights.content
          );

          results.push({
            type: 'transcript',
            id: segment.id,
            meetingId: transcript.meetingId,
            meetingTitle: meeting.title,
            segmentId: segment.id,
            speakerName: segment.speaker.name,
            timestamp: segment.startTime,
            contexts: contexts.slice(0, 2),
            score: Math.min(score, 1),
          });
        }
      }
    }

    return results;
  }

  /**
   * Search action items
   */
  private searchActionItems(
    query: string,
    filters?: SearchFilters
  ): ActionItemSearchResult[] {
    const results: ActionItemSearchResult[] = [];

    for (const minutes of this.dataSources.minutes) {
      // Find meeting for this minutes
      const meeting = this.dataSources.meetings.find(
        (m) => m.id === minutes.meetingId
      );

      if (!meeting) {
        continue;
      }

      // Apply filters
      if (!this.matchesFilters(meeting, filters)) {
        continue;
      }

      // Search in action items
      for (const actionItem of minutes.actionItems) {
        // Apply action item specific filters
        if (
          filters?.actionItemStatus !== undefined &&
          actionItem.status !== filters.actionItemStatus
        ) {
          continue;
        }

        if (
          filters?.priority !== undefined &&
          actionItem.priority !== filters.priority
        ) {
          continue;
        }

        const contexts: SearchResultContext[] = [];
        let maxScore = 0;

        // Search in content
        const contentContexts = createSearchContexts(
          actionItem.content,
          query,
          this.options.contextLength,
          'content'
        );
        if (contentContexts.length > 0) {
          contexts.push(...contentContexts);
          const contentScore = calculateRelevanceScore(
            actionItem.content,
            query,
            this.options.fieldWeights.content
          );
          maxScore = Math.max(maxScore, contentScore);
        }

        // Search in assignee name
        if (actionItem.assignee) {
          const assigneeContexts = createSearchContexts(
            actionItem.assignee.name,
            query,
            this.options.contextLength,
            'assignee'
          );
          if (assigneeContexts.length > 0) {
            contexts.push(...assigneeContexts);
            const assigneeScore = calculateRelevanceScore(
              actionItem.assignee.name,
              query,
              this.options.fieldWeights.speaker
            );
            maxScore = Math.max(maxScore, assigneeScore);
          }
        }

        if (contexts.length > 0) {
          results.push({
            type: 'action_item',
            id: actionItem.id,
            meetingId: minutes.meetingId,
            meetingTitle: minutes.title,
            content: actionItem.content,
            assigneeName: actionItem.assignee?.name,
            dueDate: actionItem.dueDate,
            priority: actionItem.priority,
            status: actionItem.status,
            contexts: contexts.slice(0, 2),
            score: Math.min(maxScore, 1),
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if meeting matches filters
   */
  private matchesFilters(
    meeting: Meeting,
    filters?: SearchFilters
  ): boolean {
    if (!filters) {
      return true;
    }

    // Date range filter
    if (filters.dateRange) {
      const meetingDate = meeting.startTime;

      if (filters.dateRange.from !== undefined && filters.dateRange.from !== '') {
        const fromDate = new Date(filters.dateRange.from);
        if (meetingDate < fromDate) {
          return false;
        }
      }

      if (filters.dateRange.to !== undefined && filters.dateRange.to !== '') {
        const toDate = new Date(filters.dateRange.to);
        if (meetingDate > toDate) {
          return false;
        }
      }
    }

    // Participant filter
    if (filters.participants !== undefined && filters.participants.length > 0) {
      const participantIds = new Set(
        filters.participants.map((p) => p.id)
      );
      // Check if host matches (simplified - in real app, check all participants)
      if (!participantIds.has(meeting.host.id)) {
        return false;
      }
    }

    // Meeting status filter
    if (filters.meetingStatus !== undefined && meeting.status !== filters.meetingStatus) {
      return false;
    }

    return true;
  }

  /**
   * Check if minutes matches filters
   */
  private matchesMinutesFilters(
    minutes: Minutes,
    filters?: SearchFilters
  ): boolean {
    if (filters === undefined) {
      return true;
    }

    // Date range filter
    if (filters.dateRange !== undefined) {
      const minutesDate = new Date(minutes.date);

      if (filters.dateRange.from !== undefined && filters.dateRange.from !== '') {
        const fromDate = new Date(filters.dateRange.from);
        if (minutesDate < fromDate) {
          return false;
        }
      }

      if (filters.dateRange.to !== undefined && filters.dateRange.to !== '') {
        const toDate = new Date(filters.dateRange.to);
        if (minutesDate > toDate) {
          return false;
        }
      }
    }

    // Participant filter
    if (filters.participants !== undefined && filters.participants.length > 0) {
      const participantIds = new Set(
        filters.participants.map((p) => p.id)
      );
      const hasMatchingAttendee = minutes.attendees.some((a) =>
        participantIds.has(a.id)
      );
      if (!hasMatchingAttendee) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sort results
   */
  private sortResults(
    results: SearchResultItem[],
    sortBy: 'relevance' | 'date',
    sortOrder: 'asc' | 'desc'
  ): SearchResultItem[] {
    const sorted = [...results];

    if (sortBy === 'relevance') {
      sorted.sort((a, b) =>
        sortOrder === 'desc' ? b.score - a.score : a.score - b.score
      );
    } else {
      // Sort by date
      sorted.sort((a, b) => {
        const dateA = this.getResultDate(a);
        const dateB = this.getResultDate(b);
        return sortOrder === 'desc'
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });
    }

    return sorted;
  }

  /**
   * Get date from search result
   */
  private getResultDate(result: SearchResultItem): Date {
    switch (result.type) {
      case 'meeting':
        return new Date(result.date);
      case 'minutes':
        return new Date(result.date);
      case 'transcript':
        return new Date(); // Would need meeting date
      case 'action_item':
        return result.dueDate !== undefined ? new Date(result.dueDate) : new Date();
    }
  }

  /**
   * Calculate facets for filtering
   */
  private calculateFacets(results: SearchResultItem[]): SearchFacets {
    // Count by type
    const typeCounts = new Map<string, number>();
    for (const result of results) {
      typeCounts.set(result.type, (typeCounts.get(result.type) ?? 0) + 1);
    }

    const typeLabels: Record<string, string> = {
      meeting: '会議',
      minutes: '議事録',
      transcript: 'トランスクリプト',
      action_item: 'アクションアイテム',
    };

    const byType: FacetCount[] = Array.from(typeCounts.entries()).map(
      ([value, count]) => ({
        value,
        count,
        label: typeLabels[value] ?? value,
      })
    );

    return { byType };
  }

  /**
   * Create snippet from text
   */
  private createSnippet(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + '...';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create search service instance
 *
 * @param dataSources - Data sources for search
 * @param options - Search service options
 * @returns Search service instance
 */
export function createSearchService(
  dataSources: SearchDataSources,
  options?: SearchServiceOptions
): SearchService {
  return new SearchService(dataSources, options);
}
