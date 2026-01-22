/**
 * Transcript related type definitions
 * @module types/transcript
 */

import { createElement, type ReactNode } from 'react';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Speaker information in a transcript
 */
export interface Speaker {
  /** Unique speaker identifier */
  readonly id: string;
  /** Speaker display name */
  readonly name: string;
  /** Speaker avatar URL */
  readonly avatarUrl?: string | undefined;
}

/**
 * A single segment of the transcript (a spoken utterance)
 */
export interface TranscriptSegment {
  /** Unique segment identifier */
  readonly id: string;
  /** Start time in milliseconds from meeting start */
  readonly startTime: number;
  /** End time in milliseconds from meeting start */
  readonly endTime: number;
  /** Speaker information */
  readonly speaker: Speaker;
  /** Transcribed text content */
  readonly text: string;
  /** Confidence score from speech recognition (0-1) */
  readonly confidence: number;
}

/**
 * Complete transcript for a meeting
 */
export interface Transcript {
  /** Associated meeting identifier */
  readonly meetingId: string;
  /** Language code (e.g., "ja", "en", "zh") */
  readonly language: string;
  /** Ordered list of transcript segments */
  readonly segments: readonly TranscriptSegment[];
  /** Total meeting duration in milliseconds */
  readonly totalDuration: number;
  /** Transcript creation timestamp in ISO 8601 format */
  readonly createdAt: string;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter conditions for searching and filtering transcript segments
 */
export interface TranscriptFilters {
  /** Text search query to match against segment text */
  readonly searchQuery?: string | undefined;
  /** Filter by specific speaker ID */
  readonly speakerId?: string | undefined;
  /** Filter segments starting from this time (milliseconds) */
  readonly startTime?: number | undefined;
  /** Filter segments ending before this time (milliseconds) */
  readonly endTime?: number | undefined;
}

// ============================================================================
// Search Result Types (for advanced search UI)
// ============================================================================

/**
 * Search match information for highlighting
 */
export interface TranscriptSearchMatch {
  /** Segment ID containing the match */
  readonly segmentId: string;
  /** Start index of match in segment text */
  readonly startIndex: number;
  /** End index of match in segment text */
  readonly endIndex: number;
}

/**
 * Transcript search result
 */
export interface TranscriptSearchResult {
  /** Search query */
  readonly query: string;
  /** Total number of matches */
  readonly totalMatches: number;
  /** List of match details */
  readonly matches: readonly TranscriptSearchMatch[];
  /** Currently focused match index (0-based) */
  readonly currentMatchIndex: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a timestamp in milliseconds to "MM:SS" or "HH:MM:SS" format
 *
 * @param ms - Time in milliseconds
 * @returns Formatted time string (e.g., "05:30" or "1:23:45")
 *
 * @example
 * ```typescript
 * formatTimestamp(90000);  // "01:30"
 * formatTimestamp(3725000); // "1:02:05"
 * ```
 */
export function formatTimestamp(ms: number): string {
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
 * Result of text highlighting operation
 */
export interface HighlightResult {
  /** Array of text parts with match indicators */
  readonly parts: readonly HighlightPart[];
  /** Whether any matches were found */
  readonly hasMatches: boolean;
}

/**
 * A part of highlighted text
 */
export interface HighlightPart {
  /** The text content */
  readonly text: string;
  /** Whether this part is a match */
  readonly isMatch: boolean;
}

/**
 * Parse text and identify search query matches for highlighting
 *
 * @param text - The original text to search within
 * @param query - The search query to highlight
 * @returns HighlightResult with parts array and match status
 *
 * @example
 * ```typescript
 * const result = parseHighlightText("This is a meeting note", "meeting");
 * // result.parts = [
 * //   { text: "This is a ", isMatch: false },
 * //   { text: "meeting", isMatch: true },
 * //   { text: " note", isMatch: false }
 * // ]
 * ```
 */
export function parseHighlightText(text: string, query: string): HighlightResult {
  if (!query || query.trim() === '') {
    return {
      parts: [{ text, isMatch: false }],
      hasMatches: false,
    };
  }

  const trimmedQuery = query.trim();
  // Escape special regex characters
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const rawParts = text.split(regex);

  if (rawParts.length === 1) {
    return {
      parts: [{ text, isMatch: false }],
      hasMatches: false,
    };
  }

  const parts: HighlightPart[] = rawParts
    .filter((part) => part !== '')
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === trimmedQuery.toLowerCase(),
    }));

