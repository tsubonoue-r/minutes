/**
 * Unit tests for transcript type definitions and utility functions
 * @module tests/types/transcript
 */

import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  filterSegments,
  createDefaultTranscriptFilters,
  createEmptySearchResult,
  createSpeaker,
  getUniqueSpeakers,
  getSegmentDuration,
  parseHighlightText,
  highlightSearchText,
  type Speaker,
  type TranscriptSegment,
  type TranscriptFilters,
} from '@/types/transcript';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const createTestSpeaker = (id: string, name: string): Speaker => ({
  id,
  name,
});

const createTestSegment = (
  id: string,
  speaker: Speaker,
  startTime: number,
  endTime: number,
  text: string,
  confidence = 0.95
): TranscriptSegment => ({
  id,
  startTime,
  endTime,
  speaker,
  text,
  confidence,
});

const speaker1 = createTestSpeaker('speaker-1', 'Alice');
const speaker2 = createTestSpeaker('speaker-2', 'Bob');
const speaker3: Speaker = {
  id: 'speaker-3',
  name: 'Charlie',
  avatarUrl: 'https://example.com/avatar.png',
};

const testSegments: TranscriptSegment[] = [
  createTestSegment(
    'seg-1',
    speaker1,
    0,
    5000,
    'Hello everyone, welcome to the meeting.'
  ),
  createTestSegment(
    'seg-2',
    speaker2,
    5000,
    10000,
    'Thank you Alice. Let us discuss the agenda.'
  ),
  createTestSegment(
    'seg-3',
    speaker1,
    10000,
    20000,
    'The first item on the agenda is the quarterly report.'
  ),
  createTestSegment(
    'seg-4',
    speaker3,
    20000,
    30000,
    'I have prepared the financial summary for everyone.'
  ),
  createTestSegment(
    'seg-5',
    speaker2,
    30000,
    40000,
    'Great work Charlie. The meeting is progressing well.'
  ),
];

// ============================================================================
// formatTimestamp Tests
// ============================================================================

describe('formatTimestamp', () => {
  it('should format zero milliseconds as 00:00', () => {
    expect(formatTimestamp(0)).toBe('00:00');
  });

  it('should format seconds correctly', () => {
    expect(formatTimestamp(5000)).toBe('00:05');
    expect(formatTimestamp(30000)).toBe('00:30');
    expect(formatTimestamp(59000)).toBe('00:59');
  });

  it('should format minutes and seconds correctly', () => {
    expect(formatTimestamp(60000)).toBe('01:00');
    expect(formatTimestamp(90000)).toBe('01:30');
    expect(formatTimestamp(600000)).toBe('10:00');
    expect(formatTimestamp(3599000)).toBe('59:59');
  });

  it('should format hours, minutes, and seconds correctly', () => {
    expect(formatTimestamp(3600000)).toBe('1:00:00');
    expect(formatTimestamp(3725000)).toBe('1:02:05');
    expect(formatTimestamp(7200000)).toBe('2:00:00');
    expect(formatTimestamp(36000000)).toBe('10:00:00');
  });

  it('should handle negative values by returning 00:00', () => {
    expect(formatTimestamp(-1000)).toBe('00:00');
    expect(formatTimestamp(-100000)).toBe('00:00');
  });

  it('should handle fractional milliseconds by rounding down', () => {
    expect(formatTimestamp(1500)).toBe('00:01');
    expect(formatTimestamp(1999)).toBe('00:01');
    expect(formatTimestamp(2000)).toBe('00:02');
  });
});

// ============================================================================
// filterSegments Tests
// ============================================================================

