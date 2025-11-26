/** @type {import('next').NextConfig} */
const nextConfig = {
    // ローカル開発時に /api へのリクエストをバックエンド（ポート3001）に転送するための設定です。
    async rewrites() {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        return {
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${backendUrl}/:path*`,
                },
            ],
        };
    },
};

export default nextConfig;
