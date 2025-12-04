/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/:slug',
        destination: '/:slug/index',
      },
      {
        source: '/:slug/admin',
        destination: '/:slug/admin',
      },
      {
        source: '/:slug/events',
        destination: '/:slug/events',
      },
    ]
  },
}

module.exports = nextConfig
