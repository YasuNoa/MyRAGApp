/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // ローカル開発時に /api へのリクエストをバックエンド（ポート3001）に転送するための設定です。
    // rewrites function removed as Hono is now integrated into Next.js API routes
};

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    scope: "/app",
    sw: "service-worker.js",
});

export default withPWA(nextConfig);
