/**
 * Tests for webhook service
 * @module services/__tests__/webhook.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebhookService,
  WebhookProcessingError,
  createWebhookServiceWithDependencies,
} from '../webhook.service';
import type {
  MinutesGenerationService,
  MinutesGenerationResult,
} from '../minutes-generation.service';
import type { TranscriptService } from '../transcript.service';
import type { WebhookPayload } from '@/types/webhook';
import { WEBHOOK_PROCESSING_STATE } from '@/types/webhook';
import type { Transcript } from '@/types/transcript';
import type { Minutes } from '@/types/minutes';

// =============================================================================
// Mocks
// =============================================================================

const mockTranscript: Transcript = {
  meetingId: 'meeting_123',
  language: 'ja',
  segments: [
    {
      id: 'seg_1',
      startTime: 0,
      endTime: 5000,
      speaker: { id: 'speaker_1', name: 'Tanaka' },
      text: 'Hello everyone.',
      confidence: 0.95,
    },
  ],
  totalDuration: 5000,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockMinutes: Minutes = {
  id: 'min_123',
  meetingId: 'meeting_123',
  title: 'Test Meeting',
  date: '2024-01-01',
  duration: 3600000,
  summary: 'Test summary',
  topics: [],
  decisions: [],
  actionItems: [],
  attendees: [],
  metadata: {
    generatedAt: '2024-01-01T00:00:00.000Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 1500,
    confidence: 0.85,
  },
};

const mockMinutesGenerationResult: MinutesGenerationResult = {
  minutes: mockMinutes,
  processingTimeMs: 1500,
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
  },
};

function createMockMinutesService(): MinutesGenerationService {
  return {
    generateMinutes: vi.fn().mockResolvedValue(mockMinutesGenerationResult),
  } as unknown as MinutesGenerationService;
}

function createMockTranscriptService(): TranscriptService {
  return {
    getTranscript: vi.fn().mockResolvedValue(mockTranscript),
    hasTranscript: vi.fn().mockResolvedValue(true),
  } as unknown as TranscriptService;
}

function createWebhookPayload(
  eventType: string = 'vc.meeting.meeting_ended_v1',
  meetingId: string = 'meeting_123'
): WebhookPayload {
  return {
    header: {
      event_id: `event_${Date.now()}`,
      token: 'verification_token',
      create_time: String(Math.floor(Date.now() / 1000)),
      event_type: eventType,
    },
    event: {
      type: eventType as 'vc.meeting.meeting_ended_v1',
      meeting_id: meetingId,
      end_time: Math.floor(Date.now() / 1000),
      host_user_id: 'user_456',
      topic: 'Test Meeting',
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('WebhookService', () => {
  let service: WebhookService;
  let mockMinutesService: MinutesGenerationService;
  let mockTranscriptService: TranscriptService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMinutesService = createMockMinutesService();
    mockTranscriptService = createMockTranscriptService();
    service = createWebhookServiceWithDependencies(
      mockMinutesService,
      mockTranscriptService,
      {
        transcriptReadyDelayMs: 100, // Short delay for tests
        transcriptRetryConfig: {
          maxRetries: 2,
          initialDelayMs: 50,
          jitter: false,
        },
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('processEvent', () => {
    it('should process meeting ended event successfully', async () => {
      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);

      // Advance through delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.COMPLETED);
      expect(result.eventId).toBe(payload.header.event_id);
      expect(result.meetingId).toBe('meeting_123');
      expect(mockTranscriptService.getTranscript).toHaveBeenCalledWith(
        accessToken,
        'meeting_123'
      );
      expect(mockMinutesService.generateMinutes).toHaveBeenCalled();
    });

    it('should skip duplicate events', async () => {
      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      // Process first time
      const result1Promise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result1 = await result1Promise;

      expect(result1.state).toBe(WEBHOOK_PROCESSING_STATE.COMPLETED);

      // Process same event again
      const result2Promise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result2 = await result2Promise;

      expect(result2.state).toBe(WEBHOOK_PROCESSING_STATE.SKIPPED);
      // generateMinutes should only be called once
      expect(mockMinutesService.generateMinutes).toHaveBeenCalledTimes(1);
    });

    it('should fail when access token is missing', async () => {
      const payload = createWebhookPayload();

      const resultPromise = service.processEvent(payload, undefined);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.FAILED);
      expect(result.error).toContain('Access token');
    });

    it('should fail when transcript fetch fails', async () => {
      vi.mocked(mockTranscriptService.getTranscript).mockRejectedValue(
        new Error('Transcript not found')
      );

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should fail when minutes generation fails', async () => {
      vi.mocked(mockMinutesService.generateMinutes).mockRejectedValue(
        new Error('Generation failed')
      );

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.FAILED);
      expect(result.error).toContain('Generation failed');
    });

    it('should use default access token from config', async () => {
      const serviceWithDefaultToken = createWebhookServiceWithDependencies(
        mockMinutesService,
        mockTranscriptService,
        {
          defaultAccessToken: 'default_token',
          transcriptReadyDelayMs: 100,
        }
      );

      const payload = createWebhookPayload();

      const resultPromise = serviceWithDefaultToken.processEvent(payload);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.COMPLETED);
      expect(mockTranscriptService.getTranscript).toHaveBeenCalledWith(
        'default_token',
        expect.any(String)
      );
    });
  });

  describe('callbacks', () => {
    it('should call onMinutesGenerated callback on success', async () => {
      const onMinutesGenerated = vi.fn();
      service.onMinutesGenerated(onMinutesGenerated);

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onMinutesGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId: 'meeting_123',
          hostUserId: 'user_456',
        }),
        mockMinutesGenerationResult
      );
    });

    it('should call onProcessingFailed callback on failure', async () => {
      vi.mocked(mockMinutesService.generateMinutes).mockRejectedValue(
        new Error('Generation failed')
      );

      const onProcessingFailed = vi.fn();
      service.onProcessingFailed(onProcessingFailed);

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onProcessingFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId: 'meeting_123',
        }),
        expect.any(Error)
      );
    });

    it('should call onProcessingFailed when access token is missing', async () => {
      const onProcessingFailed = vi.fn();
      service.onProcessingFailed(onProcessingFailed);

      const payload = createWebhookPayload();

      const resultPromise = service.processEvent(payload, undefined);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(onProcessingFailed).toHaveBeenCalled();
    });
  });

  describe('clearProcessedEventsCache', () => {
    it('should allow reprocessing after cache clear', async () => {
      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      // Process first time
      const result1Promise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      await result1Promise;

      // Clear cache
      service.clearProcessedEventsCache();

      // Process same event again - should not be skipped
      const result2Promise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result2 = await result2Promise;

      expect(result2.state).toBe(WEBHOOK_PROCESSING_STATE.COMPLETED);
      expect(mockMinutesService.generateMinutes).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasProcessedEvent', () => {
    it('should return true for processed events', async () => {
      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(service.hasProcessedEvent(payload.header.event_id)).toBe(true);
    });

    it('should return false for unprocessed events', () => {
      expect(service.hasProcessedEvent('unknown_event')).toBe(false);
    });
  });

  describe('triggerMinutesGeneration', () => {
    it('should generate minutes directly', async () => {
      const resultPromise = service.triggerMinutesGeneration({
        meetingId: 'meeting_123',
        accessToken: 'test_token',
        waitForTranscript: true,
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual(mockMinutesGenerationResult);
      expect(mockTranscriptService.getTranscript).toHaveBeenCalled();
      expect(mockMinutesService.generateMinutes).toHaveBeenCalled();
    });

    it('should skip waiting for transcript when flag is false', async () => {
      const resultPromise = service.triggerMinutesGeneration({
        meetingId: 'meeting_123',
        accessToken: 'test_token',
        waitForTranscript: false,
      });

      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual(mockMinutesGenerationResult);
      // getTranscript should be called directly without retry logic
      expect(mockTranscriptService.getTranscript).toHaveBeenCalledTimes(1);
    });
  });

  describe('transcript handling', () => {
    it('should fail when transcript service throws error', async () => {
      vi.mocked(mockTranscriptService.getTranscript)
        .mockRejectedValue(new Error('Transcript not available'));

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Should fail because transcript fetch fails
      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should succeed when transcript is available immediately', async () => {
      // mockTranscript already has segments
      vi.mocked(mockTranscriptService.getTranscript)
        .mockResolvedValue(mockTranscript);

      const payload = createWebhookPayload();
      const accessToken = 'test_token';

      const resultPromise = service.processEvent(payload, accessToken);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.state).toBe(WEBHOOK_PROCESSING_STATE.COMPLETED);
    });
  });
});

describe('WebhookProcessingError', () => {
  it('should create error with all properties', () => {
    const error = new WebhookProcessingError(
      'Test error',
      'TEST_CODE',
      'event_123',
      { detail: 'value' }
    );

    expect(error.name).toBe('WebhookProcessingError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.eventId).toBe('event_123');
    expect(error.cause).toEqual({ detail: 'value' });
  });

  it('should create transcript not ready error', () => {
    const error = WebhookProcessingError.transcriptNotReady(
      'event_123',
      'meeting_456'
    );

    expect(error.code).toBe('TRANSCRIPT_NOT_READY');
    expect(error.eventId).toBe('event_123');
    expect(error.message).toContain('meeting_456');
  });

  it('should create missing access token error', () => {
    const error = WebhookProcessingError.missingAccessToken('event_123');

    expect(error.code).toBe('MISSING_ACCESS_TOKEN');
    expect(error.eventId).toBe('event_123');
  });

  it('should create generation failed error', () => {
    const cause = new Error('API error');
    const error = WebhookProcessingError.generationFailed('event_123', cause);

    expect(error.code).toBe('GENERATION_FAILED');
    expect(error.eventId).toBe('event_123');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('API error');
  });
});

describe('createWebhookServiceWithDependencies', () => {
  it('should create service with custom dependencies', () => {
    const minutesService = createMockMinutesService();
    const transcriptService = createMockTranscriptService();

    const service = createWebhookServiceWithDependencies(
      minutesService,
      transcriptService,
      {
        transcriptReadyDelayMs: 5000,
        defaultAccessToken: 'custom_token',
      }
    );

    expect(service).toBeInstanceOf(WebhookService);
  });
});
