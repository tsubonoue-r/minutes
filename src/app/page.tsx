/**
 * Landing Page - Public homepage
 * @module app/page
 */

/**
 * Feature item component
 */
function FeatureItem({
  icon,
  title,
  description,
}: {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {description}
      </p>
    </div>
  );
}

/**
 * Landing Page Component
 *
 * Public homepage with feature overview and login call-to-action.
 */
export default function HomePage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container-app flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gradient">Minutes</span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="/login"
              className="btn-primary"
            >
              Larkでログイン
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            会議メモを、{' '}
            <span className="text-gradient">もっとシンプルに</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Larkの会議議事録を一か所でアクセス、整理、管理。
            既存のLarkワークスペースとシームレスに連携します。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="btn-primary text-lg px-8 py-3"
            >
              はじめる
            </a>
            <a
              href="#features"
              className="btn-secondary text-lg px-8 py-3"
            >
              詳しく見る
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container-app">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Minutesが選ばれる理由
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureItem
              icon="🔐"
              title="安全な認証"
              description="Larkアカウントで安全にログイン。業界標準のOAuth 2.0でデータを保護します。"
            />
            <FeatureItem
              icon="📝"
              title="簡単アクセス"
              description="すべての会議議事録を一つのダッシュボードで管理。チャットを検索する必要はもうありません。"
            />
            <FeatureItem
              icon="⚡"
              title="高速で信頼性が高い"
              description="最新の技術で構築された高速で信頼性の高いシステム。メモに瞬時にアクセスできます。"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="container-app text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            さっそく始めましょう
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Larkアカウントを接続して、今日から会議メモの整理を始めましょう。
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Larkでログイン
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="container-app flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Minutes. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-sm">
              プライバシーポリシー
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 text-sm">
              利用規約
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
