'use client';

/**
 * useMediaQuery - Responsive media query hook
 * @module hooks/use-media-query
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook that tracks a CSS media query match state.
 *
 * @description Uses `window.matchMedia` to reactively track whether a given
 * CSS media query matches. Returns `false` during SSR and hydration.
 *
 * @param query - A valid CSS media query string (e.g. "(max-width: 768px)")
 * @returns Whether the media query currently matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  const handleChange = useCallback((event: MediaQueryListEvent) => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    mediaQueryList.addEventListener('change', handleChange);

    return (): void => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query, handleChange]);

  return matches;
}

/**
 * Tailwind CSS breakpoint values (in pixels)
 */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Hook to determine if the viewport is at mobile size (below md breakpoint).
 *
 * @description Returns `true` when the viewport width is less than 768px.
 * Useful for conditionally rendering mobile-specific UI elements.
 *
 * @returns Whether the current viewport is mobile-sized
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

/**
 * Hook to determine if the viewport is at tablet size (md to lg breakpoint).
 *
 * @returns Whether the current viewport is tablet-sized
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

/**
 * Hook to determine if the viewport is at desktop size (lg and above).
 *
 * @returns Whether the current viewport is desktop-sized
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}
