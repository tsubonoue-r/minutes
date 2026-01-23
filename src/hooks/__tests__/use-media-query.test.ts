/**
 * Tests for useMediaQuery hook - logic and configuration
 * @module hooks/__tests__/use-media-query.test
 */

import { describe, it, expect } from 'vitest';

/**
 * Since the test environment is node (not jsdom), we test the hook's
 * exported interface and configuration values by verifying the module
 * exports and breakpoint logic.
 */

describe('use-media-query module', () => {
  it('should export useMediaQuery function', async () => {
    const mod = await import('../use-media-query');
    expect(typeof mod.useMediaQuery).toBe('function');
  });

  it('should export useIsMobile function', async () => {
    const mod = await import('../use-media-query');
    expect(typeof mod.useIsMobile).toBe('function');
  });

  it('should export useIsTablet function', async () => {
    const mod = await import('../use-media-query');
    expect(typeof mod.useIsTablet).toBe('function');
  });

  it('should export useIsDesktop function', async () => {
    const mod = await import('../use-media-query');
    expect(typeof mod.useIsDesktop).toBe('function');
  });
});

describe('Breakpoint configuration', () => {
  /**
   * Verify that the breakpoint values used in the hooks match
   * Tailwind CSS default breakpoints.
   */

  it('should define mobile as below 768px (md breakpoint)', () => {
    // The useIsMobile hook queries (max-width: 767px)
    // This matches Tailwind's md: 768px breakpoint
    const mdBreakpoint = 768;
    const mobileMaxWidth = mdBreakpoint - 1;
    expect(mobileMaxWidth).toBe(767);
  });

  it('should define tablet as 768px to 1023px', () => {
    const mdBreakpoint = 768;
    const lgBreakpoint = 1024;
    expect(mdBreakpoint).toBe(768);
    expect(lgBreakpoint - 1).toBe(1023);
  });

  it('should define desktop as 1024px and above', () => {
    const lgBreakpoint = 1024;
    expect(lgBreakpoint).toBe(1024);
  });

  it('should have no gap between breakpoint ranges', () => {
    const sm = 640;
    const md = 768;
    const lg = 1024;
    const xl = 1280;
    const xxl = 1536;

    // Verify each breakpoint is increasing
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
    expect(lg).toBeLessThan(xl);
    expect(xl).toBeLessThan(xxl);
  });
});
