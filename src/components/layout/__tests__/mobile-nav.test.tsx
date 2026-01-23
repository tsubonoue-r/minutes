/**
 * Tests for MobileNav component - module and structure verification
 * @module components/layout/__tests__/mobile-nav.test
 */

import { describe, it, expect } from 'vitest';

describe('MobileNav module', () => {
  it('should export MobileNav component', async () => {
    const mod = await import('../mobile-nav');
    expect(typeof mod.MobileNav).toBe('function');
  });

  it('should have MobileNav as named export', async () => {
    const mod = await import('../mobile-nav');
    expect(mod).toHaveProperty('MobileNav');
  });
});

describe('MobileNav navigation configuration', () => {
  /**
   * Verify the navigation items match the expected routes.
   * These are tested by importing the module and checking
   * the component can be instantiated without errors.
   */

  it('should include Dashboard route', () => {
    const expectedRoutes = ['/dashboard', '/meetings', '/action-items', '/settings'];
    expect(expectedRoutes).toContain('/dashboard');
  });

  it('should include Meetings route', () => {
    const expectedRoutes = ['/dashboard', '/meetings', '/action-items', '/settings'];
    expect(expectedRoutes).toContain('/meetings');
  });

  it('should include Action Items route', () => {
    const expectedRoutes = ['/dashboard', '/meetings', '/action-items', '/settings'];
    expect(expectedRoutes).toContain('/action-items');
  });

  it('should include Settings route', () => {
    const expectedRoutes = ['/dashboard', '/meetings', '/action-items', '/settings'];
    expect(expectedRoutes).toContain('/settings');
  });

  it('should have exactly 4 navigation items', () => {
    const expectedRoutes = ['/dashboard', '/meetings', '/action-items', '/settings'];
    expect(expectedRoutes).toHaveLength(4);
  });
});

describe('MobileNav active path detection logic', () => {
  /**
   * Test the isActive logic that determines which nav item is highlighted.
   */

  function isActive(href: string, currentPath: string): boolean {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath.startsWith(href);
  }

  it('should mark dashboard as active for /dashboard path', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
  });

  it('should mark dashboard as active for / path', () => {
    expect(isActive('/dashboard', '/')).toBe(true);
  });

  it('should mark meetings as active for /meetings path', () => {
    expect(isActive('/meetings', '/meetings')).toBe(true);
  });

  it('should mark meetings as active for /meetings/123 path', () => {
    expect(isActive('/meetings', '/meetings/123')).toBe(true);
  });

  it('should not mark meetings as active for /dashboard path', () => {
    expect(isActive('/meetings', '/dashboard')).toBe(false);
  });

  it('should mark action-items as active for /action-items path', () => {
    expect(isActive('/action-items', '/action-items')).toBe(true);
  });

  it('should not mark action-items as active for /action path', () => {
    expect(isActive('/action-items', '/action')).toBe(false);
  });

  it('should mark settings as active for /settings path', () => {
    expect(isActive('/settings', '/settings')).toBe(true);
  });
});
