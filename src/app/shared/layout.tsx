/**
 * Shared pages layout - Minimal branded layout without authentication
 * @module app/shared/layout
 */

/**
 * Shared layout props
 */
interface SharedLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * SharedLayout Component
 *
 * Provides a minimal branded layout for shared/public pages.
 * No authentication header or navigation is shown.
 */
export default function SharedLayout({
  children,
}: SharedLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="border-b border-lark-border bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="container mx-auto max-w-4xl flex items-center">
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Minutes
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">
            共有議事録
          </span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
