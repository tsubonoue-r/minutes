/**
 * Tests for webhook type definitions and validation
 * @module types/__tests__/webhook.test
 */

import { describe, it, expect } from 'vitest';
import {
  // Constants
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROCESSING_STATE,
  // Schemas
  WebhookPayloadSchema,
  WebhookChallengeSchema,
  MeetingEndedEventSchema,
  RetryConfigSchema,
  // Type guards
  isMeetingEndedEvent,
  isTranscriptReadyEvent,
  isRecordingReadyEvent,
  isWebhookChallenge,
  // Validation functions
  validateWebhookPayload,
  safeParseWebhookPayload,
  validateRetryConfig,
  // Factory functions
  createRetryConfig,
  createWebhookProcessingResult,
  // Utility functions
  getEventTypeLabel,
  getProcessingStateLabel,
  unixTimestampToISOString,
} from '../webhook';

describe('Webhook Constants', () => {
  describe('WEBHOOK_EVENT_TYPES', () => {
    it('should have meeting ended event type', () => {
      expect(WEBHOOK_EVENT_TYPES.MEETING_ENDED).toBe('vc.meeting.meeting_ended_v1');
    });

    it('should have transcript ready event type', () => {
      expect(WEBHOOK_EVENT_TYPES.TRANSCRIPT_READY).toBe('vc.meeting.transcript_ready_v1');
    });

    it('should have recording ready event type', () => {
      expect(WEBHOOK_EVENT_TYPES.RECORDING_READY).toBe('vc.meeting.recording_ready_v1');
    });
  });

  describe('WEBHOOK_PROCESSING_STATE', () => {
    it('should have all processing states', () => {
      expect(WEBHOOK_PROCESSING_STATE.RECEIVED).toBe('received');
      expect(WEBHOOK_PROCESSING_STATE.PROCESSING).toBe('processing');
      expect(WEBHOOK_PROCESSING_STATE.COMPLETED).toBe('completed');
      expect(WEBHOOK_PROCESSING_STATE.FAILED).toBe('failed');
      expect(WEBHOOK_PROCESSING_STATE.SKIPPED).toBe('skipped');
    });
  });
});

