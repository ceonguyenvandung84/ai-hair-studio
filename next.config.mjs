/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

// Static export cho Cloudflare Pages (khi build)
if (process.env.CF_PAGES) {
  nextConfig.output = 'export';
}

// Local dev: proxy /api/* tới wrangler pages dev
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => [
    {
      source: '/api/:path*',
      destination: 'http://127.0.0.1:8788/api/:path*',
    },
  ];
}

export default nextConfig;
