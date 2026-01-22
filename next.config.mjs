/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  /**
   * Edge Runtime (middleware) で環境変数を利用可能にする
   * DEV_SKIP_AUTH: 開発環境での認証スキップフラグ
   * SESSION_SECRET: セッション暗号化キー
   */
  env: {
    DEV_SKIP_AUTH: process.env.DEV_SKIP_AUTH,
    SESSION_SECRET: process.env.SESSION_SECRET,
  },
};

export default nextConfig;
