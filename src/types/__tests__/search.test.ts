/**
 * Search types unit tests
 * @module types/__tests__/search.test
 */

import { describe, it, expect } from 'vitest';
import {
  SearchQuerySchema,
  SearchResponseSchema,
  createSearchContexts,
  calculateRelevanceScore,
  mergeSearchResults,
  getResultTypeLabel,
  createEmptySearchResponse,
  type SearchResultItem,
  type MeetingSearchResult,
  type MinutesSearchResult,
} from '../search';

describe('Search Type Schemas', () => {
  describe('SearchQuerySchema', () => {
    it('should validate valid search query', () => {
      const validQuery = {
        query: 'project update',
        targets: ['meetings', 'minutes'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      };

      const result = SearchQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const minimalQuery = {
        query: 'test',
      };

      const result = SearchQuerySchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targets).toEqual(['all']);
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('relevance');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should reject empty query', () => {
      const invalidQuery = {
        query: '',
      };

      const result = SearchQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should reject query exceeding max length', () => {
      const invalidQuery = {
        query: 'a'.repeat(501),
      };

      const result = SearchQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should validate filters', () => {
      const queryWithFilters = {
        query: 'test',
        filters: {
          dateRange: {
            from: '2025-01-01T00:00:00Z',
            to: '2025-12-31T23:59:59Z',
          },
          meetingStatus: 'ended',
          priority: 'high',
        },
      };

      const result = SearchQuerySchema.safeParse(queryWithFilters);
      expect(result.success).toBe(true);
    });
  });

  describe('SearchResponseSchema', () => {
    it('should validate valid search response', () => {
      const validResponse = {
        query: 'test',
        results: [
          {
            type: 'meeting',
            id: 'meeting-1',
            title: 'Test Meeting',
            date: '2025-01-15T10:00:00Z',
            hostName: 'John Doe',
            participantCount: 5,
            hasMinutes: true,
            contexts: [
              {
                before: 'This is a ',
                match: 'test',
                after: ' meeting',
                field: 'title',
              },
            ],
            score: 0.85,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
        executionTimeMs: 15.5,
      };

      const result = SearchResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate response with facets', () => {
      const responseWithFacets = {
        query: 'test',
        results: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
        executionTimeMs: 5,
        facets: {
          byType: [
            { value: 'meeting', count: 10, label: '会議' },
            { value: 'minutes', count: 5, label: '議事録' },
          ],
        },
      };

      const result = SearchResponseSchema.safeParse(responseWithFacets);
      expect(result.success).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('createSearchContexts', () => {
    it('should create contexts for matching text', () => {
      const text = 'This is a test meeting about project updates';
      const query = 'meeting';
      const contexts = createSearchContexts(text, query, 20, 'title');

      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.match).toBe('meeting');
      expect(contexts[0]?.field).toBe('title');
    });

    it('should find multiple matches', () => {
      const text = 'The meeting was great. The next meeting will be better.';
      const query = 'meeting';
      const contexts = createSearchContexts(text, query, 15, 'content');

      expect(contexts).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const text = 'This is a test';
      const query = 'xyz';
      const contexts = createSearchContexts(text, query, 20, 'title');

      expect(contexts).toHaveLength(0);
    });

    it('should return empty array for empty query', () => {
      const text = 'This is a test';
      const query = '';
      const contexts = createSearchContexts(text, query, 20, 'title');

      expect(contexts).toHaveLength(0);
    });

    it('should handle case-insensitive matching', () => {
      const text = 'This is a TEST meeting';
      const query = 'test';
      const contexts = createSearchContexts(text, query, 20, 'title');

      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.match).toBe('TEST');
    });

    it('should add ellipsis for truncated context', () => {
      const text = 'This is a very long text that contains the word meeting somewhere in the middle';
      const query = 'meeting';
      const contexts = createSearchContexts(text, query, 10, 'content');

      expect(contexts[0]?.before).toContain('...');
      expect(contexts[0]?.after).toContain('...');
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should return 1 for exact match', () => {
      const score = calculateRelevanceScore('meeting', 'meeting', 1);
      expect(score).toBe(1);
    });

    it('should return high score for starts with', () => {
      const score = calculateRelevanceScore('meeting notes', 'meeting', 1);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return positive score for contains', () => {
      const score = calculateRelevanceScore(
        'The weekly meeting notes',
        'meeting',
        1
      );
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.9);
    });

    it('should return 0 for no match', () => {
      const score = calculateRelevanceScore('hello world', 'xyz', 1);
      expect(score).toBe(0);
    });

    it('should apply field weight', () => {
      const scoreWithWeight = calculateRelevanceScore('meeting', 'meeting', 1.5);
      const scoreWithoutWeight = calculateRelevanceScore('meeting', 'meeting', 1);
      expect(scoreWithWeight).toBeGreaterThan(scoreWithoutWeight);
    });

    it('should return 0 for empty query', () => {
      const score = calculateRelevanceScore('test', '', 1);
      expect(score).toBe(0);
    });

    it('should return 0 for empty text', () => {
      const score = calculateRelevanceScore('', 'test', 1);
      expect(score).toBe(0);
    });
  });

  describe('mergeSearchResults', () => {
    it('should merge multiple result arrays', () => {
      const results1: SearchResultItem[] = [
        {
          type: 'meeting',
          id: 'meeting-1',
          title: 'Meeting 1',
          date: '2025-01-15',
          hostName: 'John',
          participantCount: 5,
          hasMinutes: true,
          contexts: [],
          score: 0.9,
        } as MeetingSearchResult,
      ];

      const results2: SearchResultItem[] = [
        {
          type: 'minutes',
          id: 'minutes-1',
          meetingId: 'meeting-1',
          title: 'Minutes 1',
          date: '2025-01-15',
          summarySnippet: 'Summary',
          contexts: [],
          score: 0.8,
        } as MinutesSearchResult,
      ];

      const merged = mergeSearchResults(results1, results2);

      expect(merged).toHaveLength(2);
      const first = merged[0];
      const second = merged[1];
      if (first !== undefined && second !== undefined) {
        expect(first.score).toBeGreaterThanOrEqual(second.score);
      }
    });

    it('should deduplicate results by type and id', () => {
      const results1: SearchResultItem[] = [
        {
          type: 'meeting',
          id: 'meeting-1',
          title: 'Meeting 1',
          date: '2025-01-15',
          hostName: 'John',
          participantCount: 5,
          hasMinutes: true,
          contexts: [],
          score: 0.9,
        } as MeetingSearchResult,
      ];

      const results2: SearchResultItem[] = [
        {
          type: 'meeting',
          id: 'meeting-1', // Same as results1
          title: 'Meeting 1',
          date: '2025-01-15',
          hostName: 'John',
          participantCount: 5,
          hasMinutes: true,
          contexts: [],
          score: 0.8,
        } as MeetingSearchResult,
      ];

      const merged = mergeSearchResults(results1, results2);

      expect(merged).toHaveLength(1);
    });

    it('should sort by score descending', () => {
      const results1: SearchResultItem[] = [
        {
          type: 'meeting',
          id: 'meeting-1',
          title: 'Meeting 1',
          date: '2025-01-15',
          hostName: 'John',
          participantCount: 5,
          hasMinutes: true,
          contexts: [],
          score: 0.5,
        } as MeetingSearchResult,
      ];

      const results2: SearchResultItem[] = [
        {
          type: 'minutes',
          id: 'minutes-1',
          meetingId: 'meeting-1',
          title: 'Minutes 1',
          date: '2025-01-15',
          summarySnippet: 'Summary',
          contexts: [],
          score: 0.9,
        } as MinutesSearchResult,
      ];

      const merged = mergeSearchResults(results1, results2);

      expect(merged[0]?.score).toBe(0.9);
      expect(merged[1]?.score).toBe(0.5);
    });
  });

  describe('getResultTypeLabel', () => {
    it('should return correct label for meeting', () => {
      expect(getResultTypeLabel('meeting')).toBe('会議');
    });

    it('should return correct label for minutes', () => {
      expect(getResultTypeLabel('minutes')).toBe('議事録');
    });

    it('should return correct label for transcript', () => {
      expect(getResultTypeLabel('transcript')).toBe('トランスクリプト');
    });

    it('should return correct label for action_item', () => {
      expect(getResultTypeLabel('action_item')).toBe('アクションアイテム');
    });
  });

  describe('createEmptySearchResponse', () => {
    it('should create empty response with correct query', () => {
      const response = createEmptySearchResponse('test query');

      expect(response.query).toBe('test query');
      expect(response.results).toHaveLength(0);
      expect(response.total).toBe(0);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(20);
      expect(response.totalPages).toBe(0);
      expect(response.hasMore).toBe(false);
      expect(response.executionTimeMs).toBe(0);
    });
  });
});
