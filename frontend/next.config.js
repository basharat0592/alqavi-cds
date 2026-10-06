/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // On HTTPS deployments, have the browser upgrade any stray http:// sub-request
    // (e.g. an old absolute media URL) to https, so it can't trigger "Not secure".
    // Skipped when the API is plain http (local dev), where upgrading would break it.
    async headers() {
        if (!(process.env.NEXT_PUBLIC_API_URL || '').startsWith('https://')) return [];
        return [{
            source: '/:path*',
            headers: [{ key: 'Content-Security-Policy', value: 'upgrade-insecure-requests' }],
        }];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
            },
            {
                protocol: 'http',
                hostname: '74.208.242.204',
            },
            {
                protocol: 'https',
                hostname: 'alqavitraders.com',
            },
            {
                protocol: 'https',
                hostname: 'www.alqavitraders.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
}

module.exports = nextConfig
