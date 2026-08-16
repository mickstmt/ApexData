'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const COLORS = {
  light: '#F6F6F7',
  dark: '#0B0B0F',
};

/**
 * Keeps <meta name="theme-color"> in step with the in-app theme.
 *
 * Without this the iOS status bar and notch area follow the OS-level
 * prefers-color-scheme, which disagrees with the app whenever the user picks
 * the opposite theme. The SSR-emitted tags are disabled with `media="not all"`
 * rather than removed: removing them crashes React's reconciler on the next
 * diff, since they belong to the server-rendered tree.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const target = resolvedTheme === 'dark' ? COLORS.dark : COLORS.light;

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][data-managed-by="theme-sync"]'
    );

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('data-managed-by', 'theme-sync');
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', target);

    // Next emits its own theme-color from `viewport.themeColor` with no media
    // attribute, and it sits first in <head>, so it would win. Disabling it
    // with `media="not all"` beats removing it, which crashes React's
    // reconciler when it later diffs the server-rendered tree.
    document
      .querySelectorAll('meta[name="theme-color"]:not([data-managed-by])')
      .forEach((element) => element.setAttribute('media', 'not all'));
  }, [resolvedTheme]);

  return null;
}
