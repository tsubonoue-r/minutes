/**
 * Root Layout - Main application layout
 * @module app/layout
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast-provider';
import { I18nProvider } from '@/lib/i18n/provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Application metadata
 */
export const metadata: Metadata = {
  title: {
    default: 'Minutes - Lark Meeting Notes',
    template: '%s | Minutes',
  },
  description: 'Access and manage your Lark meeting minutes with ease.',
  keywords: ['minutes', 'meeting notes', 'lark', 'productivity'],
  authors: [{ name: 'Minutes Team' }],
  creator: 'Minutes',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

/**
 * Viewport configuration
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

/**
 * Root layout props
 */
interface RootLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Root Layout Component
 *
 * Provides the base HTML structure and global styles for the application.
 */
export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased dark:bg-slate-900">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        {/* Main content */}
        <I18nProvider>
          <ToastProvider>
            <main id="main-content">{children}</main>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
