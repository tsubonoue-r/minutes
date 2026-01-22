/**
 * Search service unit tests
 * @module services/__tests__/search.service.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchService,
  createSearchService,
  SearchServiceError,
  type SearchDataSources,
} from '../search.service';
import type { Meeting, MeetingUser } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { Transcript } from '@/types/transcript';

// ============================================================================
// Test Data
// ============================================================================

const createMockHost = (): MeetingUser => ({
  id: 'host-1',
  name: 'John Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
});

const createMockMeeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  id: 'meeting-1',
  title: 'Weekly Team Meeting',
  meetingNo: 'MTG-001',
  startTime: new Date('2025-01-15T10:00:00Z'),
  endTime: new Date('2025-01-15T11:00:00Z'),
  durationMinutes: 60,
  status: 'ended',
  type: 'regular',
  host: createMockHost(),
  participantCount: 5,
  hasRecording: true,
  recordingUrl: 'https://example.com/recording.mp4',
  minutesStatus: 'approved',
  createdAt: new Date('2025-01-15T09:00:00Z'),
  updatedAt: new Date('2025-01-15T12:00:00Z'),
  ...overrides,
});

const createMockMinutes = (overrides: Partial<Minutes> = {}): Minutes => ({
  id: 'minutes-1',
  meetingId: 'meeting-1',
  title: 'Weekly Team Meeting',
  date: '2025-01-15',
  duration: 3600000,
  summary: 'Discussed project updates and next steps for the quarter.',
  topics: [
    {
      id: 'topic-1',
      title: 'Project Alpha Updates',
      startTime: 0,
      endTime: 1800000,
      summary: 'Reviewed progress on Project Alpha.',
      keyPoints: [
        'Development is on track',
        'Testing phase starts next week',
      ],
      speakers: [{ id: 'speaker-1', name: 'John Doe' }],
    },
  ],
  decisions: [
    {
      id: 'decision-1',
      content: 'Move forward with the proposed architecture',
      context: 'After reviewing alternatives',
      decidedAt: 900000,
    },
  ],
  actionItems: [
    {
      id: 'action-1',
      content: 'Complete the API documentation',
      assignee: { id: 'speaker-1', name: 'John Doe' },
      dueDate: '2025-01-22',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'action-2',
      content: 'Review security requirements',
      assignee: { id: 'speaker-2', name: 'Jane Smith' },
      priority: 'medium',
      status: 'in_progress',
    },
  ],
  attendees: [
    { id: 'speaker-1', name: 'John Doe' },
    { id: 'speaker-2', name: 'Jane Smith' },
  ],
  metadata: {
    generatedAt: '2025-01-15T12:00:00Z',
    model: 'claude-sonnet-4',
    processingTimeMs: 5000,
    confidence: 0.95,
  },
  ...overrides,
});

const createMockTranscript = (
  overrides: Partial<Transcript> = {}
): Transcript => ({
  meetingId: 'meeting-1',
  language: 'ja',
  segments: [
    {
      id: 'segment-1',
      startTime: 0,
      endTime: 15000,
      speaker: { id: 'speaker-1', name: 'John Doe' },
      text: 'Let me start with the project update.',
      confidence: 0.95,
    },
    {
      id: 'segment-2',
      startTime: 15000,
      endTime: 30000,
      speaker: { id: 'speaker-2', name: 'Jane Smith' },
      text: 'The development phase is progressing well.',
      confidence: 0.92,
    },
  ],
  totalDuration: 3600000,
  createdAt: '2025-01-15T11:00:00Z',
  ...overrides,
});

const createMockDataSources = (): SearchDataSources => ({
  meetings: [createMockMeeting()],
  minutes: [createMockMinutes()],
  transcripts: [createMockTranscript()],
});

// ============================================================================
// Tests
// ============================================================================

describe('SearchService', () => {
  let service: SearchService;
  let dataSources: SearchDataSources;

  beforeEach(() => {
    dataSources = createMockDataSources();
    service = createSearchService(dataSources);
  });

  describe('search', () => {
    it('should return empty results for empty query', async () => {
      const result = await service.search({
        query: '',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should search meetings by title', async () => {
      const result = await service.search({
        query: 'Weekly Team',
        targets: ['meetings'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('meeting');
      expect(result.query).toBe('Weekly Team');
    });

    it('should search meetings by host name', async () => {
      const result = await service.search({
        query: 'John Doe',
        targets: ['meetings'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('meeting');
    });

    it('should search minutes by summary', async () => {
      const result = await service.search({
        query: 'project updates',
        targets: ['minutes'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('minutes');
    });

    it('should search minutes by topic title', async () => {
      const result = await service.search({
        query: 'Project Alpha',
        targets: ['minutes'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('minutes');
    });

    it('should search transcripts by text', async () => {
      const result = await service.search({
        query: 'project update',
        targets: ['transcripts'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('transcript');
    });

    it('should search action items by content', async () => {
      const result = await service.search({
        query: 'API documentation',
        targets: ['action_items'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.type).toBe('action_item');
    });

    it('should search across all targets when "all" is specified', async () => {
      const result = await service.search({
        query: 'project',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      // Should find matches in meetings, minutes, transcripts, and action items
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should sort results by relevance', async () => {
      const result = await service.search({
        query: 'project',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      // Results should be sorted by score descending
      for (let i = 1; i < result.results.length; i++) {
        const prev = result.results[i - 1];
        const curr = result.results[i];
        if (prev !== undefined && curr !== undefined) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });

    it('should paginate results', async () => {
      // Add more data for pagination test
      const manyMeetings = Array.from({ length: 30 }, (_, i) =>
        createMockMeeting({
          id: `meeting-${i}`,
          title: `Project Meeting ${i}`,
        })
      );
      dataSources = {
        ...dataSources,
        meetings: manyMeetings,
      };
      service = createSearchService(dataSources);

      const page1 = await service.search({
        query: 'Project',
        targets: ['meetings'],
        page: 1,
        limit: 10,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(page1.results).toHaveLength(10);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasMore).toBe(true);

      const page2 = await service.search({
        query: 'Project',
        targets: ['meetings'],
        page: 2,
        limit: 10,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(page2.results).toHaveLength(10);
      expect(page2.page).toBe(2);
    });

    it('should filter by date range', async () => {
      const olderMeeting = createMockMeeting({
        id: 'meeting-old',
        title: 'Old Project Meeting',
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      dataSources = {
        ...dataSources,
        meetings: [...dataSources.meetings, olderMeeting],
      };
      service = createSearchService(dataSources);

      const result = await service.search({
        query: 'Project',
        targets: ['meetings'],
        filters: {
          dateRange: {
            from: '2025-01-01T00:00:00Z',
            to: '2025-12-31T23:59:59Z',
          },
        },
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      // Should only return meetings from 2025
      const meetingResults = result.results.filter((r) => r.type === 'meeting');
      for (const meeting of meetingResults) {
        if (meeting.type === 'meeting') {
          const date = new Date(meeting.date);
          expect(date.getFullYear()).toBe(2025);
        }
      }
    });

    it('should filter action items by priority', async () => {
      const result = await service.search({
        query: 'documentation',
        targets: ['action_items'],
        filters: {
          priority: 'high',
        },
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      for (const item of result.results) {
        if (item.type === 'action_item') {
          expect(item.priority).toBe('high');
        }
      }
    });

    it('should return facets in response', async () => {
      const result = await service.search({
        query: 'project',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.facets).toBeDefined();
      expect(result.facets?.byType).toBeDefined();
      expect(Array.isArray(result.facets?.byType)).toBe(true);
    });

    it('should include execution time in response', async () => {
      const result = await service.search({
        query: 'project',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.executionTimeMs).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include contexts with matches', async () => {
      const result = await service.search({
        query: 'Weekly',
        targets: ['meetings'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      expect(result.results.length).toBeGreaterThan(0);
      const firstResult = result.results[0];
      expect(firstResult).toBeDefined();
      if (firstResult !== undefined) {
        expect(firstResult.contexts.length).toBeGreaterThan(0);
        expect(firstResult.contexts[0]?.match.toLowerCase()).toContain('weekly');
      }
    });

    it('should respect minimum score threshold', async () => {
      const serviceWithHighThreshold = createSearchService(dataSources, {
        minScoreThreshold: 0.9,
      });

      const result = await serviceWithHighThreshold.search({
        query: 'xyz',
        targets: ['all'],
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });

      for (const item of result.results) {
        expect(item.score).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('factory function', () => {
    it('should create a new SearchService instance', () => {
      const newService = createSearchService(dataSources);
      expect(newService).toBeInstanceOf(SearchService);
    });

    it('should accept custom options', () => {
      const newService = createSearchService(dataSources, {
        contextLength: 100,
        minScoreThreshold: 0.5,
        fieldWeights: {
          title: 2.0,
          summary: 1.5,
          content: 1.0,
          speaker: 0.5,
        },
      });
      expect(newService).toBeInstanceOf(SearchService);
    });
  });
});

describe('SearchServiceError', () => {
  it('should create error with correct properties', () => {
    const error = new SearchServiceError(
      'Test error',
      'TEST_ERROR',
      400,
      { detail: 'test' }
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.name).toBe('SearchServiceError');
  });

  it('should use default status code when not provided', () => {
    const error = new SearchServiceError('Test error', 'TEST_ERROR');
    expect(error.statusCode).toBe(500);
  });
});
