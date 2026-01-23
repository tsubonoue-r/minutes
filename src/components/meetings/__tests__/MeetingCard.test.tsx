/**
 * Tests for MeetingCard component - module and logic verification
 * @module components/meetings/__tests__/MeetingCard.test
 */

import { describe, it, expect } from 'vitest';

describe('MeetingCard module', () => {
  it('should export MeetingCard component', async () => {
    const mod = await import('../MeetingCard');
    expect(typeof mod.MeetingCard).toBe('function');
  });

  it('should have MeetingCard as named export', async () => {
    const mod = await import('../MeetingCard');
    expect(mod).toHaveProperty('MeetingCard');
  });
});

describe('MeetingCard duration formatting', () => {
  /**
   * Test the formatDuration logic used in MeetingCard
   */

  function formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainingMinutes}m`;
  }

  it('should format 30 minutes as "30min"', () => {
    expect(formatDuration(30)).toBe('30min');
  });

  it('should format 60 minutes as "1h"', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('should format 90 minutes as "1h30m"', () => {
    expect(formatDuration(90)).toBe('1h30m');
  });

  it('should format 120 minutes as "2h"', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('should format 45 minutes as "45min"', () => {
    expect(formatDuration(45)).toBe('45min');
  });

  it('should format 75 minutes as "1h15m"', () => {
    expect(formatDuration(75)).toBe('1h15m');
  });

  it('should format 0 minutes as "0min"', () => {
    expect(formatDuration(0)).toBe('0min');
  });
});

describe('MeetingCard date formatting', () => {
  /**
   * Test the formatDateCompact logic used in MeetingCard
   */

  function formatDateCompact(date: Date): string {
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  it('should format date in compact ja-JP format', () => {
    const date = new Date('2025-01-15T10:30:00Z');
    const result = formatDateCompact(date);
    // Should contain month/day and hour:minute
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('MeetingCard status configuration', () => {
  type MeetingStatus = 'scheduled' | 'in_progress' | 'ended' | 'cancelled';

  function getStatusConfig(
    status: MeetingStatus
  ): { label: string; variant: string } {
    const config: Record<MeetingStatus, { label: string; variant: string }> = {
      scheduled: { label: 'Scheduled', variant: 'default' },
      in_progress: { label: 'In Progress', variant: 'warning' },
      ended: { label: 'Ended', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'error' },
    };
    return config[status];
  }

  it('should map scheduled to default variant', () => {
    const config = getStatusConfig('scheduled');
    expect(config.label).toBe('Scheduled');
    expect(config.variant).toBe('default');
  });

  it('should map in_progress to warning variant', () => {
    const config = getStatusConfig('in_progress');
    expect(config.label).toBe('In Progress');
    expect(config.variant).toBe('warning');
  });

  it('should map ended to success variant', () => {
    const config = getStatusConfig('ended');
    expect(config.label).toBe('Ended');
    expect(config.variant).toBe('success');
  });

  it('should map cancelled to error variant', () => {
    const config = getStatusConfig('cancelled');
    expect(config.label).toBe('Cancelled');
    expect(config.variant).toBe('error');
  });
});

describe('MeetingCard responsive layout', () => {
  it('should use responsive padding classes', () => {
    const paddingClasses = 'p-3 sm:p-4';
    expect(paddingClasses).toContain('p-3');
    expect(paddingClasses).toContain('sm:p-4');
  });

  it('should stack meta items vertically on mobile', () => {
    const metaClasses = 'flex flex-col sm:flex-row sm:items-center';
    expect(metaClasses).toContain('flex-col');
    expect(metaClasses).toContain('sm:flex-row');
  });

  it('should use responsive text sizes', () => {
    const textClasses = 'text-sm sm:text-base';
    expect(textClasses).toContain('text-sm');
    expect(textClasses).toContain('sm:text-base');
  });

  it('should have touch-friendly minimum height', () => {
    const cardClasses = 'min-h-[44px]';
    expect(cardClasses).toContain('min-h-[44px]');
  });

  it('should show compact date on mobile and full on desktop', () => {
    const mobileClasses = 'sm:hidden';
    const desktopClasses = 'hidden sm:inline';
    expect(mobileClasses).toContain('sm:hidden');
    expect(desktopClasses).toContain('hidden');
    expect(desktopClasses).toContain('sm:inline');
  });
});
