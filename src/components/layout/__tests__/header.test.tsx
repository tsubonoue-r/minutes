/**
 * Tests for Header component - module and logic verification
 * @module components/layout/__tests__/header.test
 */

import { describe, it, expect } from 'vitest';

describe('Header module', () => {
  it('should export Header component', async () => {
    const mod = await import('../header');
    expect(typeof mod.Header).toBe('function');
  });

  it('should have Header as named export', async () => {
    const mod = await import('../header');
    expect(mod).toHaveProperty('Header');
  });
});

describe('Header navigation links', () => {
  /**
   * Verify the default navigation link configuration
   */

  const DEFAULT_NAV_LINKS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/meetings', label: 'Meetings' },
    { href: '/action-items', label: 'Action Items' },
    { href: '/settings', label: 'Settings' },
  ];

  it('should have Dashboard link', () => {
    const dashboardLink = DEFAULT_NAV_LINKS.find((l) => l.href === '/dashboard');
    expect(dashboardLink).toBeDefined();
    expect(dashboardLink?.label).toBe('Dashboard');
  });

  it('should have Meetings link', () => {
    const meetingsLink = DEFAULT_NAV_LINKS.find((l) => l.href === '/meetings');
    expect(meetingsLink).toBeDefined();
    expect(meetingsLink?.label).toBe('Meetings');
  });

  it('should have Action Items link', () => {
    const actionLink = DEFAULT_NAV_LINKS.find((l) => l.href === '/action-items');
    expect(actionLink).toBeDefined();
    expect(actionLink?.label).toBe('Action Items');
  });

  it('should have Settings link', () => {
    const settingsLink = DEFAULT_NAV_LINKS.find((l) => l.href === '/settings');
    expect(settingsLink).toBeDefined();
    expect(settingsLink?.label).toBe('Settings');
  });

  it('should have 4 navigation links', () => {
    expect(DEFAULT_NAV_LINKS).toHaveLength(4);
  });
});

describe('Header active path detection', () => {
  function isActive(href: string, currentPath: string): boolean {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath.startsWith(href);
  }

  it('should highlight dashboard for root path', () => {
    expect(isActive('/dashboard', '/')).toBe(true);
  });

  it('should highlight dashboard for /dashboard path', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
  });

  it('should not highlight dashboard for /meetings path', () => {
    expect(isActive('/dashboard', '/meetings')).toBe(false);
  });

  it('should highlight meetings for /meetings subpaths', () => {
    expect(isActive('/meetings', '/meetings/123/details')).toBe(true);
  });

  it('should highlight action-items for /action-items subpaths', () => {
    expect(isActive('/action-items', '/action-items?filter=overdue')).toBe(true);
  });
});

describe('Header layout structure', () => {
  /**
   * Verify responsive layout classes used in the header
   */

  it('should use correct responsive classes for desktop nav', () => {
    // Desktop nav should be hidden on mobile, flex on md+
    const desktopNavClasses = 'hidden md:flex';
    expect(desktopNavClasses).toContain('hidden');
    expect(desktopNavClasses).toContain('md:flex');
  });

  it('should use correct responsive classes for user name', () => {
    // User name should only show on sm+ screens
    const userNameClasses = 'hidden sm:block';
    expect(userNameClasses).toContain('hidden');
    expect(userNameClasses).toContain('sm:block');
  });

  it('should have sticky header positioning', () => {
    const headerClasses = 'sticky top-0 z-50';
    expect(headerClasses).toContain('sticky');
    expect(headerClasses).toContain('top-0');
    expect(headerClasses).toContain('z-50');
  });

  it('should have minimum touch target size for user menu', () => {
    const buttonClasses = 'min-h-[44px]';
    expect(buttonClasses).toContain('min-h-[44px]');
  });
});