describe('Webhook Schemas', () => {
  describe('MeetingEndedEventSchema', () => {
    it('should validate a valid meeting ended event', () => {
      const event = {
        type: 'vc.meeting.meeting_ended_v1',
        meeting_id: 'meeting_123',
        end_time: 1704067200,
        host_user_id: 'user_456',
      };

      const result = MeetingEndedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const event = {
        type: 'vc.meeting.meeting_ended_v1',
        meeting_id: 'meeting_123',
        end_time: 1704067200,
        host_user_id: 'user_456',
        topic: 'Weekly Standup',
        duration: 3600,
        participant_count: 5,
      };

      const result = MeetingEndedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topic).toBe('Weekly Standup');
        expect(result.data.duration).toBe(3600);
        expect(result.data.participant_count).toBe(5);
      }
    });

    it('should reject invalid event type', () => {
      const event = {
        type: 'invalid_type',
        meeting_id: 'meeting_123',
        end_time: 1704067200,
        host_user_id: 'user_456',
      };

      const result = MeetingEndedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const event = {
        type: 'vc.meeting.meeting_ended_v1',
        meeting_id: 'meeting_123',
        // Missing end_time and host_user_id
      };

      const result = MeetingEndedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('WebhookPayloadSchema', () => {
    it('should validate a complete webhook payload', () => {
      const payload = {
        header: {
          event_id: 'event_123',
          token: 'verification_token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      };

      const result = WebhookPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate payload with schema field', () => {
      const payload = {
        header: {
          event_id: 'event_123',
          token: 'verification_token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
        schema: '2.0',
      };

      const result = WebhookPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('WebhookChallengeSchema', () => {
    it('should validate a challenge request', () => {
      const challenge = {
        challenge: 'abc123xyz',
        token: 'verification_token',
        type: 'url_verification',
      };

      const result = WebhookChallengeSchema.safeParse(challenge);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const challenge = {
        challenge: 'abc123xyz',
        token: 'verification_token',
        type: 'invalid_type',
      };

      const result = WebhookChallengeSchema.safeParse(challenge);
      expect(result.success).toBe(false);
    });
  });

  describe('RetryConfigSchema', () => {
    it('should validate with defaults', () => {
      const config = {};
      const result = RetryConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxRetries).toBe(3);
        expect(result.data.initialDelayMs).toBe(1000);
        expect(result.data.maxDelayMs).toBe(30000);
        expect(result.data.backoffMultiplier).toBe(2);
        expect(result.data.jitter).toBe(true);
      }
    });

    it('should validate custom config', () => {
      const config = {
        maxRetries: 5,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 1.5,
        jitter: false,
      };

      const result = RetryConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxRetries).toBe(5);
        expect(result.data.initialDelayMs).toBe(2000);
      }
    });

    it('should reject invalid maxRetries', () => {
      const config = { maxRetries: 15 }; // Max is 10
      const result = RetryConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

describe('Type Guards', () => {
  const meetingEndedEvent = {
    type: 'vc.meeting.meeting_ended_v1' as const,
    meeting_id: 'meeting_123',
    end_time: 1704067200,
    host_user_id: 'user_456',
  };

  const transcriptReadyEvent = {
    type: 'vc.meeting.transcript_ready_v1' as const,
    meeting_id: 'meeting_123',
    transcript_id: 'transcript_456',
    ready_time: 1704067200,
  };

  const recordingReadyEvent = {
    type: 'vc.meeting.recording_ready_v1' as const,
    meeting_id: 'meeting_123',
    recording_id: 'recording_456',
    ready_time: 1704067200,
  };

  describe('isMeetingEndedEvent', () => {
    it('should return true for meeting ended events', () => {
      expect(isMeetingEndedEvent(meetingEndedEvent)).toBe(true);
    });

    it('should return false for other events', () => {
      expect(isMeetingEndedEvent(transcriptReadyEvent)).toBe(false);
      expect(isMeetingEndedEvent(recordingReadyEvent)).toBe(false);
    });
  });

  describe('isTranscriptReadyEvent', () => {
    it('should return true for transcript ready events', () => {
      expect(isTranscriptReadyEvent(transcriptReadyEvent)).toBe(true);
    });

    it('should return false for other events', () => {
      expect(isTranscriptReadyEvent(meetingEndedEvent)).toBe(false);
      expect(isTranscriptReadyEvent(recordingReadyEvent)).toBe(false);
    });
  });

  describe('isRecordingReadyEvent', () => {
    it('should return true for recording ready events', () => {
      expect(isRecordingReadyEvent(recordingReadyEvent)).toBe(true);
    });

    it('should return false for other events', () => {
      expect(isRecordingReadyEvent(meetingEndedEvent)).toBe(false);
      expect(isRecordingReadyEvent(transcriptReadyEvent)).toBe(false);
    });
  });

  describe('isWebhookChallenge', () => {
    it('should return true for valid challenge', () => {
      const challenge = {
        challenge: 'abc123',
        token: 'token',
        type: 'url_verification',
      };
      expect(isWebhookChallenge(challenge)).toBe(true);
    });

    it('should return false for event payload', () => {
      const payload = {
        header: { event_id: '123', token: 'token', create_time: '123', event_type: 'test' },
        event: meetingEndedEvent,
      };
      expect(isWebhookChallenge(payload)).toBe(false);
    });

    it('should return false for invalid data', () => {
      expect(isWebhookChallenge(null)).toBe(false);
      expect(isWebhookChallenge(undefined)).toBe(false);
      expect(isWebhookChallenge({})).toBe(false);
      expect(isWebhookChallenge('string')).toBe(false);
    });
  });
});

describe('Validation Functions', () => {
  describe('validateWebhookPayload', () => {
    it('should return validated payload for valid input', () => {
      const payload = {
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      };

      const result = validateWebhookPayload(payload);
      expect(result.header.event_id).toBe('event_123');
      expect(result.event.meeting_id).toBe('meeting_123');
    });

    it('should throw for invalid input', () => {
      expect(() => validateWebhookPayload({})).toThrow();
      expect(() => validateWebhookPayload(null)).toThrow();
    });
  });

  describe('safeParseWebhookPayload', () => {
    it('should return success for valid input', () => {
      const payload = {
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      };

      const result = safeParseWebhookPayload(payload);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid input', () => {
      const result = safeParseWebhookPayload({});
      expect(result.success).toBe(false);
    });
  });

  describe('validateRetryConfig', () => {
    it('should return validated config', () => {
      const config = validateRetryConfig({ maxRetries: 5 });
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelayMs).toBe(1000); // Default
    });
  });
});

describe('Factory Functions', () => {
  describe('createRetryConfig', () => {
    it('should create default config', () => {
      const config = createRetryConfig();
      expect(config.maxRetries).toBe(3);
      expect(config.initialDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(30000);
      expect(config.backoffMultiplier).toBe(2);
      expect(config.jitter).toBe(true);
    });

    it('should create config with overrides', () => {
      const config = createRetryConfig({
        maxRetries: 5,
        jitter: false,
      });
      expect(config.maxRetries).toBe(5);
      expect(config.jitter).toBe(false);
      expect(config.initialDelayMs).toBe(1000); // Default preserved
    });
  });

  describe('createWebhookProcessingResult', () => {
    it('should create a processing result', () => {
      const result = createWebhookProcessingResult({
        state: 'completed',
        eventId: 'event_123',
        meetingId: 'meeting_456',
        durationMs: 1500,
      });

      expect(result.state).toBe('completed');
      expect(result.eventId).toBe('event_123');
      expect(result.meetingId).toBe('meeting_456');
      expect(result.durationMs).toBe(1500);
      expect(result.completedAt).toBeDefined();
    });

    it('should create failed result with error', () => {
      const result = createWebhookProcessingResult({
        state: 'failed',
        eventId: 'event_123',
        durationMs: 500,
        error: 'Something went wrong',
        retryCount: 3,
      });

      expect(result.state).toBe('failed');
      expect(result.error).toBe('Something went wrong');
      expect(result.retryCount).toBe(3);
    });
  });
});

describe('Utility Functions', () => {
  describe('getEventTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getEventTypeLabel('vc.meeting.meeting_ended_v1')).toBe('Meeting Ended');
      expect(getEventTypeLabel('vc.meeting.transcript_ready_v1')).toBe('Transcript Ready');
      expect(getEventTypeLabel('vc.meeting.recording_ready_v1')).toBe('Recording Ready');
    });
  });

  describe('getProcessingStateLabel', () => {
    it('should return correct labels', () => {
      expect(getProcessingStateLabel('received')).toBe('Received');
      expect(getProcessingStateLabel('processing')).toBe('Processing');
      expect(getProcessingStateLabel('completed')).toBe('Completed');
      expect(getProcessingStateLabel('failed')).toBe('Failed');
      expect(getProcessingStateLabel('skipped')).toBe('Skipped');
    });
  });

  describe('unixTimestampToISOString', () => {
    it('should convert timestamp correctly', () => {
      const timestamp = 1704067200; // 2024-01-01T00:00:00Z
      const result = unixTimestampToISOString(timestamp);
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle different timestamps', () => {
      const timestamp = 0;
      const result = unixTimestampToISOString(timestamp);
      expect(result).toBe('1970-01-01T00:00:00.000Z');
    });
  });
});