describe('filterSegments', () => {
  it('should return all segments with empty filters', () => {
    const result = filterSegments(testSegments, {});
    expect(result).toHaveLength(5);
  });

  it('should filter by speaker ID', () => {
    const result = filterSegments(testSegments, { speakerId: 'speaker-1' });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.speaker.id === 'speaker-1')).toBe(true);
  });

  it('should filter by start time', () => {
    const result = filterSegments(testSegments, { startTime: 20000 });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.startTime >= 20000)).toBe(true);
  });

  it('should filter by end time', () => {
    const result = filterSegments(testSegments, { endTime: 15000 });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.endTime <= 15000)).toBe(true);
  });

  it('should filter by search query (case-insensitive)', () => {
    const result = filterSegments(testSegments, { searchQuery: 'agenda' });
    expect(result).toHaveLength(2);
    expect(
      result.every((s) => s.text.toLowerCase().includes('agenda'))
    ).toBe(true);
  });

  it('should handle search query with mixed case', () => {
    const result = filterSegments(testSegments, { searchQuery: 'MEETING' });
    expect(result).toHaveLength(2);
  });

  it('should combine multiple filters', () => {
    const result = filterSegments(testSegments, {
      speakerId: 'speaker-2',
      startTime: 0,
      endTime: 15000,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('seg-2');
  });

  it('should return empty array when no segments match', () => {
    const result = filterSegments(testSegments, {
      searchQuery: 'nonexistent text',
    });
    expect(result).toHaveLength(0);
  });

  it('should ignore empty search query', () => {
    const result = filterSegments(testSegments, { searchQuery: '   ' });
    expect(result).toHaveLength(5);
  });

  it('should filter with all conditions combined', () => {
    const result = filterSegments(testSegments, {
      searchQuery: 'agenda',
      speakerId: 'speaker-1',
      startTime: 0,
      endTime: 25000,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('seg-3');
  });
});

// ============================================================================
// createDefaultTranscriptFilters Tests
// ============================================================================

describe('createDefaultTranscriptFilters', () => {
  it('should return an empty filter object', () => {
    const filters = createDefaultTranscriptFilters();
    expect(filters).toEqual({});
  });

  it('should be usable with filterSegments', () => {
    const filters = createDefaultTranscriptFilters();
    const result = filterSegments(testSegments, filters);
    expect(result).toHaveLength(5);
  });
});

// ============================================================================
// createEmptySearchResult Tests
// ============================================================================

describe('createEmptySearchResult', () => {
  it('should return an empty search result object', () => {
    const result = createEmptySearchResult();
    expect(result).toEqual({
      query: '',
      totalMatches: 0,
      matches: [],
      currentMatchIndex: -1,
    });
  });
});

// ============================================================================
// createSpeaker Tests
// ============================================================================

describe('createSpeaker', () => {
  it('should create a speaker without avatar URL', () => {
    const speaker = createSpeaker('user-1', 'John Doe');
    expect(speaker).toEqual({
      id: 'user-1',
      name: 'John Doe',
    });
    expect(speaker.avatarUrl).toBeUndefined();
  });

  it('should create a speaker with avatar URL', () => {
    const speaker = createSpeaker(
      'user-2',
      'Jane Doe',
      'https://example.com/avatar.jpg'
    );
    expect(speaker).toEqual({
      id: 'user-2',
      name: 'Jane Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });
});

// ============================================================================
// getUniqueSpeakers Tests
// ============================================================================

describe('getUniqueSpeakers', () => {
  it('should return unique speakers from segments', () => {
    const speakers = getUniqueSpeakers(testSegments);
    expect(speakers).toHaveLength(3);
    expect(speakers.map((s) => s.id).sort()).toEqual([
      'speaker-1',
      'speaker-2',
      'speaker-3',
    ]);
  });

  it('should return empty array for empty segments', () => {
    const speakers = getUniqueSpeakers([]);
    expect(speakers).toHaveLength(0);
  });

  it('should preserve speaker data', () => {
    const speakers = getUniqueSpeakers(testSegments);
    const charlie = speakers.find((s) => s.id === 'speaker-3');
    expect(charlie).toBeDefined();
    expect(charlie?.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('should return speakers in order of first appearance', () => {
    const speakers = getUniqueSpeakers(testSegments);
    expect(speakers[0]?.id).toBe('speaker-1');
    expect(speakers[1]?.id).toBe('speaker-2');
    expect(speakers[2]?.id).toBe('speaker-3');
  });
});

// ============================================================================
// getSegmentDuration Tests
// ============================================================================

describe('getSegmentDuration', () => {
  it('should calculate segment duration correctly', () => {
    const segment = testSegments[0];
    expect(segment).toBeDefined();
    expect(getSegmentDuration(segment!)).toBe(5000);
  });

  it('should handle various durations', () => {
    expect(getSegmentDuration(testSegments[2]!)).toBe(10000);
    expect(getSegmentDuration(testSegments[3]!)).toBe(10000);
  });

  it('should return 0 for segments with same start and end time', () => {
    const zeroSegment = createTestSegment(
      'zero',
      speaker1,
      5000,
      5000,
      'Instant'
    );
    expect(getSegmentDuration(zeroSegment)).toBe(0);
  });
});

// ============================================================================
// parseHighlightText Tests
// ============================================================================

describe('parseHighlightText', () => {
  it('should return no matches for empty query', () => {
    const result = parseHighlightText('Hello world', '');
    expect(result.hasMatches).toBe(false);
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toEqual({ text: 'Hello world', isMatch: false });
  });

  it('should return no matches for whitespace-only query', () => {
    const result = parseHighlightText('Hello world', '   ');
    expect(result.hasMatches).toBe(false);
  });

  it('should find and mark single match', () => {
    const result = parseHighlightText('Hello world', 'world');
    expect(result.hasMatches).toBe(true);
    expect(result.parts).toHaveLength(2);
    expect(result.parts[0]).toEqual({ text: 'Hello ', isMatch: false });
    expect(result.parts[1]).toEqual({ text: 'world', isMatch: true });
  });

  it('should find multiple matches', () => {
    const result = parseHighlightText('hello hello hello', 'hello');
    expect(result.hasMatches).toBe(true);
    expect(result.parts.filter((p) => p.isMatch)).toHaveLength(3);
  });

  it('should be case-insensitive', () => {
    const result = parseHighlightText('Hello HELLO hello', 'hello');
    expect(result.hasMatches).toBe(true);
    expect(result.parts.filter((p) => p.isMatch)).toHaveLength(3);
  });

  it('should preserve original case in output', () => {
    const result = parseHighlightText('Hello World WORLD', 'world');
    expect(result.hasMatches).toBe(true);
    const matches = result.parts.filter((p) => p.isMatch);
    expect(matches[0]?.text).toBe('World');
    expect(matches[1]?.text).toBe('WORLD');
  });

  it('should handle special regex characters in query', () => {
    const result = parseHighlightText('Price: $100.00', '$100.00');
    expect(result.hasMatches).toBe(true);
    expect(result.parts.find((p) => p.isMatch)?.text).toBe('$100.00');
  });

  it('should return no matches when query not found', () => {
    const result = parseHighlightText('Hello world', 'xyz');
    expect(result.hasMatches).toBe(false);
    expect(result.parts).toHaveLength(1);
  });

  it('should handle match at the beginning', () => {
    const result = parseHighlightText('Hello world', 'Hello');
    expect(result.hasMatches).toBe(true);
    expect(result.parts[0]).toEqual({ text: 'Hello', isMatch: true });
    expect(result.parts[1]).toEqual({ text: ' world', isMatch: false });
  });

  it('should handle match in the middle', () => {
    const result = parseHighlightText('Hello beautiful world', 'beautiful');
    expect(result.hasMatches).toBe(true);
    expect(result.parts).toHaveLength(3);
    expect(result.parts[1]).toEqual({ text: 'beautiful', isMatch: true });
  });
});

// ============================================================================
// highlightSearchText Tests
// ============================================================================

describe('highlightSearchText', () => {
  it('should return original text for empty query', () => {
    const result = highlightSearchText('Hello world', '');
    expect(result).toBe('Hello world');
  });

  it('should return original text when no match found', () => {
    const result = highlightSearchText('Hello world', 'xyz');
    expect(result).toBe('Hello world');
  });

  it('should return ReactNode for matches', () => {
    const result = highlightSearchText('Hello world', 'world');
    // Result should be a React element (object), not a string
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  it('should handle case-insensitive matching', () => {
    const result = highlightSearchText('Hello WORLD', 'world');
    expect(typeof result).toBe('object');
  });
});

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('Type Safety', () => {
  it('should enforce readonly on TranscriptSegment properties', () => {
    const segment: TranscriptSegment = testSegments[0]!;
    // These should not compile if uncommented:
    // segment.id = 'new-id';
    // segment.text = 'modified text';
    expect(segment.id).toBe('seg-1');
  });

  it('should enforce readonly on Speaker properties', () => {
    const speaker: Speaker = speaker1;
    // These should not compile if uncommented:
    // speaker.id = 'new-id';
    // speaker.name = 'New Name';
    expect(speaker.id).toBe('speaker-1');
  });

  it('should accept readonly arrays in filterSegments', () => {
    const readonlySegments: readonly TranscriptSegment[] = testSegments;
    const result = filterSegments(readonlySegments, {});
    expect(result).toHaveLength(5);
  });

  it('should have correct filter types', () => {
    const filters: TranscriptFilters = {
      searchQuery: 'test',
      speakerId: 'speaker-1',
      startTime: 0,
      endTime: 10000,
    };
    expect(filters.searchQuery).toBe('test');
  });
});