  return {
    parts,
    hasMatches: true,
  };
}

/**
 * Highlight search text within a string by wrapping matches in a mark element
 *
 * @param text - The original text to search within
 * @param query - The search query to highlight
 * @returns ReactNode with highlighted matches, or the original text if no query
 *
 * @example
 * ```tsx
 * // Returns React elements with "meeting" wrapped in <mark>
 * highlightSearchText("This is a meeting note", "meeting");
 * ```
 */
export function highlightSearchText(text: string, query: string): ReactNode {
  const { parts, hasMatches } = parseHighlightText(text, query);

  if (!hasMatches) {
    return text;
  }

  return createElement(
    'span',
    null,
    ...parts.map((part, index) => {
      if (part.isMatch) {
        return createElement(
          'mark',
          {
            key: index,
            className: 'bg-yellow-200 dark:bg-yellow-800 rounded px-0.5',
          },
          part.text
        );
      }
      return part.text;
    })
  );
}

/**
 * Filter transcript segments based on the provided filter conditions
 *
 * @param segments - Array of transcript segments to filter
 * @param filters - Filter conditions to apply
 * @returns Filtered array of transcript segments
 *
 * @example
 * ```typescript
 * const filtered = filterSegments(segments, {
 *   searchQuery: "agenda",
 *   speakerId: "user-123",
 *   startTime: 60000,  // 1 minute
 *   endTime: 300000,   // 5 minutes
 * });
 * ```
 */
export function filterSegments(
  segments: readonly TranscriptSegment[],
  filters: TranscriptFilters
): TranscriptSegment[] {
  const { searchQuery, speakerId, startTime, endTime } = filters;

  return segments.filter((segment) => {
    // Filter by speaker ID
    if (speakerId !== undefined && segment.speaker.id !== speakerId) {
      return false;
    }

    // Filter by start time (segment must start at or after the filter start time)
    if (startTime !== undefined && segment.startTime < startTime) {
      return false;
    }

    // Filter by end time (segment must end at or before the filter end time)
    if (endTime !== undefined && segment.endTime > endTime) {
      return false;
    }

    // Filter by search query (case-insensitive)
    if (searchQuery !== undefined && searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase().trim();
      const lowerText = segment.text.toLowerCase();
      if (!lowerText.includes(lowerQuery)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default transcript filters
 *
 * @returns Empty filter object
 */
export function createDefaultTranscriptFilters(): TranscriptFilters {
  return {};
}

/**
 * Create empty search result
 *
 * @returns Empty search result object
 */
export function createEmptySearchResult(): TranscriptSearchResult {
  return {
    query: '',
    totalMatches: 0,
    matches: [],
    currentMatchIndex: -1,
  };
}

/**
 * Create a new speaker object
 *
 * @param id - Speaker ID
 * @param name - Speaker name
 * @param avatarUrl - Optional avatar URL
 * @returns Speaker object
 */
export function createSpeaker(
  id: string,
  name: string,
  avatarUrl?: string
): Speaker {
  const speaker: Speaker = {
    id,
    name,
  };

  if (avatarUrl !== undefined) {
    return { ...speaker, avatarUrl };
  }

  return speaker;
}

/**
 * Get unique speakers from transcript segments
 *
 * @param segments - Array of transcript segments
 * @returns Array of unique speakers
 */
export function getUniqueSpeakers(
  segments: readonly TranscriptSegment[]
): Speaker[] {
  const speakerMap = new Map<string, Speaker>();

  for (const segment of segments) {
    if (!speakerMap.has(segment.speaker.id)) {
      speakerMap.set(segment.speaker.id, segment.speaker);
    }
  }

  return Array.from(speakerMap.values());
}

/**
 * Calculate the duration of a transcript segment in milliseconds
 *
 * @param segment - Transcript segment
 * @returns Duration in milliseconds
 */
export function getSegmentDuration(segment: TranscriptSegment): number {
  return segment.endTime - segment.startTime;
}
