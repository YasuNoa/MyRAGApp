/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // ローカル開発時に /api へのリクエストをバックエンド（ポート3001）に転送するための設定です。
    // rewrites function removed as Hono is now integrated into Next.js API routes
};

export default nextConfig;
