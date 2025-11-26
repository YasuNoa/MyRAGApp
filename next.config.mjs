/** @type {import('next').NextConfig} */
const nextConfig = {
    // ローカル開発時に /api へのリクエストをバックエンド（ポート3001）に転送するための設定です。
    // rewrites function removed as Hono is now integrated into Next.js API routes
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push({
                'hono': 'commonjs hono',
                '@hono/node-server': 'commonjs @hono/node-server',
            });
        }
        return config;
    },
    turbopack: {},
};

export default nextConfig;
