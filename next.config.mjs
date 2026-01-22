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
   * API_KEY: API Key認証用
   */
  env: {
    DEV_SKIP_AUTH: process.env.DEV_SKIP_AUTH,
    SESSION_SECRET: process.env.SESSION_SECRET,
    API_KEY: process.env.API_KEY,
  },
};

export default nextConfig;
